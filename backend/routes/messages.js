// backend/routes/messages.js
import express from 'express';
import fs from 'fs/promises'; // Use promises version of fs for async operations
import path from 'path';
import { validateToken } from '../middleware/JWT.js'; // For authentication
import Message from '../models/Message.js'; // Import Message model

const router = express.Router();

// Get the path to the media uploads directory
const mediaDir = path.join(process.cwd(), 'uploads', 'media');

// DELETE route to delete a message by ID
// Requires authentication via validateToken
router.delete('/:messageId', validateToken, async (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.name; // Get the authenticated user's name from the token payload

  try {
    // 1. Find the message
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    // 2. Authorization Check: Ensure the authenticated user is the sender of the message
    // You could add logic here for admin users if needed (e.g., if(message.senderName !== userId && !req.isAdmin))
    if (message.senderName !== userId) {
      return res.status(403).json({ error: 'You are not authorized to delete this message.' });
    }

    // 3. Delete associated media files if any
    if (message.media && message.media.length > 0) {
      for (const mediaItem of message.media) {
        // Ensure the URL is relative and safe to construct a local path from
        // Assuming item.url is like '/api/media/files/filename.ext'
        if (mediaItem.url && mediaItem.url.startsWith('/api/media/files/')) {
          const filename = path.basename(mediaItem.url); // Extract filename safely
          const filePath = path.join(mediaDir, filename);

          try {
            await fs.unlink(filePath); // Delete the file asynchronously
            console.log(`Deleted media file: ${filePath}`);
          } catch (fileErr) {
            // Log file deletion error, but don't stop message deletion
            console.error(`Failed to delete media file ${filePath}:`, fileErr);
            // Continue with message deletion even if the file deletion fails
          }
        } else {
            console.warn(`Invalid media URL format for deletion: ${mediaItem.url}`);
        }
      }
    }

    // 4. Delete the message from the database
    const deletedMessage = await Message.findByIdAndDelete(messageId);

    if (!deletedMessage) {
        // Should not happen if findById worked, but added as a safeguard
         return res.status(500).json({ error: 'Failed to delete message from database.' });
    }


    // 5. Respond with success
    // Frontend will receive this and then emit the socket event
    res.status(200).json({ message: 'Message deleted successfully', messageId: messageId });

  } catch (error) {
    console.error('Error deleting message:', error);
    // Handle potential Mongoose cast errors (invalid ID format)
     if (error.name === 'CastError') {
         return res.status(400).json({ error: 'Invalid message ID format.' });
     }
    res.status(500).json({ error: 'Server error during message deletion.' });
  }
});

export default router;