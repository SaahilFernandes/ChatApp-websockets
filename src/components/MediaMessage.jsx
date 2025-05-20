// components/MediaMessage.jsx
import React, { useState } from 'react';
import '../css/chat.css'; // Make sure this path is correct for your CSS

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};


const MediaMessage = ({ media }) => {
  if (!media || media.length === 0) return null;

  return (
    // Consider adding a class for styling the container of media items within a message
    <div className="media-attachments-container">
      {media.map((item, index) => (
        // Ensure each item passed to MediaItem has a unique key
        <MediaItem key={item.filename || index} item={item} />
      ))}
    </div>
  );
};

const MediaItem = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);
   // State to handle potential image loading errors
  const [imageError, setImageError] = useState(false);

  const toggleExpand = () => {
    // Only toggle expand for images for now
    if (item.mimetype.startsWith('image/')) {
      setIsExpanded(!isExpanded);
    }
  };

   // Construct the full backend URL for the media file
   // VITE_API_URL is usually http://localhost:5000/api
   // Media is served from http://localhost:5000/api/media/files/
   // The item.url from the backend is /api/media/files/filename
   // So, we just need the base part, or concatenate correctly.
   // Let's assume VITE_API_URL is http://localhost:5000/api
   const backendBaseUrl = import.meta.env.VITE_API_URL.replace('/api', ''); // Should give http://localhost:5000
   const fullMediaUrl = `${backendBaseUrl}${item.url}`; // Concatenates to http://localhost:5000/api/media/files/filename


  // Handle different media types
  if (item.mimetype.startsWith('image/')) {
    // If image failed to load previously, show fallback
     if (imageError) {
         return (
             <div className="media-item file">
                <a href={fullMediaUrl} target="_blank" rel="noopener noreferrer" download={item.originalName}>
                  <div className="file-icon">
                    {/* Use a generic file icon */}
                    <svg viewBox="0 0 24 24" width="24" height="24">
                      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="file-info">
                    <div className="file-name">{item.originalName}</div>
                    <div className="file-size">{formatFileSize(item.size)}</div>
                  </div>
                </a>
              </div>
         );
     }

    return (
      <div className={`media-item image ${isExpanded ? 'expanded' : ''}`} onClick={toggleExpand}>
        <img
            src={fullMediaUrl} // Use the correctly constructed full URL
            alt={item.originalName}
            // Add an onError handler for images
            onError={(e) => {
                 console.error('Error loading image:', fullMediaUrl, e);
                 setImageError(true); // Set state to show fallback
                 // Optional: e.target.style.display = 'none'; // Hide broken image icon
            }}
        />
         {/* Optional: Add a caption span if text exists alongside image? */}
         {/* {item.text && <span className="media-caption">{item.text}</span>} */}
      </div>
    );
  }
  else if (item.mimetype.startsWith('video/')) {
    return (
      // Videos might be better handled without expanding click
      <div className="media-item video">
        <video
          controls
          src={fullMediaUrl} // Use the correctly constructed full URL
          // Add type hint for browser
          type={item.mimetype}
          onClick={(e) => e.stopPropagation()} // Prevent video click from bubbling
          // onDoubleClick={toggleExpand} // Optional: enable double click to expand if desired
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }
  else if (item.mimetype.startsWith('audio/')) {
    return (
      <div className="media-item audio">
        {/* Optional: Add audio filename/label */}
        <div className="audio-label">{item.originalName}</div>
        <audio controls src={fullMediaUrl} type={item.mimetype}> {/* Use the correctly constructed full URL */}
          Your browser does not support the audio tag.
        </audio>
      </div>
    );
  }
  else {
    // Fallback for unknown media types or potential errors
    return (
      <div className="media-item file">
        <a href={fullMediaUrl} target="_blank" rel="noopener noreferrer" download={item.originalName}> {/* Use the correctly constructed full URL for download */}
          <div className="file-icon">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z" fill="currentColor" />
            </svg>
          </div>
          <div className="file-info">
            <div className="file-name">{item.originalName}</div>
            <div className="file-size">{formatFileSize(item.size)}</div>
          </div>
        </a>
      </div>
    );
  }
};


export default MediaMessage;