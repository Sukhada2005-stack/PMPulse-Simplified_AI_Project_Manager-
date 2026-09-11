import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('pulsepm_token') || null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load all users for quick demo role switcher
  const fetchAllUsers = async () => {
    try {
      const data = await api.auth.getUsers();
      setAllUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load user roster:', err);
    }
  };

  // Initialize session or default to PM (Alex Mercer)
  useEffect(() => {
    const initAuth = async () => {
      await fetchAllUsers();
      // TEMPORARILY DISABLED: Forcing the Landing Page to be the entry point
      // const savedToken = localStorage.getItem('pulsepm_token');
      // if (savedToken) {
      //   try {
      //     const res = await api.auth.getMe();
      //     setUser(res.user);
      //   } catch (err) {
      //     console.warn('Session expired, removing token');
      //     localStorage.removeItem('pulsepm_token');
      //     setToken(null);
      //   }
      // }

      setLoading(false);
    };
    initAuth();
  }, []);

  // Inactivity Timer (1 hour = 3600000 ms)
  useEffect(() => {
    let timeoutId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Only set timer if user is logged in
      if (token) {
        timeoutId = setTimeout(() => {
          console.warn('Session expired due to inactivity');
          localStorage.removeItem('pulsepm_token');
          window.dispatchEvent(new CustomEvent('session_expired'));
        }, 3600000);
      }
    };

    // Listen to user activity
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handleActivity = () => resetTimer();

    if (token) {
      events.forEach(event => window.addEventListener(event, handleActivity));
      resetTimer(); // Initialize timer
    }

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [token]);

  const loginAsDefaultPM = async () => {
    try {
      const res = await api.auth.login('alex.mercer@pulsepm.internal', 'password123');
      localStorage.setItem('pulsepm_token', res.token);
      localStorage.setItem('pulsepm_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    } catch (err) {
      console.error('Failed to login as default PM:', err);
    }
  };

  const switchUser = async (targetUserEmail) => {
    setLoading(true);
    try {
      const res = await api.auth.login(targetUserEmail, 'password123');
      localStorage.setItem('pulsepm_token', res.token);
      localStorage.setItem('pulsepm_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    } catch (err) {
      alert(`Could not switch user: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.auth.login(email, password);
    if (!res.requires_password_change) {
      localStorage.setItem('pulsepm_token', res.token);
      localStorage.setItem('pulsepm_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const completeLogin = (tokenData, userData) => {
    localStorage.setItem('pulsepm_token', tokenData);
    localStorage.setItem('pulsepm_user', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('pulsepm_token');
    localStorage.removeItem('pulsepm_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (newData) => {
    setUser(prev => prev ? { ...prev, ...newData } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      allUsers,
      loading,
      login,
      completeLogin,
      logout,
      switchUser,
      updateUser,
      refreshUsers: fetchAllUsers,
      isPM: user?.user_type === 'pm'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
