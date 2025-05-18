import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the Auth context
const AuthContext = createContext();

// Create a provider component for the Auth context
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for stored token on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  // Login function
  const login = (token, userData = null) => {
    // If userData is not provided, extract it from the JWT (simplified approach)
    let user = userData;
    
    if (!user && token) {
      try {
        // Extract user info from token (basic implementation)
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        user = {
          name: tokenPayload.name,
          userId: tokenPayload.userId
        };
      } catch (error) {
        console.error('Failed to decode token payload:', error);
      }
    }
    
    if (user) {
      // Store token and user info in local storage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update state
      setToken(token);
      setUser(user);
    }
  };

  // Logout function
  const logout = () => {
    // Remove token and user info from local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Update state
    setToken(null);
    setUser(null);
  };

  // Context value
  const contextValue = {
    user,
    token,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the Auth context
export function useAuth() {
  return useContext(AuthContext);
}