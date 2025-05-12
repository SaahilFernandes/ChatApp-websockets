// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket'; // Import the socket instance
import '../css/styles.css' // For basic styling

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null); // For auto-scrolling

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function onConnect() {
      console.log('Connected to socket server!');
      setIsConnected(true);
    }

    function onDisconnect() {
      console.log('Disconnected from socket server.');
      setIsConnected(false);
    }

    function onChatMessage(newMessage) {
      // newMessage will be an object like { id: 'someSocketId', text: 'Hello' }
      console.log('Received message:', newMessage);
      setMessages(previousMessages => [...previousMessages, newMessage]);
    }

    // Connect the socket if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat message', onChatMessage); // Listen for 'chat message' from server

    // Cleanup listeners when the component unmounts
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat message', onChatMessage);
      // Optional: disconnect if this App component is the only place using the socket
      // if (socket.connected) {
      //   socket.disconnect();
      // }
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  const handleSendMessage = (event) => {
    event.preventDefault();
    if (inputValue.trim() && socket.connected) {
      socket.emit('chat message', inputValue); // Send 'chat message' to server
      // Optional: Optimistically add message to local state
      // setMessages(prev => [...prev, { id: 'me', text: inputValue }]);
      setInputValue('');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Simple Chat App</h1>
        <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      </header>
      <div className="chat-container">
        <div className="messages-area">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.id === socket.id ? 'my-message' : 'other-message'}`}>
              <span className="message-sender">{msg.id === socket.id ? 'You' : `User ${msg.id.substring(0,5)}`}: </span>
              <span className="message-text">{msg.text}</span>
            </div>
          ))}
          <div ref={messagesEndRef} /> {/* For auto-scrolling */}
        </div>
        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            disabled={!isConnected}
          />
          <button type="submit" disabled={!isConnected || !inputValue.trim()}>Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;