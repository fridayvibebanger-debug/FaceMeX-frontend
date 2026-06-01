import { io, type Socket } from 'socket.io-client';

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'https://YOUR-RENDER-BACKEND.onrender.com';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('✅ FaceMeX socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ FaceMeX socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ FaceMeX socket error:', error.message);
    });
  }

  return socket;
}

export function joinUserSocket(userId?: string | null) {
  const cleanUserId = String(userId || '').trim();

  if (!cleanUserId) return;

  const s = getSocket();

  if (s.connected) {
    s.emit('user:join', { userId: cleanUserId });
    return;
  }

  s.once('connect', () => {
    s.emit('user:join', { userId: cleanUserId });
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitSocket(event: string, payload?: any) {
  const s = getSocket();
  s.emit(event, payload || {});
}

export function onSocket(event: string, callback: (...args: any[]) => void) {
  const s = getSocket();
  s.on(event, callback);

  return () => {
    s.off(event, callback);
  };
}

export function offSocket(event: string, callback?: (...args: any[]) => void) {
  const s = getSocket();

  if (callback) {
    s.off(event, callback);
  } else {
    s.off(event);
  }
}

export default getSocket;
