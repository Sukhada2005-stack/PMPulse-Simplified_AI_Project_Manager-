import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lock, AlertCircle, ArrowRight } from 'lucide-react';

export default function SetPassword() {
  const { user, updateUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.changePassword(newPassword);
      // Immediately update local state so App.jsx routes to Dashboard
      updateUser({ is_first_login: 0 });
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-dark)' }}>
      <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-[rgba(238,178,13,0.1)] relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'var(--accent-gold)' }}></div>

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[rgba(238,178,13,0.1)]">
            <Lock className="w-8 h-8 text-[var(--accent-gold)]" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-2">Set Permanent Password</h2>
        <p className="text-center text-gray-400 text-sm mb-8">
          Welcome, {user?.full_name}! For security reasons, you must change your temporary password before accessing your dashboard.
        </p>

        {error && (
          <div className="mb-6 p-3 rounded bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              required
              className="w-full glass-input px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-gold)]"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              type="password"
              required
              className="w-full glass-input px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--accent-gold)]"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-2.5 px-4 bg-[var(--accent-gold)] hover:bg-[#d6a00a] text-black font-semibold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? 'Securing Account...' : 'Set Password & Continue'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
