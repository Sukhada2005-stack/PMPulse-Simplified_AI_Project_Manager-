import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pulsepm_token') || null);
  const [user, setUser] = useState(null);
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

  // Initialize session or validate existing session on app boot
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('pulsepm_token');

      if (savedToken) {
        try {
          const res = await api.auth.getMe();
          if (res?.user) {
            setUser(res.user);
            setToken(savedToken);
            setSessionExpired(false);
            localStorage.setItem('pulsepm_user', JSON.stringify(res.user));
          } else {
            throw new Error('User not found');
          }
        } catch (err) {
          console.warn('Initial session validation failed (fresh request or server restart):', err);
          // When a server is freshly hosted or a fresh request is made with an invalid/expired token,
          // cleanly clear session and direct user to login home page without session expired modal.
          localStorage.removeItem('pulsepm_token');
          localStorage.removeItem('pulsepm_user');
          setToken(null);
          setUser(null);
          setSessionExpired(false);
        }
      } else {
        // No saved token (fresh request / unauthenticated)
        localStorage.removeItem('pulsepm_token');
        localStorage.removeItem('pulsepm_user');
        setToken(null);
        setUser(null);
        setSessionExpired(false);
      }

      await fetchAllUsers();
      setLoading(false);
    };
    initAuth();
  }, []);

  // Inactivity Timer (1 hour = 3600000 ms)
  // Only triggers when the application is actively open and an established session exists,
  // but the user is not interacting with it.
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    let timeoutId;

    const expireSession = () => {
      console.warn('Session expired due to inactivity while application was open');
      localStorage.removeItem('pulsepm_token');
      setToken(null);
      setSessionExpired(true);
      window.dispatchEvent(new CustomEvent('session_expired'));
    };

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      clearTimeout(timeoutId);
      if (token && user && !loading) {
        timeoutId = setTimeout(expireSession, 3600000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && token && user && !loading) {
        const inactiveDuration = Date.now() - lastActivityRef.current;
        if (inactiveDuration >= 3600000) {
          expireSession();
        } else {
          resetTimer();
        }
      }
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handleActivity = () => resetTimer();

    if (token && user && !loading) {
      events.forEach(event => window.addEventListener(event, handleActivity));
      document.addEventListener('visibilitychange', handleVisibilityChange);
      resetTimer(); // Initialize timer for the established active session
    }

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, user, loading]);

  const loginAsDefaultPM = async () => {
    try {
      const res = await api.auth.login('alex.mercer@pulsepm.internal', 'password123');
      localStorage.setItem('pulsepm_token', res.token);
      localStorage.setItem('pulsepm_user', JSON.stringify(res.user));
      localStorage.setItem('pmpulse_active_tab', 'other_workspaces');
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
      localStorage.setItem('pmpulse_active_tab', res.user?.user_type === 'pm' ? 'other_workspaces' : (res.user?.user_type === 'superuser' ? 'superuser_hub' : 'employee_dash'));
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
      if (res.user?.user_type === 'pm') {
        localStorage.setItem('pmpulse_active_tab', 'other_workspaces');
      }
      setToken(res.token);
      setUser(res.user);
      setSessionExpired(false);
    }
    return res;
  };

  const completeLogin = (tokenData, userData) => {
    localStorage.setItem('pulsepm_token', tokenData);
    localStorage.setItem('pulsepm_user', JSON.stringify(userData));
    if (userData?.user_type === 'pm') {
      localStorage.setItem('pmpulse_active_tab', 'other_workspaces');
    }
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
