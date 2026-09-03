import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  BarChart3,
  Sparkles,
  Briefcase,
  ChevronDown,
  ShieldCheck,
  User,
  LogOut,
  Zap,
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab }) {
  const { user, isPM, allUsers, switchUser, logout } = useAuth();
  const [expanded, setExpanded]     = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const pmNavItems = [
    { id: 'dashboard',       label: 'Project Dashboard',       icon: LayoutDashboard },
    { id: 'workforce',       label: 'Workforce Directory',      icon: Users },
    { id: 'employee_360',    label: 'Employee 360° Analytics',  icon: BarChart3 },
    { id: 'calendar_matrix', label: 'Calendar Matrix Tracker',  icon: Calendar },
    { id: 'ai_summary',      label: 'AI Summary Hub',           icon: Sparkles, highlight: true },
  ];
  const empNavItems = [
    { id: 'employee_dash', label: 'My Tasks & Daily Log', icon: Briefcase },
  ];
  const navItems = isPM ? pmNavItems : empNavItems;

  /* Widths */
  const W_CLOSED = 56;
  const W_OPEN   = 220;
  const w = expanded ? W_OPEN : W_CLOSED;

  /* Shared transition */
  const transition = 'all 0.22s cubic-bezier(0.4,0,0.2,1)';

  return (
    <>
      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => { setExpanded(false); setShowUserMenu(false); }}
        className="no-print"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: w,
          background: '#161410',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '10px 8px 14px',
          gap: 2,
          zIndex: 50,
          transition,
          overflow: 'hidden',
          boxShadow: expanded ? '4px 0 24px rgba(0,0,0,0.45)' : 'none',
        }}
      >

        {/* Logo Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 4px 12px',
            width: '100%',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 6,
            flexShrink: 0,
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg,#eeb20d,#f2b50d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontWeight: 900,
              color: '#161410',
              fontSize: 15,
              letterSpacing: '-0.5px',
            }}
          >
            P
          </div>

          {/* Label — only visible when expanded */}
          <div
            style={{
              opacity: expanded ? 1 : 0,
              transform: expanded ? 'translateX(0)' : 'translateX(-6px)',
              transition,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>PulsePM</div>
            <div style={{ color: '#eeb20d', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Core</div>
          </div>
        </div>

        {/* Nav Items */}
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const accent = item.highlight ? '#eeb20d' : undefined;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={!expanded ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 8px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'rgba(238,178,13,0.15)' : 'transparent',
                color: isActive ? '#eeb20d' : accent || 'rgba(255,255,255,0.55)',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                textAlign: 'left',
                transition,
                flexShrink: 0,
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Icon — always visible */}
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20 }}>
                <Icon size={18} color={isActive ? '#eeb20d' : (accent || 'rgba(255,255,255,0.55)')} />
              </span>

              {/* Label — slide-in on expand */}
              <span
                style={{
                  opacity: expanded ? 1 : 0,
                  maxWidth: expanded ? 160 : 0,
                  overflow: 'hidden',
                  transition,
                  display: 'inline-block',
                  pointerEvents: 'none',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', width: '100%', marginBottom: 6 }} />

        {/* User Profile Row */}
        <div style={{ width: '100%', position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(v => !v)}
            title={!expanded ? user?.full_name : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '7px 8px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: showUserMenu ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition,
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => { if (!showUserMenu) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { if (!showUserMenu) e.currentTarget.style.background = 'transparent'; }}
          >
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.full_name}`}
              alt={user?.full_name}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.2)',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                opacity: expanded ? 1 : 0,
                maxWidth: expanded ? 130 : 0,
                overflow: 'hidden',
                transition,
                pointerEvents: 'none',
                textAlign: 'left',
              }}
            >
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                {user?.full_name}
              </div>
              <div style={{ color: '#eeb20d', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {isPM ? '🛡 PM' : '👤 Contributor'}
              </div>
            </span>
            {expanded && (
              <ChevronDown size={12} color="rgba(255,255,255,0.4)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
            )}
          </button>

          {/* User Switcher Dropdown */}
          {showUserMenu && expanded && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: 8,
                width: 210,
                background: '#1f1d17',
                borderRadius: 10,
                boxShadow: '0 20px 60px rgba(9,30,66,0.25)',
                border: '1px solid rgba(255,255,255,0.1)',
                overflow: 'hidden',
                zIndex: 200,
              }}
            >
              {/* Header */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#8e8b85', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Switch User</span>
                <Zap size={11} color="#eeb20d" />
              </div>

              {/* Users List */}
              <div style={{ maxHeight: 220, overflowY: 'auto', padding: 4 }}>
                {allUsers?.map(u => {
                  const isSel = u.id === user?.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => { switchUser(u.email); setShowUserMenu(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '7px 8px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        background: isSel ? 'rgba(238,178,13,0.12)' : 'transparent',
                        textAlign: 'left',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <img
                        src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.full_name}`}
                        alt={u.full_name}
                        style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#f0ede8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</div>
                        <div style={{ fontSize: 10, color: '#8e8b85', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.role_title}</div>
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
                        background: u.user_type === 'pm' ? 'rgba(238,178,13,0.15)' : 'rgba(255,255,255,0.06)',
                        color: u.user_type === 'pm' ? '#eeb20d' : '#8e8b85',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                      }}>
                        {u.user_type === 'pm' ? 'PM' : 'EMP'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sign out */}
              <div style={{ padding: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    width: '100%',
                    padding: '7px 8px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: '#ff6b6b',
                    fontSize: 12,
                    fontWeight: 500,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── CONTENT OFFSET SPACER ─────────────────────────────────── */}
      {/* This invisible div pushes the flex layout by the collapsed sidebar width */}
      <div style={{ width: W_CLOSED, flexShrink: 0 }} />
    </>
  );
}
