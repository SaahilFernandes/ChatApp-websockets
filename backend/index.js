import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectToMongo from './db.js';
import authRoutes from './routes/auth.js';
import cookieParser from 'cookie-parser';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

const users = {}; // Keep track of which socket ID belongs to which user ID (username)

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

app.use('/api/users', authRoutes);

// Socket.IO Middleware for Username Authentication
io.use((socket, next) => {
    const username = socket.handshake.auth.username;
    if (!username) {
        // This should ideally not happen if the client connects only when logged in
        return next(new Error("Authentication failed: Username is required"));
    }
    // Attach user info to the socket instance
    socket.user = { name: username };
    next();
});

io.on('connection', (socket) => {
    const userId = socket.user.name; // using user name as user id
    console.log('A user connected:', socket.id, 'Username:', userId);

    // Store the socket ID for the user when they connect
    // Note: This simple map assumes one connection per user.
    // If multiple connections are possible, you'd store an array of socket IDs.
    users[userId] = socket.id;

    console.log('Current connected users:', Object.keys(users));

    // --- Put the getUsers handler here ---
    socket.on("getUsers", () => {
        const currentUsers = Object.keys(users);
        console.log('Sending users list:', currentUsers);
        socket.emit("users", currentUsers); // Send the list only to the requesting socket
    });
    // --- End of getUsers handler ---


    // Handle incoming messages (either broadcast or private) from the client
    socket.on('send_message', (data) => {
        const { text, recipient } = data;
        const senderId = userId;
        const senderName = userId; // Assuming username is the displayed name

        if (!text || !text.trim()) {
            console.log('Received empty message from', senderId);
            return; // Ignore empty messages
        }

        const message = {
            text: text.trim(),
            senderId: senderId,
            senderName: senderName,
            timestamp: new Date().toISOString(), // Add timestamp
        };

        if (recipient && recipient !== '') {
            // It's a private message
            const recipientSocketId = users[recipient];

            if (recipientSocketId) {
                message.private = true;
                message.recipient = recipient; // Add recipient info to message object
                console.log(`Private Message from ${senderId} to ${recipient} (${recipientSocketId}): ${text}`);

                // Send to recipient's socket
                io.to(recipientSocketId).emit('chat message', message); // Still use 'chat message' or a new event? Let's use 'chat message' but client needs to handle it

                // Send back to sender's socket
                // This is important so the sender sees their own message in their chat window
                 socket.emit('chat message', message);

            } else {
                console.log(`Recipient ${recipient} not found or is offline.`);
                // Optional: Notify sender that recipient is offline
                socket.emit('error', `User "${recipient}" is offline or doesn't exist.`);
            }
        } else {
            // It's a broadcast message (recipient is null or empty)
            console.log(`Broadcast Message from ${senderId}: ${text}`);
            message.private = false; // Indicate it's not private
            io.emit('chat message', message); // Broadcast to all connected sockets
        }
    });


    socket.on('join room', (roomName) => {
        socket.join(roomName);
        console.log(socket.id, 'joined room:', roomName);
        // You can emit to the room: io.to(roomName).emit(...)
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id, 'Username:', userId);
        // Remove the user from the list of online users
        // Simple removal assumes one socket per user
        if (users[userId] === socket.id) {
            delete users[userId];
            console.log('Remaining connected users:', Object.keys(users));
            // Optional: Notify all clients that a user went offline
            // In a real app, you'd emit the updated user list to everyone here:
             io.emit('users', Object.keys(users));
        }
    });

    // Optional: Emit updated user list to all clients when a user connects
    // This is a simple way to keep the list updated for everyone
     io.emit('users', Object.keys(users));
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

connectToMongo();