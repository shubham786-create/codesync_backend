import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    let socketUrl = '/';
    if (backendUrl) {
      socketUrl = backendUrl;
    } else if (
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ) {
      socketUrl = `http://${window.location.hostname}:5000`;
    }

    socket = io(socketUrl, {
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}
