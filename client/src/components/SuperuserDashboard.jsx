import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Users,
  UserPlus,
  Mail,
  CheckCircle2,
  Key,
  RefreshCw,
  Search,
  X,
  ShieldAlert,
  Trash2,
  Edit2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AICopilotPanel from './AICopilotPanel';
import PMDetailsPage from './PMDetailsPage';

export default function SuperuserDashboard() {
  const { user } = useAuth();
  const [pms, setPMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPM, setSelectedPM] = useState(null);
  const [selectedPMForDetails, setSelectedPMForDetails] = useState(null);

  // New PM form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);

  // Edit PM form & status toggle
  const [editingPM, setEditingPM] = useState(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoleTitle, setEditRoleTitle] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchPMs = async () => {
    try {
      setLoading(true);
      const res = await api.pms.getAll();
      setPMs(res.pms || []);
    } catch (err) {
      console.error('Failed to fetch PM directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPMs();
  }, []);

  // Lock body scroll whenever modal is open
  useEffect(() => {
    if (showAddModal || editingPM || selectedPM) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddModal, editingPM, selectedPM]);

  const handleRemovePM = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.pms.remove(id);
      setPMs(pms.filter(pm => pm.id !== id));
    } catch (err) {
      alert(`Failed to remove PM: ${err.message}`);
    }
  };

  const handleOpenEdit = (pm) => {
    setEditingPM(pm);
    setEditFullName(pm.full_name || '');
    setEditEmail(pm.email || '');
    setEditRoleTitle(pm.role_title || 'Project Manager');
    setEditStatus((pm.status || 'active').toLowerCase());
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFullName || !editEmail) {
      alert('Please fill out full name and email.');
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await api.pms.update(editingPM.id, {
        full_name: editFullName,
        email: editEmail,
        role_title: editRoleTitle,
        status: editStatus
      });
      setPMs(prev => prev.map(p => p.id === editingPM.id ? { ...p, ...res.pm } : p));
      if (selectedPM && selectedPM.id === editingPM.id) {
        setSelectedPM(res.pm);
      }
      setEditingPM(null);
    } catch (err) {
      alert(`Failed to update PM: ${err.message}`);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCreatePM = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      alert('Please fill out all fields.');
      return;
    }

    setSubmitting(true);
    try {
      await api.pms.create({
        full_name: fullName,
        email,
        password
      });
      alert(`Project Manager profile for ${fullName} created successfully!`);
      setShowAddModal(false);
      setFullName('');
      setEmail('');
      setPassword('password123');
      fetchPMs();
    } catch (err) {
      alert(`Failed to create PM: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPMs = pms.filter(pm => {
    const term = search.toLowerCase();
    return (
      pm.full_name.toLowerCase().includes(term) ||
      pm.email.toLowerCase().includes(term)
    );
  });

  // If a PM is selected for the Details Page, render the dedicated Details Page
  if (selectedPMForDetails) {
    return (
      <>
        <PMDetailsPage
          pm={selectedPMForDetails}
          onBack={() => setSelectedPMForDetails(null)}
        />
        <AICopilotPanel
          role="superuser"
          title="Superuser Fleet Copilot"
          subtitle="Fleet Health & Cross-Project Telemetry"
          endpoint="/copilot/superuser"
          userName={user?.full_name || user?.fullName || 'Administrator'}
          suggestedInquiries={[
            "Provide a fleet-wide health summary of all project managers and their workspaces.",
            "Which project managers have projects with stalled tasks or low activity?",
            "What is the total headcount and project distribution across the organization?",
            "Which PM accounts were recently created and how many teams do they oversee?"
          ]}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-up">
        {/* Header & Create PM Action */}
        <div className="jira-card p-5 flex flex-wrap items-center justify-between gap-4" style={{ background: 'var(--color-surface-solid)' }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[var(--accent-gold)] text-[#1a1814]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text-1)' }}>
                Superuser Administration Hub
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-3)' }}>
                Provision and manage Project Managers for PMPulse
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Project Managers..."
                className="jira-input pr-4 py-2 text-sm w-full sm:w-72"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary py-2 px-4 text-sm w-full sm:w-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Project Manager</span>
            </button>
          </div>
        </div>

        {/* Directory Grid */}
        {loading ? (
          <div className="py-20 text-center jira-card" style={{ background: 'var(--color-surface-solid)' }}>
            <RefreshCw className="w-8 h-8 animate-spin text-[var(--accent-gold)] mx-auto mb-2" />
            <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>Loading Project Managers...</p>
          </div>
        ) : filteredPMs.length === 0 ? (
          <div className="jira-card p-10 text-center rounded-xl" style={{ background: 'var(--color-surface-solid)', color: 'var(--color-text-3)' }}>
            No Project Managers found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPMs.map(pm => (
              <div
                key={pm.id}
                className="jira-card p-5 flex flex-col justify-between group transition-all cursor-pointer hover:border-[var(--accent-gold)]"
                style={{ background: 'var(--color-surface-solid)' }}
                onClick={() => setSelectedPMForDetails(pm)}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
                          {pm.full_name}
                        </h3>
                        <p className="text-xs font-medium text-[var(--accent-gold)] mt-0.5">{pm.role_title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`lozenge ${pm.status === 'inactive' ? 'bg-slate-700/60 text-slate-300 border border-slate-600' : 'lozenge-success'}`}>
                        {pm.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPMForDetails(pm);
                        }}
                        className="btn-secondary py-1 px-2.5 text-xs font-semibold flex items-center gap-1.5 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-all cursor-pointer"
                        title="View Details Page"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(pm);
                        }}
                        className="text-gray-400 hover:text-[var(--accent-gold)] p-1 rounded transition-colors"
                        title="Edit Project Manager"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePM(pm.id, pm.full_name);
                        }}
                        className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors"
                        title="Remove Project Manager"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs p-3 rounded-lg border border-gray-100 mb-3" style={{ background: 'var(--table-th-bg)' }}>
                    <div className="flex items-center gap-2 truncate" style={{ color: 'var(--color-text-2)' }}>
                      <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-mono text-[11px] truncate">{pm.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create PM Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md jira-card p-6 border shadow-2xl space-y-4 animate-fade-up"
            style={{ background: 'var(--color-surface-solid)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[var(--accent-gold)] text-[#1a1814]">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
                  Provision Project Manager
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePM} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-text-2)' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
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
                  placeholder="e.g. alex.mercer@pulsepm.internal"
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
                  <span>Create PM Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit PM Modal */}
      {editingPM && (
        <div
          className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setEditingPM(null)}
        >
          <div
            className="w-full max-w-md jira-card p-6 border shadow-2xl space-y-4 animate-fade-up"
            style={{ background: 'var(--color-surface-solid)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[var(--accent-gold)] text-[#1a1814]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
                  Edit Project Manager
                </h3>
              </div>
              <button
                onClick={() => setEditingPM(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-text-2)' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  className="jira-input"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-text-2)' }}>Work Email *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="e.g. alex.mercer@pulsepm.internal"
                  className="jira-input"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-text-2)' }}>Role Title</label>
                <input
                  type="text"
                  value={editRoleTitle}
                  onChange={(e) => setEditRoleTitle(e.target.value)}
                  placeholder="e.g. Project Manager"
                  className="jira-input"
                />
              </div>

              {/* Status Toggle (Active / Inactive) */}
              <div>
                <label className="block font-bold mb-1.5 uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-text-2)' }}>
                  Status *
                </label>
                <div className="p-3 rounded-lg border border-slate-700/50 bg-slate-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Project Manager Status:
                    </span>
                    <span className={`lozenge ${editStatus === 'active' ? 'lozenge-success' : 'bg-slate-700/60 text-slate-300 border border-slate-600'}`}>
                      {editStatus === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditStatus('active')}
                      className={`py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        editStatus === 'active'
                          ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                          : 'bg-transparent text-slate-400 border border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStatus('inactive')}
                      className={`py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        editStatus === 'inactive'
                          ? 'bg-amber-600 text-white shadow-sm border border-amber-500'
                          : 'bg-transparent text-slate-400 border border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Inactive</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingPM(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="btn-primary"
                >
                  {editSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Edit2 className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PM Details Modal */}
      {selectedPM && (
        <div
          className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setSelectedPM(null)}
        >
          <div
            className="w-full max-w-md jira-card p-6 border shadow-2xl space-y-4 animate-fade-up"
            style={{ background: 'var(--color-surface-solid)' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-[var(--accent-gold)] text-[#1a1814]">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
                  Project Manager Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedPM(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-sm" style={{ color: 'var(--color-text-2)' }}>
              <div>
                <strong className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">Full Name</strong>
                <p style={{ color: 'var(--color-text-1)' }}>{selectedPM.full_name}</p>
              </div>
              <div>
                <strong className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">Email</strong>
                <p className="font-mono">{selectedPM.email}</p>
              </div>
              <div>
                <strong className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">Role</strong>
                <p className="text-[var(--accent-gold)]">{selectedPM.role_title}</p>
              </div>
              <div>
                <strong className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">Status</strong>
                <span className={`lozenge ${selectedPM.status === 'active' ? 'lozenge-success' : 'bg-gray-700 text-gray-300'}`}>
                  {selectedPM.status}
                </span>
              </div>
              {selectedPM.created_at && (
                <div>
                  <strong className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1">Created At</strong>
                  <p>{new Date(selectedPM.created_at).toLocaleString()}</p>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => setSelectedPM(null)} className="btn-secondary">
                    Close
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Role-Scoped Conversational AI Copilot */}
      <AICopilotPanel
        role="superuser"
        title="Superuser Fleet Copilot"
        subtitle="Fleet Health & Cross-Project Telemetry"
        endpoint="/copilot/superuser"
        userName={user?.full_name || user?.fullName || 'Administrator'}
        suggestedInquiries={[
          "Provide a fleet-wide health summary of all project managers and their workspaces.",
          "Which project managers have projects with stalled tasks or low activity?",
          "What is the total headcount and project distribution across the organization?",
          "Which PM accounts were recently created and how many teams do they oversee?"
        ]}
      />
    </>
  );
}
