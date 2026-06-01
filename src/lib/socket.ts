import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocketUrl() {
  const directSocketUrl = import.meta.env.VITE_SOCKET_URL;
  const apiUrl = import.meta.env.VITE_API_URL;

  if (directSocketUrl) {
    return String(directSocketUrl).replace(/\/$/, '');
  }

  if (apiUrl) {
    return String(apiUrl)
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');
  }

  return 'http://localhost:4000';
}

export function getSocket() {
  if (socket) return socket;

  socket = io(getSocketUrl(), {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
    timeout: 20000,
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
  if (!socket) return;

  socket.disconnect();
  socket = null;
}
