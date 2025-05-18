// backend/routes/chatapp.js
import express from 'express';
import { validateToken } from '../middleware/JWT.js'; // Assuming this is the correct path
import Message from '../models/Message.js'; // Import the new Message model

const router = express.Router();

// Route to get message history for a conversation
// Protected route using validateToken middleware
router.get('/messages', validateToken, async (req, res) => {
    // validateToken middleware adds req.name and req.userId
    const currentUser = req.name;
    const recipient = req.query.recipient; // Get recipient username from query parameter

    console.log(`Fetching messages for user "${currentUser}" with recipient "${recipient || 'broadcast'}"`);

    try {
        let query;
        if (recipient === '' || recipient === 'broadcast') {
            // Fetch broadcast messages (where recipientName is null)
            query = { recipientName: null };
        } else {
            // Fetch private messages between currentUser and recipient
            // Messages where currentUser is sender and recipient is receiver
            // OR messages where recipient is sender and currentUser is receiver
            query = {
                $or: [
                    { senderName: currentUser, recipientName: recipient },
                    { senderName: recipient, recipientName: currentUser }
                ]
            };
        }

        // Fetch messages, sorted by timestamp ascending
        const messages = await Message.find(query)
                                     .sort({ timestamp: 1 })
                                     // Optional: Limit the number of messages fetched for performance
                                     // .limit(100) // e.g., fetch last 100 messages
                                     .exec();

        console.log(`Found ${messages.length} messages for the conversation.`);
        res.status(200).json(messages);

    } catch (error) {
        console.error('Error fetching message history:', error);
        res.status(500).json({ error: 'Failed to fetch message history' });
    }
});

// You can add other chat-related API routes here in the future,
// e.g., /api/chatapp/users (get all registered users), /api/chatapp/delete-message, etc.

export default router;