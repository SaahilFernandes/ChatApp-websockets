import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../css/styles.css';

function UserSearch({ onSelectUser }) { // Add onSelectUser prop
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const { user, token } = useAuth();

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await fetch(`/api/users/search?query=${searchTerm}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error('Error searching users:', error);
            setSearchResults([]);
            alert('Failed to search users. Please try again.');
        }
    };

    const handleUserSelect = (selectedUser) => {
        onSelectUser(selectedUser.name); // Call the function in Home.js
    };

    return (
        <div className="user-search-container">
            <div className="search-input-area">
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button onClick={handleSearch}>Search</button>
            </div>

            <div className="search-results-area">
                {searchResults.length > 0 ? (
                    <ul>
                        {searchResults.map(user => (
                            <li key={user._id} onClick={() => handleUserSelect(user)}>
                                {user.name} ({user.email})
                            </li>
                        ))}
                    </ul>
                ) : (
                    searchTerm.trim() && <p>No users found matching "{searchTerm}".</p>
                )}
            </div>
        </div>
    );
}

export default UserSearch;