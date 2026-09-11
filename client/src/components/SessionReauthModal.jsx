import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SessionReauthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  
  const { user, completeLogin } = useAuth();

  useEffect(() => {
    const handleSessionExpired = () => {
      // Clear token proactively just in case
      localStorage.removeItem('pulsepm_token');
      // Show modal without page reload
      setIsOpen(true);
      setAuthError('');
      setPassword('');
      if (user?.email) {
        setEmail(user.email);
      }
    };

    window.addEventListener('session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('session_expired', handleSessionExpired);
    };
  }, [user]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthenticating(true);
    setAuthError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok) {
        // OVERRIDE generic errors with specific credential feedback
        if (response.status === 401 || response.status === 400 || data.error === 'session_expired') {
          setAuthError("Invalid email or password!");
        } else {
          setAuthError(data.message || data.error || "An error occurred during login. Please try again.");
        }
        return; // Stop execution
      }

      completeLogin(data.token, data.user);
      setIsOpen(false);
    } catch (err) {
      console.error("Login request failed:", err);
      setAuthError("Invalid email or password!"); // Fallback for network-level rejections during auth
    } finally {
      setAuthenticating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 border shadow-2xl space-y-6 animate-fade-up bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5"
      >
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'var(--accent-gold)' }}>
            <ShieldCheck className="w-6 h-6 text-[#161410]" />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-1)' }}>
            Session Expired
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
            Your session has timed out. Please enter your credentials to resume your work.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enterprise Email"
            disabled={authenticating}
            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:border-[#eeb20d] focus:ring-1 focus:ring-[#eeb20d] transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            disabled={authenticating}
            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:border-[#eeb20d] focus:ring-1 focus:ring-[#eeb20d] transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
          
          {authError && <p className="text-red-400 text-sm font-semibold text-center">{authError}</p>}

          <button
            type="submit"
            disabled={authenticating}
            className="w-full py-3 rounded-xl font-bold transition-all bg-[#eeb20d] hover:bg-[#f2b50d] text-[#161410] disabled:opacity-50"
          >
            {authenticating ? 'Authenticating...' : 'Resume Session'}
          </button>
        </form>
      </div>
    </div>
  );
}
