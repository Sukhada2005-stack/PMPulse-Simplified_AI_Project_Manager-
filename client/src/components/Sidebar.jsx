import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  BarChart3,
  Sparkles,
  Briefcase,
  ChevronDown,
  ShieldCheck,
  User,
  LogOut,
  Zap,
  FolderKanban,
  FileText,
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab }) {
  const { user, isPM } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const isSuperuser = user?.user_type === 'superuser';

  const superuserNavItems = [
    { id: 'superuser_hub', label: 'Superuser Hub', icon: ShieldCheck, highlight: true },
  ];

  const pmNavItems = [
    { id: 'other_workspaces', label: 'Dashboard',               icon: FolderKanban },
    { id: 'pm_daily_logs',    label: 'Daily Logs',              icon: FileText },
    { id: 'workforce',        label: 'Workforce Directory',     icon: Users },
    { id: 'employee_360',     label: 'Employee 360° Analytics', icon: BarChart3 },
    { id: 'ai_summary',       label: 'AI Summary Hub',          icon: Sparkles, highlight: true },
  ];
  const empNavItems = [
    { id: 'employee_dash',       label: 'My Tasks & Daily Log', icon: Briefcase },
    { id: 'employee_daily_logs', label: 'Daily Logs',           icon: FileText },
  ];
  const navItems = isSuperuser ? superuserNavItems : (isPM ? pmNavItems : empNavItems);

  /* Widths */
  const W_CLOSED = 56;
  const W_OPEN = 220;
  const w = expanded ? W_OPEN : W_CLOSED;

  /* Shared transition */
  const transition = 'all 0.22s cubic-bezier(0.4,0,0.2,1)';

  return (
    <>
      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className="no-print"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: w,
          background: 'var(--navy)',
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
              color: 'var(--navy)',
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
          const isActive = isSuperuser ? true : activeTab === item.id;
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
          <div
            title={!expanded ? user?.full_name : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '7px 8px',
              borderRadius: 6,
              background: 'transparent',
              transition,
              boxSizing: 'border-box',
            }}
          >

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
                {user?.user_type === 'superuser' ? '👑 Superuser' : user?.user_type === 'pm' ? '🛡 PM' : '👤 Contributor'}
              </div>
            </span>
          </div>
        </div>
      </aside>

      {/* ── CONTENT OFFSET SPACER ─────────────────────────────────── */}
      {/* This invisible div pushes the flex layout by the collapsed sidebar width */}
      <div style={{ width: W_CLOSED, flexShrink: 0 }} />
    </>
  );
}
