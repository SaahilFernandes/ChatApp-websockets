
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your page components
import Login from './components/Login'; // Assuming Login.jsx is here
import Navbar from './components/Navbar';
// ... import other components/pages that will be routes

function App() {
  return (
    // 1. Wrap your entire application (or routing part) with BrowserRouter
    <Router>

      {/* Optional: Navbar could go here if it should appear on ALL pages */}
       
      {/* 2. Define routes using Routes and Route */}
      <Routes>
        {/* Render the Login component for the root path or a specific /login path */}
        <Route path="/" element={<Login />} />
        {/* Or <Route path="/login" element={<Login />} /> */}

        {/* Define other routes */}
       
      </Routes>

    </Router> // Close the Router
  );
}

export default App;
