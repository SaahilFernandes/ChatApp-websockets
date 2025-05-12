import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import '../css/styles.css'; // Ensure you have styles for .my-message, .other-message, etc.
import { useAuth } from '../context/AuthContext';

function Home() {
  const [selectedRecipient, setSelectedRecipient] = useState(''); // '' means broadcast
  const { user, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const [userList, setUserList] = useState([]); // List of online usernames

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    function onConnect() {
      console.log('Connected to socket server!');
      setIsConnected(true);
      // When connected, request the initial list of users
      // Wait a moment or ensure auth is processed if needed
       setTimeout(() => {
         socket.emit('getUsers');
       }, 100); // Request users after connection is fully established and auth processed
    }

    function onDisconnect() {
      console.log('Disconnected from socket server.');
      setIsConnected(false);
      setUserList([]); // Clear user list on disconnect
    }

    // Handler for ANY message from the server (broadcast or private)
    function onChatMessage(message) {
      console.log('Received message:', message);
      // Add the message to state
      setMessages(previousMessages => [...previousMessages, message]);

      // Optional: If implementing UI filtering, you might check message.private here
      // and only add it if it's a broadcast OR if it's a private message involving the current user.
      // For now, adding all received messages.
    }

    // Handler for receiving the list of online users
    function onUserList(users) {
      console.log('Received user list:', users);
       // Filter out the current user from the list displayed in the dropdown
      const filteredUsers = users.filter(userName => userName !== (user ? user.name : null));
      setUserList(filteredUsers);
    }

    // Handler for server-side errors
    function onError(error) {
        console.error('Socket Error:', error);
        // Display error to the user, e.g., using a state variable for alerts
        alert(`Socket error: ${error}`); // Simple alert for demo
    }


    // Connect the socket if not already connected, passing auth data
    // Ensure user is available before attempting to connect and authenticate
    if (!socket.connected && user?.name) {
       socket.auth = { username: user.name };
       socket.connect();
       console.log(`Attempting to connect socket with username: ${user.name}`);
    } else if (!user?.name) {
        console.log('User not logged in, cannot connect socket.');
        // Optional: Handle state cleanup if user logs out while connected
        setIsConnected(false);
        setMessages([]);
        setUserList([]);
    }


    // Register socket event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat message', onChatMessage); // Listen for the single message event
    socket.on('users', onUserList);         // Listen for user list updates
    socket.on('error', onError);            // Listen for server errors


    // Cleanup listeners and disconnect on component unmount or user change (logout)
    return () => {
      console.log('Cleaning up socket listeners...');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat message', onChatMessage);
      socket.off('users', onUserList);
      socket.off('error', onError);

      // Disconnect the socket during cleanup if it's connected
      if (socket.connected) {
         console.log('Disconnecting socket during cleanup.');
         socket.disconnect();
      }
    };
  }, [user]); // Effect depends on 'user' - runs on mount and when user state changes

  // Request user list whenever connection status changes (e.g., on initial connect)
  // and user is logged in.
  useEffect(() => {
     if (isConnected && user?.name) {
         // Request the user list explicitly when connection is established and user is logged in
         // This handles cases where the initial connection might have happened before user loaded.
         socket.emit('getUsers');
     }
  }, [isConnected, user]); // Depends on isConnected and user state

  const handleLogout = () => {
    // Perform AuthContext logout
    logout();
    // The useEffect cleanup will handle socket disconnect when 'user' state changes to null
    // You might also want to navigate here if not handled by your router setup
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    const trimmedValue = inputValue.trim();

    // Only send if connected, input is not empty, and user is logged in
    if (trimmedValue && socket.connected && user?.name) {
      const messageData = {
        text: trimmedValue,
        // If selectedRecipient is '', it means broadcast.
        // Otherwise, it's the username of the recipient.
        // Pass null or undefined for broadcast, the server checks for existence.
        recipient: selectedRecipient === '' ? null : selectedRecipient,
      };

      // Emit a single 'send_message' event, server handles routing
      socket.emit('send_message', messageData);

      setInputValue(''); // Clear input field
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Simple Chat App</h1>
        <div>
          Status: {isConnected ? 'Connected' : 'Disconnected'}
          {user && (
            <span style={{ marginLeft: '20px' }}>
              Welcome, {user.name}!
              <button onClick={handleLogout} style={{ marginLeft: '10px' }}>
                Logout
              </button>
            </span>
          )}
          {!user && <p>Please log in to chat.</p>}
        </div>

        {user && isConnected && ( // Show recipient dropdown only if logged in and connected
          <div style={{ marginTop: '10px' }}>
              <label htmlFor="recipient-select">Send To:</label>
              <select
                id="recipient-select"
                value={selectedRecipient}
                onChange={e => setSelectedRecipient(e.target.value)}
                style={{ marginLeft: '5px' }}
              >
                <option value="" className='drop-down'>Everyone</option>
                {/* Populate dropdown with the list of online users received from the server */}
                {userList.map(userName => (
                  // Make sure the value is the username
                  <option key={userName} value={userName} className='drop-down'>
                    {userName}
                  </option>
                ))}
              </select>
               {/* Optional: Display currently online users count (excluding self) */}
              <span style={{ marginLeft: '15px', fontSize: '0.9em' }}>Online Users (Excluding You): {userList.length}</span>
          </div>
        )}
      </header>

      <div className="chat-container">
        <div className="messages-area">
          {messages.map((msg, index) => (
            <div
              key={index}
              // Use msg.senderId (username) for determining 'my-message'
              className={`message ${msg.senderId === (user ? user.name : null) ? 'my-message' : 'other-message'}`}
            >
              <span className="message-sender">
                 {/* Display sender and recipient info */}
                {msg.senderId === (user ? user.name : null) ? 'You' : msg.senderName}

                {/* Indicate if it's a private message and who the recipient is */}
                {msg.private && msg.recipient && (
                     // Show recipient for private messages: "You (to John):" or "Alice (to You):"
                     msg.recipient === (user ? user.name : null) ? ' (to You)' : ` (to ${msg.recipient})`
                )}
                : {/* Colon after sender/recipient info */}
              </span>
              <span className="message-text">{msg.text}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={user ? "Type a message..." : "Login to send messages"}
            disabled={!isConnected || !user} // Disable if not connected OR not logged in
          />
          <button
            type="submit"
            disabled={!isConnected || !inputValue.trim() || !user} // Disable send button if no input, not connected, or not logged in
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default Home;