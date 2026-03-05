import { uploadToCloudinary } from './cloudinary';
import { API_URL, api } from './api';

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

export async function uploadMedia(file: File, folder: string = 'uploads'): Promise<string> {
  void folder;

  // Prefer backend uploads so the URL is permanent and Cloudinary secrets stay server-side.
  if (API_URL) {
    try {
      const dataUrl = await fileToDataUrl(file);
      const r = await api.post('/api/uploads', { dataUrl, folder });
      const url = String((r as any)?.url || '').trim();
      if (url) return url;
    } catch {
      // fall back to direct Cloudinary below
    }
  }

  // Cloudinary only
  const hasCloudinary = !!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && !!import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (hasCloudinary) {
    return await uploadToCloudinary(file);
  }

  throw new Error('No upload provider configured. Set Supabase or Cloudinary env vars.');
}
