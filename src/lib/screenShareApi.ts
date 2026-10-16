import { supabase } from '@/lib/supabaseClient';

const SCREEN_SHARE_FUNCTION_PATH = '/.netlify/functions/screen-share';

export type ShareParticipant = {
  id: string;
  name: string;
  isGuest: boolean;
  status: 'waiting' | 'approved' | 'rejected' | 'removed';
  requestedAt: string;
  connected: boolean;
};

export type ShareSession = {
  id: string;
  status: 'pending' | 'active' | 'paused' | 'ended';
  expiresAt: string;
  hostName: string;
  role: 'host' | 'visitor';
  participantStatus: ShareParticipant['status'] | null;
  isGuest: boolean;
  hostConnected: boolean;
  startedAt: string | null;
  participants: ShareParticipant[];
};

export type ShareToken = {
  url: string;
  token: string;
};

export async function screenShareRequest<T>(
  action: string,
  values: Record<string, unknown> = {}
): Promise<T> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error(`Could not verify your FaceMeX sign-in: ${sessionError.message}`);
  }

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error('Sign in to FaceMeX before using private screen sharing.');
  }

  const response = await fetch(SCREEN_SHARE_FUNCTION_PATH, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...values }),
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    console.error('FaceMeX screen-sharing function returned a non-JSON response', {
      route: SCREEN_SHARE_FUNCTION_PATH,
      method: 'POST',
      status: response.status,
      contentType: contentType || 'missing',
      requestId: response.headers.get('x-nf-request-id') || undefined,
    });
    throw new Error(`Screen sharing endpoint ${SCREEN_SHARE_FUNCTION_PATH} returned an unexpected response (HTTP ${response.status}).`);
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Screen sharing request failed (HTTP ${response.status}).`);
  }

  return payload as T;
}
