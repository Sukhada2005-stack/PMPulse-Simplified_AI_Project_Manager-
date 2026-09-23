import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FolderGit2,
  Plus,
  Users,
  MessageSquare,
  Trash2,
  Search,
  Loader2,
  Layout,
  ArrowRight,
  Clock,
  AlertTriangle,
  ListFilter,
} from 'lucide-react';
import { NewProjectModal, NewTaskModal } from './ProjectTaskModal';
import ProjectChatModal from './ProjectChatModal';
import FilterPanel from './FilterPanel';

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

/* ── Status badge colour mapping (mirrors PMDashboard tokens) ────────── */
function StatusBadge({ status }) {
  const s = (status || 'active').toLowerCase();
  let cls = 'lozenge ';
  if (s === 'active')      cls += 'lozenge-success';
  else if (s === 'in-review') cls += 'lozenge-warning';
  else if (s === 'completed') cls += 'lozenge-info';
  else if (s === 'archived')  cls += 'lozenge-default';
  else                        cls += 'lozenge-success';
  return <span className={cls}>{status || 'Active'}</span>;
}

/* ── Priority badge colour mapping ─────────────────────────────────── */
export function PriorityBadge({ priority }) {
  const p = (priority || 'Medium').toLowerCase();
  if (p === 'critical') {
    return (
      <span className="lozenge font-semibold flex items-center gap-1 bg-red-500/15 text-red-400 border border-red-500/30">
        <span>⚡</span> Critical
      </span>
    );
  }
  if (p === 'high') {
    return (
      <span className="lozenge font-semibold flex items-center gap-1 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
        <span>🔥</span> High
      </span>
    );
  }
  if (p === 'low') {
    return (
      <span className="lozenge font-semibold flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        Low
      </span>
    );
  }
  return (
    <span className="lozenge font-semibold flex items-center gap-1 bg-amber-500/15 text-amber-400 border border-amber-500/30">
      Medium
    </span>
  );
}

/* ── Category badge colour & icon mapping ────────────────────────── */
export const CATEGORY_CONFIG = {
  'Finance':           { icon: '💳', color: 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30' },
  'Sports':            { icon: '⚽', color: 'text-orange-400 bg-orange-500/15 border border-orange-500/30' },
  'Marketing':         { icon: '📢', color: 'text-pink-400 bg-pink-500/15 border border-pink-500/30' },
  'Business':          { icon: '💼', color: 'text-blue-400 bg-blue-500/15 border border-blue-500/30' },
  'Medical':           { icon: '🏥', color: 'text-rose-400 bg-rose-500/15 border border-rose-500/30' },
  'Sales':             { icon: '📈', color: 'text-green-400 bg-green-500/15 border border-green-500/30' },
  'Customer Services': { icon: '🎧', color: 'text-teal-400 bg-teal-500/15 border border-teal-500/30' },
  'Data Science':      { icon: '📊', color: 'text-cyan-400 bg-cyan-500/15 border border-cyan-500/30' },
  'AI/ML':             { icon: '🤖', color: 'text-purple-400 bg-purple-500/15 border border-purple-500/30' },
  'Neural Network':    { icon: '🧠', color: 'text-violet-400 bg-violet-500/15 border border-violet-500/30' },
  'Other':             { icon: '📁', color: 'text-amber-400 bg-amber-500/15 border border-amber-500/30' },
  'General':           { icon: '📁', color: 'text-slate-300 bg-slate-500/15 border border-slate-500/30' },
};

export function CategoryBadge({ category }) {
  const cat = category || 'General';
  const config = CATEGORY_CONFIG[cat] || {
    icon: '📁',
    color: 'text-blue-400 bg-blue-500/15 border border-blue-500/30',
  };

  return (
    <span
      className={`lozenge font-semibold flex items-center gap-1.5 ${config.color}`}
      title={`Project Category: ${cat}`}
    >
      <span className="text-xs leading-none">{config.icon}</span>
      <span className="leading-none">{cat}</span>
    </span>
  );
}

/* ── Priority filter configuration & helper ────────────────────────── */
export function getProjectPriorityCategory(priority) {
  const p = (priority || 'Medium').toString().trim().toLowerCase();
  if (p.includes('critical')) return 'critical';
  if (p.includes('high')) return 'high';
  if (p.includes('low')) return 'low';
  return 'medium';
}



export default function OtherWorkspaces({ onNavigateTab }) {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('pulsepm_user'); 
      const parsed = storedUser ? JSON.parse(storedUser) : (user || null);
      if (parsed) {
        return {
          ...parsed,
          fullName: parsed.fullName || parsed.full_name || parsed.name,
          name: parsed.name || parsed.full_name || parsed.fullName
        };
      }
      return null;
    } catch (error) {
      console.error("Failed to parse user session", error);
      return user ? { ...user, fullName: user.fullName || user.full_name, name: user.name || user.full_name } : null;
    }
  });

  useEffect(() => {
    if (user && !currentUser) {
      setCurrentUser({
        ...user,
        fullName: user.fullName || user.full_name || user.name,
        name: user.name || user.full_name || user.fullName
      });
    }
  }, [user, currentUser]);

  const [projects, setProjects]   = useState([]);
  const [allTasks, setAllTasks]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Jira-style two-column FilterPanel state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const filterBtnRef = useRef(null);
  const [panelFilters, setPanelFilters] = useState({
    categories: [],
    priorities: [],
    members: { type: 'all', min: '', max: '' },
    status: { selected: [], custom: [] },
  });

  const activePanelFilterCount = useMemo(() => {
    let count = 0;
    if (panelFilters.categories.length > 0) count++;
    if (panelFilters.priorities.length > 0) count++;
    if (panelFilters.members.type !== 'all') count++;
    if (panelFilters.status.selected.length > 0) count++;
    return count;
  }, [panelFilters]);

  const [showNewProjectModal, setShowNewProjectModal]         = useState(false);
  const [showNewTaskModal, setShowNewTaskModal]               = useState(false);
  const [selectedProjectIdForTask, setSelectedProjectIdForTask] = useState(null);
  const [showChatModal, setShowChatModal]                     = useState(false);
  const [selectedChatProjectId, setSelectedChatProjectId]     = useState(null);

  /* ── Data fetch ───────────────────────────────────────────────────── */
  const fetchProjectsAndTasks = async () => {
    try {
      setLoading(true);
      const [projRes, tasksRes, empRes] = await Promise.all([
        api.projects.getAll(),
        api.projects.getAllTasks().catch(() => ({ tasks: [] })),
        api.employees.getAll().catch(() => ({ employees: [] }))
      ]);
      setProjects(projRes.projects || []);
      if (tasksRes?.tasks) {
        setAllTasks(tasksRes.tasks);
      }
      if (empRes?.employees) {
        setEmployees(empRes.employees);
      }
    } catch (err) {
      console.error('Failed to load projects and tasks:', err);
    } finally {
      setLoading(false);
    }
  };
  const fetchProjects = fetchProjectsAndTasks;

  useEffect(() => {
    fetchProjectsAndTasks();

    const handleSyncGlobal = () => {
      fetchProjectsAndTasks();
    };

    window.addEventListener('pmpulse_workspaceTasks_updated', handleSyncGlobal);
    window.addEventListener('pmpulse_listTasks_updated', handleSyncGlobal);
    window.addEventListener('pmpulse_boardTasks_updated', handleSyncGlobal);
    window.addEventListener('pmpulse_boardBacklogTasks_updated', handleSyncGlobal);

    return () => {
      window.removeEventListener('pmpulse_workspaceTasks_updated', handleSyncGlobal);
      window.removeEventListener('pmpulse_listTasks_updated', handleSyncGlobal);
      window.removeEventListener('pmpulse_boardTasks_updated', handleSyncGlobal);
      window.removeEventListener('pmpulse_boardBacklogTasks_updated', handleSyncGlobal);
    };
  }, []);

  /* ── Global KPIs calculation (mirrors PMDashboard calculation) ─────── */
  const globalKpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const DONE = new Set(['Done', 'Completed', 'Remove', 'completed', 'archived', 'Archived']);

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

    // ── Step 1: Deduplicate rows by task id or key ────────────────────────
    const dedupeById = (arr) => {
      const seen = new Map();
      (arr || []).forEach(t => {
        if (!t) return;
        const key = String(t.id ?? t.key ?? t.title ?? Math.random());
        if (!seen.has(key)) seen.set(key, t);
      });
      return Array.from(seen.values());
    };

    // ── Step 2: Build local task map across all views ──────────────────────
    const allLocalTasksRaw = [];
    (projects || []).forEach(p => {
      const wsTasks = getSafeStorage(`pmpulse_workspaceTasks_${p.id}`, []);
      const lTasks = getSafeStorage(`pmpulse_listTasks_${p.id}`, []);
      const bTasks = getSafeStorage(`pmpulse_boardTasks_${p.id}`, []);
      const bbTasks = getSafeStorage(`pmpulse_boardBacklogTasks_${p.id}`, []);
      allLocalTasksRaw.push(...wsTasks, ...lTasks, ...bTasks, ...bbTasks);
    });

    const allLocalTasks = dedupeById(allLocalTasksRaw);
    const localTaskMap = new Map();
    allLocalTasks.forEach(t => {
      if (t.id != null) localTaskMap.set(String(t.id), t);
      if (t.key != null) localTaskMap.set(String(t.key), t);
      if (t.title) localTaskMap.set(String(t.title).toLowerCase().trim(), t);
      if (t['Issue / Task / Enhancement']) localTaskMap.set(String(t['Issue / Task / Enhancement']).toLowerCase().trim(), t);
      if (t.task) localTaskMap.set(String(t.task).toLowerCase().trim(), t);
      if (t.taskName) localTaskMap.set(String(t.taskName).toLowerCase().trim(), t);
      if (t.description) localTaskMap.set(String(t.description).toLowerCase().trim(), t);
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

    const rawTasks = dedupeById(allTasks.length > 0 ? allTasks : allLocalTasks);
    const dbMerged = rawTasks.map(mergeTask);
    const dbIds = new Set(rawTasks.map(t => String(t.id)));
    const localOnlyTasks = allLocalTasks
      .filter(t => t.id != null && !dbIds.has(String(t.id)))
      .map(mergeTask);

    const fullTasks = dedupeById([...dbMerged, ...localOnlyTasks]);

    // ── Global KPIs ───────────────────────────────────────────────────
    // 1. Overdue: due date < today AND not in a done-like status
    const overdueTasks = fullTasks.filter(t => {
      const due = (t.dueDate && t.dueDate !== '—') 
        ? t.dueDate 
        : ((t.due_date && t.due_date !== '—') 
            ? t.due_date 
            : ((t['Completed'] && t['Completed'] !== '—') ? t['Completed'] : null));
      const d = parseDate(due);
      if (!d) return false;
      d.setHours(0, 0, 0, 0);
      const s = t.status || t['Status'];
      return d < today && !DONE.has(s);
    }).length;

    // 2. Escalated: High / Highest priority tasks or synonyms (urgent, critical, escalated)
    const escalatedTasks = fullTasks.filter(t => {
      if (t.is_escalated || t.escalated || t.isEscalated) return true;
      const p = t.priority || t['Priority'] || t.Priority || t.priority_level;
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
    }).length;

    // 3. In Review: exact Kanban column name 'In Review' or synonyms
    const inReviewTasks = fullTasks.filter(t => {
      const s = t.status || t['Status'];
      if (!s) return false;
      const norm = String(s).trim().toLowerCase().replace(/[_\s-]+/g, ' ');
      return norm === 'in review' || norm === 'in review / qa' || norm === 'qa' || norm === 'review';
    }).length;

    return {
      overdueTasks,
      escalatedTasks,
      inReviewTasks,
      totalProjects: (projects || []).length
    };
  }, [allTasks, projects]);

  /* ── Dynamic Project Archives KPI (Total / Active / Completed / Custom) ── */
  const projectKpi = useMemo(() => {
    const selectedStatuses = panelFilters?.status?.selected || [];
    const customStatuses = panelFilters?.status?.custom || [];

    const isPredefinedActive = (s) =>
      s.toLowerCase() === 'active' && !customStatuses.some(c => c.toLowerCase() === 'active');
    const isPredefinedInactive = (s) =>
      (s.toLowerCase() === 'inactive' || s.toLowerCase() === 'completed') &&
      !customStatuses.some(c => c.toLowerCase() === s.toLowerCase());

    const hasActivePredefined = selectedStatuses.some(isPredefinedActive);
    const hasInactivePredefined = selectedStatuses.some(isPredefinedInactive);

    const customSelected = selectedStatuses.filter(
      s => customStatuses.some(c => c.toLowerCase() === s.toLowerCase()) ||
           (!isPredefinedActive(s) && !isPredefinedInactive(s))
    );

    const isActiveProject = (proj) => {
      const s = (proj.status || 'active').toLowerCase();
      return s === 'active' || s === 'in-review' || s === 'in_progress' || s === 'in-progress';
    };

    const isCompletedProject = (proj) => {
      const s = (proj.status || '').toLowerCase();
      return s === 'completed' || s === 'archived' || s === 'inactive' || s === 'complete';
    };

    // Case A: Custom-created status(es) are selected without predefined statuses
    if (customSelected.length > 0 && !hasActivePredefined && !hasInactivePredefined) {
      const matchingCount = (projects || []).filter(proj => {
        const s = (proj.status || 'active').toLowerCase();
        return customSelected.some(c => c.toLowerCase() === s);
      }).length;

      // If no project is included in that particular custom created status, do NOT change name or value!
      if (matchingCount === 0) {
        return {
          title: 'Total Projects',
          value: (projects || []).length,
        };
      }

      const label = customSelected.length === 1
        ? customSelected[0].split(/[-_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('-') + ' Projects'
        : 'Filtered Projects';

      return {
        title: label,
        value: matchingCount,
      };
    }

    // Case B: Predefined Active status filter
    if (hasActivePredefined && !hasInactivePredefined) {
      const count = (projects || []).filter(isActiveProject).length;
      return {
        title: 'Active Projects',
        value: count,
      };
    }

    // Case C: Predefined Inactive status filter
    if (hasInactivePredefined && !hasActivePredefined) {
      const count = (projects || []).filter(isCompletedProject).length;
      return {
        title: 'Completed Projects',
        value: count,
      };
    }

    // Default: Total Projects
    return {
      title: 'Total Projects',
      value: (projects || []).length,
    };
  }, [projects, panelFilters?.status?.selected, panelFilters?.status?.custom]);

  /* ── Team Utilization % KPI ────────────────────────────────────────── */
  const teamUtilization = useMemo(() => {
    if (!employees || employees.length === 0) {
      return 0;
    }

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
        console.error('Error computing local workspace memberships for utilization:', err);
      }
      const dbCount = Number(emp.project_count) || 0;
      return Math.max(dbCount, storageCount);
    };

    // Active contributors are those assigned to at least 1 project or with active tasks
    const activeContributors = employees.filter(emp => {
      const projCount = getEmployeeProjectCount(emp);
      const activeTasks = Number(emp.active_task_count) || 0;
      return projCount > 0 || activeTasks > 0;
    }).length;

    return Math.round((activeContributors / employees.length) * 100);
  }, [employees, projects]);

  /* ── Client-side search & multi-dimensional filters ─────────────────── */
  const filteredProjects = useMemo(() => {
    return projects.filter(proj => {
      // 1. Panel Priority filter (multi-select)
      if (panelFilters.priorities.length > 0) {
        const projP = (proj.priority || 'Medium').toLowerCase();
        const matchesPriority = panelFilters.priorities.some(
          p => p.toLowerCase() === projP
        );
        if (!matchesPriority) return false;
      }

      // 2. Panel Category filter (multi-select)
      if (panelFilters.categories.length > 0) {
        const projCat = (proj.category || 'General').toLowerCase();
        const matchesCat = panelFilters.categories.some(
          c => c.toLowerCase() === projCat
        );
        if (!matchesCat) return false;
      }

      // 3. Panel Members range filter
      if (panelFilters.members.type !== 'all') {
        const count = proj.member_count ?? 0;
        const min = panelFilters.members.min !== '' ? Number(panelFilters.members.min) : 0;
        const max = panelFilters.members.max !== '' ? Number(panelFilters.members.max) : Infinity;
        if (count < min || count > max) return false;
      }

      // 4. Panel Status filter
      if (panelFilters.status.selected.length > 0) {
        const s = (proj.status || 'active').toLowerCase();
        const selected = panelFilters.status.selected;

        const matchesStatus = selected.some(target => {
          const t = target.toLowerCase();
          if (t === 'active') {
            return s === 'active' || s === 'in-review' || s === 'in_progress';
          }
          if (t === 'inactive') {
            return s === 'completed' || s === 'archived' || s === 'inactive';
          }
          return s === t;
        });

        if (!matchesStatus) return false;
      }

      // 5. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          (proj.title       && proj.title.toLowerCase().includes(q)) ||
          (proj.description && proj.description.toLowerCase().includes(q)) ||
          (proj.priority    && proj.priority.toLowerCase().includes(q)) ||
          (proj.category    && proj.category.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [projects, panelFilters, searchQuery]);


  /* ── Loading spinner ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#eeb20d' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-3)' }}>
          Loading project workspaces…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Seamless Welcome Banner ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-transparent">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            Welcome, {currentUser?.fullName || currentUser?.name || currentUser?.full_name || user?.full_name || 'Project Manager'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Project Manager • Workspace Overview & Analytics
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 bg-transparent px-2 py-1">
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* ── Global KPIs (Overdue, Escalated, Total Projects, Team Utilization %) ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Global Overdue Tasks</p>
              <h3 className="text-3xl font-bold text-red-500">{globalKpis.overdueTasks}</h3>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
              <Clock size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Global Escalated Tasks</p>
              <h3 className="text-3xl font-bold text-orange-500">{globalKpis.escalatedTasks}</h3>
            </div>
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{projectKpi.title}</p>
              <h3 className="text-3xl font-bold text-blue-500">{projectKpi.value}</h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <FolderGit2 size={20} />
            </div>
          </div>
        </div>
        {/* Team Utilization % KPI (in succession of Total projects) */}
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Team Utilization %</p>
              <h3 className="text-3xl font-bold text-emerald-500">{teamUtilization}%</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Users size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Header row ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">

          {/* Title */}
          <h2
            className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            style={{ color: 'var(--color-text-2)' }}
          >
            <FolderGit2 className="w-4 h-4 text-blue-600" />
            <span>Project Archives ({projects.length})</span>
          </h2>

          {/* Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-gray-900 dark:text-slate-100"
              />
            </div>

            {/* Filter with Anchored Jira-style FilterPanel */}
            <div className="relative">
              <button
                ref={filterBtnRef}
                type="button"
                onClick={() => setIsFilterPanelOpen(prev => !prev)}
                className={`border rounded-md px-3.5 py-2 text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer select-none ${
                  isFilterPanelOpen || activePanelFilterCount > 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
                title={isFilterPanelOpen ? "Close filters" : "Open filter panel"}
              >
                <ListFilter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Filter</span>
                {activePanelFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center -mr-0.5">
                    {activePanelFilterCount}
                  </span>
                )}
              </button>

              <FilterPanel
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                filters={panelFilters}
                onChange={setPanelFilters}
                projects={projects}
                buttonRef={filterBtnRef}
              />
            </div>

            {/* + New Project */}
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold px-4 py-2 rounded-md flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>



        {/* ── Project card grid ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* Empty state */}
          {filteredProjects.length === 0 ? (
            <div
              className="col-span-full jira-card p-10 flex flex-col items-center justify-center text-center space-y-4"
              style={{ background: 'var(--table-th-bg)' }}
            >
              <FolderGit2 className="w-12 h-12 text-gray-500" />
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-1)' }}>
                  {searchQuery || activePanelFilterCount > 0 ? 'No Results Found' : 'No Workspaces Yet'}
                </h3>
                <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: 'var(--color-text-3)' }}>
                  {searchQuery || activePanelFilterCount > 0
                    ? 'No project containers matched your search or filter criteria.'
                    : 'Your workspace is completely clean. No active projects are provisioned yet. Start by creating your first project container to begin tracking deliverables.'}
                </p>
              </div>
              {!searchQuery && activePanelFilterCount === 0 && (
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="btn-primary mt-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Project</span>
                </button>
              )}
            </div>
          ) : (

            filteredProjects.map(proj => (
              <div
                key={proj.id}
                className="jira-card p-5 flex flex-col justify-between group transition-all"
                style={{ background: 'var(--table-th-bg)' }}
              >
                {/* Card body */}
                <div>
                  {/* Status + priority KPI + task count badges */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={proj.status} />
                      <PriorityBadge priority={proj.priority} />
                    </div>
                    <span className="lozenge lozenge-default font-mono">
                      {proj.task_count ?? 0} Tasks
                    </span>
                  </div>

                  {/* Project title */}
                  <h3
                    className="font-bold text-base transition-colors leading-snug"
                    style={{ color: 'var(--color-text-1)' }}
                  >
                    {proj.title}
                  </h3>

                  {/* Description — 2-line clamp */}
                  <p
                    className="text-xs line-clamp-2 mt-1.5 leading-relaxed"
                    style={{ color: 'var(--color-text-2)' }}
                  >
                    {proj.description || 'No description provided.'}
                  </p>

                  {/* Category KPI & Members count */}
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <CategoryBadge category={proj.category} />
                    <span
                      className="text-xs font-semibold flex items-center gap-1"
                      style={{ color: '#eeb20d' }}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{proj.member_count ?? 0} Members</span>
                    </span>
                  </div>
                </div>

                {/* Quick-action footer */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">

                  {/* 💬 Chat */}
                  <button
                    onClick={() => {
                      setSelectedChatProjectId(proj.id);
                      setShowChatModal(true);
                    }}
                    className="btn-secondary flex-1 justify-center text-xs px-2 text-blue-700 bg-blue-50 border-blue-200 hover:bg-slate-100 hover:text-slate-900 dark:text-blue-400 dark:bg-transparent dark:border-blue-800/50 dark:hover:bg-white/10 dark:hover:text-white transition-colors duration-200"
                    title="Open Team Chat & Meeting Scheduler"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>

                  {/* Workspace → */}
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('dashboard', proj.id, 'workspace')}
                    className="btn-primary flex-1 justify-center text-xs px-2"
                    title="Open Workspace for this Project"
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>Workspace</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>


                  {/* 🗑 Delete */}
                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete "${proj.title}"? This cannot be undone.`)) {
                        try {
                          await api.projects.delete(proj.id);
                          fetchProjectsAndTasks();
                        } catch (err) {
                          alert(err.message || 'Failed to delete project');
                        }
                      }
                    }}
                    className="btn-secondary text-red-600 bg-red-50 hover:bg-red-100 border-red-200 justify-center text-xs"
                    style={{ padding: '0 8px' }}
                    title="Delete Project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onSuccess={fetchProjectsAndTasks}
        />
      )}

      {showNewTaskModal && (
        <NewTaskModal
          projectId={selectedProjectIdForTask}
          projects={projects}
          onClose={() => setShowNewTaskModal(false)}
          onSuccess={fetchProjectsAndTasks}
        />
      )}

      {showChatModal && (
        <ProjectChatModal
          projectId={selectedChatProjectId ?? (projects[0]?.id ?? null)}
          projects={projects}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </div>
  );
}
