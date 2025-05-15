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
  // const [loadingHistory, setLoadingHistory] = useState(false); // REMOVED

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
      // Automatically select broadcast on connect and load its messages
       handleSelectEveryone();
    }

    function onDisconnect() {
      console.log('Disconnected from socket server.');
      setIsConnected(false);
      setUserList([]); // Clear user list on disconnect
      setMessages([]); // Clear messages on disconnect/logout
      setSelectedRecipient(''); // Reset recipient selection
      // setLoadingHistory(false); // REMOVED
    }

    // Handler for ANY new message from the server (broadcast or private)
    function onChatMessage(message) {
      console.log('Received new message:', message);

      const currentUser = user?.name;
      const isBroadcast = !message.private || message.recipient === null;

      if (selectedRecipient === '' && isBroadcast) {
           setMessages(previousMessages => [...previousMessages, message]);
      } else if (selectedRecipient !== '' && message.private) {
          if (
              (message.senderId === currentUser && message.recipient === selectedRecipient) ||
              (message.senderId === selectedRecipient && message.recipient === currentUser)
          ) {
               setMessages(previousMessages => [...previousMessages, message]);
          }
      } else {
          console.log(`Received message for a different conversation (Selected: ${selectedRecipient}, Message: ${message.senderId} -> ${message.recipient || 'everyone'}). Ignoring for current view.`);
      }
    }


    // --- Handler for receiving message history (or initial messages) ---
    function onMessageHistory(historyMessages) {
        console.log('Received message history/initial messages:', historyMessages);
        setMessages(historyMessages); // Replace current messages
        // setLoadingHistory(false); // REMOVED
    }


    // Handler for receiving the list of online users
    function onUserList(users) {
      console.log('Received user list:', users);
      const filteredUsers = users.filter(userName => userName !== (user ? user.name : null));
      setUserList(filteredUsers);
    }

    // Handler for server-side errors
    function onError(error) {
        console.error('Socket Error:', error);
        alert(`Socket error: ${error}`);
        // setLoadingHistory(false); // REMOVED
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
        // setLoadingHistory(false); // REMOVED
    }

    // Register socket event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat message', onChatMessage);
    socket.on('message_history', onMessageHistory);
    socket.on('users', onUserList);
    socket.on('error', onError);


    // Cleanup listeners and disconnect on component unmount or user change (logout)
    return () => {
      console.log('Cleaning up socket listeners...');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat message', onChatMessage);
      socket.off('message_history', onMessageHistory);
      socket.off('users', onUserList);
      socket.off('error', onError);

      if (socket.connected && !user?.name) {
         console.log('Disconnecting socket due to logout/user change.');
         socket.disconnect();
      }
    };
  }, [user, selectedRecipient]);

  // Request user list when connection is established AND user is logged in
  useEffect(() => {
     if (isConnected && user?.name) {
         socket.emit('getUsers');
     }
  }, [isConnected, user]);


  // --- Handler for Logout ---
  const handleLogout = () => {
    logout();
  };

  // --- Handler for Sending Message ---
  const handleSendMessage = (event) => {
    event.preventDefault();
    const trimmedValue = inputValue.trim();

    if (trimmedValue && socket.connected && user?.name) {
      const messageData = {
        text: trimmedValue,
        recipient: selectedRecipient === '' ? null : selectedRecipient,
      };
      socket.emit('send_message', messageData);
      setInputValue('');
    }
  };

  // --- Handler for Selecting a Conversation (Clicking a user in the sidebar) ---
  const handleConversationSelect = (userName) => {
     console.log('Selecting conversation with:', userName);
     if (selectedRecipient !== userName) {
        setSelectedRecipient(userName);
        setMessages([]); // Clear current messages immediately

        if (socket.connected) {
            socket.emit('get_messages', userName); // Request messages for this conversation
        } else {
            console.warn('Socket not connected, cannot fetch messages.');
        }
     }
  };

  // --- Handler for Selecting Broadcast ("Everyone") ---
  const handleSelectEveryone = () => {
      console.log('Selecting broadcast chat.');
      if (selectedRecipient !== '') {
         setSelectedRecipient('');
         setMessages([]); // Clear current messages immediately

         if (socket.connected) {
            socket.emit('get_messages', ''); // Request broadcast messages
         } else {
             console.warn('Socket not connected, cannot fetch messages.');
         }
      } else if (selectedRecipient === '' && messages.length === 0) {
        // If already on broadcast and no messages, fetch them (e.g., on initial connect)
        if (socket.connected) {
            socket.emit('get_messages', '');
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
        const colorHash = name ? name.charCodeAt(0) * 10 % 900 : 0;
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
                {user?.isAdmin && <span className="admin-indicator">admin</span>}
                {user ? (
                    <>
                       <span className="logged-in-user-name">{user.name}</span>
                       <button className="header-button" onClick={handleLogout}>Logout</button>
                    </>
                ) : null}
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
              {isConnected && user && (
                  <div
                      className={`conversation-item ${selectedRecipient === '' ? 'selected' : ''}`}
                      onClick={handleSelectEveryone}
                  >
                      <img src="https://via.placeholder.com/40/cccccc/ffffff?text=All" alt="Everyone" className="avatar" />
                      <span>Everyone</span>
                  </div>
              )}

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
          {user ? (
               <div className="chat-header-main">
                   <img src={currentChatPartnerAvatar} alt={currentChatPartnerName} className="avatar" />
                   <h3>{currentChatPartnerName}</h3>
               </div>
           ) : (
               <div className="chat-header-main">
                   <h3>Login to chat</h3>
               </div>
           )}


          {/* Messages Area */}
          <div className="messages-area-main">
             {user && (
                  <div className="chatting-with-indicator">
                       {selectedRecipient === '' ? 'You are in the broadcast chat.' : `You are chatting with ${selectedRecipient}.`}
                       {/* REMOVED: {loadingHistory && ' Loading history...'} */}
                  </div>
             )}

            {user && messages.map((msg, index) => (
              <div
                key={msg._id || index}
                className={`message ${msg.senderId === (user ? user.name : null) ? 'my-message' : 'other-message'}`}
              >
                <span className="message-sender">
                   {msg.senderId === (user ? user.name : null) ? 'You' : msg.senderName || 'Unknown'}
                   {msg.private && (
                       msg.senderId === (user ? user.name : null)
                           ? (msg.recipient ? ` (to ${msg.recipient})` : ' (private)')
                           : (msg.recipient === (user ? user.name : null) ? ' (to You)' : ' (private)')
                   )}
                  :
                </span>
                <span className="message-text">{msg.text}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Area */}
          {isConnected && user ? (
            <form onSubmit={handleSendMessage} className="message-input-area">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={selectedRecipient === '' ? "Type a broadcast message..." : `Message ${selectedRecipient}...`}
                disabled={!isConnected || !user } // REMOVED: || loadingHistory
              />
              <button
                type="submit"
                disabled={!isConnected || !inputValue.trim() || !user } // REMOVED: || loadingHistory
              >
                Send
              </button>
            </form>
          ) : (
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