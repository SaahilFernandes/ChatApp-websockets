
// backend/models/Message.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const messageSchema = new Schema({
    senderName: { // Using name as identifier for simplicity matching client
        type: String,
        required: true,
    },
    recipientName: { // Null for broadcast
        type: String,
        default: null,
    },
    text: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    // Optional: Add indexes for faster queries, especially for history
    // You might need to create these indexes in your MongoDB database
});

// Add indexes for efficient querying by sender/recipient/timestamp
// These indexes are crucial for performance on large chat histories
// db.collection('messages').createIndex({ senderName: 1, recipientName: 1, timestamp: 1 });
// db.collection('messages').createIndex({ recipientName: 1, senderName: 1, timestamp: 1 });
// db.collection('messages').createIndex({ recipientName: 1, timestamp: 1 }); // For broadcast

const Message = mongoose.model('Message', messageSchema);
export default Message;