import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  Sparkles,
  Briefcase,
  ChevronDown,
  Layers,
  ShieldCheck,
  User,
  LogOut
} from 'lucide-react';

export default function Navbar({ activeTab, onSelectTab }) {
  const { user, isPM, allUsers, switchUser, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const pmTabs = [
    { id: 'dashboard', label: 'Project Dashboard', icon: LayoutDashboard },
    { id: 'calendar_matrix', label: 'Calendar Matrix Tracker', icon: Calendar },
    { id: 'workforce', label: 'Workforce Directory', icon: Users },
    { id: 'employee_360', label: 'Employee 360° Analytics', icon: UserCheck },
    { id: 'ai_summary', label: 'AI Summary Hub', icon: Sparkles, highlight: true }
  ];

  const employeeTabs = [
    { id: 'employee_dash', label: 'My Active Tasks & Daily Log', icon: Briefcase }
  ];

  const currentTabs = isPM ? pmTabs : employeeTabs;

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/10 backdrop-blur-xl no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-600/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <span className="text-lg font-black bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                  P
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">PulsePM</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI CORE
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block">Zero-Agile Overhead Platform</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 overflow-x-auto">
            {currentTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? tab.highlight
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-800 text-white border border-white/10 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${tab.highlight ? 'text-amber-300' : isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* User Profile & 1-Click Role Switcher */}
            <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 transition-all text-xs"
            >
              <img
                src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.full_name}`}
                alt={user?.full_name}
                className="w-7 h-7 rounded-full border border-white/20 object-cover"
              />
              <div className="text-left hidden sm:block">
                <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <span>{user?.full_name || 'Loading...'}</span>
                </div>
                <div className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1">
                  {isPM ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : <User className="w-3 h-3 text-blue-400" />}
                  <span>{isPM ? 'Project Manager' : 'Contributor'}</span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu for instant role switching */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 glass-panel rounded-2xl p-3 border border-white/10 shadow-2xl space-y-2 animate-in fade-in z-50">
                <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 flex items-center justify-between">
                  <span>Switch Role / User</span>
                  <span className="text-[9px] text-indigo-400 font-normal">Fast Demo Switch</span>
                </div>

                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {allUsers.map(u => {
                    const isSelected = u.id === user?.id;
                    const isUserPM = u.user_type === 'pm';
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.email);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors ${
                          isSelected
                            ? 'bg-indigo-600/30 border border-indigo-500/40 text-white'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <img
                          src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.full_name}`}
                          alt={u.full_name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs truncate flex items-center justify-between">
                            <span>{u.full_name}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                              isUserPM ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {isUserPM ? 'PM' : 'EMP'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{u.role_title}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Reset Session</span>
                  </button>
                </div>
              </div>
            )}
            </div>
            
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto py-2 border-t border-white/5">
          {currentTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
