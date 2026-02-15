import { uploadToCloudinary } from './cloudinary';

export async function uploadMedia(file: File, folder: string = 'uploads'): Promise<string> {
  void folder;

  // Cloudinary only
  const hasCloudinary = !!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && !!import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (hasCloudinary) {
    return await uploadToCloudinary(file);
  }

  throw new Error('No upload provider configured. Set Supabase or Cloudinary env vars.');
}
