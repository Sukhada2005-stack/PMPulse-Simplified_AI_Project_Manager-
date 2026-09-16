import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Sparkles,
  Briefcase,
  ChevronDown,
  Layers,
  ShieldCheck,
  User,
  LogOut,
  Search
} from 'lucide-react';

export default function Navbar({ activeTab, onSelectTab, workspaces, setSelectedWorkspace }) {
  const { user, isPM, allUsers, switchUser, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pmTabs = [
    { id: 'dashboard', label: 'Project Dashboard', icon: LayoutDashboard },
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
        <div className="flex items-center h-16 w-full">
          
          {/* Left: Brand Logo & Tagline */}
          <div className="flex-1 flex items-center justify-start">
            <div className="flex items-center gap-3">
            <div className="flex flex-col justify-center select-none">
              <span
                className="text-2xl font-black tracking-tight leading-none text-white"
              >
                PMPulse
              </span>
              <div
                className="flex items-center gap-1.5 mt-1 text-white"
                style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                <span>BY</span>
                <img
                  src="/acube-cube.png"
                  onError={(e) => { e.currentTarget.src = "https://www.acubeai.com/favicon-32x32.png"; }}
                  alt="Acube AI Logo"
                  className="w-4 h-4 object-contain"
                />
                <span className="font-bold tracking-widest text-[12px]">ACUBE AI</span>
              </div>
            </div>
            </div>
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 flex justify-center px-4">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search projects or workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                className="bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-yellow-500 dark:focus:border-yellow-500 rounded-md py-1.5 pl-10 pr-12 text-sm w-full transition-all text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="hidden sm:inline-block border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 shadow-sm leading-none">
                  Ctrl K
                </kbd>
              </div>

              {isDropdownOpen && workspaces?.length > 0 && (
                <ul className="absolute top-full mt-2 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-50 overflow-hidden left-0">
                  {workspaces.map(workspace => (
                    <li
                      key={workspace.id}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input blur
                        if (setSelectedWorkspace) setSelectedWorkspace(workspace);
                        setSearchQuery(workspace.name || workspace.title);
                        setIsDropdownOpen(false);
                        if (onSelectTab) onSelectTab('dashboard');
                      }}
                      className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm text-slate-700 dark:text-slate-300"
                    >
                      {workspace.name || workspace.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-4">
            {/* Navigation Tabs */}
            <nav className="hidden xl:flex items-center gap-1.5 overflow-x-auto">
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
