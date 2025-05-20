// backend/routes/media.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateToken } from '../middleware/JWT.js'; // Ensure this is correct

const router = express.Router();

// Create uploads directory if it doesn't exist
// Use process.cwd() for reliable pathing from project root
const uploadDir = path.join(process.cwd(), 'uploads');
const mediaDir = path.join(uploadDir, 'media');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir);
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, mediaDir); // Save files to the 'uploads/media' directory
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter to restrict to images, videos, and audio
const fileFilter = (req, file, cb) => {
  // Check mime type
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/')
  ) {
    cb(null, true); // Accept the file
  } else {
    // Reject file and provide an informative error message
    cb(new Error('Unsupported file type. Only images, videos, and audio files are allowed.'), false);
  }
};

// Set up multer with size limits (Increased the limit)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Increased to 50MB. Adjust based on your needs.
  }
});

// POST route to upload media files
// Apply validateToken middleware first to ensure authentication
router.post('/upload', validateToken, (req, res) => {
    // Now, apply the multer middleware inside the route handler
    // This allows us to catch multer-specific errors (like file size)
    upload.array('media', 5)(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred (e.g., file size, too many files)
            console.error('Multer Error during upload:', err);
            let errorMessage = 'File upload error.';
            if (err.code === 'LIMIT_FILE_SIZE') {
                errorMessage = `File is too large. Max size is ${upload.limits.fileSize / (1024 * 1024)}MB.`;
            } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                 errorMessage = 'Too many files uploaded.'; // Adjust if needed based on 'media' field limit
            }
            // Add other Multer error code checks if necessary
            return res.status(400).json({ error: errorMessage }); // Send JSON error response
        } else if (err) {
            // An unknown error occurred during upload (e.g., from fileFilter)
             console.error('Unknown Upload Error:', err);
             let errorMessage = 'An error occurred during upload.';
             if (err.message) { // Use the specific error message from fileFilter if available
                 errorMessage = err.message;
             }
            return res.status(500).json({ error: errorMessage }); // Send JSON error response
        }

        // If no Multer errors, proceed to check if files were uploaded
        if (!req.files || req.files.length === 0) {
            // This might happen if fileFilter rejected all files without throwing a specific error
             // or if the 'media' field was missing entirely.
            return res.status(400).json({ error: 'No files were uploaded or all files were invalid.' });
        }

        // Process uploaded files if successful
        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            // Construct the URL relative to the path served by server.js
            // server.js serves from /api/media/files, so this matches
            url: `/api/media/files/${file.filename}`,
            uploader: req.name, // Get uploader name from validateToken middleware
        }));

        // Send a successful JSON response with file details
        res.status(201).json({
            message: 'Files uploaded successfully',
            files: uploadedFiles // Send back the array of file info
        });
    });
});

// GET route to serve media files (should remain the same)
// This route is hit by the browser directly using the URL provided in the message
router.get('/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(mediaDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found' }); // Return JSON for consistency
    }

    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Server error while serving file' }); // Return JSON error
  }
});


export default router;