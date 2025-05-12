// src/socket.js
import { io } from 'socket.io-client';

const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5000';

// Create socket instance without connecting immediately
export const socket = io(URL, {
  autoConnect: false, // Will be connected manually
  withCredentials: true
});
