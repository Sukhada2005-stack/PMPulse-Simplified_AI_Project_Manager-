import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pulsepm_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('pulsepm_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Load all users for quick demo role switcher
  const fetchAllUsers = async () => {
    try {
      const data = await api.auth.getUsers();
      setAllUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load user roster:', err);
    }
  };

  // Initialize session or validate existing session
  useEffect(() => {
    const initAuth = async () => {
      await fetchAllUsers();
      const savedToken = localStorage.getItem('pulsepm_token');
      const savedUser = localStorage.getItem('pulsepm_user');

      if (savedToken) {
        try {
          const res = await api.auth.getMe();
          if (res?.user) {
            setUser(res.user);
            setToken(savedToken);
            setSessionExpired(false);
            localStorage.setItem('pulsepm_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('Session expired or inactive on refresh:', err);
          localStorage.removeItem('pulsepm_token');
          setToken(null);
          setSessionExpired(true);
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch {}
          }
          window.dispatchEvent(new CustomEvent('session_expired'));
        }
      } else if (savedUser) {
        // User was previously logged in, but token has expired/cleared
        setToken(null);
        setSessionExpired(true);
        window.dispatchEvent(new CustomEvent('session_expired'));
      }

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
          setToken(null);
          setSessionExpired(true);
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
      setSessionExpired(false);
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
      localStorage.removeItem('pmpulse_active_workspace');
      localStorage.setItem('pmpulse_active_tab', 'dashboard');
      setToken(res.token);
      setUser(res.user);
      setSessionExpired(false);
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
      setSessionExpired(false);
    }
    return res;
  };

  const completeLogin = (tokenData, userData) => {
    localStorage.setItem('pulsepm_token', tokenData);
    localStorage.setItem('pulsepm_user', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
    setSessionExpired(false);
  };

  const logout = () => {
    localStorage.removeItem('pulsepm_token');
    localStorage.removeItem('pulsepm_user');
    localStorage.removeItem('pmpulse_active_workspace');
    localStorage.removeItem('pmpulse_active_tab');
    localStorage.removeItem('pmpulse_active_view');
    localStorage.removeItem('pmpulse_selected_project_id');
    localStorage.removeItem('pmpulse_selected_360_employee_id');
    setToken(null);
    setUser(null);
    setSessionExpired(false);
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
      sessionExpired,
      setSessionExpired,
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
