import { API_URL } from '@/lib/api';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

async function getAuthHeaders() {
  const headers: Record<string, string> = {};

  try {
    const localToken = localStorage.getItem('faceme_token');

    if (localToken) {
      headers.Authorization = `Bearer ${localToken}`;
      return headers;
    }

    if (isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {}

  return headers;
}

async function compressImage(file: File, maxWidth = 1080, quality = 0.78): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const scale = Math.min(1, maxWidth / image.width);
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    if (!ctx) return file;

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob) return file;

    return new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function uploadImageToAzure(file: File) {
  const compressed = await compressImage(file);

  const formData = new FormData();
  formData.append('file', compressed);

  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_URL}/api/uploads/azure/image`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.url) {
    throw new Error(data?.error || 'Azure image upload failed');
  }

  return data.url as string;
}

export async function uploadImagesToAzure(files: File[]) {
  const safeFiles = files
    .filter((file) => file.type.startsWith('image/'))
    .slice(0, 5);

  const urls: string[] = [];

  for (const file of safeFiles) {
    const url = await uploadImageToAzure(file);
    urls.push(url);
  }

  return urls;
}
