import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import '../css/chat.css';
import { useAuth } from '../context/AuthContext';
import UserSearch from '../components/UserSearch.jsx';

function Home() {
    const [selectedRecipient, setSelectedRecipient] = useState('');
    const { user, logout } = useAuth();
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [messages, setMessages] = useState(() => {
        const storedMessages = localStorage.getItem('chatMessages')
        return storedMessages ? JSON.parse(storedMessages) : [];
    });
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);
    const [onlineUserList, setOnlineUserList] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [pastConversations, setPastConversations] = useState([]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        function onConnect() {
            console.log('Connected to socket server!');
            setIsConnected(true);
            socket.emit('getUsers');
            handleSelectEveryone();
        }

        function onDisconnect() {
            console.log('Disconnected from socket server.');
            setIsConnected(false);
            setOnlineUserList([]);
            setMessages([]);
            setSelectedRecipient('');
            setPastConversations([]);
        }

        function onChatMessage(message) {
            console.log('Received new message:', message);

            const currentUser = user?.name;
            const isBroadcast = !message.private || message.recipient === null;

            if (selectedRecipient === '' && isBroadcast) {
                setMessages(previousMessages => [...previousMessages, message]);
            } else if (selectedRecipient !== '' && message.private) {
                if (
                    (message.senderName === currentUser && message.recipient === selectedRecipient) ||
                    (message.senderName === selectedRecipient && message.recipient === currentUser)
                ) {
                    setMessages(previousMessages => [...previousMessages, message]);
                }
            } else {
                console.log(`Received message for a different conversation (Selected: ${selectedRecipient}, Message: ${message.senderName} -> ${message.recipient || 'everyone'}). Ignoring for current view.`);
            }
        }

        function onMessageHistory(historyMessages) {
            console.log('Received message history/initial messages:', historyMessages);
            setMessages(historyMessages);
            setLoadingHistory(false);
        }

        function onUserList(users) {
            console.log('Received user list:', users);
            const filteredUsers = users.filter(userName => userName !== (user ? user.name : null));
            setOnlineUserList(filteredUsers);
        }

        function onPastConversations(conversations){
            console.log('Received past conversations:', conversations);
            setPastConversations(conversations);
        }

        function onError(error) {
            console.error('Socket Error:', error);
            alert(`Socket error: ${error}`);
            setLoadingHistory(false);
        }

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
            setOnlineUserList([]);
            setSelectedRecipient('');
            setPastConversations([]);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('chat message', onChatMessage);
        socket.on('message_history', onMessageHistory);
        socket.on('users', onUserList);
        socket.on('past_conversations', onPastConversations);
        socket.on('error', onError);

        return () => {
            console.log('Cleaning up socket listeners...');
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('chat message', onChatMessage);
            socket.off('message_history', onMessageHistory);
            socket.off('users', onUserList);
            socket.off('past_conversations', onPastConversations);
            socket.off('error', onError);

            if (socket.connected && !user?.name) {
                console.log('Disconnecting socket due to logout/user change.');
                socket.disconnect();
            }
        };
    }, [user, selectedRecipient]);

    useEffect(() => {
        if (isConnected && user?.name) {
            socket.emit('getUsers');
        }
    }, [isConnected, user]);

    useEffect(() => {
        // Store messages in local storage whenever it changes
        localStorage.setItem('chatMessages', JSON.stringify(messages));
    }, [messages]);


    const handleLogout = () => {
        logout();
    };

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

    const handleConversationSelect = (userName) => {
        console.log('Selecting conversation with:', userName);
        if (selectedRecipient !== userName) {
            setSelectedRecipient(userName);
            setMessages([]);
            setLoadingHistory(true);
            if (socket.connected) {
                socket.emit('get_messages', userName);
            } else {
                console.warn('Socket not connected, cannot fetch messages.');
            }
        }
    };

    const handleSelectEveryone = () => {
        console.log('Selecting broadcast chat.');
        if (selectedRecipient !== '') {
            setSelectedRecipient('');
            setMessages([]);
            setLoadingHistory(true);
            if (socket.connected) {
                socket.emit('get_messages', '');
            } else {
                console.warn('Socket not connected, cannot fetch messages.');
            }
        } else if (selectedRecipient === '' && messages.length === 0) {
            setLoadingHistory(true);
            if (socket.connected) {
                socket.emit('get_messages', '');
            }
        }
    };

    // Combine past conversations and online users, removing duplicates
    const allConversations = [...new Set([...pastConversations, ...onlineUserList])];

    const filteredConversations = allConversations.filter(userName =>
        userName.toLowerCase().includes(searchText.toLowerCase())
    );

    const getDummyAvatar = (name) => {
        const initial = name ? name.charAt(0).toUpperCase() : '?';
        const colorHash = name ? name.charCodeAt(0) * 10 % 900 : 0;
        return `https://via.placeholder.com/40/${colorHash}/ffffff?text=${initial}`;
    };

    const currentChatPartnerName = selectedRecipient === '' ? 'Everyone' : selectedRecipient;
    const currentChatPartnerAvatar = selectedRecipient === '' ? "https://via.placeholder.com/40/cccccc/ffffff?text=All" : getDummyAvatar(selectedRecipient);

    return (
        <div className="chat-page-container">
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

            <div className="chat-content-area">
                <aside className="chat-sidebar">
                    {/* Pass handleConversationSelect to UserSearch */}
                    <UserSearch onSelectUser={handleConversationSelect} />

                    {isConnected && user && (
                        <div
                            className={`conversation-item ${selectedRecipient === '' ? 'selected' : ''}`}
                            onClick={handleSelectEveryone}
                        >
                            <img src="https://via.placeholder.com/40/cccccc/ffffff?text=All" alt="Everyone" className="avatar" />
                            <span>Everyone</span>
                        </div>
                    )}

                   {user && filteredConversations.map(conversation => (
                        <div
                            key={conversation}
                            className={`conversation-item ${selectedRecipient === conversation ? 'selected' : ''}`}
                            onClick={() => handleConversationSelect(conversation)}
                        >
                            <img src={getDummyAvatar(conversation)} alt={conversation} className="avatar" />
                            <span>{conversation}</span>
                        </div>
                    ))}

                    {!user && (
                        <div className="sidebar-message">Log in to see conversations.</div>
                    )}
                    {user && !isConnected && (
                        <div className="sidebar-message">Connecting to chat...</div>
                    )}
                    {user && filteredConversations.length === 0 && searchText === '' && (
                        <div className="sidebar-message">No conversations yet.</div>
                    )}
                    {user && searchText !== '' && filteredConversations.length === 0 && (
                        <div className="sidebar-message">No users found for "{searchText}"</div>
                    )}

                </aside>

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

                    <div className="messages-area-main">
                        {user && (
                            <div className="chatting-with-indicator">
                                {selectedRecipient === '' ? 'You are in the broadcast chat.' : `You are chatting with ${selectedRecipient}.`}
                                {loadingHistory && ' Loading history...'}
                            </div>
                        )}

                        {user && messages.map((msg, index) => (
                            <div
                                key={msg._id || index}
                                className={`message ${msg.senderName === (user ? user.name : null) ? 'my-message' : 'other-message'}`}
                            >
                                <span className="message-sender">
                                    {msg.senderName === (user ? user.name : null) ? 'You' : msg.senderName || 'Unknown'}
                                    {msg.private && (
                                        msg.senderName === (user ? user.name : null)
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

                    {isConnected && user ? (
                        <form onSubmit={handleSendMessage} className="message-input-area">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={selectedRecipient === '' ? "Type a broadcast message..." : `Message ${selectedRecipient}...`}
                                disabled={!isConnected || !user || loadingHistory}
                            />
                            <button
                                type="submit"
                                disabled={!isConnected || !inputValue.trim() || !user || loadingHistory}
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