import express from 'express';
import cors from 'cors';
import http from 'http';
import connectToMongo from './db.js';
import authRoutes from './routes/auth.js';
import cookieParser from 'cookie-parser';
import initializeChatApp from './routes/chatapp.js'; // Import the chat app initialization

const app = express();
const server = http.createServer(app);

// Initialize the chat application with the HTTP server
initializeChatApp(server);


// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

app.use('/api/users', authRoutes);

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

connectToMongo();