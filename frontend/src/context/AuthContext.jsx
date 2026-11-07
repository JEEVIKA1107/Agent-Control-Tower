import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage and verify /api/auth/me
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('act_token');
      const storedUser = localStorage.getItem('act_user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify with server
          const response = await api.get('/auth/me');
          if (response.data.success) {
            setUser(response.data.user);
            localStorage.setItem('act_user', JSON.stringify(response.data.user));
            initSocket(storedToken);
          }
        } catch (error) {
          console.warn('[Auth] Session validation failed:', error.message);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.success) {
      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('act_token', newToken);
      localStorage.setItem('act_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      initSocket(newToken);
      return { success: true, user: newUser };
    }
    return { success: false, message: response.data.message };
  };

  const logout = () => {
    localStorage.removeItem('act_token');
    localStorage.removeItem('act_user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Admin',
    isOperator: user?.role === 'Admin' || user?.role === 'Operator',
    isViewer: user?.role === 'Viewer',
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
