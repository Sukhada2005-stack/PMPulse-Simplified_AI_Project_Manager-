import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import {
  FolderPlus,
  CheckSquare,
  Calendar,
  Users,
  X,
  RefreshCw,
} from 'lucide-react';

/* ── Shared Design Tokens ───────────────────────────────────────────── */
const DARK_BG       = 'var(--color-surface-solid)';
const DARK_CARD     = 'var(--table-th-bg)';
const BORDER        = 'rgba(255,255,255,0.08)';
const BORDER_FOCUS  = '#eeb20d';
const TEXT_PRIMARY  = 'var(--color-text-1)';
const TEXT_MUTED    = 'var(--color-text-2)';
const TEXT_LABEL    = 'var(--color-text-3)';
const GOLD          = '#eeb20d';

const fieldLabel = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: TEXT_MUTED,
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: `1.5px solid ${BORDER}`,
  borderRadius: 6,
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  color: TEXT_PRIMARY,
  background: DARK_BG,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};

const inputFocusStyle = {
  borderColor: BORDER_FOCUS,
  boxShadow: `0 0 0 2px rgba(238,178,13,0.15)`,
};

/* ── Shared Sub-components ──────────────────────────────────────────── */
function JiraInput({ type = 'text', value, onChange, placeholder, required, style }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle, ...(focused ? inputFocusStyle : {}), ...style }}
    />
  );
}

function JiraTextarea({ value, onChange, placeholder, rows = 3 }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle, ...(focused ? inputFocusStyle : {}), resize: 'vertical', lineHeight: 1.5 }}
    />
  );
}

function JiraSelect({ value, onChange, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        ...(focused ? inputFocusStyle : {}),
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8b85' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 32,
      }}
    >
      {children}
    </select>
  );
}

/* Overlay wrapper shared by both modals */
function ModalOverlay({ onClose, children }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      style={{
        background: 'rgba(0,0,0,0.70)',
        backdropFilter: 'blur(6px)',
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border overflow-hidden flex flex-col max-h-[90vh] z-[10000]"
        style={{
          background: DARK_BG,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
          margin: 'auto',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ── New Project Modal ──────────────────────────────────────────────── */
export function NewProjectModal({ onClose, onSuccess }) {
  const [title, setTitle]                         = useState('');
  const [description, setDescription]             = useState('');
  const [startDate, setStartDate]                 = useState('2026-09-01');
  const [endDate, setEndDate]                     = useState('2026-09-10');
  const [employees, setEmployees]                 = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [submitting, setSubmitting]               = useState(false);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);

    api.employees.getAll()
      .then(res => setEmployees(res.employees || []))
      .catch(console.error);

    return () => {
      document.body.style.overflow = orig || '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const toggleMember = id =>
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) {
      alert('Please enter a project title and timeline dates.');
      return;
    }
    setSubmitting(true);
    try {
      await api.projects.create({ title, description, start_date: startDate, end_date: endDate, member_ids: selectedMemberIds });
      alert(`Project "${title}" created successfully!`);
      onSuccess(); onClose();
    } catch (err) {
      alert(`Failed to create project: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${BORDER}`, background: DARK_CARD }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.3)' }}
          >
            <FolderPlus size={18} color="#60a5fa" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight" style={{ color: TEXT_PRIMARY }}>
              Initialize Project Container
            </h3>
            <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
              Provision a new project workspace
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: TEXT_MUTED }}
          onMouseEnter={e => { e.currentTarget.style.background = DARK_CARD; e.currentTarget.style.color = TEXT_PRIMARY; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_MUTED; }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-6 space-y-4 overflow-y-auto flex-1">

          <div>
            <label style={fieldLabel}>Project Title *</label>
            <JiraInput
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Next-Gen Mobile Checkout Experience"
              required
            />
          </div>

          <div>
            <label style={fieldLabel}>High-Level Description &amp; Scope</label>
            <JiraTextarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Core goals, client specs, and deliverable targets..."
              rows={3}
            />
          </div>

          {/* Timeline box */}
          <div
            className="p-3.5 rounded-lg space-y-2.5"
            style={{ background: DARK_CARD, border: `1px solid ${BORDER}` }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: GOLD }}
            >
              <Calendar size={13} color={GOLD} />
              <span>Project Timeline (Required)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_LABEL }}>
                  Start Date
                </label>
                <JiraInput
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                  style={{ fontFamily: 'monospace', fontSize: 12, colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_LABEL }}>
                  End Date
                </label>
                <JiraInput
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                  style={{ fontFamily: 'monospace', fontSize: 12, colorScheme: 'dark' }}
                />
              </div>
            </div>
          </div>

          {/* Member selection */}
          <div>
            <label style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={13} color={GOLD} />
              Allocate Team Members from Active Directory
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {employees.map(emp => {
                const isSel = selectedMemberIds.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleMember(emp.id)}
                    className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all"
                    style={{
                      background: isSel ? 'rgba(238,178,13,0.10)' : DARK_CARD,
                      border: `1px solid ${isSel ? 'rgba(238,178,13,0.45)' : BORDER}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => {}}
                      className="cursor-pointer flex-shrink-0"
                      style={{ accentColor: GOLD }}
                    />
                    <img
                      src={emp.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.full_name}`}
                      alt={emp.full_name}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      style={{ border: `1px solid ${BORDER}` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate" style={{ color: TEXT_PRIMARY }}>
                        {emp.full_name}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: TEXT_MUTED }}>
                        {emp.role_title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2.5 px-6 py-3.5 flex-shrink-0"
          style={{ borderTop: `1px solid ${BORDER}`, background: DARK_CARD }}
        >
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary text-xs">
            {submitting ? <RefreshCw size={13} className="animate-spin" /> : <FolderPlus size={13} />}
            <span>Create Project</span>
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

/* ── New Task Modal ─────────────────────────────────────────────────── */
export function NewTaskModal({ projectId, projects = [], onClose, onSuccess }) {
  const [targetProjectId, setTargetProjectId]       = useState(projectId || (projects[0]?.id || ''));
  const [title, setTitle]                           = useState('');
  const [description, setDescription]               = useState('');
  const [startDate, setStartDate]                   = useState('2026-09-01');
  const [endDate, setEndDate]                       = useState('2026-09-10');
  const [employees, setEmployees]                   = useState([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState([]);
  const [submitting, setSubmitting]                 = useState(false);

  useEffect(() => {
    if (projectId) setTargetProjectId(projectId);
    else if (projects?.length > 0 && !targetProjectId) setTargetProjectId(projects[0].id);
  }, [projectId, projects]);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = orig || '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    const current = projects.find(p => p.id === targetProjectId);
    const emps = current?.members || [];
    setEmployees(emps);
    setSelectedAssigneeIds(prev => {
      const valid = prev.filter(id => emps.some(e => e.id === id));
      return emps.length > 0 && valid.length === 0 ? [emps[0].id] : valid;
    });
  }, [targetProjectId, projects]);

  const toggleAssignee = id =>
    setSelectedAssigneeIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate || !targetProjectId) {
      alert('Please fill out all task details and date ranges.');
      return;
    }
    setSubmitting(true);
    try {
      await api.projects.createTask(targetProjectId, {
        title, description,
        start_date: startDate, end_date: endDate,
        assignee_ids: selectedAssigneeIds,
      });
      alert(`Task "${title}" provisioned successfully with scheduled active dates!`);
      onSuccess(); onClose();
    } catch (err) {
      alert(`Failed to provision task: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${BORDER}`, background: DARK_CARD }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(56,221,159,0.15)', border: '1px solid rgba(56,221,159,0.3)' }}
          >
            <CheckSquare size={18} color="#38dd9f" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight" style={{ color: TEXT_PRIMARY }}>
              Provision Actionable Deliverable
            </h3>
            <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
              Schedule a task with specifications and date window
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: TEXT_MUTED }}
          onMouseEnter={e => { e.currentTarget.style.background = DARK_CARD; e.currentTarget.style.color = TEXT_PRIMARY; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_MUTED; }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-6 space-y-4 overflow-y-auto flex-1">

          <div>
            <label style={fieldLabel}>Target Project *</label>
            <JiraSelect
              value={targetProjectId}
              onChange={e => setTargetProjectId(parseInt(e.target.value, 10))}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} style={{ background: DARK_BG, color: TEXT_PRIMARY }}>
                  📁 {p.title}
                </option>
              ))}
            </JiraSelect>
          </div>

          <div>
            <label style={fieldLabel}>Deliverable / Task Title *</label>
            <JiraInput
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Integrate Razorpay Webhook Handlers & Idempotency"
              required
            />
          </div>

          <div>
            <label style={fieldLabel}>Specifications &amp; Deliverable Context</label>
            <JiraTextarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Deliverable milestones, APIs, requirements, and acceptance criteria..."
              rows={3}
            />
          </div>

          {/* Date Range Box */}
          <div
            className="p-3.5 rounded-lg space-y-2.5"
            style={{ background: DARK_CARD, border: `1px solid ${BORDER}` }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: GOLD }}
            >
              <Calendar size={13} color={GOLD} />
              <span>Strict Date Window (Required)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_LABEL }}>
                  Start Date
                </label>
                <JiraInput
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                  style={{ fontFamily: 'monospace', fontSize: 12, colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_LABEL }}>
                  End Date
                </label>
                <JiraInput
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                  style={{ fontFamily: 'monospace', fontSize: 12, colorScheme: 'dark' }}
                />
              </div>
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={13} color={GOLD} />
              Assign Contributor(s)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {employees.map(emp => {
                const isSel = selectedAssigneeIds.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleAssignee(emp.id)}
                    className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all"
                    style={{
                      background: isSel ? 'rgba(56,221,159,0.10)' : DARK_CARD,
                      border: `1px solid ${isSel ? 'rgba(56,221,159,0.40)' : BORDER}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => {}}
                      className="cursor-pointer flex-shrink-0"
                      style={{ accentColor: '#38dd9f' }}
                    />
                    <img
                      src={emp.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.full_name}`}
                      alt={emp.full_name}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      style={{ border: `1px solid ${BORDER}` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate" style={{ color: TEXT_PRIMARY }}>
                        {emp.full_name}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: TEXT_MUTED }}>
                        {emp.role_title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2.5 px-6 py-3.5 flex-shrink-0"
          style={{ borderTop: `1px solid ${BORDER}`, background: DARK_CARD }}
        >
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary text-xs">
            {submitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckSquare size={13} />}
            <span>Schedule Deliverable</span>
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}
