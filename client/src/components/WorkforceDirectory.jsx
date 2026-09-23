import React, { useState, useEffect, useMemo } from 'react';
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
  UserMinus,
  Edit,
  Layers,
  AlertCircle
} from 'lucide-react';

const EditContributorModal = ({ data, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 relative">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800 mb-4">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
            Edit Contributor Details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold mb-1 uppercase tracking-wider text-slate-600 dark:text-slate-400">Name</label>
            <input
              type="text"
              defaultValue={data?.full_name}
              className="jira-input w-full"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold mb-1 uppercase tracking-wider text-slate-600 dark:text-slate-400">Role</label>
            <input
              type="text"
              defaultValue={data?.role_title}
              placeholder="e.g., Frontend Developer, Backend Developer"
              className="jira-input w-full"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold mb-1 uppercase tracking-wider text-slate-600 dark:text-slate-400">Email</label>
            <input
              type="email"
              defaultValue={data?.email}
              className="jira-input w-full"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 px-4 py-2 rounded-md text-sm font-bold transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function WorkforceDirectory({ onSelectEmployee360 }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeKpiFilter, setActiveKpiFilter] = useState('all'); // 'all' | 'multi' | 'bench'
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null); // { id, full_name }
  const [removing, setRemoving] = useState(false);

  // Edit State
  const [editingContributor, setEditingContributor] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // New employee form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('Senior Frontend Developer');
  const [employmentType, setEmploymentType] = useState('Full Time Contributor');
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

    const handleSyncTasks = () => {
      fetchDirectory();
    };

    window.addEventListener('storage', handleSyncTasks);
    window.addEventListener('pmpulse_listTasks_updated', handleSyncTasks);
    window.addEventListener('pmpulse_boardTasks_updated', handleSyncTasks);
    window.addEventListener('pmpulse_workspaceTasks_updated', handleSyncTasks);

    return () => {
      window.removeEventListener('storage', handleSyncTasks);
      window.removeEventListener('pmpulse_listTasks_updated', handleSyncTasks);
      window.removeEventListener('pmpulse_boardTasks_updated', handleSyncTasks);
      window.removeEventListener('pmpulse_workspaceTasks_updated', handleSyncTasks);
    };
  }, []);

  // Lock body scroll whenever any modal is open
  useEffect(() => {
    const isAnyModalOpen = showAddModal || !!removeTarget || isEditModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddModal, removeTarget, isEditModalOpen]);

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
        employment_type: employmentType,
        password
      });
      alert(`Employee profile for ${fullName} created successfully! Credentials generated.`);
      setShowAddModal(false);
      setFullName('');
      setEmail('');
      setEmploymentType('Full Time Contributor');
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

  // ── Workforce Directory KPIs Calculation ───────────────────────────
  // 1. Total Headcount: total number of members (div cards) present in directory
  const totalHeadcount = employees.length;

  // Reconcile project counts combining DB records and workspace members from localStorage
  const getEmployeeProjectCount = (emp) => {
    let storageCount = 0;
    try {
      const storageProjects = new Set();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pmpulse_workspaceMembers_')) {
          const wsId = key.replace('pmpulse_workspaceMembers_', '');
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const found = list.some(m => {
                if (m.id && emp.id && String(m.id) === String(emp.id)) return true;
                const mName = (m.name || m.full_name || '').trim().toLowerCase();
                const eName = (emp.full_name || '').trim().toLowerCase();
                if (mName && eName && mName === eName) return true;
                const mEmail = (m.email || '').trim().toLowerCase();
                const eEmail = (emp.email || '').trim().toLowerCase();
                if (mEmail && eEmail && mEmail === eEmail) return true;
                return false;
              });
              if (found) {
                storageProjects.add(wsId);
              }
            }
          }
        }
      }
      storageCount = storageProjects.size;
    } catch (err) {
      console.error('Error computing local workspace memberships:', err);
    }
    const dbCount = Number(emp.project_count) || 0;
    return Math.max(dbCount, storageCount);
  };

  // Reconcile and calculate total active tasks assigned to this employee across all projects (List & Board views)
  const getEmployeeActiveTaskCount = (emp) => {
    let storageActiveCount = 0;
    try {
      const countedTaskKeys = new Set();

      // Scan all localStorage keys for project listTasks and boardTasks
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        let projectId = null;
        let isList = false;
        let isBoard = false;

        if (key.startsWith('pmpulse_listTasks_')) {
          projectId = key.replace('pmpulse_listTasks_', '');
          isList = true;
        } else if (key.startsWith('pmpulse_boardTasks_')) {
          projectId = key.replace('pmpulse_boardTasks_', '');
          isBoard = true;
        }

        if (projectId && (isList || isBoard)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const taskList = JSON.parse(raw);
              if (Array.isArray(taskList)) {
                taskList.forEach(task => {
                  if (!task) return;

                  // 1. Check if assigned to this employee
                  let isAssigned = false;
                  if (task.assignee_id && emp.id && String(task.assignee_id) === String(emp.id)) {
                    isAssigned = true;
                  } else if (task.user_id && emp.id && String(task.user_id) === String(emp.id)) {
                    isAssigned = true;
                  } else if (task.assignee && emp.id && String(task.assignee) === String(emp.id)) {
                    isAssigned = true;
                  } else {
                    const empName = (emp.full_name || emp.name || '').trim().toLowerCase();
                    const rawAssignee = typeof task.assignee === 'string' ? task.assignee.trim().toLowerCase() : '';
                    const rawResp = typeof task.Responsible === 'string' ? task.Responsible.trim().toLowerCase() : '';
                    const rawAssignedTo = typeof task.assigned_to === 'string' ? task.assigned_to.trim().toLowerCase() : '';

                    if (empName && (rawAssignee === empName || rawAssignee.replace(/\s+/g, ' ') === empName.replace(/\s+/g, ' ') ||
                                    rawResp === empName || rawResp.replace(/\s+/g, ' ') === empName.replace(/\s+/g, ' ') ||
                                    rawAssignedTo === empName || rawAssignedTo.replace(/\s+/g, ' ') === empName.replace(/\s+/g, ' '))) {
                      isAssigned = true;
                    } else {
                      const empEmail = (emp.email || '').trim().toLowerCase();
                      const rawEmail = typeof task.email === 'string' ? task.email.trim().toLowerCase() : '';
                      if (empEmail && (rawEmail === empEmail || rawAssignee === empEmail || rawResp === empEmail)) {
                        isAssigned = true;
                      }
                    }
                  }

                  if (!isAssigned) return;

                  // 2. Check if task is active (not done/completed/archived/closed)
                  const status = String(task.status || task['Status'] || '').trim().toLowerCase();
                  const isCompleted = ['done', 'completed', 'archived', 'closed', 'remove'].includes(status);
                  if (isCompleted) return;

                  // 3. Deduplicate across list and board views of the same project
                  const taskKey = task.key || task.task_key || task.id ||
                    (task.task || task.title || task.description || task.taskName || task['Issue / Task / Enhancement'] || '').trim().toLowerCase();
                  const uniqueKey = `${projectId}_${taskKey}`;

                  if (!countedTaskKeys.has(uniqueKey)) {
                    countedTaskKeys.add(uniqueKey);
                    storageActiveCount++;
                  }
                });
              }
            } catch (err) {
              console.error(`Error parsing task data for ${key}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error computing local employee active tasks:', err);
    }

    const dbCount = Number(emp.active_task_count) || 0;
    return Math.max(dbCount, storageActiveCount);
  };

  // 2. MultiProject Staff: members working on >1 project
  const multiProjectStaff = employees.filter(emp => getEmployeeProjectCount(emp) > 1).length;

  // 3. Available / Bench: members not present in any project (0 assigned projects)
  const availableMembers = employees.filter(emp => getEmployeeProjectCount(emp) === 0).length;

  // 4. Full Time Contributor: members with category 'Full Time Contributor'
  const fullTimeContributors = employees.filter(emp => !emp.employment_type || !emp.employment_type.toLowerCase().includes('intern')).length;

  // 5. Intern: members with category 'Intern'
  const internContributors = employees.filter(emp => emp.employment_type && emp.employment_type.toLowerCase().includes('intern')).length;

  // ── Filtered Employees (Search + KPI Click Filter) ─────────────────
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      // 1. KPI Filter
      if (activeKpiFilter === 'multi') {
        if (getEmployeeProjectCount(e) <= 1) return false;
      } else if (activeKpiFilter === 'bench') {
        if (getEmployeeProjectCount(e) !== 0) return false;
      } else if (activeKpiFilter === 'fulltime') {
        if (e.employment_type && e.employment_type.toLowerCase().includes('intern')) return false;
      } else if (activeKpiFilter === 'intern') {
        if (!e.employment_type || !e.employment_type.toLowerCase().includes('intern')) return false;
      }

      // 2. Search query filter
      if (search.trim()) {
        const term = search.toLowerCase();
        const matches =
          (e.full_name && e.full_name.toLowerCase().includes(term)) ||
          (e.role_title && e.role_title.toLowerCase().includes(term)) ||
          (e.email && e.email.toLowerCase().includes(term));
        if (!matches) return false;
      }

      return true;
    });
  }, [employees, activeKpiFilter, search]);

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

      {/* ── Workforce Summary KPIs ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Headcount */}
        <div
          onClick={() => setActiveKpiFilter('all')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveKpiFilter('all'); } }}
          className={`jira-card p-4 sm:p-4.5 rounded-2xl flex items-center gap-3.5 border shadow-sm cursor-pointer select-none transition-all ${
            activeKpiFilter === 'all'
              ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/25 bg-indigo-50/15 dark:bg-indigo-950/20'
              : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 hover:shadow-md'
          }`}
          style={{ background: 'var(--color-surface-solid)' }}
          title="Click to view all employees (reset filter)"
        >
          <div
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              background: 'rgba(99, 102, 241, 0.12)',
              borderColor: 'rgba(99, 102, 241, 0.25)',
              color: '#818cf8',
            }}
          >
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[11px] font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 truncate"
              style={{ color: 'var(--color-text-3)' }}
            >
              <span>TOTAL HEADCOUNT</span>
              {activeKpiFilter === 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block shrink-0" title="Active Filter" />
              )}
            </div>
            <div
              className="text-2xl sm:text-3xl font-extrabold leading-tight my-0.5"
              style={{ color: 'var(--color-text-1)' }}
            >
              {totalHeadcount}
            </div>
            <div
              className="text-xs truncate"
              style={{ color: 'var(--color-text-3)' }}
            >
              Actual company employees
            </div>
          </div>
        </div>

        {/* KPI 2: Multi-Project Staff */}
        <div
          onClick={() => setActiveKpiFilter(prev => prev === 'multi' ? 'all' : 'multi')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveKpiFilter(prev => prev === 'multi' ? 'all' : 'multi'); } }}
          className={`jira-card p-4 sm:p-4.5 rounded-2xl flex items-center gap-3.5 border shadow-sm cursor-pointer select-none transition-all ${
            activeKpiFilter === 'multi'
              ? 'border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/25 bg-amber-50/15 dark:bg-amber-950/20'
              : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 hover:shadow-md'
          }`}
          style={{ background: 'var(--color-surface-solid)' }}
          title={activeKpiFilter === 'multi' ? "Active filter. Click to reset to all employees." : "Click to filter employees working on >1 project"}
        >
          <div
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              background: 'rgba(238, 178, 13, 0.12)',
              borderColor: 'rgba(238, 178, 13, 0.3)',
              color: '#eeb20d',
            }}
          >
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[11px] font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 truncate"
              style={{ color: 'var(--color-text-3)' }}
            >
              <span>MULTI-PROJECT STAFF</span>
              {activeKpiFilter === 'multi' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" title="Active Filter" />
              )}
            </div>
            <div
              className="text-2xl sm:text-3xl font-extrabold leading-tight my-0.5"
              style={{ color: '#eeb20d' }}
            >
              {multiProjectStaff}
            </div>
            <div
              className="text-xs truncate"
              style={{ color: 'var(--color-text-3)' }}
            >
              Working on &gt;1 project
            </div>
          </div>
        </div>

        {/* KPI 3: Available / Bench */}
        <div
          onClick={() => setActiveKpiFilter(prev => prev === 'bench' ? 'all' : 'bench')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveKpiFilter(prev => prev === 'bench' ? 'all' : 'bench'); } }}
          className={`jira-card p-4 sm:p-4.5 rounded-2xl flex items-center gap-3.5 border shadow-sm cursor-pointer select-none transition-all ${
            activeKpiFilter === 'bench'
              ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/25 bg-blue-50/15 dark:bg-blue-950/20'
              : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 hover:shadow-md'
          }`}
          style={{ background: 'var(--color-surface-solid)' }}
          title={activeKpiFilter === 'bench' ? "Active filter. Click to reset to all employees." : "Click to filter available / bench employees (0 projects)"}
        >
          <div
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              background: 'rgba(148, 163, 184, 0.12)',
              borderColor: 'rgba(148, 163, 184, 0.25)',
              color: 'var(--color-text-2)',
            }}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[11px] font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 truncate"
              style={{ color: 'var(--color-text-3)' }}
            >
              <span>AVAILABLE / BENCH</span>
              {activeKpiFilter === 'bench' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block shrink-0" title="Active Filter" />
              )}
            </div>
            <div
              className="text-2xl sm:text-3xl font-extrabold leading-tight my-0.5"
              style={{ color: 'var(--color-text-2)' }}
            >
              {availableMembers}
            </div>
            <div
              className="text-xs truncate"
              style={{ color: 'var(--color-text-3)' }}
            >
              0 assigned projects
            </div>
          </div>
        </div>

        {/* KPI 4: Full Time Contributor */}
        <div
          onClick={() => setActiveKpiFilter(prev => prev === 'fulltime' ? 'all' : 'fulltime')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveKpiFilter(prev => prev === 'fulltime' ? 'all' : 'fulltime'); } }}
          className={`jira-card p-4 sm:p-4.5 rounded-2xl flex items-center gap-3.5 border shadow-sm cursor-pointer select-none transition-all ${
            activeKpiFilter === 'fulltime'
              ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/25 bg-blue-50/15 dark:bg-blue-950/20'
              : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 hover:shadow-md'
          }`}
          style={{ background: 'var(--color-surface-solid)' }}
          title={activeKpiFilter === 'fulltime' ? "Active filter. Click to reset to all employees." : "Click to filter full time contributors"}
        >
          <div
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              background: 'rgba(59, 130, 246, 0.12)',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              color: '#3b82f6',
            }}
          >
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[11px] font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 truncate"
              style={{ color: 'var(--color-text-3)' }}
            >
              <span>FULL TIME CONTRIBUTOR</span>
              {activeKpiFilter === 'fulltime' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block shrink-0" title="Active Filter" />
              )}
            </div>
            <div
              className="text-2xl sm:text-3xl font-extrabold leading-tight my-0.5 text-blue-600 dark:text-blue-400"
            >
              {fullTimeContributors}
            </div>
            <div
              className="text-xs truncate"
              style={{ color: 'var(--color-text-3)' }}
            >
              Full time workforce
            </div>
          </div>
        </div>

        {/* KPI 5: Intern */}
        <div
          onClick={() => setActiveKpiFilter(prev => prev === 'intern' ? 'all' : 'intern')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveKpiFilter(prev => prev === 'intern' ? 'all' : 'intern'); } }}
          className={`jira-card p-4 sm:p-4.5 rounded-2xl flex items-center gap-3.5 border shadow-sm cursor-pointer select-none transition-all ${
            activeKpiFilter === 'intern'
              ? 'border-purple-500 dark:border-purple-400 ring-2 ring-purple-500/25 bg-purple-50/15 dark:bg-purple-950/20'
              : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 hover:shadow-md'
          }`}
          style={{ background: 'var(--color-surface-solid)' }}
          title={activeKpiFilter === 'intern' ? "Active filter. Click to reset to all employees." : "Click to filter intern contributors"}
        >
          <div
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              background: 'rgba(168, 85, 247, 0.12)',
              borderColor: 'rgba(168, 85, 247, 0.3)',
              color: '#a855f7',
            }}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[11px] font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 truncate"
              style={{ color: 'var(--color-text-3)' }}
            >
              <span>INTERN</span>
              {activeKpiFilter === 'intern' && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block shrink-0" title="Active Filter" />
              )}
            </div>
            <div
              className="text-2xl sm:text-3xl font-extrabold leading-tight my-0.5 text-purple-600 dark:text-purple-400"
            >
              {internContributors}
            </div>
            <div
              className="text-xs truncate"
              style={{ color: 'var(--color-text-3)' }}
            >
              Intern contributors
            </div>
          </div>
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
        <div className="jira-card p-10 text-center rounded-xl space-y-2" style={{ background: 'var(--color-surface-solid)', color: 'var(--color-text-3)' }}>
          <Users className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-1)' }}>
            {search.trim() && activeKpiFilter !== 'all'
              ? `No employees match "${search}" in the active ${
                  activeKpiFilter === 'multi' ? 'Multi-Project Staff' :
                  activeKpiFilter === 'bench' ? 'Available / Bench' :
                  activeKpiFilter === 'fulltime' ? 'Full Time Contributor' :
                  activeKpiFilter === 'intern' ? 'Intern' :
                  'selected'
                } filter.`
              : search.trim()
              ? `No employees match "${search}".`
              : activeKpiFilter === 'bench'
              ? 'No available / bench employees found (all employees are currently assigned to active projects).'
              : activeKpiFilter === 'multi'
              ? 'No multi-project staff found (no employees are assigned to >1 project).'
              : activeKpiFilter === 'fulltime'
              ? 'No full time contributors found in the directory.'
              : activeKpiFilter === 'intern'
              ? 'No interns found in the directory.'
              : 'No employees found.'}
          </p>
          {activeKpiFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveKpiFilter('all')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-2 cursor-pointer underline"
            >
              Reset filter to view all employees
            </button>
          )}
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
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <p className="text-xs font-medium text-blue-600">{emp.role_title}</p>
                        {emp.employment_type && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            emp.employment_type.toLowerCase().includes('intern')
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}>
                            {emp.employment_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="lozenge lozenge-success">
                    Active
                  </span>
                </div>

                <div className="space-y-1.5 text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 mb-3" style={{ background: 'var(--table-th-bg)' }}>
                  <div className="flex items-center gap-2 truncate" style={{ color: 'var(--color-text-2)' }}>
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-mono text-[11px] truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80" style={{ color: 'var(--color-text-3)' }}>
                    <span>Projects: <b style={{ color: 'var(--color-text-1)' }}>{getEmployeeProjectCount(emp)}</b></span>
                    <span>Active Tasks: <b className="text-blue-600">{getEmployeeActiveTaskCount(emp)}</b></span>
                  </div>
                </div>

                {/* Consistency Index */}
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-500/20 dark:border-emerald-500/30 text-xs mb-4" style={{ background: 'rgba(56,221,159,0.08)' }}>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">Daily Log Compliance:</span>
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{emp.consistency_score}%</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => {
                    setEditingContributor(emp);
                    setIsEditModalOpen(true);
                  }}
                  title="Edit employee"
                  className="p-2 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <Edit size={18} />
                </button>
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

              {/* Contributor Role Type Option / Toggle Switch (Full Time Contributor / Intern) */}
              <div>
                <label className="block font-bold mb-1.5 uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-text-2)' }}>
                  Role Type / Category *
                </label>

                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg border border-slate-700/50 bg-slate-900/40">
                  <button
                    type="button"
                    onClick={() => setEmploymentType('Full Time Contributor')}
                    className={`py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      employmentType === 'Full Time Contributor'
                        ? 'bg-blue-600 text-white shadow-sm border border-blue-500'
                        : 'bg-transparent text-slate-400 border border-transparent hover:bg-slate-800'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Full Time Contributor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmploymentType('Intern')}
                    className={`py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      employmentType === 'Intern'
                        ? 'bg-purple-600 text-white shadow-sm border border-purple-500'
                        : 'bg-transparent text-slate-400 border border-transparent hover:bg-slate-800'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Intern</span>
                  </button>
                </div>
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
      {/* Edit Contributor Modal Shell */}
      {isEditModalOpen && (
        <EditContributorModal data={editingContributor} onClose={() => setIsEditModalOpen(false)} />
      )}
    </div>
  );
}
