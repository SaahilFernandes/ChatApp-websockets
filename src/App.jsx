<<<<<<< HEAD
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
=======
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
>>>>>>> recovered-work
