import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FolderGit2,
  RefreshCw,
  ChevronDown,
  X,
  Filter,
  TrendingUp,
  AlertCircle,
  Loader2,
  Search,
  MessageSquare,
  Layout,
  ArrowLeft
} from 'lucide-react';
import LogDetailModal from './LogDetailModal';
import TaskDetailModal from './TaskDetailModal';
import ProjectChatModal from './ProjectChatModal';

/* ── Main CalendarMatrix Component ──────────────────────────────────── */
export default function CalendarMatrix({ selectedProjectId, onSelectProject, onNavigateTab, onOpenAISummary }) {
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(selectedProjectId || 'fleet');
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedTaskModal, setSelectedTaskModal] = useState(null);

  // Date filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Stores the computed Active Sprint bounds so the 'Full Sprint' button
  // can reference them dynamically instead of using hardcoded strings.
  const [sprintDateFrom, setSprintDateFrom] = useState('');
  const [sprintDateTo, setSprintDateTo] = useState('');

  const initializedProjectRef = useRef(null);

  // When project changes, reset initialized project ref so the new project's bounds will be adopted
  useEffect(() => {
    initializedProjectRef.current = null;
    setDateFrom('');
    setDateTo('');
  }, [currentProjectId]);

  // Auto-set date range to the Active Sprint when a project is selected.
  // Derives sprint bounds from task date ranges (in_progress tasks take priority),
  // falling back to all tasks, then to the macro project deadline or matrix dates.
  // CRITICAL: Runs initialization ONLY once per project selection (or when project ID changes),
  // so the user's manual date adjustments are NEVER overwritten!
  useEffect(() => {
    if (!matrixData) return;

    if (initializedProjectRef.current !== currentProjectId) {
      const rows = matrixData.rows || [];

      // Collect task dates — prefer in_progress tasks to represent the active sprint
      const activeTasks = rows
        .map(r => r.task)
        .filter(t => t && t.status === 'in_progress' && t.start_date && t.end_date && !String(t.id).startsWith('unallocated-'));

      const candidateTasks = activeTasks.length > 0
        ? activeTasks
        : rows.map(r => r.task).filter(t => t && t.start_date && t.end_date && !String(t.id).startsWith('unallocated-'));

      let initialStart = '';
      let initialEnd = '';

      if (candidateTasks.length > 0) {
        initialStart = candidateTasks
          .map(t => t.start_date)
          .sort()[0]; // earliest task start
        initialEnd = candidateTasks
          .map(t => t.end_date)
          .sort()
          .reverse()[0]; // latest task end
      } else if (matrixData?.dates?.length > 0) {
        initialStart = matrixData.dates[0];
        initialEnd = matrixData.dates[matrixData.dates.length - 1];
      } else if (matrixData?.project?.start_date && matrixData?.project?.end_date) {
        initialStart = matrixData.project.start_date;
        initialEnd = matrixData.project.end_date;
      }

      if (initialStart && initialEnd) {
        setDateFrom(initialStart);
        setDateTo(initialEnd);
        setSprintDateFrom(initialStart); // keep sprint bounds in sync
        setSprintDateTo(initialEnd);
      }

      initializedProjectRef.current = currentProjectId;
    }
  }, [matrixData, currentProjectId]);

  const handleDateFromChange = (newVal) => {
    setDateFrom(newVal);
    if (newVal && dateTo && newVal > dateTo) {
      setDateTo(newVal);
    }
  };

  const handleDateToChange = (newVal) => {
    setDateTo(newVal);
    if (newVal && dateFrom && newVal < dateFrom) {
      setDateFrom(newVal);
    }
  };

  const handleFullSprint = () => {
    if (sprintDateFrom && sprintDateTo) {
      setDateFrom(sprintDateFrom);
      setDateTo(sprintDateTo);
    }
  };

  const handleFiveDayWindow = () => {
    const base = sprintDateFrom || dateFrom;
    if (!base) return;
    const start = new Date(base);
    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    const endStr = end.toISOString().split('T')[0];
    setDateFrom(base);
    setDateTo(endStr);
  };

  const isFullSprintActive = Boolean(
    sprintDateFrom && sprintDateTo &&
    dateFrom === sprintDateFrom && dateTo === sprintDateTo
  );

  const fiveDayEndStr = sprintDateFrom ? (() => {
    const d = new Date(sprintDateFrom);
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  })() : null;

  const isFiveDayActive = Boolean(
    dateFrom && dateTo && (
      (sprintDateFrom && dateFrom === sprintDateFrom && dateTo === fiveDayEndStr) ||
      ((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24) === 4)
    )
  );

  // Deadline modal state
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineActionLoading, setDeadlineActionLoading] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [deadlineProject, setDeadlineProject] = useState(null);
  const [extendMode, setExtendMode] = useState(false);

  useEffect(() => {
    if (matrixData?.project?.end_date && matrixData?.project?.status !== 'completed' && currentProjectId !== 'fleet') {
      const todayDate = new Date().toISOString().split('T')[0];
      if (matrixData.project.end_date <= todayDate) {
        setDeadlineProject(matrixData.project);
        setNewEndDate(matrixData.project.end_date);
        setShowDeadlineModal(true);
        setExtendMode(false);
      } else {
        setShowDeadlineModal(false);
      }
    }
  }, [matrixData, currentProjectId]);

  const handleDeadlineSubmit = async (action) => {
    setDeadlineActionLoading(true);
    try {
      const payload = {};
      if (action === 'completed') {
        payload.status = 'completed';
      } else if (action === 'extend') {
        if (!newEndDate) return;
        payload.end_date = newEndDate;
      }
      await api.projects.update(deadlineProject.id, payload);
      setShowDeadlineModal(false);
      fetchMatrix(); // Refresh
    } catch (err) {
      console.error('Failed to update project:', err);
    } finally {
      setDeadlineActionLoading(false);
    }
  };

  useEffect(() => {
    api.projects.getAll().then(res => {
      setProjects(res.projects || []);
      if (selectedProjectId) setCurrentProjectId(selectedProjectId);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setCurrentProjectId(selectedProjectId);
    }
  }, [selectedProjectId]);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      if (currentProjectId && currentProjectId !== 'fleet') {
        try {
          const listTasks = JSON.parse(localStorage.getItem(`pmpulse_listTasks_${currentProjectId}`) || '[]');
          const boardTasks = JSON.parse(localStorage.getItem(`pmpulse_boardTasks_${currentProjectId}`) || '[]');
          const wsTasks = JSON.parse(localStorage.getItem(`pmpulse_workspaceTasks_${currentProjectId}`) || '[]');
          const sprintBacklog = JSON.parse(localStorage.getItem(`pmpulse_sprintBacklogTasks_${currentProjectId}`) || '[]');
          const boardBacklog = JSON.parse(localStorage.getItem(`pmpulse_boardBacklogTasks_${currentProjectId}`) || '[]');

          // Deduplicate: Active sprint tasks (list & board) have highest priority.
          // Stale backlog items from wsTasks or sprintBacklog should never overwrite active sprint assignments.
          const normalizeTitle = (t) => (t.title || t['Issue / Task / Enhancement'] || t.task || t.description || '')
            .trim()
            .replace(/[\u2010-\u2015]/g, '-')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/\s+/g, ' ')
            .toLowerCase();

          // Build a lookup of real database IDs from wsTasks by normalized title
          const titleToDbId = new Map();
          wsTasks.forEach(w => {
            const wTitle = normalizeTitle(w);
            if (wTitle && w.id && !isNaN(Number(w.id)) && Number(w.id) < 1000000000 && !String(w.id).startsWith('KAN-') && !String(w.id).startsWith('unallocated-')) {
              titleToDbId.set(wTitle, w.id);
            }
          });

          // Ensure active sprint tasks retain/inherit the real DB id if they currently have a timestamp id
          [...listTasks, ...boardTasks].forEach(t => {
            const tTitle = normalizeTitle(t);
            const isPseudoId = !t.id || isNaN(Number(t.id)) || Number(t.id) >= 1000000000 || String(t.id).startsWith('KAN-');
            if (isPseudoId && titleToDbId.has(tTitle)) {
              t.id = titleToDbId.get(tTitle);
            }
          });

          const taskMap = new Map();
          // 1. Add active sprint tasks first (highest priority)
          [...listTasks, ...boardTasks].forEach(t => {
            const titleKey = normalizeTitle(t);
            const idKey = t.id ? `id-${t.id}` : null;
            if (idKey) taskMap.set(idKey, t);
            if (titleKey) taskMap.set(`title-${titleKey}`, t);
          });

          // 2. Add backlog & workspace tasks only if not already present in active sprint
          [...sprintBacklog, ...boardBacklog, ...wsTasks].forEach(t => {
            const titleKey = normalizeTitle(t);
            const idKey = t.id ? `id-${t.id}` : null;
            const alreadyHasId = idKey && taskMap.has(idKey);
            const alreadyHasTitle = titleKey && taskMap.has(`title-${titleKey}`);

            if (!alreadyHasId && !alreadyHasTitle) {
              if (idKey) taskMap.set(idKey, t);
              if (titleKey) taskMap.set(`title-${titleKey}`, t);
            }
          });

          const allTasks = Array.from(new Set(taskMap.values()));
          if (allTasks.length > 0) {
            await api.projects.syncWorkspaceTasks(currentProjectId, allTasks);
          }
        } catch (syncErr) {
          console.error('Pre-matrix task sync error:', syncErr);
        }
      }

      if (currentProjectId === 'fleet' || !currentProjectId) {
        const data = await api.dailyLogs.getFleetMatrix(dateFrom, dateTo);
        setMatrixData({
          project: { title: '' },
          dates: data.dates,
          rows: data.rows,
        });
      } else {
        const data = await api.dailyLogs.getProjectMatrix(currentProjectId, dateFrom, dateTo);
        setMatrixData(data);
      }
    } catch (err) {
      console.error('Failed to fetch calendar matrix:', err);
    } finally {
      setLoading(false);
    }
  }, [currentProjectId, dateFrom, dateTo]);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  /* Stats - Dynamically computed across all scheduled matrix cells */
  let totalCells = 0, loggedCount = 0, blockerCount = 0, pendingCount = 0;
  if (matrixData?.rows) {
    matrixData.rows.forEach(row => {
      if (Array.isArray(row.days)) {
        row.days.forEach(day => {
          if (day.status === 'logged') loggedCount++;
          else if (day.status === 'no_work') blockerCount++;
          else if (day.status === 'pending' || day.status === 'missed') pendingCount++;
          if (day.status !== 'na') totalCells++;
        });
      }
    });
  }
  const health = totalCells > 0 ? Math.round((loggedCount / totalCells) * 100) : 0;

  const fmtDate = (str) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [, m, d] = str.split('-');
    return { month: months[+m - 1], day: +d };
  };

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="flex gap-5 items-start animate-fade-up">

      {/* ── LEFT: Main Matrix Panel ───────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Page Header (Matches PMDashboard Spaces styling) */}
        <div className="flex flex-col items-start gap-1 mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <span>Spaces</span>
            <span>/</span>
            <span className="text-yellow-500 font-semibold">Calendar Matrix Tracker</span>
          </div>
          <div className="w-full flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Layout className="w-6 h-6 text-yellow-500" />
              <span>{matrixData?.project?.title || projects.find(p => String(p.id) === String(currentProjectId))?.title || 'Fleet-Level (All Projects)'}</span>
              {matrixData?.project?.start_date && matrixData?.project?.end_date && (
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-2.5 py-1 rounded-md flex items-center gap-1.5 ml-1">
                  <Clock className="w-3.5 h-3.5 text-yellow-500" />
                  <span>{matrixData.project.start_date} — {matrixData.project.end_date}</span>
                </span>
              )}
            </h1>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Project Dashboard navigation */}
              {currentProjectId !== 'fleet' && currentProjectId && (
                <button
                  onClick={() => {
                    if (onSelectProject) onSelectProject(currentProjectId);
                    if (typeof onNavigateTab === 'function') {
                      onNavigateTab('dashboard', currentProjectId, 'workspace');
                    } else {
                      window.dispatchEvent(new CustomEvent('pmpulse_navigate_tab', { detail: { tab: 'dashboard', projectId: currentProjectId } }));
                    }
                  }}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                  title="Return to Project Dashboard"
                >
                  <Layout className="w-4 h-4 text-yellow-500" />
                  <span className="hidden sm:inline">Project Dashboard</span>
                </button>
              )}

              {/* Team Chat & Discussions Button */}
              <button
                onClick={() => setShowChatModal(true)}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                title="Open Project Team Chat & Meeting Scheduler"
              >
                <MessageSquare className="w-4 h-4 text-yellow-500" />
                <span>Team Chat &amp; Sync</span>
              </button>

              <button
                onClick={fetchMatrix}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-3.5 flex flex-wrap items-center gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filters:</span>
          </div>

          {/* Project Scope */}
          <div style={{ minWidth: '220px' }}>
            <select
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-yellow-500 outline-none w-full"
              value={currentProjectId}
              onChange={e => {
                setCurrentProjectId(e.target.value);
                if (onSelectProject) onSelectProject(e.target.value);
              }}
            >
              <option value="fleet">🌐 Fleet-Level (All Projects)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>📁 {p.title}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <input
            type="date"
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-yellow-500 outline-none"
            style={{ width: '140px' }}
            value={dateFrom}
            onChange={e => handleDateFromChange(e.target.value)}
          />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">to</span>
          <input
            type="date"
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-yellow-500 outline-none"
            style={{ width: '140px' }}
            value={dateTo}
            onChange={e => handleDateToChange(e.target.value)}
          />

          {/* Quick windows */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleFullSprint}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                isFullSprintActive
                  ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/40 font-semibold shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Full Sprint
            </button>
            <button
              type="button"
              onClick={handleFiveDayWindow}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                isFiveDayActive
                  ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/40 font-semibold shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              5-Day Window
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Logged Days
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {loggedCount}
            </div>
            <div className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">successful submissions</div>
          </div>

          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Blockers
              </span>
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400">
              {blockerCount}
            </div>
            <div className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">no-work impediments</div>
          </div>

          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending / Missed
              </span>
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-700 dark:text-slate-300">
              {pendingCount}
            </div>
            <div className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">scheduled workdays</div>
          </div>

          <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 transition-all hover:border-slate-300 dark:hover:border-slate-600 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Health Index
              </span>
              <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-yellow-500">
              {health}%
            </div>
            <div className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">on-time completion</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Legend:</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span className="font-medium text-emerald-600 dark:text-emerald-400">Logged Work (Done)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
            <span className="font-medium text-red-600 dark:text-red-400">Blocker (Stalled)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="font-medium text-amber-600 dark:text-amber-400">Missed Log</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full border border-dashed border-slate-400 dark:border-slate-500" />
            <span className="font-medium text-slate-600 dark:text-slate-400">Pending Window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-slate-400 dark:text-slate-600">—</span>
            <span className="font-medium text-slate-500">Unallocated / Outside Window</span>
          </div>
        </div>

        {/* Matrix Grid (Matches PMDashboard Table Styling) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
              <p className="text-sm font-medium">Rendering Calendar Heatmap Matrix…</p>
            </div>
          ) : !matrixData?.dates?.length ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              <FolderGit2 className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-slate-500" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">No tasks in this scope</p>
              <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">Provision tasks in the Project Dashboard to populate the grid.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse" style={{ minWidth: '700px' }}>
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th
                      className="sticky-col text-left px-4 py-3 bg-slate-50 dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700"
                      style={{
                        width: '280px',
                        minWidth: '280px',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Employee · Task (Click to inspect)
                        </span>
                      </div>
                    </th>
                    {matrixData.dates.map(dateStr => {
                      const { month, day } = fmtDate(dateStr);
                      const isToday = dateStr === today;
                      return (
                        <th
                          key={dateStr}
                          className={`text-center py-2 px-1 border-l border-b ${
                            isToday
                              ? 'bg-yellow-500/10 border-yellow-500/40'
                              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60'
                          }`}
                          style={{ minWidth: '72px' }}
                        >
                          <div
                            className={`text-[9px] uppercase tracking-widest font-bold ${
                              isToday ? 'text-yellow-600 dark:text-yellow-500' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {month}
                          </div>
                          <div
                            className={`text-sm font-extrabold ${
                              isToday ? 'text-yellow-600 dark:text-yellow-400 underline underline-offset-2' : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {day}
                          </div>
                          {isToday && (
                            <div className="text-[8px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-500 bg-yellow-500/20 px-1 py-0.5 rounded mt-0.5 inline-block">
                              Today
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(!matrixData?.rows || matrixData.rows.length === 0) ? (
                    <tr>
                      <td colSpan={matrixData?.dates?.length + 1 || 8} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                        <FolderGit2 className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                        <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No contributors or deliverables found in this project</p>
                        <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">Use the "Add Member" button above or provision deliverables in the Project Dashboard to populate this matrix.</p>
                      </td>
                    </tr>
                  ) : (
                    matrixData.rows.map((row, idx) => (
                      <tr key={`${row.employee?.id || 'emp'}-${row.task?.id || 'tsk'}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        {/* Sticky Contributor Column (Tracks Contributor Log Status) */}
                        <td
                          className="sticky-col px-4 py-3.5 bg-white dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800/80"
                          style={{ minWidth: '220px', width: '220px' }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0"
                              style={{
                                background: 'rgba(99, 102, 241, 0.2)',
                                color: '#818cf8',
                                border: '1px solid rgba(99, 102, 241, 0.4)'
                              }}
                            >
                              {(row.employee?.full_name || row.employee?.name || '?').trim().charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {row.employee?.full_name || 'Project Member'}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {row.employee?.role_title || 'Contributor'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Day Cells */}
                        {matrixData.dates.map(dateStr => {
                          const dayStatus = row.days?.find(d => d.date === dateStr) || { date: dateStr, status: 'na' };
                          const s = (dayStatus.status === 'missed' && dateStr >= today) ? 'pending' : dayStatus.status;

                          return (
                            <td
                              key={dateStr}
                              className="border-l border-slate-200 dark:border-slate-800/60 p-2 text-center align-middle"
                              style={{
                                minWidth: '72px',
                              }}
                            >
                              {s === 'logged' && (
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full cursor-pointer hover:opacity-90 transition-all shadow-sm bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                                  onClick={() => setSelectedCell({
                                    employee: row.employee,
                                    task: dayStatus.task || row.task,
                                    dayStatus,
                                    status: 'logged',
                                    date: dateStr,
                                    log: dayStatus.log
                                  })}
                                  title="Click to view submitted daily log"
                                >
                                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  <span className="hidden sm:inline">Done</span>
                                </button>
                              )}

                              {s === 'no_work' && (
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full cursor-pointer hover:opacity-90 transition-all shadow-sm bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/25"
                                  onClick={() => setSelectedCell({
                                    employee: row.employee,
                                    task: dayStatus.task || row.task,
                                    dayStatus,
                                    status: 'stalled',
                                    date: dateStr,
                                    log: dayStatus.log
                                  })}
                                  title="Click to view blocker reason"
                                >
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  <span className="hidden sm:inline">Stalled</span>
                                </button>
                              )}

                              {s === 'missed' && (
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full cursor-pointer hover:opacity-90 transition-all shadow-sm bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                                  onClick={() => setSelectedCell({
                                    employee: row.employee,
                                    task: dayStatus.task || row.task,
                                    dayStatus,
                                    status: 'missed',
                                    date: dateStr,
                                    log: null
                                  })}
                                  title="Contributor missed to provide log for this date"
                                >
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span className="hidden sm:inline">Missed</span>
                                </button>
                              )}

                              {s === 'pending' && (
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full cursor-pointer hover:opacity-90 transition-all shadow-sm bg-slate-50 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700/60 border-dashed text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500"
                                  onClick={() => setSelectedCell({
                                    employee: row.employee,
                                    task: dayStatus.task || row.task,
                                    dayStatus: { ...dayStatus, status: 'pending' },
                                    status: 'pending',
                                    date: dateStr,
                                    log: null
                                  })}
                                  title="Scheduled workday (window not closed yet)"
                                >
                                  <Clock className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" />
                                  <span className="hidden sm:inline">Pending</span>
                                </button>
                              )}

                              {(s === 'na' || !s) && (
                                <div className="text-center py-1">
                                  <span className="text-slate-400 dark:text-slate-600 font-mono text-xs">—</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>


      {/* ── Log Detail Modal ──────────────────────────────── */}
      {selectedCell && (
        <LogDetailModal
          logData={selectedCell}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {/* ── Task Specification Modal ──────────────────────── */}
      {selectedTaskModal && (
        <TaskDetailModal
          task={selectedTaskModal.task}
          employee={selectedTaskModal.employee}
          days={selectedTaskModal.days}
          onClose={() => setSelectedTaskModal(null)}
        />
      )}

      {/* ── Project Team Chat & Meeting Scheduler Modal ─── */}
      {showChatModal && (
        <ProjectChatModal
          projectId={currentProjectId !== 'fleet' && currentProjectId ? Number(currentProjectId) : (projects[0]?.id || null)}
          projects={projects}
          onClose={() => setShowChatModal(false)}
        />
      )}

      {/* ── Project Deadline Reached Modal ─── */}
      {showDeadlineModal && deadlineProject && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 300 }}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl animate-fade-up flex flex-col p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Project Deadline Reached</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {deadlineProject.title} ended on {deadlineProject.end_date}.
                </p>
              </div>
            </div>

            <p className="text-sm mb-6 text-slate-700 dark:text-slate-300 leading-relaxed">
              The scheduled deadline for this project has been reached. Please mark the project as completed or extend the deadline to continue tracking work.
            </p>

            {extendMode ? (
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">New End Date</label>
                <input
                  type="date"
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-yellow-500 outline-none w-full"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setExtendMode(false)}
                    className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors"
                    disabled={deadlineActionLoading}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleDeadlineSubmit('extend')}
                    className="px-4 py-1.5 rounded-lg text-sm font-bold bg-yellow-500 hover:bg-yellow-600 text-slate-950 transition-colors"
                    disabled={deadlineActionLoading || !newEndDate}
                  >
                    {deadlineActionLoading ? 'Saving...' : 'Save Deadline'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleDeadlineSubmit('completed')}
                  className="btn-primary flex items-center justify-center gap-2 py-2"
                  style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                  disabled={deadlineActionLoading}
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  {deadlineActionLoading ? 'Saving...' : 'Mark Project Completed'}
                </button>
                <button
                  onClick={() => setExtendMode(true)}
                  className="btn-secondary flex items-center justify-center gap-2 py-2"
                  disabled={deadlineActionLoading}
                >
                  <Clock className="w-4 h-4" />
                  Extend Deadline
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
