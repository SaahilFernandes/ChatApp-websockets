// src/socket.js
import { io } from 'socket.io-client';
const SOCKET_URL_FROM_ENV = import.meta.env.VITE_SOCKET_URL; // Renamed for clarity
const URL_TO_USE = process.env.NODE_ENV === 'production' ? undefined : SOCKET_URL_FROM_ENV;

// Create socket instance without connecting immediately
export const socket = io(URL_TO_USE, {
  autoConnect: false, // Will be connected manually
  withCredentials: true
});