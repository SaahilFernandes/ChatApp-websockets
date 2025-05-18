// --- START OF FILE chatapp.js ---

import { Server as SocketIOServer } from 'socket.io';
import Message from '../models/Message.js';  // Import the Message model

const initializeChatApp = (server) => {
    const io = new SocketIOServer(server, {
        cors: {
            origin: 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    const users = {}; // Keep track of which socket ID belongs to which user ID (username)

    // Socket.IO Middleware for Username Authentication
    io.use((socket, next) => {
        const username = socket.handshake.auth.username;
        if (!username) {
            return next(new Error("Authentication failed: Username is required"));
        }
        socket.user = { name: username };
        next();
    });

    io.on('connection', (socket) => {
        const userId = socket.user.name; // using user name as user id
        console.log('A user connected:', socket.id, 'Username:', userId);

        users[userId] = socket.id;

        console.log('Current connected users:', Object.keys(users));

        socket.on("getUsers", () => {
            const currentUsers = Object.keys(users);
            console.log('Sending users list:', currentUsers);
            socket.emit("users", currentUsers);
        });

        socket.on('send_message', async (data) => {  //Marking the handler as async
            const { text, recipient } = data;
            const senderName = userId;

            if (!text || !text.trim()) {
                console.log('Received empty message from', senderName);
                return;
            }

            const messageData = {
                senderName: senderName,
                text: text.trim(),
                timestamp: new Date().toISOString(), // Add timestamp
            };

            if (recipient && recipient !== '') {
                // It's a private message
                messageData.recipientName = recipient; // Add recipient name

                try {
                    const newMessage = new Message(messageData);
                    await newMessage.save(); // Save to DB
                    console.log(`Private Message saved: ${newMessage._id}`);

                    const recipientSocketId = users[recipient];

                    if (recipientSocketId) {
                        const message = {
                            ...messageData,
                            private: true,
                            recipient: recipient, // Add recipient info to message object
                        }
                        console.log(`Private Message from ${senderName} to ${recipient} (${recipientSocketId}): ${text}`);
                        io.to(recipientSocketId).emit('chat message', message); // Send to recipient's socket
                         socket.emit('chat message', message); // Send to the sender
                    } else {
                        console.log(`Recipient ${recipient} not found or is offline.`);

                    }

                } catch (dbError) {
                    console.error("Error saving private message:", dbError);
                    socket.emit('error', "Failed to send message. Please try again.");
                }

            } else {
                // It's a broadcast message
                messageData.recipientName = null; // Explicitly set to null for broadcast messages

                try {
                    const newMessage = new Message(messageData);
                    await newMessage.save(); //Save to DB
                    console.log(`Broadcast Message saved: ${newMessage._id}`);

                    const message = {
                        ...messageData,
                        private: false,
                    }
                    console.log(`Broadcast Message from ${senderName}: ${text}`);
                     io.emit('chat message', message);
                } catch (dbError) {
                    console.error("Error saving broadcast message:", dbError);
                    socket.emit('error', "Failed to send message. Please try again.");
                }
            }
        });

        //NEW: get_messages handler
        socket.on('get_messages', async (targetUser) => {  // targetUser is the recipient name (or empty string for broadcast)
            console.log(`Requesting message history for: ${targetUser ? targetUser : 'broadcast'}`);
            try {
                let query = {};
                if (targetUser) { //Private chat
                    query = {
                        $or: [
                            { senderName: userId, recipientName: targetUser },
                            { senderName: targetUser, recipientName: userId }
                        ]
                    };
                } else { //Broadcast chat
                    query = { recipientName: null }; //recipientName null means broadcast.
                }

                const messages = await Message.find(query).sort({ timestamp: 1 });//get all messages sorted by timestamp.
                socket.emit('message_history', messages); //send messages back to the client
            } catch (error) {
                console.error("Error fetching messages from the database", error);
                socket.emit('error', "Could not retrieve message history.");//send error to client.
            }
        });

        socket.on('join room', (roomName) => {
            socket.join(roomName);
            console.log(socket.id, 'joined room:', roomName);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id, 'Username:', userId);
            if (users[userId] === socket.id) {
                delete users[userId];
                console.log('Remaining connected users:', Object.keys(users));
                io.emit('users', Object.keys(users));
            }
        });

         // NEW: Initial fetch of past conversations
         updatePastConversations(userId);

         // NEW: When a new message is sent, update the past conversations
        socket.on('send_message', () => {
            updatePastConversations(userId);
        });

         // NEW: Function to update past conversations
         async function updatePastConversations(userId) {
            try {
                // Find all unique users the current user has had conversations with.
                const conversations = await Message.aggregate([
                    {
                        $match: {
                            $or: [
                                { senderName: userId },
                                { recipientName: userId }
                            ]
                        }
                    },
                    {
                        $project: {
                            otherUser: {
                                $cond: {
                                    if: { $eq: ["$senderName", userId] },
                                    then: "$recipientName",
                                    else: "$senderName"
                                }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$otherUser" ,
                        }
                    },
                     {
                        $match: {
                            _id: { $ne: null }  // Exclude broadcast chats (recipientName: null)
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            otherUser: "$_id"
                        }
                    }
                ]);

                // Extract usernames from the aggregation result
                const conversationUsernames = conversations.map(item => item.otherUser);
                console.log(`Past conversations for ${userId}:`, conversationUsernames);

                // Emit the list of conversations to the client.
                socket.emit('past_conversations', conversationUsernames); // Emit to the individual socket
             } catch (error) {
                console.error("Error fetching past conversations:", error);
            }
        }

        // NEW: Listen for a new user connecting and send them the past conversations
        socket.on('connect', () => {
            updatePastConversations(userId); // Initial fetch when a user connects
        });

        io.emit('users', Object.keys(users));
    });
};

export default initializeChatApp;