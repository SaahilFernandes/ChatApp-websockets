// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider> {/* Ensure this is here */}
      <App />       {/* App and all its children can now access AuthContext */}
    </AuthProvider>
  </React.StrictMode>
);