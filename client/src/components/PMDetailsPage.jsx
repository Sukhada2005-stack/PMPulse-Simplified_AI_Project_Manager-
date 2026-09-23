import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  FolderGit2,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import { api } from '../services/api';
import { PriorityBadge, CategoryBadge } from './OtherWorkspaces';

const getSafeStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return fallback;
  }
};

/* ── Status badge matching project cards in Project Archives ── */
function StatusBadge({ status }) {
  const s = (status || 'active').toLowerCase();
  let cls = 'lozenge ';
  let label = status || 'Active';

  if (s === 'active') {
    cls += 'lozenge-success';
    label = 'Active';
  } else if (s === 'completed' || s === 'complete') {
    cls += 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
    label = 'Complete';
  } else if (s === 'inactive') {
    cls += 'bg-slate-700/60 text-slate-300 border border-slate-600';
    label = 'Inactive';
  } else if (s === 'in-review' || s === 'in_review') {
    cls += 'lozenge-warn';
    label = 'In-Review';
  } else if (s === 'archived') {
    cls += 'lozenge-default';
    label = 'Archived';
  } else {
    cls += 'lozenge-success';
  }

  return <span className={cls}>{label}</span>;
}

const parseDate = (val) => {
  if (!val || val === '—' || val === '-') return null;
  if (typeof val === 'number') {
    if (val > 25000 && val < 60000) return new Date((val - 25569) * 86400 * 1000);
    return new Date(val);
  }
  const s = String(val).trim();
  if (!isNaN(Number(s)) && Number(s) > 25000 && Number(s) < 60000) {
    return new Date((Number(s) - 25569) * 86400 * 1000);
  }
  const parts = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    const year = parseInt(parts[3], 10);
    return new Date(year, month, day);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const DONE_SET = new Set(['Done', 'Completed', 'Remove', 'completed', 'archived', 'Archived', 'Complete']);

const isHighPriority = (task) => {
  if (task.is_escalated || task.escalated || task.isEscalated) return true;
  const p = task.priority || task['Priority'] || task.Priority || task.priority_level;
  if (!p) return false;
  const norm = String(p).trim().toLowerCase();
  return (
    norm === 'high' ||
    norm === 'highest' ||
    norm === 'urgent' ||
    norm === 'critical' ||
    norm === 'escalated' ||
    norm === 'p1' ||
    norm === 'blocker' ||
    norm.startsWith('high') ||
    norm.includes('urgent') ||
    norm.includes('critical') ||
    norm.includes('escalat')
  );
};

export default function PMDetailsPage({ pm, onBack }) {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingWorkforce, setLoadingWorkforce] = useState(true);
  const [activeTable, setActiveTable] = useState(null); // 'projects' | 'overdue' | 'workforce' | null

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!pm?.id) return;
      try {
        setLoading(true);
        setLoadingWorkforce(true);
        const [projRes, workRes] = await Promise.all([
          api.pms.getProjects(pm.id).catch(err => {
            console.error('Failed to fetch PM projects:', err);
            return { projects: [] };
          }),
          api.pms.getWorkforce(pm.id).catch(err => {
            console.error('Failed to fetch PM workforce:', err);
            return { employees: [] };
          })
        ]);
        if (isMounted) {
          setProjects(projRes.projects || []);
          setEmployees(workRes.employees || []);
        }
      } catch (err) {
        console.error('Failed to fetch PM details data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setLoadingWorkforce(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [pm?.id]);

  // Reconcile and calculate total active tasks assigned to an employee across all projects (matching WorkforceDirectory mechanism)
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

  /* ── Overdue Tasks per Project & Total Calculation ── */
  const projectOverdueData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dedupeById = (arr) => {
      const seen = new Map();
      (arr || []).forEach(t => {
        if (!t) return;
        const key = String(t.id ?? t.key ?? t.title ?? t['Issue / Task / Enhancement'] ?? Math.random());
        if (!seen.has(key)) seen.set(key, t);
      });
      return Array.from(seen.values());
    };

    return projects.map(proj => {
      const wsId = proj.id;

      // 1. Database tasks returned with project
      const rawDbTasks = Array.isArray(proj.tasks) ? proj.tasks : [];

      // 2. Local storage tasks from board view, list view, backlog, and workspace
      const localWorkspaceTasks = getSafeStorage(`pmpulse_workspaceTasks_${wsId}`, []);
      const localListTasks = getSafeStorage(`pmpulse_listTasks_${wsId}`, []);
      const localBoardTasks = getSafeStorage(`pmpulse_boardTasks_${wsId}`, []);
      const localSprintTasks = getSafeStorage(`pmpulse_sprintBacklogTasks_${wsId}`, []);
      const localBoardBacklogTasks = getSafeStorage(`pmpulse_boardBacklogTasks_${wsId}`, []);

      const allLocalTasks = dedupeById([
        ...localWorkspaceTasks,
        ...localListTasks,
        ...localBoardTasks,
        ...localSprintTasks,
        ...localBoardBacklogTasks
      ]);

      const localTaskMap = new Map();
      allLocalTasks.forEach(t => {
        if (t.id != null) localTaskMap.set(String(t.id), t);
        if (t.key != null) localTaskMap.set(String(t.key), t);
        const titleKey = (t.title || t['Issue / Task / Enhancement'] || t.task || t.taskName || t.description || '').toLowerCase().trim();
        if (titleKey) localTaskMap.set(titleKey, t);
      });

      const mergeTask = (task) => {
        const titleKey = (task.title || task['Issue / Task / Enhancement'] || task.task || task.taskName || task.description || '').toLowerCase().trim();
        const local = localTaskMap.get(String(task.id)) ||
                      (task.key ? localTaskMap.get(String(task.key)) : null) ||
                      (titleKey ? localTaskMap.get(titleKey) : null);
        const merged = local ? { ...task, ...local } : { ...task };
        const due = (merged.dueDate && merged.dueDate !== '—') 
          ? merged.dueDate 
          : ((merged.due_date && merged.due_date !== '—') 
              ? merged.due_date 
              : ((merged['Completed'] && merged['Completed'] !== '—') ? merged['Completed'] : null));
        const prio = merged.priority || merged['Priority'] || 'Medium';
        const stat = merged.status || merged['Status'] || 'To Do';
        return {
          ...merged,
          dueDate: due,
          priority: prio,
          status: stat
        };
      };

      const dbMerged = rawDbTasks.map(mergeTask);
      const dbIds = new Set(rawDbTasks.map(t => String(t.id)));
      const localOnlyTasks = allLocalTasks
        .filter(t => t.id != null && !dbIds.has(String(t.id)))
        .map(mergeTask);

      const fullTasks = dedupeById([...dbMerged, ...localOnlyTasks]);

      let totalOverdue = 0;
      let highPriorityOverdue = 0;

      fullTasks.forEach(t => {
        const due = (t.dueDate && t.dueDate !== '—') 
          ? t.dueDate 
          : ((t.due_date && t.due_date !== '—') 
              ? t.due_date 
              : ((t['Completed'] && t['Completed'] !== '—') ? t['Completed'] : null));
        const d = parseDate(due);
        if (!d) return;
        d.setHours(0, 0, 0, 0);
        const s = t.status || t['Status'];
        if (d < today && !DONE_SET.has(s)) {
          totalOverdue += 1;
          if (isHighPriority(t)) {
            highPriorityOverdue += 1;
          }
        }
      });

      return {
        id: proj.id,
        name: proj.title || proj.name || 'Untitled Project',
        totalOverdueTasks: totalOverdue,
        highPriorityOverdueTasks: highPriorityOverdue,
      };
    });
  }, [projects]);

  const totalOverdueCount = useMemo(() => {
    return projectOverdueData.reduce((sum, item) => sum + item.totalOverdueTasks, 0);
  }, [projectOverdueData]);

  if (!pm) return null;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header bar matching Superuser Administration Hub */}
      <div
        className="jira-card p-5 flex flex-wrap items-center justify-between gap-4"
        style={{ background: 'var(--color-surface-solid)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-2 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-colors cursor-pointer"
            title="Return to Superuser Administration Hub"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Hub</span>
          </button>
          <div className="h-6 w-px bg-slate-700/60 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text-1)' }}>
                {pm.full_name}
              </h1>
              <span className={`lozenge ${pm.status === 'inactive' ? 'bg-slate-700/60 text-slate-300 border border-slate-600' : 'lozenge-success'}`}>
                {pm.status === 'inactive' ? 'Inactive' : 'Active'}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-3)' }}>
              Project Manager Details &bull; <span className="font-mono">{pm.email}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── KPIs Section (under the Project manager_name div) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Total Projects KPI */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTable(prev => prev === 'projects' ? null : 'projects')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTable(prev => prev === 'projects' ? null : 'projects');
            }
          }}
          className={`jira-card p-5 cursor-pointer transition-all duration-200 select-none group ${
            activeTable === 'projects'
              ? 'border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]/40 shadow-lg'
              : 'hover:border-[var(--accent-gold)]'
          }`}
          style={{ background: 'var(--color-surface-solid)' }}
          title={activeTable === 'projects' ? 'Click to hide projects table' : 'Click to view all projects'}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                Total Projects
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-blue-500">
                  {loading ? (
                    <Loader2 className="w-7 h-7 animate-spin inline text-blue-500" />
                  ) : (
                    projects.length
                  )}
                </h3>
              </div>
              <p className="text-[11px] mt-2 flex items-center gap-1 font-medium text-[var(--accent-gold)]">
                {activeTable === 'projects' ? (
                  <>
                    <span>Hide projects table</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Click to view project details</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </p>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500/20 transition-colors">
              <FolderGit2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 2. OverDued Task KPI (in succession to Total Projects KPI) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTable(prev => prev === 'overdue' ? null : 'overdue')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTable(prev => prev === 'overdue' ? null : 'overdue');
            }
          }}
          className={`jira-card p-5 cursor-pointer transition-all duration-200 select-none group ${
            activeTable === 'overdue'
              ? 'border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]/40 shadow-lg'
              : 'hover:border-[var(--accent-gold)]'
          }`}
          style={{ background: 'var(--color-surface-solid)' }}
          title={activeTable === 'overdue' ? 'Click to hide overdue breakdown' : 'Click to view overdue breakdown by project'}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                OverDued Task
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-red-500">
                  {loading ? (
                    <Loader2 className="w-7 h-7 animate-spin inline text-red-500" />
                  ) : (
                    totalOverdueCount
                  )}
                </h3>
              </div>
              <p className="text-[11px] mt-2 flex items-center gap-1 font-medium text-[var(--accent-gold)]">
                {activeTable === 'overdue' ? (
                  <>
                    <span>Hide overdue table</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Click to view overdue breakdown</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </p>
            </div>
            <div className="p-2.5 bg-red-500/10 rounded-lg text-red-500 group-hover:bg-red-500/20 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 3. Total Workforce KPI (in succession to OverDued KPI) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTable(prev => prev === 'workforce' ? null : 'workforce')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTable(prev => prev === 'workforce' ? null : 'workforce');
            }
          }}
          className={`jira-card p-5 cursor-pointer transition-all duration-200 select-none group ${
            activeTable === 'workforce'
              ? 'border-[var(--accent-gold)] ring-1 ring-[var(--accent-gold)]/40 shadow-lg'
              : 'hover:border-[var(--accent-gold)]'
          }`}
          style={{ background: 'var(--color-surface-solid)' }}
          title={activeTable === 'workforce' ? 'Click to hide workforce table' : 'Click to view workforce directory'}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
                Total Workforce
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-purple-400">
                  {loadingWorkforce ? (
                    <Loader2 className="w-7 h-7 animate-spin inline text-purple-400" />
                  ) : (
                    employees.length
                  )}
                </h3>
              </div>
              <p className="text-[11px] mt-2 flex items-center gap-1 font-medium text-[var(--accent-gold)]">
                {activeTable === 'workforce' ? (
                  <>
                    <span>Hide workforce table</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Click to view workforce directory</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </p>
            </div>
            <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Table 1: Projects Table (Appears when clicking Total Projects KPI) ── */}
      {activeTable === 'projects' && (
        <div className="jira-card p-5 space-y-4 animate-fade-up" style={{ background: 'var(--color-surface-solid)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-700/50 pb-3">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-bold tracking-tight" style={{ color: 'var(--color-text-1)' }}>
                Projects under {pm.full_name} ({projects.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {projects.filter(p => (p.status || '').toLowerCase() === 'active').length} Active &bull;{' '}
              {projects.filter(p => (p.status || '').toLowerCase() !== 'active').length} Inactive / Complete
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-700/60">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Total Tasks</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">End Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--accent-gold)]" />
                      <span>Loading projects...</span>
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      No projects found under this Project Manager.
                    </td>
                  </tr>
                ) : (
                  projects.map((proj) => (
                    <tr
                      key={proj.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-4 py-3 font-semibold text-slate-100">
                        <div>
                          <span>{proj.title || proj.name || 'Untitled Project'}</span>
                          {proj.description && (
                            <p className="text-xs font-normal text-slate-400 line-clamp-1 mt-0.5 max-w-xs">
                              {proj.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <CategoryBadge category={proj.category} />
                      </td>

                      {/* Status (active/complete) */}
                      <td className="px-4 py-3">
                        <StatusBadge status={proj.status} />
                      </td>

                      {/* Members */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#eeb20d' }}>
                          <Users className="w-3.5 h-3.5" />
                          <span>{proj.member_count ?? 0}</span>
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        <PriorityBadge priority={proj.priority} />
                      </td>

                      {/* Total Tasks */}
                      <td className="px-4 py-3">
                        <span className="lozenge lozenge-default font-mono">
                          {proj.task_count ?? 0} Tasks
                        </span>
                      </td>

                      {/* Start Date */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {proj.start_date || '—'}
                      </td>

                      {/* End Date */}
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {proj.end_date || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Table 2: Overdue Tasks Breakdown Table (Appears when clicking OverDued Task KPI) ── */}
      {activeTable === 'overdue' && (
        <div className="jira-card p-5 space-y-4 animate-fade-up" style={{ background: 'var(--color-surface-solid)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-700/50 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-bold tracking-tight" style={{ color: 'var(--color-text-1)' }}>
                Overdue Tasks Breakdown &bull; {pm.full_name}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="lozenge bg-red-500/15 text-red-400 border border-red-500/30">
                {totalOverdueCount} Total Overdue
              </span>
              <span className="text-slate-400">across {projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-700/60">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Total Overdue Tasks</th>
                  <th className="px-4 py-3">High Priority Tasks from Overdues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-red-500" />
                      <span>Calculating overdue tasks...</span>
                    </td>
                  </tr>
                ) : projectOverdueData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                      No projects found under this Project Manager.
                    </td>
                  </tr>
                ) : (
                  projectOverdueData.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Project Name */}
                      <td className="px-4 py-3 font-semibold text-slate-100">
                        <span>{item.name}</span>
                      </td>

                      {/* Total Overdue Tasks */}
                      <td className="px-4 py-3">
                        {item.totalOverdueTasks > 0 ? (
                          <span className="lozenge bg-red-500/15 text-red-400 border border-red-500/30 font-mono font-bold">
                            {item.totalOverdueTasks} {item.totalOverdueTasks === 1 ? 'Task' : 'Tasks'}
                          </span>
                        ) : (
                          <span className="lozenge lozenge-default font-mono">
                            0 Tasks
                          </span>
                        )}
                      </td>

                      {/* High Priority Tasks from Overdues */}
                      <td className="px-4 py-3">
                        {item.highPriorityOverdueTasks > 0 ? (
                          <span className="lozenge font-semibold flex items-center gap-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <span>⚡</span>
                            <span>{item.highPriorityOverdueTasks} {item.highPriorityOverdueTasks === 1 ? 'Task' : 'Tasks'}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">
                            0
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Table 3: Workforce Directory Table (Appears when clicking Total Workforce KPI) ── */}
      {activeTable === 'workforce' && (
        <div className="jira-card p-5 space-y-4 animate-fade-up" style={{ background: 'var(--color-surface-solid)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-700/50 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold tracking-tight" style={{ color: 'var(--color-text-1)' }}>
                Workforce Directory &bull; {pm.full_name} ({employees.length})
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="lozenge bg-purple-500/15 text-purple-400 border border-purple-500/30">
                {employees.length} Total Headcount
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-700/60">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <th className="px-4 py-3">Names (of members)</th>
                  <th className="px-4 py-3">Deparmental Job Role</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Work Email</th>
                  <th className="px-4 py-3">Active Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loadingWorkforce ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                      <span>Loading workforce directory...</span>
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No contributors found in the workforce directory under this Project Manager.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => {
                    const activeTasks = getEmployeeActiveTaskCount(emp);
                    const category = emp.employment_type && emp.employment_type.toLowerCase().includes('intern')
                      ? 'Intern'
                      : 'Full Time Contributor';

                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Names (of members) */}
                        <td className="px-4 py-3 font-semibold text-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0"
                              style={{
                                background: 'rgba(99, 102, 241, 0.2)',
                                color: '#818cf8',
                                border: '1px solid rgba(99, 102, 241, 0.4)'
                              }}
                            >
                              {(emp.full_name || emp.name || '?').trim().charAt(0)}
                            </div>
                            <span>{emp.full_name || emp.name}</span>
                          </div>
                        </td>

                        {/* Deparmental Job Role */}
                        <td className="px-4 py-3 text-sm">
                          <span className="font-medium text-blue-400">
                            {emp.role_title || 'Contributor'}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 text-sm">
                          {category === 'Intern' ? (
                            <span className="lozenge bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold text-xs">
                              Intern
                            </span>
                          ) : (
                            <span className="lozenge bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold text-xs">
                              Full Time Contributor
                            </span>
                          )}
                        </td>

                        {/* Work Email */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-slate-300 font-mono text-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{emp.email}</span>
                          </div>
                        </td>

                        {/* Active Tasks */}
                        <td className="px-4 py-3">
                          {activeTasks > 0 ? (
                            <span className="lozenge bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono font-bold">
                              {activeTasks} {activeTasks === 1 ? 'Task' : 'Tasks'}
                            </span>
                          ) : (
                            <span className="lozenge lozenge-default font-mono">
                              0 Tasks
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
