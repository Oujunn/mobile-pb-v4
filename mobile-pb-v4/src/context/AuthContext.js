/*
|--------------------------------------------------------------------------
| Auth Context
|--------------------------------------------------------------------------
| Global authentication state management for the mobile app.
*/

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
  fetchUserProfileFromDB2,
  subscribeUserProfile,
  updateStoredUser,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  // Listen to profile updates in real time whenever user is logged in
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeUserProfile(user.id, (freshUser) => {
      if (freshUser) {
        setUser((prev) => {
          if (!prev || JSON.stringify(prev) !== JSON.stringify(freshUser)) {
            updateStoredUser(freshUser);
            return freshUser;
          }
          return prev;
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user?.id]);

  async function loadUser() {
    try {
      let storedUser = await getCurrentUser();
      if (storedUser && storedUser.id) {
        // Real-time synchronization with Firebase DB2
        try {
          const freshUser = await fetchUserProfileFromDB2(storedUser.id);
          if (freshUser) {
            storedUser = freshUser;
            await updateStoredUser(storedUser);
          }
        } catch (syncErr) {
          console.warn('Sync user error:', syncErr);
        }
      }
      setUser(storedUser);
    } catch (e) {
      console.error('Load user error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshUser() {
    if (!user?.id) return null;
    try {
      const freshUser = await fetchUserProfileFromDB2(user.id);
      if (freshUser) {
        await updateStoredUser(freshUser);
        setUser(freshUser);
        return freshUser;
      }
    } catch (e) {
      console.warn('Refresh user error:', e);
    }
    return user;
  }

  async function login(email, password) {
    const userData = await loginUser(email, password);
    setUser(userData);
    return userData;
  }

  async function register(name, email, phone, password) {
    const userData = await registerUser(name, email, phone, password);
    return userData;
  }

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loggingOutUser, setLoggingOutUser] = useState(null);

  async function updateUser(updates) {
    const updated = await updateUserProfile(user?.id, updates);
    setUser(updated);
    return updated;
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  function startLogout() {
    if (isLoggingOut) return;
    setLoggingOutUser(user);
    setIsLoggingOut(true);
  }

  async function finalizeLogout() {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Error clearing storage on logout:', e);
    } finally {
      setUser(null);
      setIsLoggingOut(false);
      setLoggingOutUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        updateUser,
        logout,
        refreshUser,
        isLoggingOut,
        loggingOutUser,
        startLogout,
        finalizeLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
