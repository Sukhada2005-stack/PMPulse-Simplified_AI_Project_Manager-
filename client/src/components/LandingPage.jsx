import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { 
  BrainCircuit, 
  Calendar, 
  PenTool, 
  Users, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  Sun,
  Moon,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LandingPage() {
  const { login, completeLogin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');



  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthenticating(true);
    setAuthError('');
    
    try {
      if (isFirstLogin) {
        // Submit permanent password
        const res = await api.auth.setPermanentPassword(email, password, newPassword);
        completeLogin(res.token, res.user);
      } else {
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

        if (data.requires_password_change) {
          setIsFirstLogin(true);
        } else {
          completeLogin(data.token, data.user);
        }
      }
    } catch (err) {
      console.error("Login request failed:", err);
      setAuthError("Invalid email or password!"); // Fallback for network-level rejections during auth
    } finally {
      setAuthenticating(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-300" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Viewport Height Wrapper for Navbar + Hero */}
      <div className="min-h-screen flex flex-col relative">
        {/* Navbar */}
        <nav className="w-full flex items-center justify-between p-6 max-w-7xl mx-auto border-b border-[var(--color-border)] relative z-10">
        <a href="https://www.acubeai.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img 
            src="https://www.acubeai.com/favicon-32x32.png" 
            alt="Acube AI Symbol" 
            className="w-8 h-8 object-contain"
          />
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">ACUBE AI</span>
        </a>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-slate-900" />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex-1 overflow-hidden flex flex-col items-center justify-center text-center px-6 py-12">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#eeb20d]/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#eeb20d]/20 bg-[#eeb20d]/10 text-[#eeb20d] text-sm font-bold mb-8 uppercase tracking-widest">
          <Sparkles className="w-4 h-4" />
          The New Standard of Project Execution
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 max-w-5xl leading-tight text-slate-900 dark:text-white">
          Enterprise Project Execution, <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#eeb20d] to-[#f2b50d]">Powered by AI</span>
        </h1>
        <p className="text-lg md:text-xl text-[var(--color-text-3)] max-w-2xl mb-12 font-medium">
          Eliminate manual tracking. Our intelligence engine synthesizes raw daily inputs into executive-level clarity in real time.
        </p>
        <div className="mt-8 relative animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="px-10 py-4 rounded-xl bg-[#eeb20d] hover:bg-[#f2b50d] text-[var(--navy)] font-bold text-lg transition-all shadow-[0_8px_30px_rgba(234,179,8,0.3)] hover:shadow-[0_8px_40px_rgba(234,179,8,0.4)] flex items-center gap-3"
          >
            Login <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
      </div>

      {/* Advantages Section */}
      <section className="py-24 border-t border-[var(--color-border)] px-6" style={{ background: '#0d0c0a' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-[var(--color-text-1)] mb-4">Leave Legacy Platforms Behind</h2>
            <p className="text-[var(--color-text-3)] max-w-xl mx-auto text-lg">We stripped away the noise so you can focus on building.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
                <h3 className="text-xl font-bold text-red-400 flex items-center gap-3 mb-4">
                  <XCircle className="w-6 h-6" />
                  Legacy Platforms
                </h3>
                <ul className="space-y-3 text-[#c5c4c1]">
                  <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">×</span> Complex configuration overhead</li>
                  <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">×</span> Forced sprint ceremonies</li>
                  <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">×</span> Rigid ticketing & micromanagement</li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-[#eeb20d]/20 bg-[#eeb20d]/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#eeb20d]/10 rounded-full blur-3xl"></div>
                <h3 className="text-xl font-bold text-[#eeb20d] flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                  PMPluse
                </h3>
                <ul className="space-y-3 text-[var(--color-text-1)]">
                  <li className="flex items-start gap-2"><span className="text-[#eeb20d] font-bold mt-0.5">✓</span> Frictionless daily logging</li>
                  <li className="flex items-start gap-2"><span className="text-[#eeb20d] font-bold mt-0.5">✓</span> AI-synthesized executive insights</li>
                  <li className="flex items-start gap-2"><span className="text-[#eeb20d] font-bold mt-0.5">✓</span> Continuous delivery workflow</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-[var(--color-text-1)] mb-4">The Four Pillars of Execution</h2>
          <p className="text-[var(--color-text-3)] max-w-xl mx-auto text-lg">Engineered for absolute clarity and momentum.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: BrainCircuit,
              title: 'Multi-Dimensional AI Engine',
              desc: 'Synthesizing raw text into 5 levels of executive insights, instantly uncovering risks and velocity trends.'
            },
            {
              icon: Calendar,
              title: 'Calendar Matrix Tracker',
              desc: 'A visual heatmap of progress across the entire organization, highlighting blockers before they become crises.'
            },
            {
              icon: PenTool,
              title: 'Frictionless Daily Logging',
              desc: 'The AI handles the cognitive load. Contributors spend less than a minute updating their status.'
            },
            {
              icon: Users,
              title: 'Strict Dual-Role Architecture',
              desc: 'Clean separation of concerns. PMs get high-level visibility, Contributors get undisturbed focus.'
            }
          ].map((feat, i) => (
            <div key={i} className="p-8 rounded-2xl border border-[var(--color-border)] bg-[#1a1814] hover:border-[#eeb20d]/50 transition-colors group">
              <div className="w-14 h-14 rounded-xl bg-[#eeb20d]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feat.icon className="w-7 h-7 text-[#eeb20d]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text-1)] mb-3">{feat.title}</h3>
              <p className="text-[var(--color-text-3)] text-base leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-8 text-center text-[var(--color-text-3)] text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-[#eeb20d]" />
          <span className="font-bold text-[var(--color-text-1)]">Acube AI</span> Enterprise Grade Security
        </div>
        &copy; {new Date().getFullYear()} PMPluse powered by Acube AI. All rights reserved.
      </footer>
      
      {/* PM Password Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            className="w-full max-w-sm rounded-2xl p-8 border shadow-2xl space-y-6 animate-fade-up bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5"
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'var(--accent-gold)' }}>
                <ShieldCheck className="w-6 h-6 text-[var(--navy)]" />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-1)' }}>
                {isFirstLogin ? 'Set Permanent Password' : 'Secure Login'}
              </h3>
              <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
                {isFirstLogin 
                  ? 'For security, please set a permanent password for your dashboard.'
                  : 'Enter your enterprise email and password.'}
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enterprise Email"
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:border-[#eeb20d] focus:ring-1 focus:ring-[#eeb20d] transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
              {!isFirstLogin ? (
                <div className="relative w-full">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-4 py-3 pr-10 rounded-xl focus:outline-none focus:border-[#eeb20d] focus:ring-1 focus:ring-[#eeb20d] transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors flex items-center justify-center"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              ) : (
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Permanent Password"
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:border-[#eeb20d] focus:ring-1 focus:ring-[#eeb20d] transition-all bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              )}
              
              {authError && <p className="text-red-400 text-sm font-semibold text-center">{authError}</p>}
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setIsFirstLogin(false);
                    setPassword('');
                    setNewPassword('');
                  }}
                  className="px-6 py-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authenticating}
                  className="px-6 py-2 rounded-xl bg-[#eeb20d] hover:bg-[#f2b50d] text-[var(--navy)] font-bold transition-all disabled:opacity-50"
                >
                  {authenticating ? 'Verifying...' : isFirstLogin ? 'Set Password & Login' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
