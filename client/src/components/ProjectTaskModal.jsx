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
  Clock,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';

/* ── Field Components ───────────────────────────────────────────────── */
const fieldLabel = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#c5c4c1',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1.5px solid rgba(255,255,255,0.10)',
  borderRadius: 6,
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  color: '#f0ede8',
  background: '#1a1814',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};

const inputFocusStyle = {
  borderColor: '#eeb20d',
  boxShadow: '0 0 0 2px rgba(0,82,204,0.18)',
};

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
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A869A' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 32,
      }}
    >
      {children}
    </select>
  );
}

/* ── New Project Modal ──────────────────────────────────────────────── */
export function NewProjectModal({ onClose, onSuccess }) {
  const [title, setTitle]                     = useState('');
  const [description, setDescription]         = useState('');
  const [startDate, setStartDate]             = useState('2026-09-01');
  const [endDate, setEndDate]                 = useState('2026-09-10');
  const [employees, setEmployees]             = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [submitting, setSubmitting]           = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    api.employees.getAll()
      .then(res => setEmployees(res.employees || []))
      .catch(console.error);

    return () => {
      document.body.style.overflow = originalOverflow || '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const toggleMember = (id) =>
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) { 
      alert('Please enter a project title and timeline dates.'); 
      return; 
    }
    setSubmitting(true);
    try {
      await api.projects.create({ 
        title, 
        description, 
        start_date: startDate, 
        end_date: endDate, 
        member_ids: selectedMemberIds 
      });
      alert(`Project "${title}" created successfully!`);
      onSuccess(); onClose();
    } catch (err) {
      alert(`Failed to create project: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      style={{
        background: 'rgba(9, 30, 66, 0.54)',
        backdropFilter: 'blur(3px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] z-[10000]"
        style={{
          boxShadow: '0 20px 60px rgba(9,30,66,0.25)',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <FolderPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                Initialize Project Container
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Provision a new project workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
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

            {/* Date Range Box */}
            <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/80 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-600" />
                <span>Project Timeline (Required)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <JiraInput
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <JiraInput
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    required
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={13} color="#eeb20d" />
                Allocate Team Members from Active Directory
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {employees.map(emp => {
                  const isSel = selectedMemberIds.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleMember(emp.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all border ${
                        isSel
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => {}}
                        className="accent-blue-600 cursor-pointer flex-shrink-0"
                      />
                      <img
                        src={emp.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.full_name}`}
                        alt={emp.full_name}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-200"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-gray-900 truncate">
                          {emp.full_name}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {emp.role_title}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs"
            >
              {submitting ? <RefreshCw size={13} className="animate-spin" /> : <FolderPlus size={13} />}
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ── New Task Modal ─────────────────────────────────────────────────── */
export function NewTaskModal({ projectId, projects = [], onClose, onSuccess }) {
  const [targetProjectId, setTargetProjectId] = useState(projectId || (projects[0]?.id || ''));
  const [title, setTitle]                     = useState('');
  const [description, setDescription]         = useState('');
  const [startDate, setStartDate]             = useState('2026-09-01');
  const [endDate, setEndDate]                 = useState('2026-09-10');
  const [employees, setEmployees]             = useState([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState([]);
  const [submitting, setSubmitting]           = useState(false);

  useEffect(() => {
    if (projectId) {
      setTargetProjectId(projectId);
    } else if (projects?.length > 0 && !targetProjectId) {
      setTargetProjectId(projects[0].id);
    }
  }, [projectId, projects]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow || '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Update employees list when target project changes
  useEffect(() => {
    const currentProject = projects.find(p => p.id === targetProjectId);
    const emps = currentProject?.members || [];
    setEmployees(emps);

    // Auto-select first member if none selected or if selected member is not in the new project
    setSelectedAssigneeIds(prev => {
      const validSelections = prev.filter(id => emps.some(e => e.id === id));
      if (emps.length > 0 && validSelections.length === 0) {
        return [emps[0].id];
      }
      return validSelections;
    });
  }, [targetProjectId, projects]);

  const toggleAssignee = (id) =>
    setSelectedAssigneeIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate || !targetProjectId) {
      alert('Please fill out all task details and date ranges.');
      return;
    }
    setSubmitting(true);
    try {
      await api.projects.createTask(targetProjectId, {
        title,
        description,
        start_date: startDate,
        end_date: endDate,
        assignee_ids: selectedAssigneeIds,
      });
      alert(`Task "${title}" provisioned successfully with scheduled active dates!`);
      onSuccess();
      onClose();
    } catch (err) {
      alert(`Failed to provision task: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      style={{
        background: 'rgba(9, 30, 66, 0.54)',
        backdropFilter: 'blur(3px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] z-[10000]"
        style={{
          boxShadow: '0 20px 60px rgba(9,30,66,0.25)',
          margin: 'auto',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <CheckSquare size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                Provision Actionable Deliverable
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Schedule a task with specifications and date window
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">

            {/* Target Project */}
            <div>
              <label style={fieldLabel}>Target Project *</label>
              <JiraSelect
                value={targetProjectId}
                onChange={e => setTargetProjectId(parseInt(e.target.value, 10))}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    📁 {p.title}
                  </option>
                ))}
              </JiraSelect>
            </div>

            {/* Title */}
            <div>
              <label style={fieldLabel}>Deliverable / Task Title *</label>
              <JiraInput
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Integrate Razorpay Webhook Handlers & Idempotency"
                required
              />
            </div>

            {/* Specifications */}
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
            <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/80 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-600" />
                <span>Strict Date Window (Required)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <JiraInput
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <JiraInput
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    required
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* Assignees */}
            <div>
              <label style={{ ...fieldLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={13} color="#eeb20d" />
                Assign Contributor(s)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {employees.map(emp => {
                  const isSel = selectedAssigneeIds.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleAssignee(emp.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all border ${
                        isSel
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => {}}
                        className="accent-blue-600 cursor-pointer flex-shrink-0"
                      />
                      <img
                        src={emp.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.full_name}`}
                        alt={emp.full_name}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-200"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-gray-900 truncate">
                          {emp.full_name}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {emp.role_title}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs"
              style={{ background: submitting ? '#8e8b85' : '#38dd9f' }}
            >
              {submitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckSquare size={13} />}
              <span>Schedule Deliverable</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
