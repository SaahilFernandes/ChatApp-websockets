// backend/server.js
import express from 'express';
import cors from 'cors';
import http from 'http';
import connectToMongo from './db.js';
import authRoutes from './routes/auth.js';
import mediaRoutes from './routes/media.js';
import messagesRoutes from './routes/messages.js'; // Import the new messages route
import cookieParser from 'cookie-parser';
import initializeChatApp from './routes/chatapp.js';
import path from 'path';

const app = express();
const server = http.createServer(app);

// Initialize the chat application with the HTTP server
initializeChatApp(server);

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true,
}));
app.use(cookieParser());

// Serve static files from uploads directory
const mediaUploadsPath = path.join(process.cwd(), 'uploads', 'media');
app.use('/api/media/files', express.static(mediaUploadsPath));


// Routes
app.use('/api/users', authRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/messages', messagesRoutes); // Use the new messages route


const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

connectToMongo();