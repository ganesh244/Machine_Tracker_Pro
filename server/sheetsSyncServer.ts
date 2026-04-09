import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { google, sheets_v4 } from 'googleapis';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type SyncPayload = {
  collection: string;
  documentId: string;
  data: Record<string, unknown>;
};

const app = express();

// Minimal CORS so the local Vite app (often on :3000/:3001) can call this server on :8787.
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '2mb' }));
const upload = multer({ storage: multer.memoryStorage() });

const PORT = Number(process.env.PORT || process.env.SHEETS_SYNC_PORT || 8787);
const STATE_PATH = path.resolve(process.cwd(), '.sheets-sync.json');

const sheetTitleCache = new Map<string, number>();

const loadState = () => {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) as { spreadsheetId?: string };
  } catch {
    return {};
  }
};

const saveState = (state: { spreadsheetId?: string }) => {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
};

const state = loadState();

const getAuthClient = () => {
  const serviceAccountJsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH;
  if (serviceAccountJsonPath) {
    const fileContents = fs.readFileSync(path.resolve(process.cwd(), serviceAccountJsonPath), 'utf8');
    const credentials = JSON.parse(fileContents);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
    });
  }

  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    const credentials = JSON.parse(serviceAccountJson);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
    });
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google service account credentials.');
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
  });
};

const getSheetsClient = async () => {
  const auth = await getAuthClient().getClient();
  return google.sheets({ version: 'v4', auth: auth as any });
};

const getDriveClient = async () => {
  const auth = await getAuthClient().getClient();
  return google.drive({ version: 'v3', auth: auth as any });
};

const flattenValue = (value: unknown): string | number | boolean | '' => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.stringify(value);
};

const flattenObject = (input: Record<string, unknown>, prefix = ''): Record<string, string | number | boolean | ''> => {
  const output: Record<string, string | number | boolean | ''> = {};

  for (const [key, value] of Object.entries(input)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      Object.assign(output, flattenObject(value as Record<string, unknown>, nextKey));
      continue;
    }

    output[nextKey] = flattenValue(value);
  }

  return output;
};

const getSpreadsheetId = async (sheets: sheets_v4.Sheets) => {
  if (process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
    return process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  }

  if (state.spreadsheetId) {
    return state.spreadsheetId;
  }

  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: process.env.GOOGLE_SHEETS_SPREADSHEET_TITLE || 'FarmMech Auto Sync'
      }
    }
  });

  const spreadsheetId = created.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('Failed to create spreadsheet.');
  }

  state.spreadsheetId = spreadsheetId;
  saveState(state);
  return spreadsheetId;
};

const getSpreadsheetUrl = (spreadsheetId: string) => `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

const getSpreadsheetMetadata = async (sheets: sheets_v4.Sheets, spreadsheetId: string) => {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  return metadata.data;
};

const ensureSheet = async (sheets: sheets_v4.Sheets, spreadsheetId: string, title: string) => {
  if (sheetTitleCache.has(title)) {
    return sheetTitleCache.get(title)!;
  }

  const metadata = await getSpreadsheetMetadata(sheets, spreadsheetId);
  const existing = metadata.sheets?.find(sheet => sheet.properties?.title === title);
  if (existing?.properties?.sheetId !== undefined) {
    sheetTitleCache.set(title, existing.properties.sheetId);
    return existing.properties.sheetId;
  }

  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }]
    }
  });

  const sheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (sheetId === undefined) {
    throw new Error(`Failed to create sheet "${title}".`);
  }

  sheetTitleCache.set(title, sheetId);
  return sheetId;
};

const getHeaders = async (sheets: sheets_v4.Sheets, spreadsheetId: string, title: string) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${title}!1:1`
  });

  return (response.data.values?.[0] || []) as string[];
};

const setHeaders = async (sheets: sheets_v4.Sheets, spreadsheetId: string, title: string, headers: string[]) => {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!1:1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [headers]
    }
  });
};

const findRowIndex = async (sheets: sheets_v4.Sheets, spreadsheetId: string, title: string, documentId: string) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${title}!A:A`
  });

  const rows = response.data.values || [];
  const index = rows.findIndex(row => row[0] === documentId);
  return index >= 0 ? index + 1 : null;
};

const toColumnName = (index: number) => {
  let result = '';
  let current = index;

  while (current >= 0) {
    result = String.fromCharCode((current % 26) + 65) + result;
    current = Math.floor(current / 26) - 1;
  }

  return result;
};

const upsertDocument = async ({ collection, documentId, data }: SyncPayload) => {
  const sheets = await getSheetsClient();
  const spreadsheetId = await getSpreadsheetId(sheets);
  const title = collection;

  await ensureSheet(sheets, spreadsheetId, title);

  const flattened = flattenObject(data);
  const baseRow: Record<string, string | number | boolean | ''> = {
    documentId,
    syncedAt: new Date().toISOString(),
    ...flattened
  };

  const currentHeaders = await getHeaders(sheets, spreadsheetId, title);
  const headers = currentHeaders.length > 0 ? [...currentHeaders] : ['documentId', 'syncedAt'];

  for (const key of Object.keys(baseRow)) {
    if (!headers.includes(key)) {
      headers.push(key);
    }
  }

  if (headers.length !== currentHeaders.length || headers.some((header, index) => currentHeaders[index] !== header)) {
    await setHeaders(sheets, spreadsheetId, title, headers);
  }

  const rowValues = headers.map(header => baseRow[header] ?? '');
  const rowIndex = await findRowIndex(sheets, spreadsheetId, title, documentId);
  const lastColumn = toColumnName(headers.length - 1);

  if (rowIndex) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A${rowIndex}:${lastColumn}${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowValues]
      }
    });
    return { spreadsheetId, mode: 'updated' };
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${title}!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [rowValues]
    }
  });

  return { spreadsheetId, mode: 'created' };
};

const deleteDocument = async (collection: string, documentId: string) => {
  const sheets = await getSheetsClient();
  const spreadsheetId = await getSpreadsheetId(sheets);
  const title = collection;
  const sheetId = await ensureSheet(sheets, spreadsheetId, title);
  const rowIndex = await findRowIndex(sheets, spreadsheetId, title, documentId);

  if (!rowIndex || rowIndex === 1) {
    return { spreadsheetId, mode: 'skipped' };
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex
          }
        }
      }]
    }
  });

  return { spreadsheetId, mode: 'deleted' };
};

const ensureDriveFolder = async (drive: any, folderName: string, parentId?: string) => {
  const queryParts = [
    `name='${folderName.replace(/'/g, "\\'")}'`,
    "mimeType='application/vnd.google-apps.folder'",
    'trashed=false'
  ];

  if (parentId) {
    queryParts.push(`'${parentId}' in parents`);
  }

  const existing = await drive.files.list({
    q: queryParts.join(' and '),
    fields: 'files(id, name)',
    pageSize: 1
  });

  const existingId = existing.data.files?.[0]?.id;
  if (existingId) return existingId;

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined
    },
    fields: 'id'
  });

  const createdId = created.data.id;
  if (!createdId) {
    throw new Error(`Failed to create Drive folder "${folderName}".`);
  }

  return createdId;
};

const uploadFileToDrive = async ({
  fileName,
  mimeType,
  buffer,
  machineId,
  bucket
}: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  machineId?: string;
  bucket: 'gallery' | 'proofs';
}) => {
  const drive = await getDriveClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || undefined;
  const bucketFolderId = await ensureDriveFolder(drive, bucket, rootFolderId);
  const machineFolderId = machineId ? await ensureDriveFolder(drive, machineId, bucketFolderId) : bucketFolderId;

  const uploaded = await drive.files.create({
    requestBody: {
      name: `${Date.now()}_${fileName}`,
      parents: machineFolderId ? [machineFolderId] : undefined
    },
    media: {
      mimeType,
      body: Readable.from(buffer)
    },
    fields: 'id, webViewLink, webContentLink'
  });

  const fileId = uploaded.data.id;
  if (!fileId) {
    throw new Error('Drive upload did not return a file id.');
  }

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });

  return {
    fileId,
    url: uploaded.data.webContentLink || uploaded.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`
  };
};

app.get('/health', (_req, res) => {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || state.spreadsheetId || null;
  res.json({
    ok: true,
    spreadsheetId,
    spreadsheetUrl: spreadsheetId ? getSpreadsheetUrl(spreadsheetId) : null
  });
});

app.get('/api/sheets/info', async (_req, res) => {
  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = await getSpreadsheetId(sheets);
    return res.json({
      ok: true,
      spreadsheetId,
      spreadsheetUrl: getSpreadsheetUrl(spreadsheetId)
    });
  } catch (error) {
    // Return 200 so the frontend can show a friendly "offline/unconfigured" state
    // instead of throwing (and so we avoid confusing CORS + ERR_FAILED output).
    return res.status(200).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/sheets/upsert', async (req, res) => {
  try {
    const payload = req.body as SyncPayload;
    if (!payload?.collection || !payload?.documentId || !payload?.data) {
      return res.status(400).json({ error: 'collection, documentId, and data are required.' });
    }

    const result = await upsertDocument(payload);
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Sheets upsert failed:', error);
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/sheets/delete', async (req, res) => {
  try {
    const { collection, documentId } = req.body as { collection?: string; documentId?: string };
    if (!collection || !documentId) {
      return res.status(400).json({ error: 'collection and documentId are required.' });
    }

    const result = await deleteDocument(collection, documentId);
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Sheets delete failed:', error);
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/drive/upload', upload.single('file'), async (req, res) => {
  try {
    const file = (req as any).file as { originalname: string; mimetype: string; buffer: Buffer } | undefined;
    const machineId = typeof req.body?.machineId === 'string' ? req.body.machineId : undefined;
    const bucket = req.body?.bucket === 'proofs' ? 'proofs' : 'gallery';

    if (!file) {
      return res.status(400).json({ ok: false, error: 'file is required' });
    }

    const result = await uploadFileToDrive({
      fileName: file.originalname,
      mimeType: file.mimetype || 'application/octet-stream',
      buffer: file.buffer,
      machineId,
      bucket
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Drive upload failed:', error);
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve frontend build artifacts from dist/
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  console.log(`Serving static files from ${distPath}`);
  app.use(express.static(distPath));
  
  // SPA catch-all: Always serve index.html for any unknown routes
  app.get('*', (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/health')) {
      const idx = path.join(distPath, 'index.html');
      if (fs.existsSync(idx)) {
        res.sendFile(idx);
      } else {
        res.status(404).send('Frontend not built. Run npm run build.');
      }
    } else {
      res.status(404).json({ error: 'Not Found' });
    }
  });
}

app.listen(PORT, () => {
  console.log(`Google Sheets sync server listening on http://localhost:${PORT}`);
});
