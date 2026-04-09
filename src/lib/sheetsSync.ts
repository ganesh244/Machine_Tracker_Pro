let sheetsSyncUnavailableUntil = 0;
let hasWarnedSheetsSyncOffline = false;

const getSheetsSyncBaseUrl = (): string | undefined => {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  
  // In production, if served from the same origin, we use relative paths.
  // If VITE_SHEETS_SYNC_URL is explicitly set (e.g. for cross-origin), we use that.
  if (env?.VITE_SHEETS_SYNC_URL) {
    return env.VITE_SHEETS_SYNC_URL.replace(/\/$/, '');
  }

  // Fallback for local development or same-origin production
  if (env?.DEV) {
    return 'http://localhost:8787';
  }
  
  // Default to same origin in production
  return '';
};

const shouldSkipSheetsRequest = () => false; // Disabled skip logic for debugging

const markSheetsSyncUnavailable = (error: unknown) => {
  console.warn('Sheets sync error detected:', error);
};

const markSheetsSyncAvailable = () => {
  hasWarnedSheetsSyncOffline = false;
};

const postToSheets = async (path: string, payload: Record<string, unknown>) => {
  const baseUrl = getSheetsSyncBaseUrl();
  if (!baseUrl) return;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Sheets sync returned ${response.status}`);
    }
    markSheetsSyncAvailable();
  } catch (error) {
    markSheetsSyncUnavailable(error);
  }
};

export const syncSheetDocument = async (collection: string, documentId: string, data: Record<string, unknown>) => {
  await postToSheets('/api/sheets/upsert', { collection, documentId, data });
};

export const deleteSheetDocument = async (collection: string, documentId: string) => {
  await postToSheets('/api/sheets/delete', { collection, documentId });
};

export const getSheetInfo = async (): Promise<any> => {
  const baseUrl = getSheetsSyncBaseUrl();
  console.log('getSheetInfo: fetching from', `${baseUrl}/api/sheets/info`);

  try {
    const response = await fetch(`${baseUrl}/api/sheets/info`);
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error('getSheetInfo: server error', response.status, errorText);
      return { ok: false, error: `Mirroring server error: ${response.status} ${errorText}` };
    }
    markSheetsSyncAvailable();
    const data = await response.json();
    console.log('getSheetInfo: success', data);
    return data;
  } catch (error: any) {
    console.error('getSheetInfo: unreachable', error);
    markSheetsSyncUnavailable(error);
    return { ok: false, error: `Mirroring server unreachable: ${error.message || 'Network error'}.` };
  }
};

export const uploadDriveFile = async ({
  file,
  machineId,
  bucket
}: {
  file: File;
  machineId?: string;
  bucket: 'gallery' | 'proofs';
}) => {
  const baseUrl = getSheetsSyncBaseUrl();
  if (!baseUrl) return null;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  if (machineId) {
    formData.append('machineId', machineId);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${baseUrl}/api/drive/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Drive upload returned ${response.status}`);
    }
    markSheetsSyncAvailable();
    return await response.json();
  } catch (error) {
    markSheetsSyncUnavailable(error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};
