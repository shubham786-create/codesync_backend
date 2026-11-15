import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    socket = io(backendUrl || '/', {
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}
