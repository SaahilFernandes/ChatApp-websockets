// backend/routes/chatapp.js
import { Server as SocketIOServer } from 'socket.io';
import Message from '../models/Message.js';

const initializeChatApp = (server) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const users = {};

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
    const userId = socket.user.name;
    console.log('A user connected:', socket.id, 'Username:', userId);
    users[userId] = socket.id;
    console.log('Current connected users:', Object.keys(users));

    socket.on("getUsers", () => {
      const currentUsers = Object.keys(users);
      console.log('Sending users list:', currentUsers);
      socket.emit("users", currentUsers);
    });
    socket.on('message_deleted', ({ messageId }) => {
             console.log(`Received message_deleted event for ID: ${messageId}. Broadcasting...`);
             // Simply broadcast the ID of the deleted message to all connected clients.
             // The frontend will then remove the message from its state if it's displayed.
             io.emit('message_deleted', { messageId });
             // A more refined approach would only emit to users in the specific conversation,
             // but broadcasting the ID and letting the frontend filter is simpler initially.
        });
    socket.on('send_message', async (data) => {
      const { text, recipient, media } = data;
      const senderName = userId;

      // Allow empty text if media is present
      if ((!text || !text.trim()) && (!media || media.length === 0)) {
        console.log('Received empty message from', senderName);
        return;
      }

      const messageData = {
        senderName: senderName,
        text: text ? text.trim() : '',
        timestamp: new Date().toISOString(),
        media: media || []
      };

      if (recipient && recipient !== '') {
        // It's a private message
        messageData.recipientName = recipient;

        try {
          const newMessage = new Message(messageData);
          await newMessage.save();
          console.log(`Private Message saved: ${newMessage._id}`);

          const recipientSocketId = users[recipient];
          if (recipientSocketId) {
            const message = {
              ...messageData,
              private: true,
              recipient: recipient,
            };
            console.log(`Private Message from ${senderName} to ${recipient} (${recipientSocketId})`);
            io.to(recipientSocketId).emit('chat message', message);
            socket.emit('chat message', message);
          } else {
            console.log(`Recipient ${recipient} not found or is offline.`);
          }
        } catch (dbError) {
          console.error("Error saving private message:", dbError);
          socket.emit('error', "Failed to send message. Please try again.");
        }
      } else {
        // It's a broadcast message
        messageData.recipientName = null;

        try {
          const newMessage = new Message(messageData);
          await newMessage.save();
          console.log(`Broadcast Message saved: ${newMessage._id}`);

          const message = {
            ...messageData,
            private: false,
          };
          console.log(`Broadcast Message from ${senderName}`);
          io.emit('chat message', message);
        } catch (dbError) {
          console.error("Error saving broadcast message:", dbError);
          socket.emit('error', "Failed to send message. Please try again.");
        }
      }
    });

    socket.on('get_messages', async (targetUser) => {
      console.log(`Requesting message history for: ${targetUser ? targetUser : 'broadcast'}`);
      
      try {
        let query = {};
        
        if (targetUser) {
          // Private chat
          query = {
            $or: [
              { senderName: userId, recipientName: targetUser },
              { senderName: targetUser, recipientName: userId }
            ]
          };
        } else {
          // Broadcast chat
          query = { recipientName: null };
        }
        
        const messages = await Message.find(query).sort({ timestamp: 1 });
        socket.emit('message_history', messages);
      } catch (error) {
        console.error("Error fetching messages from the database", error);
        socket.emit('error', "Could not retrieve message history.");
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

    // Initial fetch of past conversations
    updatePastConversations(userId);
    
    // When a new message is sent, update the past conversations
    socket.on('send_message', () => {
      updatePastConversations(userId);
    });

    // Function to update past conversations
    async function updatePastConversations(userId) {
      try {
        // Find all unique users the current user has had conversations with
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
              _id: "$otherUser",
            }
          },
          {
            $match: {
              _id: { $ne: null } // Exclude broadcast chats
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
        
        // Emit the list of conversations to the client
        socket.emit('past_conversations', conversationUsernames);
      } catch (error) {
        console.error("Error fetching past conversations:", error);
      }
    }

    // Listen for a new user connecting
    socket.on('connect', () => {
      updatePastConversations(userId);
    });

    io.emit('users', Object.keys(users));
  });
};

export default initializeChatApp;