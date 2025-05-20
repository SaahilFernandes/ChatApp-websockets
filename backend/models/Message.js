// backend/models/Message.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

// Define media schema for attachments
const mediaSchema = new Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  }
});

const messageSchema = new Schema({
  senderName: {
    type: String,
    required: true,
  },
  recipientName: {
    type: String,
    default: null,
  },
  text: {
    type: String,
    default: '',  // Allow empty text for media-only messages
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Add media attachments field
  media: {
    type: [mediaSchema],
    default: []
  }
});

// Add indexes for efficient querying
messageSchema.index({ senderName: 1, recipientName: 1, timestamp: 1 });
messageSchema.index({ recipientName: 1, timestamp: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;