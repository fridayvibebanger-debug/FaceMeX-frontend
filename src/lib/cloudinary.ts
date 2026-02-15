const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 60000, ...rest } = init;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET');
  }
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  // auto resource type, with timeout safety
  let res: Response;
  try {
    res = await fetchWithTimeout(url, { method: 'POST', body: form, timeoutMs: 60000 });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Upload took too long and was cancelled. Please try again with a smaller file or better connection.');
    }
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => 'Upload failed');
    throw new Error(text);
  }
  const data = await res.json();
  return data.secure_url as string;
}
