import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users,
  UserPlus,
  Mail,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Shield,
  Key,
  Sparkles,
  RefreshCw,
  Search,
  X,
  Trash2,
  UserMinus
} from 'lucide-react';

export default function WorkforceDirectory({ onSelectEmployee360 }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null); // { id, full_name }
  const [removing, setRemoving] = useState(false);

  // New employee form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('Senior Frontend Developer');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const res = await api.employees.getAll();
      setEmployees(res.employees || []);
    } catch (err) {
      console.error('Failed to fetch workforce directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, []);

  // Lock body scroll whenever any modal is open
  useEffect(() => {
    const isAnyModalOpen = showAddModal || !!removeTarget;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddModal, removeTarget]);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !roleTitle || !password) {
      alert('Please fill out all fields.');
      return;
    }

    setSubmitting(true);
    try {
      await api.employees.create({
        full_name: fullName,
        email,
        role_title: roleTitle,
        password
      });
      alert(`Employee profile for ${fullName} created successfully! Credentials generated.`);
      setShowAddModal(false);
      setFullName('');
      setEmail('');
      fetchDirectory();
    } catch (err) {
      alert(`Failed to onboard employee: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveEmployee = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await api.employees.remove(removeTarget.id);
      setRemoveTarget(null);
      fetchDirectory();
    } catch (err) {
      alert(`Failed to remove employee: ${err.message}`);
    } finally {
      setRemoving(false);
    }
  };

  const filteredEmployees = employees.filter(e => {
    const term = search.toLowerCase();
    return (
      e.full_name.toLowerCase().includes(term) ||
      e.role_title.toLowerCase().includes(term) ||
      e.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header & Onboard Action */}
      <div className="jira-card p-5 flex flex-wrap items-center justify-between gap-4" style={{ background: 'var(--color-surface-solid)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text-1)' }}>
              Active Workforce Directory
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-3)' }}>
              Manage contributor profiles, departmental roles, and authentication credentials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search directory..."
              className="jira-input pr-3 text-xs w-48 sm:w-64"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard Contributor</span>
          </button>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="py-20 text-center jira-card" style={{ background: 'var(--color-surface-solid)' }}>
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>Loading active workforce directory...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="jira-card p-10 flex flex-col items-center justify-center text-center space-y-4 rounded-xl" style={{ background: 'var(--color-surface-solid)' }}>
          <Users className="w-12 h-12 text-gray-500" />
          <div>
            <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-1)' }}>0 Team Members</h3>
            <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: 'var(--color-text-3)' }}>Your workforce directory is completely clean. Start onboarding contributors to assign them to projects.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary mt-4"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard First Contributor</span>
          </button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="jira-card p-10 text-center rounded-xl" style={{ background: 'var(--color-surface-solid)', color: 'var(--color-text-3)' }}>
          No employees match the search query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEmployees.map(emp => (
            <div
              key={emp.id}
              className="jira-card p-5 flex flex-col justify-between group transition-all"
              style={{ background: 'var(--color-surface-solid)' }}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-3">

                    <div>
                      <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
                        {emp.full_name}
                      </h3>
                      <p className="text-xs font-medium text-blue-600 mt-0.5">{emp.role_title}</p>
                    </div>
                  </div>

                  <span className="lozenge lozenge-success">
                    Active
                  </span>
                </div>

                <div className="space-y-1.5 text-xs p-3 rounded-lg border border-gray-100 mb-3" style={{ background: 'var(--table-th-bg)' }}>
                  <div className="flex items-center gap-2 truncate" style={{ color: 'var(--color-text-2)' }}>
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-mono text-[11px] truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-200/60" style={{ color: 'var(--color-text-3)' }}>
                    <span>Projects: <b style={{ color: 'var(--color-text-1)' }}>{emp.project_count}</b></span>
                    <span>Active Tasks: <b className="text-blue-600">{emp.active_task_count}</b></span>
                  </div>
                </div>

                {/* Consistency Index */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-green-200 text-xs mb-4" style={{ background: 'rgba(56,221,159,0.12)' }}>
                  <span className="font-semibold text-emerald-800">Daily Log Compliance:</span>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{emp.consistency_score}%</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectEmployee360(emp.id)}
                  className="btn-secondary flex-1 justify-center"
                >
                  <span>View 360° Analysis</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setRemoveTarget({ id: emp.id, full_name: emp.full_name })}
                  title="Remove employee"
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 transition-colors flex-shrink-0"
                  style={{ background: '#FFF5F5' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Remove Employee Confirmation Modal */}
      {removeTarget && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(9,30,66,0.65)', backdropFilter: 'blur(6px)', zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setRemoveTarget(null)}
        >
          <div
            className="w-full max-w-sm jira-card p-6 border shadow-2xl animate-fade-up"
            style={{ background: 'var(--color-surface-solid)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-red-50">
                  <UserMinus className="w-4 h-4 text-red-500" />
                </div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
                  Remove Employee
                </h3>
              </div>
              <button
                onClick={() => setRemoveTarget(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning body */}
            <div className="rounded-lg p-4 mb-5 border border-red-200" style={{ background: '#FFF5F5' }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs" style={{ color: 'var(--color-text-2)' }}>
                  <p className="font-bold text-red-700 mb-1">This action is irreversible.</p>
                  <p>You are about to permanently remove&nbsp;
                    <span className="font-bold" style={{ color: 'var(--color-text-1)' }}>{removeTarget.full_name}</span>
                    &nbsp;from the system. All their daily logs, task assignments, and project memberships will be deleted.
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="btn-secondary"
                disabled={removing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveEmployee}
                disabled={removing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all"
                style={{ background: removing ? '#FCA5A5' : '#DC2626', border: '1px solid #DC2626' }}
              >
                {removing
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />}
                <span>{removing ? 'Removing...' : 'Yes, Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Employee Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(9,30,66,0.65)', backdropFilter: 'blur(6px)', zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md jira-card p-6 border shadow-2xl space-y-4 animate-fade-up"
            style={{ background: 'var(--color-surface-solid)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-50 text-blue-600">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
                  Onboard New Contributor
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-text-2)' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maya Chen"
                  className="jira-input"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-text-2)' }}>Work Email / Username *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. maya.chen@pulsepm.internal"
                  className="jira-input"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-text-2)' }}>Departmental Job Role *</label>
                <input
                  type="text"
                  required
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Fullstack Engineer, QA Lead, UI Designer"
                  className="jira-input"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-text-2)' }}>Initial Password *</label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="jira-input pl-9 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Create Contributor Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
