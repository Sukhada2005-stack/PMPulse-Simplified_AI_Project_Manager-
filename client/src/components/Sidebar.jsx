import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  BarChart3,
  Sparkles,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  User,
  LogOut,
  Zap,
  FolderKanban,
  FileText,
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab, activeAiDimension, onExpandChange }) {
  const { user, isPM } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [isAiSummaryOpen, setIsAiSummaryOpen] = useState(false);

  const aiSummarySubItems = [
    { id: 'multi_employee', label: 'Team Cohort Analysis' },
    { id: 'task_based',     label: 'Task & Milestone Tracking' },
    { id: 'project_based',  label: 'Project Health & Status' },
    { id: 'fleet_level',    label: 'Fleet-Level Macro Overview' },
  ];

  const isSuperuser = user?.user_type === 'superuser';

  const superuserNavItems = [
    { id: 'superuser_hub', label: 'Superuser Hub', icon: ShieldCheck, highlight: true },
  ];

  const pmNavItems = [
    { id: 'other_workspaces', label: 'Dashboard',               icon: FolderKanban },
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

  const handleMouseEnter = () => {
    setExpanded(true);
    document.documentElement.style.setProperty('--sidebar-width', `${W_OPEN}px`);
    onExpandChange?.(true);
  };

  const handleMouseLeave = () => {
    setExpanded(false);
    document.documentElement.style.setProperty('--sidebar-width', `${W_CLOSED}px`);
    onExpandChange?.(false);
  };

  return (
    <>
      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          overflowX: 'hidden',
          overflowY: 'auto',
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
            <React.Fragment key={item.id}>
              <button
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

                {/* Toggle Arrow for AI Summary Hub */}
                {item.id === 'ai_summary' && isPM && expanded && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAiSummaryOpen(prev => !prev);
                    }}
                    title={isAiSummaryOpen ? "Collapse sub-options" : "Expand sub-options"}
                    style={{
                      marginLeft: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px 4px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      color: isActive ? '#eeb20d' : 'rgba(255,255,255,0.7)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = isActive ? '#eeb20d' : 'rgba(255,255,255,0.7)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {isAiSummaryOpen ? (
                      <ChevronDown size={14} strokeWidth={2.5} />
                    ) : (
                      <ChevronUp size={14} strokeWidth={2.5} />
                    )}
                  </span>
                )}
              </button>

              {/* Submenu Dropdown List for AI Summary Hub */}
              {item.id === 'ai_summary' && isPM && isAiSummaryOpen && expanded && (
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    paddingLeft: 26,
                    paddingRight: 4,
                    marginTop: 2,
                    marginBottom: 4,
                    boxSizing: 'border-box',
                  }}
                >
                  {aiSummarySubItems.map(sub => {
                    const isSubActive = activeTab === 'ai_summary' && activeAiDimension === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTab('ai_summary', sub.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          background: isSubActive ? 'rgba(238,178,13,0.18)' : 'transparent',
                          color: isSubActive ? '#eeb20d' : 'rgba(255,255,255,0.75)',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: 11.5,
                          fontWeight: isSubActive ? 600 : 500,
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSubActive) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            e.currentTarget.style.color = '#fff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSubActive) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                          }
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            backgroundColor: isSubActive ? '#eeb20d' : 'rgba(255,255,255,0.4)',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', width: '100%', marginBottom: 6 }} />

        {/* User Profile Row */}
        <div style={{ width: '100%', position: 'relative' }}>
          <div
            onClick={() => onSelectTab('personal_profile')}
            title={!expanded ? `${user?.full_name} - View Profile` : "View Personal Profile"}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '7px 8px',
              borderRadius: 6,
              background: activeTab === 'personal_profile' ? 'rgba(238,178,13,0.18)' : 'transparent',
              border: activeTab === 'personal_profile' ? '1px solid rgba(238,178,13,0.3)' : '1px solid transparent',
              cursor: 'pointer',
              transition,
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => {
              if (activeTab !== 'personal_profile') e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={e => {
              if (activeTab !== 'personal_profile') e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* Small Avatar icon visible in both collapsed and expanded states */}
            <span
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: activeTab === 'personal_profile' ? '#eeb20d' : 'rgba(255,255,255,0.16)',
                color: activeTab === 'personal_profile' ? '#081122' : '#fff',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </span>

            <span
              style={{
                opacity: expanded ? 1 : 0,
                maxWidth: expanded ? 130 : 0,
                overflow: 'hidden',
                transition,
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
      {/* Dynamically matches sidebar width with matching transition to squeeze the page smoothly */}
      <div
        style={{
          width: w,
          flexShrink: 0,
          transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </>
  );
}
