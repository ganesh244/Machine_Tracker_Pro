const getSheetsSyncBaseUrl = () => {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const configured = env?.VITE_SHEETS_SYNC_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8787';
  }

  return typeof window !== 'undefined' ? window.location.origin : '';
};

const postToSheets = async (path: string, payload: Record<string, unknown>) => {
  const baseUrl = getSheetsSyncBaseUrl();
  if (baseUrl === undefined) return;

  try {
    await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn('Google Sheets sync request failed:', error);
  }
};

export const syncSheetDocument = async (collection: string, documentId: string, data: Record<string, unknown>) => {
  await postToSheets('/api/sheets/upsert', { collection, documentId, data });
};

export const deleteSheetDocument = async (collection: string, documentId: string) => {
  await postToSheets('/api/sheets/delete', { collection, documentId });
};

export const getSheetInfo = async () => {
  const baseUrl = getSheetsSyncBaseUrl();
  if (baseUrl === undefined) return null;

  try {
    const response = await fetch(`${baseUrl}/api/sheets/info`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch Google Sheets info:', error);
    return null;
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
  if (baseUrl === undefined) return null;

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

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('Failed to upload file to Google Drive:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};
