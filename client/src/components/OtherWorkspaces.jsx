import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  TrendingUp,
  CalendarClock,
  ShieldAlert,
  CheckCircle2,
  X,
  UserCheck,
  UserMinus,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
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
      <span className="lozenge font-semibold flex items-center gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        <span>Critical</span>
      </span>
    );
  }
  if (p === 'high') {
    return (
      <span className="lozenge font-semibold flex items-center gap-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
        <span>High</span>
      </span>
    );
  }
  if (p === 'low') {
    return (
      <span className="lozenge font-semibold flex items-center gap-1.5 bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
        <span>Low</span>
      </span>
    );
  }
  return (
    <span className="lozenge font-semibold flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
      <span>Medium</span>
    </span>
  );
}

/* ── Category badge colour & micro-indicator mapping ──────────────── */
export const CATEGORY_CONFIG = {
  'Finance':           { color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20' },
  'Sports':            { color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20' },
  'Marketing':         { color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60' },
  'Business':          { color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60' },
  'Medical':           { color: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20' },
  'Sales':             { color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60' },
  'Customer Services': { color: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20' },
  'Data Science':      { color: 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20' },
  'AI/ML':             { color: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20' },
  'Neural Network':    { color: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20' },
  'Other':             { color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60' },
  'General':           { color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60' },
};

export function CategoryBadge({ category }) {
  const cat = category || 'General';
  const config = CATEGORY_CONFIG[cat] || {
    color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60',
  };

  return (
    <span
      className={`lozenge font-semibold flex items-center gap-1.5 ${config.color}`}
      title={`Project Category: ${cat}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
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
  const [showBlockersModal, setShowBlockersModal]             = useState(false);
  const [activeBlockersData, setActiveBlockersData]           = useState({ count: 0, blockers: [] });
  const [showOverdueModal, setShowOverdueModal]               = useState(false);
  const [showEscalatedModal, setShowEscalatedModal]           = useState(false);
  const [showUtilizationModal, setShowUtilizationModal]       = useState(false);
  const [showPortfolioModal, setShowPortfolioModal]           = useState(false);

  // Lock background scroll when any KPI modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      showBlockersModal ||
      showOverdueModal ||
      showEscalatedModal ||
      showUtilizationModal ||
      showPortfolioModal
    );
    if (!isAnyModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow || '';
    };
  }, [showBlockersModal, showOverdueModal, showEscalatedModal, showUtilizationModal, showPortfolioModal]);

  // View Mode: Grid (Cards) vs Table (Tabular Display)
  const [viewMode, setViewMode]                               = useState(() => {
    try {
      return localStorage.getItem('pmpulse_projects_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });
  const [tablePage, setTablePage]                             = useState(1);
  const ITEMS_PER_PAGE = 8;

  /* ── Data fetch ───────────────────────────────────────────────────── */
  const fetchProjectsAndTasks = async () => {
    try {
      setLoading(true);
      const [projRes, tasksRes, empRes, blockersRes] = await Promise.all([
        api.projects.getAll(),
        api.projects.getAllTasks().catch(() => ({ tasks: [] })),
        api.employees.getAll().catch(() => ({ employees: [] })),
        api.dailyLogs.getActiveBlockers().catch(() => ({ count: 0, blockers: [] }))
      ]);
      setProjects(projRes.projects || []);
      if (tasksRes?.tasks) {
        setAllTasks(tasksRes.tasks);
      }
      if (empRes?.employees) {
        setEmployees(empRes.employees);
      }
      if (blockersRes) {
        setActiveBlockersData(blockersRes);
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
      const tagProject = (tasks) => (tasks || []).map(t => ({
        ...t,
        project_id: t.project_id || t.projectId || p.id,
        projectId: t.projectId || t.project_id || p.id
      }));
      allLocalTasksRaw.push(
        ...tagProject(wsTasks),
        ...tagProject(lTasks),
        ...tagProject(bTasks),
        ...tagProject(bbTasks)
      );
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
    const dbKeys = new Set(rawTasks.map(t => (t.key || t.task_key || '').trim().toLowerCase()).filter(Boolean));
    const normalizeTaskTitle = (str) => !str ? '' : String(str).trim().replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, ' ').toLowerCase();
    const dbTitles = new Set(rawTasks.map(t => normalizeTaskTitle(t.title || t['Issue / Task / Enhancement'] || t.task || t.description || '')).filter(Boolean));

    const localOnlyTasks = allLocalTasks
      .filter(t => {
        if (!t || t.id == null) return false;
        if (dbIds.has(String(t.id))) return false;
        const tKey = (t.key || t.task_key || '').trim().toLowerCase();
        if (tKey && dbKeys.has(tKey)) return false;
        const tTitle = normalizeTaskTitle(t.title || t['Issue / Task / Enhancement'] || t.task || t.description || '');
        if (tTitle && dbTitles.has(tTitle)) return false;
        return true;
      })
      .map(mergeTask);

    const fullTasks = dedupeById([...dbMerged, ...localOnlyTasks]);

    // ── Global KPIs ───────────────────────────────────────────────────
    // 1. Overdue: due date < today AND not in a done-like status
    const overdueTasksList = fullTasks.filter(t => {
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
    });
    const overdueTasks = overdueTasksList.length;

    // Accurate per-project overdue breakdown
    const overdueTasksBreakdown = (projects || []).map(p => {
      const pOverdue = overdueTasksList.filter(t => {
        const pId = t.project_id ?? t.projectId;
        return pId ? String(pId) === String(p.id) : false;
      });
      return {
        id: p.id,
        title: p.title || p.name || 'Untitled Project',
        category: p.category,
        status: p.status,
        overdueCount: pOverdue.length,
        overdueTasks: pOverdue
      };
    }).sort((a, b) => b.overdueCount - a.overdueCount);

    // 2. Escalated: High / Highest priority tasks or synonyms (urgent, critical, escalated)
    const isEscalatedTask = (t) => {
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
    };

    const escalatedTasksList = fullTasks.filter(isEscalatedTask);
    const escalatedTasks = escalatedTasksList.length;

    // Accurate per-project escalated breakdown (only projects with escalated / High/Highest priority tasks)
    const escalatedTasksBreakdown = (projects || []).map(p => {
      const pEscalated = escalatedTasksList.filter(t => {
        const pId = t.project_id ?? t.projectId;
        return pId ? String(pId) === String(p.id) : false;
      });
      return {
        id: p.id,
        title: p.title || p.name || 'Untitled Project',
        category: p.category,
        status: p.status,
        escalatedCount: pEscalated.length,
        escalatedTasks: pEscalated
      };
    })
    .filter(p => p.escalatedCount > 0)
    .sort((a, b) => b.escalatedCount - a.escalatedCount);

    // 3. In Review: exact Kanban column name 'In Review' or synonyms
    const inReviewTasks = fullTasks.filter(t => {
      const s = t.status || t['Status'];
      if (!s) return false;
      const norm = String(s).trim().toLowerCase().replace(/[_\s-]+/g, ' ');
      return norm === 'in review' || norm === 'in review / qa' || norm === 'qa' || norm === 'review';
    }).length;

    // ── 4. Portfolio Completion Rate (%) ──────────────────────────────
    // Portfolio Completion % = (Total Completed Tasks Across All Active Projects / Total Tasks Across All Active Projects) * 100
    const activeProjectIds = new Set(
      (projects || []).filter(p => {
        const s = (p.status || 'active').toLowerCase();
        return s === 'active' || s === 'in-review' || s === 'in_progress' || s === 'in-progress';
      }).map(p => String(p.id))
    );

    const isTaskDone = (s) => {
      if (!s) return false;
      return DONE.has(s) || ['done', 'completed', 'archived', 'closed', 'remove'].includes(String(s).trim().toLowerCase());
    };

    // Filter tasks that belong to active projects
    const activeProjectTasks = fullTasks.filter(t => {
      const pId = t.project_id ?? t.projectId;
      return pId ? activeProjectIds.has(String(pId)) : true;
    });

    const totalActiveTasks = activeProjectTasks.length;
    const completedActiveTasks = activeProjectTasks.filter(t => isTaskDone(t.status || t['Status'])).length;
    const portfolioCompletionRate = totalActiveTasks > 0
      ? Math.round((completedActiveTasks / totalActiveTasks) * 100)
      : 0;

    // ── 5. Upcoming Deadlines (Next 7 Days) ───────────────────────────
    // Counts all deliverables or project milestone target dates scheduled between Today and Today + 7 Days that are not yet marked Completed / Done
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    in7Days.setHours(23, 59, 59, 999);

    const upcomingTasksCount = fullTasks.filter(t => {
      if (isTaskDone(t.status || t['Status'])) return false;

      const targetDateVal = (t.dueDate && t.dueDate !== '—') 
        ? t.dueDate 
        : ((t.due_date && t.due_date !== '—') 
            ? t.due_date 
            : ((t.end_date && t.end_date !== '—')
                ? t.end_date
                : ((t['Completed'] && t['Completed'] !== '—') ? t['Completed'] : null)));

      const d = parseDate(targetDateVal);
      if (!d) return false;
      d.setHours(0, 0, 0, 0);

      return d >= startOfToday && d <= in7Days;
    }).length;

    const upcomingProjectMilestones = (projects || []).filter(p => {
      const s = (p.status || '').toLowerCase();
      if (s === 'completed' || s === 'archived' || s === 'inactive') return false;
      const pDate = parseDate(p.deadline || p.target_date || p.due_date);
      if (!pDate) return false;
      pDate.setHours(0, 0, 0, 0);
      return pDate >= startOfToday && pDate <= in7Days;
    }).length;

    const upcomingDeadlines = upcomingTasksCount + upcomingProjectMilestones;

    // ── 4b. Per-project completion breakdown (all projects under the PM) ──
    const projectCompletionBreakdown = (projects || []).map(p => {
      const pTasks = fullTasks.filter(t => {
        const pId = t.project_id ?? t.projectId;
        return pId ? String(pId) === String(p.id) : false;
      });

      const wsTasks = getSafeStorage(`pmpulse_workspaceTasks_${p.id}`, []);
      const lTasks = getSafeStorage(`pmpulse_listTasks_${p.id}`, []);
      const bTasks = getSafeStorage(`pmpulse_boardTasks_${p.id}`, []);
      const bbTasks = getSafeStorage(`pmpulse_boardBacklogTasks_${p.id}`, []);
      const activeSprintAndBacklog = [...(lTasks || []), ...(bTasks || []), ...(bbTasks || [])];

      let totalTasks = pTasks.length;
      if (totalTasks === 0 && wsTasks.length > 0) {
        totalTasks = wsTasks.length;
      }
      if (totalTasks === 0 && Number(p.task_count) > 0) {
        totalTasks = Number(p.task_count);
      }

      let completedTasks = 0;
      if (pTasks.length > 0) {
        completedTasks = pTasks.filter(t => isTaskDone(t.status || t['Status'])).length;
      } else if (wsTasks.length > 0) {
        const normalizeTitleLocal = (str) => !str ? '' : String(str).trim().toLowerCase();
        wsTasks.forEach(task => {
          const tTitle = normalizeTitleLocal(task['Issue / Task / Enhancement'] || task.title || task.description || '');
          const activeMatch = activeSprintAndBacklog.find(at => 
            (at.id && String(at.id) === String(task.id)) ||
            (at.key && task.key && at.key === task.key) ||
            (tTitle && normalizeTitleLocal(at.task || at.title || at.description || at.taskName || '') === tTitle)
          );
          const taskStatus = activeMatch?.status || activeMatch?.['Status'] || task['Status'] || task.status || 'To Do';
          if (isTaskDone(taskStatus)) {
            completedTasks++;
          }
        });
      }

      const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: p.id,
        title: p.title || p.name || 'Untitled Project',
        category: p.category,
        status: p.status,
        priority: p.priority,
        totalTasks,
        completedTasks,
        progressPct
      };
    });

    return {
      overdueTasks,
      overdueTasksBreakdown,
      escalatedTasks,
      escalatedTasksBreakdown,
      inReviewTasks,
      totalProjects: (projects || []).length,
      portfolioCompletionRate,
      projectCompletionBreakdown,
      totalActiveTasks,
      completedActiveTasks,
      upcomingDeadlines
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

  /* ── Team Utilization % KPI & Contributor Breakdown ───────────────── */
  const teamUtilizationDetails = useMemo(() => {
    if (!employees || employees.length === 0) {
      return { active: [], idle: [], rate: 0 };
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

    const active = [];
    const idle = [];

    employees.forEach(emp => {
      const projCount = getEmployeeProjectCount(emp);
      const activeTasks = Number(emp.active_task_count) || 0;
      const isAssigned = projCount > 0 || activeTasks > 0;
      const enriched = {
        ...emp,
        computedProjectCount: projCount,
        computedActiveTasks: activeTasks,
      };

      if (isAssigned) {
        active.push(enriched);
      } else {
        idle.push(enriched);
      }
    });

    const rate = Math.round((active.length / employees.length) * 100);
    return { active, idle, rate };
  }, [employees, projects]);

  const teamUtilization = teamUtilizationDetails.rate;

  /* ── Active Blockers Count (Last 24–48 Hours) ──────────────────────── */
  const activeBlockersCount = useMemo(() => {
    if (activeBlockersData && typeof activeBlockersData.count === 'number') {
      return activeBlockersData.count;
    }
    return (employees || []).reduce((sum, e) => sum + (Number(e.blocker_count) || 0), 0);
  }, [activeBlockersData, employees]);

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

  // Reset pagination on search or filter change
  useEffect(() => {
    setTablePage(1);
  }, [searchQuery, panelFilters]);

  const totalTablePages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE) || 1;
  const paginatedTableProjects = useMemo(() => {
    const start = (tablePage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProjects, tablePage]);


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
    <div className="space-y-6 animate-fade-up pb-72">

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
        <div
          onClick={() => setShowOverdueModal(true)}
          className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition-colors cursor-pointer"
          title="Click to view overdue tasks by project"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Global Overdue Tasks</p>
              <h3 className="text-3xl font-bold text-rose-500 dark:text-rose-400 tracking-tight">{globalKpis.overdueTasks}</h3>
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 rounded-lg">
              <Clock size={20} />
            </div>
          </div>
        </div>
        <div
          onClick={() => setShowEscalatedModal(true)}
          className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition-colors cursor-pointer"
          title="Click to view escalated tasks by project"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Global Escalated Tasks</p>
              <h3 className="text-3xl font-bold text-amber-500 dark:text-amber-400 tracking-tight">{globalKpis.escalatedTasks}</h3>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{projectKpi.title}</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{projectKpi.value}</h3>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 rounded-lg">
              <FolderGit2 size={20} />
            </div>
          </div>
        </div>
        {/* Team Utilization % KPI (in succession of Total projects) */}
        <div
          onClick={() => setShowUtilizationModal(true)}
          className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition-colors cursor-pointer"
          title="Click to view team contributor utilization"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Team Utilization %</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{teamUtilization}%</h3>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 rounded-lg">
              <Users size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Macro Velocity & Operations Radar (Portfolio Completion %, Upcoming Deadlines, Active Blockers) ──── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Portfolio Completion Rate (%) */}
        <div
          onClick={() => setShowPortfolioModal(true)}
          className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition-colors cursor-pointer"
          title="Click to view portfolio completion progress by project"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Portfolio Completion Rate (%)</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{globalKpis.portfolioCompletionRate}%</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  ({globalKpis.completedActiveTasks}/{globalKpis.totalActiveTasks} tasks)
                </span>
              </div>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        {/* 2. Upcoming Deadlines (Next 7 Days) */}
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Upcoming Deadlines (Next 7 Days)</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{globalKpis.upcomingDeadlines}</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">scheduled deliverables</span>
              </div>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400 border border-slate-200 dark:border-slate-700/60 rounded-lg">
              <CalendarClock size={20} />
            </div>
          </div>
        </div>

        {/* 3. Active Blockers (Last 24–48 Hours) */}
        <div
          onClick={() => setShowBlockersModal(true)}
          className={`bg-white dark:bg-slate-800/40 border rounded-xl p-5 shadow-sm transition-all cursor-pointer ${
            activeBlockersCount > 0
              ? 'border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/[0.02] dark:hover:bg-rose-500/[0.04]'
              : 'border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
          title="Click to view and unblock contributors"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Blockers (Last 24–48 Hours)</p>
                {activeBlockersCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                    Action Req.
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className={`text-3xl font-bold tracking-tight ${activeBlockersCount > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {activeBlockersCount}
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {activeBlockersCount === 1 ? 'impediment logged' : 'impediments logged'}
                </span>
              </div>
            </div>
            <div className={`p-2 rounded-lg ${activeBlockersCount > 0 ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700/60'}`}>
              <ShieldAlert size={20} />
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
            <FolderGit2 className="w-4 h-4 text-slate-400 dark:text-slate-400" />
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

            {/* View Mode Toggle: Grid vs Table */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => {
                  setViewMode('grid');
                  try {
                    localStorage.setItem('pmpulse_projects_view_mode', 'grid');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-800 text-yellow-600 dark:text-yellow-400 shadow-sm border border-slate-200 dark:border-slate-700/80'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Grid View (Cards)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('table');
                  try {
                    localStorage.setItem('pmpulse_projects_view_mode', 'table');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-800 text-yellow-600 dark:text-yellow-400 shadow-sm border border-slate-200 dark:border-slate-700/80'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Table View (Tabular Display)"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
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



        {/* ── Projects Display: Table vs Grid ────────────────────────── */}
        {filteredProjects.length === 0 ? (
          <div
            className="jira-card p-10 flex flex-col items-center justify-center text-center space-y-4"
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
        ) : viewMode === 'table' ? (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 min-w-[220px]">Project</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4 text-center">Tasks</th>
                    <th className="py-3 px-4 text-center">Team</th>
                    <th className="py-3 px-4 text-right min-w-[190px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  {paginatedTableProjects.map(proj => (
                    <tr
                      key={proj.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Project Title & Description */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                            <FolderGit2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[220px] sm:max-w-xs">
                              {proj.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px] sm:max-w-xs">
                              {proj.description || 'No description provided.'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <CategoryBadge category={proj.category} />
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={proj.status} />
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <PriorityBadge priority={proj.priority} />
                      </td>

                      {/* Tasks Count */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="lozenge lozenge-default font-mono text-[11px]">
                          {proj.task_count ?? 0} Tasks
                        </span>
                      </td>

                      {/* Team Members */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{proj.member_count ?? 0}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Chat */}
                          <button
                            onClick={() => {
                              setSelectedChatProjectId(proj.id);
                              setShowChatModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Open Team Chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Workspace */}
                          <button
                            onClick={() => onNavigateTab && onNavigateTab('dashboard', proj.id, 'workspace')}
                            className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1 font-semibold"
                            title={`Open ${proj.title} Workspace`}
                          >
                            <Layout className="w-3 h-3" />
                            <span>Workspace</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          {/* Delete */}
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalTablePages > 1 && (
              <div className="py-3 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div>
                  Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{(tablePage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(tablePage * ITEMS_PER_PAGE, filteredProjects.length)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredProjects.length}</span> projects
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                    disabled={tablePage === 1}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-medium text-slate-700 dark:text-slate-300 px-1">
                    Page {tablePage} of {totalTablePages}
                  </span>
                  <button
                    onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
                    disabled={tablePage === totalTablePages}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map(proj => (
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
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
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
                    className="btn-secondary flex-1 justify-center text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
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
                    className="btn-secondary text-slate-400 hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10 justify-center text-xs p-1.5"
                    title="Delete Project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

      {showBlockersModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBlockersModal(false); }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Active Blockers (Last 24–48 Hours)</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-500 border border-red-500/30">
                      {activeBlockersCount}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Unresolved contributor impediments logged on active deliverables
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBlockersModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh]">
              {activeBlockersData?.blockers && activeBlockersData.blockers.length > 0 ? (
                activeBlockersData.blockers.map((b) => (
                  <div
                    key={b.id || `${b.task_id}-${b.user_id}`}
                    className="p-4 rounded-xl border border-red-500/20 bg-red-500/[0.02] dark:bg-red-500/[0.04] space-y-3"
                  >
                    {/* Contributor Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={b.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(b.employee_name || 'Member')}`}
                          alt={b.employee_name}
                          className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {b.employee_name}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {b.role_title || 'Contributor'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded">
                        {b.log_date || 'Recent'}
                      </span>
                    </div>

                    {/* Task & Project Context */}
                    <div className="text-xs bg-white dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 space-y-1">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          📁 {b.project_title || 'Project'}
                        </span>
                        <span className="lozenge lozenge-warning text-[10px]">
                          {b.task_status || 'In Progress'}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        Task: {b.task_title}
                      </p>
                    </div>

                    {/* Blocker Reason Box */}
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs">
                      <p className="font-bold text-red-500 mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Impediment Explanation:</span>
                      </p>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                        "{b.no_work_reason}"
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {b.project_id && (
                        <button
                          onClick={() => {
                            setShowBlockersModal(false);
                            if (onNavigateTab) {
                              onNavigateTab('dashboard', b.project_id, 'workspace');
                            }
                          }}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <Layout className="w-3.5 h-3.5" />
                          <span>Open Workspace</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Zero Active Blockers
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      All contributors are operating at full momentum. No impediments or roadblocks logged in the last 24–48 hours.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ── Global Overdue Tasks Modal ──────────────────────────────── */}
      {showOverdueModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowOverdueModal(false); }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Global Overdue Tasks</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      {globalKpis.overdueTasks}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Breakdown of overdue deliverables by project workspace
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOverdueModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh]">
              {globalKpis.overdueTasksBreakdown && globalKpis.overdueTasksBreakdown.filter(p => p.overdueCount > 0).length > 0 ? (
                globalKpis.overdueTasksBreakdown
                  .filter(p => p.overdueCount > 0)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.02] dark:bg-rose-500/[0.04] transition-all space-y-3"
                    >
                    {/* Project Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 shrink-0">
                          <FolderGit2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {p.title}
                            </h4>
                            <CategoryBadge category={p.category} />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Status: <span className="capitalize">{p.status || 'Active'}</span>
                          </p>
                        </div>
                      </div>

                      {/* In front of the project name: count badge + button */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                          p.overdueCount > 0
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                            : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{p.overdueCount} {p.overdueCount === 1 ? 'Overdue Task' : 'Overdue Tasks'}</span>
                        </span>

                        <button
                          onClick={() => {
                            setShowOverdueModal(false);
                            if (onNavigateTab) {
                              onNavigateTab('dashboard', p.id, 'workspace');
                            }
                          }}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold whitespace-nowrap"
                          title={`Navigate to ${p.title} Workspace`}
                        >
                          <Layout className="w-3.5 h-3.5" />
                          <span>To the workspace</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Overdue Deliverables List Preview if any */}
                    {p.overdueTasks && p.overdueTasks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Overdue Deliverables ({p.overdueTasks.length}):
                        </p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {p.overdueTasks.map((t, idx) => (
                            <div
                              key={t.id || idx}
                              className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800"
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                  {t.key || t.task_key || `#${idx + 1}`}
                                </span>
                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {t.title || t['Issue / Task / Enhancement'] || t.task || t.taskName || 'Untitled Task'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Due: {t.dueDate || t.due_date || t['Completed'] || 'Past Due'}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Zero Overdue Tasks
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      All deliverables across all workspaces are on schedule. No overdue deadlines detected.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ── Global Escalated Tasks Modal ────────────────────────────── */}
      {showEscalatedModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEscalatedModal(false); }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Global Escalated Tasks</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {globalKpis.escalatedTasks}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Projects containing Highest and High priority escalated tasks
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEscalatedModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh]">
              {globalKpis.escalatedTasksBreakdown && globalKpis.escalatedTasksBreakdown.length > 0 ? (
                globalKpis.escalatedTasksBreakdown.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.02] dark:bg-amber-500/[0.04] transition-all space-y-3"
                  >
                    {/* Project Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 shrink-0">
                          <FolderGit2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {p.title}
                            </h4>
                            <CategoryBadge category={p.category} />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Status: <span className="capitalize">{p.status || 'Active'}</span>
                          </p>
                        </div>
                      </div>

                      {/* In front of project name: count badge + button */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{p.escalatedCount} {p.escalatedCount === 1 ? 'Escalated Task' : 'Escalated Tasks'}</span>
                        </span>

                        <button
                          onClick={() => {
                            setShowEscalatedModal(false);
                            if (onNavigateTab) {
                              onNavigateTab('dashboard', p.id, 'workspace');
                            }
                          }}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold whitespace-nowrap"
                          title={`Navigate to ${p.title} Workspace`}
                        >
                          <Layout className="w-3.5 h-3.5" />
                          <span>To the workspace</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Escalated Tasks List */}
                    {p.escalatedTasks && p.escalatedTasks.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Escalated Deliverables ({p.escalatedTasks.length}):
                        </p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {p.escalatedTasks.map((t, idx) => (
                            <div
                              key={t.id || idx}
                              className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800"
                            >
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                  {t.key || t.task_key || `#${idx + 1}`}
                                </span>
                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {t.title || t['Issue / Task / Enhancement'] || t.task || t.taskName || 'Untitled Task'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 capitalize">
                                  {t.priority || t['Priority'] || 'High Priority'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Zero Escalated Tasks
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      All project deliverables are progressing within standard operational thresholds. No High/Highest priority escalations detected.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Team Utilization Breakdown Modal ───────────────────────── */}
      {showUtilizationModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUtilizationModal(false); }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Team Utilization Breakdown</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {teamUtilizationDetails.rate}%
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Workforce capacity, active assignment, and contributor availability
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUtilizationModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-5 overflow-y-auto space-y-6 max-h-[60vh]">
              {/* Section 1: Active Contributors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Active Contributors ({teamUtilizationDetails.active.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Assigned to active projects or tasks
                  </span>
                </div>

                {teamUtilizationDetails.active.length > 0 ? (
                  <div className="space-y-2">
                    {teamUtilizationDetails.active.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {emp.full_name || emp.name || 'Team Member'}
                            </h4>
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {emp.role_title || emp.role || 'Contributor'} {emp.department ? `• ${emp.department}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                            {emp.computedProjectCount} {emp.computedProjectCount === 1 ? 'Project' : 'Projects'}
                          </span>
                          {emp.computedActiveTasks > 0 && (
                            <span className="px-2 py-1 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              {emp.computedActiveTasks} {emp.computedActiveTasks === 1 ? 'Task' : 'Tasks'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                    No active contributors currently allocated to projects.
                  </div>
                )}
              </div>

              {/* Section 2: Idle Contributors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Idle Contributors ({teamUtilizationDetails.idle.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Available for workspace assignment
                  </span>
                </div>

                {teamUtilizationDetails.idle.length > 0 ? (
                  <div className="space-y-2">
                    {teamUtilizationDetails.idle.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                              {emp.full_name || emp.name || 'Team Member'}
                            </h4>
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                              Available / Idle
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {emp.role_title || emp.role || 'Contributor'} {emp.department ? `• ${emp.department}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/40">
                            0 Active Projects
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                    All team members are actively engaged across projects (100% capacity).
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Portfolio Completion Rate Modal ────────────────────────── */}
      {showPortfolioModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPortfolioModal(false); }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Portfolio Completion Rate</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {globalKpis.portfolioCompletionRate}%
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Completion progress and task delivery rate for all projects under your workspace
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPortfolioModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh]">
              {globalKpis.projectCompletionBreakdown && globalKpis.projectCompletionBreakdown.length > 0 ? (
                globalKpis.projectCompletionBreakdown.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all space-y-3"
                  >
                    {/* Project Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 shrink-0">
                          <FolderGit2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {p.title}
                            </h4>
                            <CategoryBadge category={p.category} />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Status: <span className="capitalize">{p.status || 'Active'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right side: Progress badge & To the workspace button */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                          p.progressPct === 100
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                            : p.progressPct > 0
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                              : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{p.progressPct}% Completed</span>
                        </span>

                        <button
                          onClick={() => {
                            setShowPortfolioModal(false);
                            if (onNavigateTab) {
                              onNavigateTab('dashboard', p.id, 'workspace');
                            }
                          }}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold whitespace-nowrap"
                          title={`Navigate to ${p.title} Workspace`}
                        >
                          <Layout className="w-3.5 h-3.5" />
                          <span>To the workspace</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & tasks completed-out-of-total-tasks summary */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          tasks completed-out-of-total-tasks
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {p.completedTasks} <span className="text-slate-400 font-normal">/ {p.totalTasks} tasks</span>
                        </span>
                      </div>

                      {/* Progress bar line */}
                      <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-200/50 dark:border-slate-800">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${p.progressPct}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {p.totalTasks > 0
                          ? `${p.completedTasks} out of ${p.totalTasks} tasks completed (${p.progressPct}%)`
                          : '0 tasks provisioned in this project'
                        }
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                    <FolderGit2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      No Projects Available
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      There are currently no projects provisioned under your workspace.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
