import { io } from "socket.io-client";
import { API_BASE_URL } from "./axiosClient";

// Strip the trailing "/api" since Socket.IO connects to the server root.
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false, transports: ["websocket"] });
  }
  return socket;
}

export function connectSocket(uid) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit("join", uid);
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) socket.disconnect();
}
