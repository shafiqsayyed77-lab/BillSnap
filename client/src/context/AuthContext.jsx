/**
 * Authentication Context (AuthContext.jsx)
 * -----------------------------------------
 * Manages global user authentication state, token persistence in localStorage,
 * login, signup, profile updates, and session expiration.
 * 
 * Beginner Concept:
 * React Context allows any component anywhere in our component tree to read
 * the current user profile or call login/logout without passing props down manually.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('billsnap_token'));
  const [loading, setLoading] = useState(true);

  // Initialize and verify user on application mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('billsnap_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch (err) {
          console.warn('⚠️ [AuthContext] Stored session is invalid or expired:', err.message);
          localStorage.removeItem('billsnap_token');
          localStorage.removeItem('billsnap_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Log in user with email and password
   */
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('billsnap_token', receivedToken);
      localStorage.setItem('billsnap_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true, user: receivedUser };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, error: errorMsg };
    }
  };

  /**
   * Set authenticated session directly (used by Passkey login)
   */
  const setAuthenticatedSession = (receivedToken, receivedUser) => {
    localStorage.setItem('billsnap_token', receivedToken);
    localStorage.setItem('billsnap_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
  };

  /**
   * Register a new user
   */
  const signup = async (name, email, password, monthlyBudget = 20000) => {
    try {
      const res = await api.post('/auth/signup', {
        name,
        email,
        password,
        monthlyBudget,
      });
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('billsnap_token', receivedToken);
      localStorage.setItem('billsnap_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true, user: receivedUser };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, error: errorMsg };
    }
  };

  /**
   * Log out and clear stored session
   */
  const logout = () => {
    localStorage.removeItem('billsnap_token');
    localStorage.removeItem('billsnap_user');
    setToken(null);
    setUser(null);
  };

  /**
   * Refresh current user profile from server
   */
  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  /**
   * Update local user state (e.g. after budget change)
   */
  const updateUserLocally = (updatedFields) => {
    setUser((prev) => ({ ...prev, ...updatedFields }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        signup,
        logout,
        refreshUser,
        updateUserLocally,
        setAuthenticatedSession,
      }}
    >
      {children}
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

export default AuthContext;
