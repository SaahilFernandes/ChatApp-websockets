import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode'; // Corrected import

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Will store decoded user info: { id, name, email, etc. }
  const [token, setToken] = useState(localStorage.getItem('accessToken'));

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      try {
        const decodedUser = jwtDecode(storedToken); // Decode the token
        // Optional: Check token expiration (decodedUser.exp * 1000 < Date.now())
        // If expired, clear localStorage and setUser(null)
        setUser({
          id: decodedUser.userId, // Assuming your JWT payload has userId
          name: decodedUser.name,   // Assuming your JWT payload has name
          email: decodedUser.email  // Assuming your JWT payload has email
        });
        setToken(storedToken);
      } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem('accessToken');
        setUser(null);
        setToken(null);
      }
    }
  }, []); // Runs once on component mount

  const login = (newToken) => {
    localStorage.setItem('accessToken', newToken);
    try {
      const decodedUser = jwtDecode(newToken);
      setUser({
        id: decodedUser.userId,
        name: decodedUser.name,
        email: decodedUser.email
      });
      setToken(newToken);
    } catch (error) {
      console.error("Error decoding token on login:", error);
      // Handle error, maybe clear token and user
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setToken(null);
    // Potentially redirect to login page
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};