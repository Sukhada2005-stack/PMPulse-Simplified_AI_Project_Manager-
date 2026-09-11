import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import PMDashboard from './components/PMDashboard';
import CalendarMatrix from './components/CalendarMatrix';
import WorkforceDirectory from './components/WorkforceDirectory';
import Employee360View from './components/Employee360View';
import AISummaryHub from './components/AISummaryHub';
import EmployeeDashboard from './components/EmployeeDashboard';
import SuperuserDashboard from './components/SuperuserDashboard';
import LandingPage from './components/LandingPage';
import SetPassword from './components/SetPassword';
import SessionReauthModal from './components/SessionReauthModal';
import OtherWorkspaces from './components/OtherWorkspaces';
import { Sparkles, Loader2, Sun, Moon, LogOut, Search } from 'lucide-react';
import { api } from './services/api';

function MainApp() {
  const { user, isPM, loading, logout } = useAuth();
  const [activeTab, setActiveTab]             = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selected360EmployeeId, setSelected360EmployeeId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setSelectedWorkspace(null);
      setActiveTab('dashboard');
    }
  }, [user?.id]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await api.projects.getAll();
        const projectList = res.projects || [];
        setWorkspaces(projectList);
      } catch (err) {
        console.error('Failed to load workspaces:', err);
      }
    };
    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      if (isPM && activeTab === 'employee_dash') setActiveTab('dashboard');
      if (!isPM && user.user_type !== 'superuser') setActiveTab('employee_dash');
    }
  }, [user?.user_type, loading]);

  const [initialDashboardView, setInitialDashboardView] = useState('overview');

  const handleNavigateTab = (tabId, projectId = null, view = null) => {
    if (projectId) {
      setSelectedProjectId(projectId);
      const ws = workspaces.find(w => String(w.id) === String(projectId));
      if (ws) setSelectedWorkspace(ws);
    }
    if (view) {
      setInitialDashboardView(view);
    }
    setActiveTab(tabId);
  };

  const handleSelectEmployee360 = (employeeId) => {
    setSelected360EmployeeId(employeeId);
    setActiveTab('employee_360');
  };

  /* ── Loading Splash ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #eeb20d, #f2b50d)' }}
        >
          <span className="text-white font-black text-2xl" style={{ color: '#161410' }}>P</span>
        </div>
        <Loader2 className="w-6 h-6 animate-spin mb-3" style={{ color: '#eeb20d' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-1)' }}>Initializing PulsePM…</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-3)' }}>Connecting to relational data core and AI engine</p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  if (user.is_first_login === 1) {
    return <SetPassword />;
  }


  /* ── Page Title lookup ───────────────────────────────────────── */
  const pageTitles = {
    dashboard:       'Project Dashboard',
    other_workspaces:'Other Workspaces',
    calendar_matrix: 'Calendar Matrix Tracker',
    workforce:       'Workforce Directory',
    employee_360:    'Employee 360° Analytics',
    ai_summary:      'AI Executive Summary Hub',
    employee_dash:   'My Tasks & Daily Log',
  };
  const pageTitle = user.user_type === 'superuser' ? 'Superuser Hub' : (pageTitles[activeTab] || 'PulsePM');

  const { isDark, toggleTheme } = useTheme();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)', overflow: 'hidden' }}>

      {/* Left Sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div
        className="page-shell flex flex-col"
        style={{ flex: 1, minWidth: 0, paddingTop: '72px' }}
      >
        {/* Top Bar */}
        <header className="jira-topbar no-print flex items-center justify-between relative" style={{ height: '72px', padding: '0 24px' }}>
          
          {/* Left: Logo */}
          <div className="flex flex-col justify-center h-full pt-1 z-10">
            <h1
              className="text-4xl font-black tracking-tight"
              style={{ color: 'var(--color-text-1)', lineHeight: '0.9' }}
            >
              PMPulse
            </h1>
            <div
              className="flex items-center gap-1.5 mt-1 ml-16"
              style={{ color: 'var(--color-text-1)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              <span style={{ color: 'var(--color-text-3)' }}>BY</span>
              <div className="flex items-center gap-1 opacity-90">
                <img
                  src="https://www.acubeai.com/favicon-32x32.png"
                  alt="Acube Symbol"
                  className="w-3.5 h-3.5 object-contain mb-0.5"
                />
                <span className="font-bold tracking-widest text-[12px]">ACUBE AI</span>
              </div>
            </div>
          </div>

          {/* Center: Search Bar */}
          {(activeTab === 'dashboard' || activeTab === 'employee_dash') ? (
            <div className="flex items-center gap-2 flex-1 max-w-2xl mx-4 min-w-0 hidden md:flex relative">
              <div className="relative w-full min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search projects or workspaces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  className="bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-yellow-500 dark:focus:border-yellow-500 rounded-md py-1.5 pl-10 pr-12 text-sm w-full min-w-0 transition-all text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <kbd className="hidden sm:inline-block border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 shadow-sm leading-none">
                    Ctrl K
                  </kbd>
                </div>
              </div>
              <button className="px-4 py-1.5 text-sm font-medium rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors whitespace-nowrap flex-shrink-0">
                Search Workspace
              </button>

              {isDropdownOpen && workspaces.length > 0 && (
                <ul className="absolute top-full mt-2 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-50 overflow-hidden left-0">
                  {workspaces.map(workspace => (
                    <li
                      key={workspace.id}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input blur
                        setSelectedWorkspace(workspace);
                        setSearchQuery(workspace.name || workspace.title);
                        setIsDropdownOpen(false);
                        if (isPM) setActiveTab('dashboard');
                      }}
                      className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm text-slate-700 dark:text-slate-300"
                    >
                      {workspace.name || workspace.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex-1 min-w-0 max-w-2xl mx-4"></div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-4 flex-shrink-0 z-10">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDark
                ? <Sun size={16} style={{ color: 'var(--accent-gold)' }} />
                : <Moon size={16} style={{ color: 'var(--color-text-2)' }} />
              }
            </button>
            <div
              className="text-[12px] font-bold hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--page-title-bg)', color: 'var(--color-text-2)', border: '1px solid var(--page-title-border)' }}
            >
              {pageTitle}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10"
              style={{ color: 'var(--color-text-2)' }}
              title="Sign Out"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main
          className="flex-1 p-6"
        >
          {/* PM Views */}
          {isPM && (
            <>
              {activeTab === 'dashboard' && (
                <PMDashboard
                  onNavigateTab={handleNavigateTab}
                  onSelectEmployee360={handleSelectEmployee360}
                  selectedWorkspace={selectedWorkspace}
                  initialSidebarView={initialDashboardView}
                />
              )}

              {activeTab === 'other_workspaces' && (
                <OtherWorkspaces
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {activeTab === 'calendar_matrix' && (
                <CalendarMatrix
                  selectedProjectId={selectedProjectId}
                  onSelectProject={setSelectedProjectId}
                  onOpenAISummary={() => setActiveTab('ai_summary')}
                />
              )}

              {activeTab === 'workforce' && (
                <WorkforceDirectory
                  onSelectEmployee360={handleSelectEmployee360}
                />
              )}

              {activeTab === 'employee_360' && (
                <Employee360View
                  employeeId={selected360EmployeeId}
                  onBack={() => setActiveTab('workforce')}
                />
              )}

              {activeTab === 'ai_summary' && (
                <div className="space-y-4 animate-fade-up">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded font-bold uppercase tracking-wider"
                        style={{ background: 'rgba(238,178,13,0.08)', color: '#eeb20d', border: '1px solid rgba(238,178,13,0.15)' }}
                      >
                        <Sparkles className="w-3 h-3 text-yellow-500" />
                        Multi-Dimensional Synthesis Engine
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-1)' }}>
                      AI Executive Summary Hub
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-3)' }}>
                      Transforms raw daily notes into polished executive summaries across 5 dimensions
                    </p>
                  </div>
                  <AISummaryHub />
                </div>
              )}
            </>
          )}

          {/* Superuser View */}
          {user?.user_type === 'superuser' && <SuperuserDashboard />}

          {/* Employee View */}
          {!isPM && user?.user_type !== 'superuser' && <EmployeeDashboard selectedWorkspace={selectedWorkspace} />}
        </main>

        {/* Footer */}
        <footer
          className="no-print"
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--footer-border)',
            background: 'var(--footer-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span className="text-xs font-bold" style={{ color: 'var(--color-text-2)' }}>
            PulsePM — Lightweight AI Project Management
          </span>
        </footer>
      </div>
      
      {/* Global Session Re-auth Modal */}
      <SessionReauthModal />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
