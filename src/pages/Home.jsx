import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import '../css/chat.css'; // Assuming your chat styles are here
import { useAuth } from '../context/AuthContext';
import UserSearch from '../components/UserSearch.jsx'; // Assuming this component exists
import MediaUpload from '../components/MediaUpload.jsx'; // Import the new component
import MediaMessage from '../components/MediaMessage.jsx'; // Import the new component

function Home() {
    const [selectedRecipient, setSelectedRecipient] = useState(''); // '' for broadcast chat
    const selectedRecipientRef = useRef(selectedRecipient); // Ref for the latest selectedRecipient

    const { user, logout } = useAuth();
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [messages, setMessages] = useState([]); // Start with empty messages, history comes from socket 'message_history'
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);
    const [onlineUserList, setOnlineUserList] = useState([]); // List of users currently online
    const [searchText, setSearchText] = useState(''); // For searching users/conversations
    const [loadingHistory, setLoadingHistory] = useState(true); // State to indicate if message history is loading
    const [pastConversations, setPastConversations] = useState([]); // List of users the current user has chatted with previously

    // Keep the ref in sync with the state
    useEffect(() => {
      selectedRecipientRef.current = selectedRecipient;
    }, [selectedRecipient]);


    // Scroll to the bottom when messages change (with a slight delay for rendering)
    useEffect(() => {
        const timer = setTimeout(() => {
             messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50); // Small delay to allow DOM to update

        return () => clearTimeout(timer); // Cleanup timer
    }, [messages]);


    // Socket connection and event listeners
    useEffect(() => {
        // Socket event handlers
        function onConnect() {
            console.log('Connected to socket server!');
            setIsConnected(true);
            // Emit get users and past conversations upon connect
            socket.emit('getUsers');
        }

        function onDisconnect() {
            console.log('Disconnected from socket server.');
            setIsConnected(false);
            setOnlineUserList([]);
            setMessages([]); // Clear messages on disconnect
            setSelectedRecipient(''); // Reset recipient state
            selectedRecipientRef.current = ''; // Reset recipient ref
            setPastConversations([]);
            setLoadingHistory(true); // Reset loading state
        }

        // Use selectedRecipientRef.current in the relevance check
        function onChatMessage(message) {
            console.log('Received new message:', message);
            const currentUser = user?.name;

            const latestSelectedRecipient = selectedRecipientRef.current;

            const isBroadcastMessage = message.recipient === null || message.recipient === undefined;

             const isRelevant = (latestSelectedRecipient === '' && isBroadcastMessage) ||
                                (latestSelectedRecipient !== '' && !isBroadcastMessage &&
                                    ((message.senderName === currentUser && message.recipient === latestSelectedRecipient) ||
                                     (message.senderName === latestSelectedRecipient && message.recipient === currentUser))
                                );

            if (isRelevant) {
                setMessages(previousMessages => [...previousMessages, message]);
            } else {
                 console.log(`Received message for a different conversation (Selected: ${latestSelectedRecipient}, Message: ${message.senderName} -> ${message.recipient || 'everyone'}).`);
            }
        }

        // Handle message history (includes media)
        function onMessageHistory(historyMessages) {
            console.log('Received message history:', historyMessages);
            setMessages(historyMessages);
            setLoadingHistory(false);
        }

        // Handle user list updates and check selected recipient status
        function onUserList(users) {
            console.log('Received user list:', users);
            const filteredUsers = users.filter(userName => userName !== user?.name);

            if (user?.name && selectedRecipientRef.current !== '') {
                 if (!users.includes(selectedRecipientRef.current)) {
                     console.log(`Selected recipient "${selectedRecipientRef.current}" went offline. Switching to Everyone chat.`);
                     handleSelectEveryone(); // Call the handler to switch view and fetch history
                 }
            }
            setOnlineUserList(filteredUsers);
        }

        // Handle incoming past conversations list
        function onPastConversations(conversations){
            console.log('Received past conversations:', conversations);
            const filteredConversations = conversations.filter(userName => userName !== user?.name);
            setPastConversations(filteredConversations);

            // Initial Chat Selection Logic: Load history if messages are empty on connect/load
            if (socket.connected && messages.length === 0 && user?.name) {
                console.log(`Initial state/Reconnect: Fetching history for ${selectedRecipientRef.current || 'Everyone'}`);
                setLoadingHistory(true);
                socket.emit('get_messages', selectedRecipient);
            }
        }

        function onError(error) {
            console.error('Socket Error:', error);
            alert(`Socket error: ${error}`);
            setLoadingHistory(false);
        }

        // NEW: Handle message deleted event
        function onMessageDeleted({ messageId }) {
             console.log(`Received message_deleted event for ID: ${messageId}`);
             // Remove the message from the state if it exists
             setMessages(prevMessages => prevMessages.filter(msg => msg._id !== messageId));
        }


        // Connection logic
        if (user?.name && !socket.connected) {
             console.log(`Attempting to connect socket with username: ${user.name}`);
             socket.auth = { username: user.name };
             socket.connect();
        } else if (!user?.name && socket.connected) {
            console.log('User logged out, disconnecting socket.');
            socket.disconnect();
        } else if (!user?.name && !socket.connected) {
             console.log('No user logged in and socket not connected. Initial state.');
             setIsConnected(false);
             setMessages([]);
             setOnlineUserList([]);
             setSelectedRecipient('');
             selectedRecipientRef.current = '';
             setPastConversations([]);
             setLoadingHistory(false);
        }


        // Register listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('chat message', onChatMessage);
        socket.on('message_history', onMessageHistory);
        socket.on('users', onUserList);
        socket.on('past_conversations', onPastConversations);
        socket.on('error', onError);
        socket.on('message_deleted', onMessageDeleted); // Register the new listener

        // Cleanup listeners
        return () => {
            console.log('Cleaning up socket listeners...');
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('chat message', onChatMessage);
            socket.off('message_history', onMessageHistory);
            socket.off('users', onUserList);
            socket.off('past_conversations', onPastConversations);
            socket.off('error', onError);
            socket.off('message_deleted', onMessageDeleted); // Clean up the new listener
        };
    }, [user, selectedRecipient]); // Keep dependencies minimal

    // --- User Interface Actions ---

    const handleLogout = () => {
        logout();
        setSelectedRecipient('');
        selectedRecipientRef.current = '';
        setMessages([]);
        setLoadingHistory(true);
    };

    const handleSendMessage = (event) => {
        event.preventDefault();
        const trimmedValue = inputValue.trim();

        if (trimmedValue && socket.connected && user?.name) {
            const messageData = {
                text: trimmedValue,
                recipient: selectedRecipient || null,
                media: []
            };
            console.log('Sending text message via socket:', messageData);
            socket.emit('send_message', messageData);
            setInputValue('');
        } else if (!trimmedValue) {
             console.log("Attempted to send empty text message.");
        } else if (!socket.connected || !user?.name) {
             console.warn("Cannot send message: Socket not connected or user not logged in.");
        }
    };

     const handleMediaUpload = async (files) => {
         if (!user?.name || !isConnected) {
            alert('You must be logged in and connected to upload files.');
            return;
        }
        if (!files || files.length === 0) {
            console.log("No files selected for upload.");
            return;
        }

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
             formData.append('media', files[i]);
        }

        try {
            const apiUrl = import.meta.env.VITE_API_URL;
             if (!apiUrl) {
                console.error("VITE_API_URL is not defined");
                alert("Configuration error: API URL not set.");
                return;
             }

            console.log(`Uploading ${files.length} file(s) to ${apiUrl}/media/upload`);
            const response = await fetch(`${apiUrl}/media/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 console.error('Upload API Error:', errorData);
                throw new Error(errorData.error || response.statusText || 'File upload failed.');
            }

            const data = await response.json();
            console.log('Upload successful, received data:', data);
            const uploadedFilesInfo = data.files;

            if (socket.connected) {
                 const currentText = inputValue.trim();

                 if (!uploadedFilesInfo || uploadedFilesInfo.length === 0) {
                     console.warn("Upload successful but no file info returned. Not sending message.");
                     alert("Upload failed or no files processed by server.");
                     return;
                 }

                const messageData = {
                    text: currentText || '',
                    recipient: selectedRecipient || null,
                    media: uploadedFilesInfo,
                };
                console.log('Sending socket message after upload:', messageData);
                socket.emit('send_message', messageData);

                setInputValue('');
            } else {
                console.error('Socket not connected, cannot send message after upload.');
                alert('File(s) uploaded, but could not send chat message. Socket is disconnected.');
            }

        } catch (error) {
            console.error('Error uploading file(s):', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
           // Cleanup is handled by the MediaUpload component
        }
     };


    const handleConversationSelect = (userName) => {
        console.log('Selecting conversation with:', userName);
        if (selectedRecipient !== userName && socket.connected && user?.name) {
            setSelectedRecipient(userName);
            setMessages([]);
            setLoadingHistory(true);
            console.log(`Requesting history for ${userName}`);
            socket.emit('get_messages', userName);
            setInputValue('');
        } else if (!socket.connected) {
            console.warn('Socket not connected, cannot switch conversation.');
        }
    };

    const handleSelectEveryone = () => {
        console.log('Selecting broadcast chat.');
        const needsLoading = selectedRecipient === '' && messages.length === 0;

        if (selectedRecipient !== '' || needsLoading) {
             if (socket.connected && user?.name) {
                 setSelectedRecipient('');
                 setMessages([]);
                 setLoadingHistory(true);
                 console.log(`Requesting history for broadcast chat`);
                 socket.emit('get_messages', '');
                 setInputValue('');
             } else if (!socket.connected) {
                 console.warn('Socket not connected, cannot switch to broadcast chat.');
             }
        } else {
             console.log("Already on broadcast chat, no action needed.");
        }
    };

    // NEW: Function to handle message deletion initiated by the current user
    const handleDeleteMessage = async (messageId) => {
        if (!user?.name || !isConnected) {
            alert('You must be logged in and connected to delete messages.');
            return;
        }

        // Confirmation before deleting
        const isConfirmed = window.confirm('Are you sure you want to delete this message?');
        if (!isConfirmed) {
            return; // Abort deletion if not confirmed
        }

        try {
            const apiUrl = import.meta.env.VITE_API_URL;
             if (!apiUrl) {
                console.error("VITE_API_URL is not defined");
                alert("Configuration error: API URL not set.");
                return;
             }

            console.log(`Deleting message with ID: ${messageId}`);
            const response = await fetch(`${apiUrl}/messages/${messageId}`, { // Use the new DELETE endpoint
                method: 'DELETE',
                credentials: 'include', // Include cookies for authentication
            });

            const responseData = await response.json(); // Always try to parse JSON for error messages

            if (!response.ok) {
                console.error('Delete API Error:', responseData);
                // Display specific error message from backend if available
                throw new Error(responseData.error || response.statusText || 'Failed to delete message.');
            }

            console.log('Message deleted successfully:', responseData);

            // IMPORTANT: Remove the message from the local state immediately
            // This updates the UI instantly for the user who initiated the delete
            setMessages(prevMessages => prevMessages.filter(msg => msg._id !== messageId));

            // Emit socket event to notify other users in the conversation in real-time
            if (socket.connected) {
                 socket.emit('message_deleted', { messageId });
            } else {
                console.warn('Socket not connected, could not broadcast deletion.');
                // Message is deleted on this client, but others won't see it removed in real-time
            }

        } catch (error) {
            console.error('Error deleting message:', error);
            alert(`Failed to delete message: ${error.message}`);
        }
    };


    const allConversations = [
        ...new Set([...pastConversations, ...onlineUserList])
    ].filter(userName => userName !== user?.name);


    const filteredConversations = allConversations.filter(userName =>
        userName.toLowerCase().includes(searchText.toLowerCase())
    );

    const isUserOnline = (userName) => onlineUserList.includes(userName);

    const getDummyAvatar = (name) => {
        const initial = name ? name.charAt(0).toUpperCase() : '?';
        let hash = 0;
        if (name) {
            for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
        }
        const color = Math.floor(Math.abs((hash % 0xFFF) / 0xFFF) * 16777215).toString(16);
        const paddedColor = '0'.repeat(6 - color.length) + color;
        return `https://via.placeholder.com/40/${paddedColor}/ffffff?text=${initial}`;
    };

    const currentChatPartnerName = selectedRecipient === '' ? 'Everyone' : selectedRecipient;
    const currentChatPartnerAvatar = selectedRecipient === ''
        ? "https://via.placeholder.com/40/cccccc/ffffff?text=All"
        : getDummyAvatar(selectedRecipient);

    return (
        <div className="chat-page-container">
            <header className="app-header-top">
                <div className="header-app-title">ChatApp</div>
                <div className="header-actions">
                    {user?.isAdmin && <span className="admin-indicator">admin</span>}
                    {user ? (
                        <>
                            <span className="logged-in-user-name">{user.name}</span>
                            <span className={`connection-status ${isConnected ? 'online' : 'offline'}`}>
                                {isConnected ? 'Online' : 'Offline'}
                            </span>
                            <button className="header-button" onClick={handleLogout}>Logout</button>
                        </>
                    ) : null}
                </div>
            </header>

            <div className="chat-content-area">
                <aside className="chat-sidebar">
                     {user && (
                         <div className="search-container">
                            <input
                                type="text"
                                placeholder="Search users or conversations"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                disabled={!isConnected}
                            />
                         </div>
                     )}

                    {isConnected && user && (
                        <div
                            className={`conversation-item ${selectedRecipient === '' ? 'selected' : ''}`}
                            onClick={handleSelectEveryone}
                        >
                            <img src="https://via.placeholder.com/40/cccccc/ffffff?text=All" alt="Everyone" className="avatar" />
                            <div className="conversation-info">
                                <span className="conversation-name">Everyone</span>
                            </div>
                        </div>
                    )}

                   {user && filteredConversations.map(conversation => (
                        <div
                            key={conversation}
                            className={`conversation-item ${selectedRecipient === conversation ? 'selected' : ''}`}
                            onClick={() => handleConversationSelect(conversation)}
                        >
                            <img src={getDummyAvatar(conversation)} alt={conversation} className="avatar" />
                            <div className="conversation-info">
                                <span className="conversation-name">{conversation}</span>
                                {isConnected && (
                                     <span className={`status-indicator ${isUserOnline(conversation) ? 'online' : 'offline'}`}></span>
                                )}
                            </div>
                        </div>
                    ))}

                    {!user && (
                        <div className="sidebar-message">Log in to see conversations.</div>
                    )}
                    {user && !isConnected && (
                        <div className="sidebar-message">Connecting to chat...</div>
                    )}
                     {user && isConnected && filteredConversations.length === 0 && searchText === '' && pastConversations.length === 0 && (
                         <div className="sidebar-message">No private conversations yet.<br/>Start by chatting with 'Everyone' or searching for a user.</div>
                     )}
                     {user && isConnected && searchText !== '' && filteredConversations.length === 0 && (
                        <div className="sidebar-message">No users or conversations found matching "{searchText}".</div>
                    )}

                </aside>

                <main className="chat-main">
                    {/* Chat Header */}
                    {user ? (
                        <div className="chat-header-main">
                            <img src={currentChatPartnerAvatar} alt={currentChatPartnerName} className="avatar" />
                            <h3>{currentChatPartnerName}</h3>
                            {selectedRecipient !== '' && isConnected && (
                                 <span className={`status-indicator large ${isUserOnline(selectedRecipient) ? 'online' : 'offline'}`}></span>
                            )}
                        </div>
                    ) : (
                        <div className="chat-header-main">
                            <h3>Login to chat</h3>
                        </div>
                    )}

                    {/* Messages Display Area */}
                    <div className="messages-area-main">
                        {user && loadingHistory && (
                             <div className="chatting-with-indicator">
                                Loading messages...
                            </div>
                        )}
                         {user && !loadingHistory && messages.length === 0 && (
                            <div className="chatting-with-indicator">
                                {selectedRecipient === ''
                                    ? 'Welcome to the broadcast chat! Messages sent here are visible to everyone online.'
                                    : `This is the start of your conversation with ${selectedRecipient}. Say hello!`
                                }
                            </div>
                         )}

                        {user && messages.map((msg, index) => (
                             // Add a class to the message div for positioning the delete icon
                            <div
                                key={msg._id || index}
                                className={`message ${msg.senderName === user?.name ? 'my-message' : 'other-message'}`}
                            >
                                {/* Display delete button/icon only for messages sent by the current user */}
                                {user?.name && msg.senderName === user.name && msg._id && (
                                     <button
                                         className="delete-message-button"
                                         onClick={() => handleDeleteMessage(msg._id)}
                                         title="Delete Message"
                                     >
                                        {/* Basic Trash Can SVG Icon */}
                                         <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#888888"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z"/></svg>
                                     </button>
                                )}

                                 <span className="message-sender">
                                    {msg.senderName === user?.name ? 'You' : msg.senderName || 'Unknown'}
                                    {msg.recipient !== null && (
                                        msg.senderName === user?.name
                                            ? (msg.recipient ? ` (to ${msg.recipient})` : ' (private)')
                                            : (msg.recipient === user?.name ? ' (to You)' : ` (to ${msg.recipient})`)
                                    )}
                                    :
                                </span>

                                {msg.media && msg.media.length > 0 && (
                                     <MediaMessage media={msg.media} />
                                )}

                                {msg.text && <span className="message-text">{msg.text}</span>}

                                {msg.timestamp && (
                                    <span className="message-timestamp">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input Area */}
                    {isConnected && user ? (
                        <form onSubmit={handleSendMessage} className="message-input-area">
                            <MediaUpload
                                onUpload={handleMediaUpload}
                                isDisabled={!isConnected || !user || loadingHistory}
                            />

                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={selectedRecipient === '' ? "Type a broadcast message..." : `Message ${selectedRecipient}...`}
                                disabled={!isConnected || !user || loadingHistory}
                            />
                            <button
                                type="submit"
                                disabled={!isConnected || !user || loadingHistory || !inputValue.trim()}
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