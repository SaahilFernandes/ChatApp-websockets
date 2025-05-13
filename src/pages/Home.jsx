import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import '../css/chat.css'; // Make sure you are using the chat.css with the layout styles
import { useAuth } from '../context/AuthContext';

function Home() {
  // selectedRecipient: '' for broadcast, username string for private chat
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const { user, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]); // State to hold current messages
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const [userList, setUserList] = useState([]); // List of online usernames
  const [searchText, setSearchText] = useState(''); // For the search input in the sidebar
  const [loadingHistory, setLoadingHistory] = useState(false); // State to indicate history loading


  // --- Effect to scroll to bottom whenever messages change ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Effect for Socket.IO Connection and Listeners ---
  useEffect(() => {
    function onConnect() {
      console.log('Connected to socket server!');
      setIsConnected(true);
      // Request the initial list of users after auth handshake
       setTimeout(() => {
         socket.emit('getUsers');
       }, 100);
      // Optional: Maybe load broadcast history by default on connect
       handleSelectEveryone(); // Automatically select broadcast on connect
    }

    function onDisconnect() {
      console.log('Disconnected from socket server.');
      setIsConnected(false);
      setUserList([]); // Clear user list on disconnect
      setMessages([]); // Clear messages on disconnect/logout
      setSelectedRecipient(''); // Reset recipient selection
      setLoadingHistory(false);
    }

    // Handler for ANY new message from the server (broadcast or private)
    // These arrive AFTER history might have been loaded.
    function onChatMessage(message) {
      console.log('Received new message:', message);

      // Add the message to state ONLY if it belongs to the currently selected conversation
      // This prevents seeing messages from other private chats.
      const currentUser = user?.name;
      const isBroadcast = !message.private || message.recipient === null;

      if (selectedRecipient === '' && isBroadcast) {
          // If currently viewing broadcast and the message is broadcast
           setMessages(previousMessages => [...previousMessages, message]);
      } else if (selectedRecipient !== '' && message.private) {
          // If currently viewing a private chat and the message is private
          // Check if the message is between the current user and the selected recipient (in either direction)
          if (
              (message.senderId === currentUser && message.recipient === selectedRecipient) ||
              (message.senderId === selectedRecipient && message.recipient === currentUser)
          ) {
               setMessages(previousMessages => [...previousMessages, message]);
          }
      } else {
          console.log(`Received message for a different conversation (Selected: ${selectedRecipient}, Message: ${message.senderId} -> ${message.recipient || 'everyone'}). Ignoring for current view.`);
          // Optional: Show a notification that a new message arrived in another chat
      }
    }


    // --- Handler for receiving message history ---
    function onMessageHistory(historyMessages) {
        console.log('Received message history:', historyMessages);
        // Replace the current messages with the history
        setMessages(historyMessages);
        setLoadingHistory(false); // Finished loading
    }


    // Handler for receiving the list of online users
    function onUserList(users) {
      console.log('Received user list:', users);
       // Filter out the current user from the list displayed in the sidebar
      const filteredUsers = users.filter(userName => userName !== (user ? user.name : null));
      setUserList(filteredUsers);

      // Optional: If the currently selected private recipient goes offline, handle it here
      // ... (logic as before)
    }

    // Handler for server-side errors
    function onError(error) {
        console.error('Socket Error:', error);
        alert(`Socket error: ${error}`); // Simple alert for demo
        setLoadingHistory(false); // Stop loading if error occurs during history fetch
    }


    // Connect the socket if not already connected, passing auth data
    if (!socket.connected && user?.name) {
       socket.auth = { username: user.name };
       socket.connect();
       console.log(`Attempting to connect socket with username: ${user.name}`);
    } else if (!user?.name) {
        console.log('User not logged in or logged out, ensuring socket disconnected and state cleared.');
        if (socket.connected) {
             socket.disconnect();
        }
        setIsConnected(false);
        setMessages([]);
        setUserList([]);
        setSelectedRecipient('');
        setLoadingHistory(false);
    }

    // Register socket event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat message', onChatMessage);         // Listen for NEW messages
    socket.on('message_history', onMessageHistory);   // Listen for history
    socket.on('users', onUserList);                   // Listen for user list updates
    socket.on('error', onError);                      // Listen for server errors


    // Cleanup listeners and disconnect on component unmount or user change (logout)
    return () => {
      console.log('Cleaning up socket listeners...');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat message', onChatMessage);
      socket.off('message_history', onMessageHistory);
      socket.off('users', onUserList);
      socket.off('error', onError);

      // If socket is connected and we're cleaning up because user is no longer logged in, disconnect.
      // If cleaning up due to component unmount but user IS still logged in (e.g., routing),
      // you might NOT want to disconnect the socket if other parts of the app use it.
      // Adjust this logic based on your overall app architecture.
      if (socket.connected && !user?.name) {
         console.log('Disconnecting socket due to logout/user change.');
         socket.disconnect();
      }
       // If component unmounts *while* user is logged in, the socket remains connected for potential reuse.
    };
  }, [user, selectedRecipient]); // Effect depends on 'user' and 'selectedRecipient'

  // Request user list when connection is established AND user is logged in
  useEffect(() => {
     if (isConnected && user?.name) {
         socket.emit('getUsers');
     }
  }, [isConnected, user]);


  // --- Handler for Logout ---
  const handleLogout = () => {
    // Perform AuthContext logout
    logout();
    // The useEffect cleanup will handle socket disconnect when 'user' state changes to null
    // Navigate to login page is often handled by AuthContext redirect or router setup
  };

  // --- Handler for Sending Message ---
  const handleSendMessage = (event) => {
    event.preventDefault();
    const trimmedValue = inputValue.trim();

    // Only send if connected, input not empty, user is logged in
    if (trimmedValue && socket.connected && user?.name) {
      const messageData = {
        text: trimmedValue,
        // If selectedRecipient is '', it means broadcast.
        // Pass null to the server, server interprets null/undefined/'' as broadcast.
        recipient: selectedRecipient === '' ? null : selectedRecipient,
      };

      // Emit a single 'send_message' event
      socket.emit('send_message', messageData);

      setInputValue(''); // Clear input field
    }
  };

  // --- Handler for Selecting a Conversation (Clicking a user in the sidebar) ---
  const handleConversationSelect = (userName) => {
     console.log('Selecting conversation with:', userName);
     // Only switch if it's a different user or if current is broadcast
     if (selectedRecipient !== userName) {
        setSelectedRecipient(userName); // Set the recipient state
        setMessages([]); // Clear current messages immediately
        setLoadingHistory(true); // Start loading indicator

        // Request message history for this conversation
        if (socket.connected) {
            socket.emit('get_messages', userName);
        } else {
            console.warn('Socket not connected, cannot fetch history.');
            setLoadingHistory(false); // Stop loading if not connected
        }
     }
  };

  // --- Handler for Selecting Broadcast ("Everyone") ---
  const handleSelectEveryone = () => {
      console.log('Selecting broadcast chat.');
       // Only switch if current is not already broadcast
      if (selectedRecipient !== '') {
         setSelectedRecipient(''); // Set recipient state to empty string for broadcast
         setMessages([]); // Clear current messages immediately
         setLoadingHistory(true); // Start loading indicator

         // Request broadcast history
         if (socket.connected) {
            socket.emit('get_messages', ''); // Send empty string or null for broadcast
         } else {
             console.warn('Socket not connected, cannot fetch history.');
             setLoadingHistory(false); // Stop loading if not connected
         }
      }
  };

    // Filter user list based on search text
    const filteredUserList = userList.filter(userName =>
        userName.toLowerCase().includes(searchText.toLowerCase())
    );

    // Helper to get a simple dummy avatar based on the first letter of the name
    const getDummyAvatar = (name) => {
        const initial = name ? name.charAt(0).toUpperCase() : '?';
        const colorHash = name ? name.charCodeAt(0) * 10 % 900 : 0; // Handle null/undefined name
        return `https://via.placeholder.com/40/${colorHash}/ffffff?text=${initial}`;
    };

    // Determine the current conversation partner's name to display in the header
    const currentChatPartnerName = selectedRecipient === '' ? 'Everyone' : selectedRecipient;
    const currentChatPartnerAvatar = selectedRecipient === '' ? "https://via.placeholder.com/40/cccccc/ffffff?text=All" : getDummyAvatar(selectedRecipient);


  // --- Render the Chat UI ---
  return (
    <div className="chat-page-container">
      {/* Top App Header */}
       <header className="app-header-top">
             <div className="header-app-title">ChatApp</div>
             <div className="header-actions">
                {/* Assuming 'admin' check is on user object from AuthContext */}
                {user?.isAdmin && <span className="admin-indicator">admin</span>}
                {user ? (
                    <>
                       <span className="logged-in-user-name">{user.name}</span>
                       <button className="header-button" onClick={handleLogout}>Logout</button>
                    </>
                ) : null} {/* Assuming auth context handles login redirection */}
            </div>
        </header>


      {/* Main Chat Content Area (Sidebar + Chat) */}
      <div className="chat-content-area">
        {/* Left Sidebar */}
        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <h2>ChatApp</h2>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search users..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                disabled={!isConnected || !user}
              />
            </div>
          </div>
          <div className="conversation-list">
              {/* Option for sending to everyone */}
              {isConnected && user && (
                  <div
                      className={`conversation-item ${selectedRecipient === '' ? 'selected' : ''}`}
                      onClick={handleSelectEveryone}
                  >
                      <img src="https://via.placeholder.com/40/cccccc/ffffff?text=All" alt="Everyone" className="avatar" />
                      <span>Everyone</span>
                  </div>
              )}

            {/* Map through the filtered online users list */}
            {isConnected && user && filteredUserList.map(userName => (
                <div
                    key={userName}
                    className={`conversation-item ${selectedRecipient === userName ? 'selected' : ''}`}
                    onClick={() => handleConversationSelect(userName)}
                >
                    <img src={getDummyAvatar(userName)} alt={userName} className="avatar" />
                    <span>{userName}</span>
                </div>
            ))}

            {/* Messages/Placeholders for empty states in sidebar */}
            {!user && (
                 <div className="sidebar-message">Log in to see online users.</div>
             )}
             {user && !isConnected && (
                  <div className="sidebar-message">Connecting to chat...</div>
             )}
            {user && isConnected && userList.length === 0 && searchText === '' && (
                <div className="sidebar-message">No other users online.</div>
            )}
             {user && isConnected && filteredUserList.length === 0 && searchText !== '' && (
                <div className="sidebar-message">No users found for "{searchText}"</div>
            )}

          </div>
        </aside>

        {/* Right Main Chat Area */}
        <main className="chat-main">
          {/* Chat Header (Recipient Info) - Show if user is logged in */}
          {user ? (
               <div className="chat-header-main">
                   <img src={currentChatPartnerAvatar} alt={currentChatPartnerName} className="avatar" />
                   <h3>{currentChatPartnerName}</h3>
                   {/* Add other header elements */}
               </div>
           ) : ( // Placeholder header if not logged in
               <div className="chat-header-main">
                   <h3>Login to chat</h3>
               </div>
           )}


          {/* Messages Area */}
          <div className="messages-area-main">
             {/* Message indicating who you are chatting with */}
             {user && (
                  <div className="chatting-with-indicator">
                       {selectedRecipient === '' ? 'You are in the broadcast chat.' : `You are chatting with ${selectedRecipient}.`}
                       {loadingHistory && ' Loading history...'} {/* Show loading indicator */}
                  </div>
             )}

            {/* Display messages */}
            {/* Only show messages if user is logged in */}
            {user && messages.map((msg, index) => (
              <div
                key={msg._id || index} // Use message ID as key if available, fallback to index
                className={`message ${msg.senderId === (user ? user.name : null) ? 'my-message' : 'other-message'}`}
              >
                <span className="message-sender">
                   {/* Display sender name (show "You" for current user) */}
                   {msg.senderId === (user ? user.name : null) ? 'You' : msg.senderName || 'Unknown'}

                   {/* Indicate if it's a private message and who the recipient is */}
                   {msg.private && (
                       msg.senderId === (user ? user.name : null) // If sender is YOU
                           ? (msg.recipient ? ` (to ${msg.recipient})` : ' (private)') // "You (to John)"
                           : (msg.recipient === (user ? user.name : null) ? ' (to You)' : ' (private)') // "Alice (to You)"
                   )}
                  :
                </span>
                <span className="message-text">{msg.text}</span>
              </div>
            ))}
             {/* This empty div is the target for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Area */}
          {/* Show input if connected and logged in */}
          {isConnected && user ? (
            <form onSubmit={handleSendMessage} className="message-input-area">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={selectedRecipient === '' ? "Type a broadcast message..." : `Message ${selectedRecipient}...`}
                disabled={!isConnected || !user || loadingHistory} // Disable input while loading history
              />
              <button
                type="submit"
                disabled={!isConnected || !inputValue.trim() || !user || loadingHistory} // Disable send button
              >
                Send
              </button>
            </form>
          ) : ( // Placeholder input area if not connected or not logged in
              <div className="message-input-area">
                  <input
                    type="text"
                    placeholder={!user ? "Login to send messages" : "Connecting..."}
                    disabled
                  />
                  <button type="submit" disabled>Send</button>
              </div>
          )}


        </main>
      </div>
    </div>
  );
}

export default Home;