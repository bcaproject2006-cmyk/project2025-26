// src/context/AuthContext.jsx
import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Mock user – replace with real auth logic
  const [user, setUser] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '9876543210',
  });

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};