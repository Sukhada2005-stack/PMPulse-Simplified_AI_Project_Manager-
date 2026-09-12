import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  FolderGit2,
  Eye,
  X,
  ChevronRight
} from 'lucide-react';

export default function EmployeeDailyLogs({ selectedWorkspace: propWorkspace }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({
    totalLogged: 0,
    totalProductive: 0,
    totalBlockers: 0,
    productivityRate: 100
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Today's submission form state
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [hasWorked, setHasWorked] = useState(true);
  const [workText, setWorkText] = useState('');
  const [noWorkReason, setNoWorkReason] = useState('');

  // History filtering & search
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'productive', 'blocker'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);

  // Active project context
  const activeWorkspace = propWorkspace || (tasks[0]?.project_id ? { id: tasks[0].project_id, title: tasks[0].project_title } : null);

  const isTaskAllocatedToUser = (task, currentUser) => {
    if (!task || !currentUser) return false;
    const targetName = (currentUser.full_name || currentUser.name || '').trim().toLowerCase();
    const targetEmail = (currentUser.email || '').trim().toLowerCase();
    const targetId = currentUser.id;

    const assignee = String(task.assignee || task.Responsible || '').trim().toLowerCase();
    if (!assignee || assignee === 'unassigned') return false;

    // Direct ID match
    if (task.user_id && String(task.user_id) === String(targetId)) return true;
    if (task.assignee_id && String(task.assignee_id) === String(targetId)) return true;

    // Match full name or email
    if (assignee === targetName) return true;
    if (targetEmail && assignee === targetEmail) return true;

    // Clean name matching (e.g. "Nayan K" vs "Nayan K (pm)")
    const cleanAssignee = assignee.replace(/\s*\(.*?\)$/, '').trim();
    if (cleanAssignee && (cleanAssignee === targetName || targetName.startsWith(cleanAssignee) || cleanAssignee.startsWith(targetName))) {
      return true;
    }

    return false;
  };

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const wsId = activeWorkspace?.id;

      // 1. Fetch DB tasks and daily logs
      const [tasksRes, logsRes] = await Promise.all([
        api.tasks.getMyTasks(),
        api.dailyLogs.getMyLogs(wsId)
      ]);

      // Database tasks assigned to user
      let dbTasks = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : [];
      if (wsId) {
        dbTasks = dbTasks.filter(t => String(t.project_id) === String(wsId));
      }

      // 2. Also check active workspace tasks from List view and Board view in localStorage
      let localAllocatedTasks = [];
      if (wsId) {
        try {
          const listTasks = JSON.parse(localStorage.getItem(`pmpulse_listTasks_${wsId}`) || '[]');
          const boardTasks = JSON.parse(localStorage.getItem(`pmpulse_boardTasks_${wsId}`) || '[]');
          const allLocal = [...listTasks, ...boardTasks];

          // If there are local tasks assigned to the employee that might not be synced to DB yet, sync them
          const needsSync = allLocal.filter(t => t && (t.title || t['Issue / Task / Enhancement']));
          if (needsSync.length > 0) {
            try {
              await api.projects.syncWorkspaceTasks(wsId, needsSync);
              const refreshed = await api.tasks.getMyTasks();
              if (Array.isArray(refreshed?.tasks)) {
                dbTasks = refreshed.tasks.filter(t => String(t.project_id) === String(wsId));
              }
            } catch (syncErr) {
              console.warn('Silent task sync error:', syncErr);
            }
          }

          allLocal.forEach(t => {
            if (isTaskAllocatedToUser(t, user)) {
              localAllocatedTasks.push({
                id: t.id,
                title: t.title || t['Issue / Task / Enhancement'] || t.task || t.description || 'Assigned Task',
                project_id: wsId,
                project_title: activeWorkspace?.name || activeWorkspace?.title || 'Current Project',
                description: t.description || t['Added '] || '',
                status: t.status || t['Status'] || 'in_progress'
              });
            }
          });
        } catch (e) {
          console.warn('Error reading local workspace tasks:', e);
        }
      }

      // 3. Merge DB tasks and Local tasks strictly allocated to this employee
      const normalizeTitle = (str) => (str || '').trim().toLowerCase();
      const taskMap = new Map();

      // Highest priority: DB tasks assigned to this employee
      dbTasks.forEach(t => {
        const titleKey = normalizeTitle(t.title);
        if (t.id) taskMap.set(`id-${t.id}`, t);
        if (titleKey) taskMap.set(`title-${titleKey}`, t);
      });

      // Supplement with any local tasks allocated to this employee not yet mapped
      localAllocatedTasks.forEach(t => {
        const titleKey = normalizeTitle(t.title);
        const idKey = t.id ? `id-${t.id}` : null;
        if ((!idKey || !taskMap.has(idKey)) && (!titleKey || !taskMap.has(`title-${titleKey}`))) {
          if (idKey) taskMap.set(idKey, t);
          else if (titleKey) taskMap.set(`title-${titleKey}`, t);
        }
      });

      // Strictly filtered to tasks allocated to this employee only
      const finalTasks = Array.from(new Set(taskMap.values()));

      setTasks(finalTasks);

      if (finalTasks.length > 0) {
        if (!selectedTaskId || !finalTasks.some(t => String(t.id) === String(selectedTaskId))) {
          setSelectedTaskId(finalTasks[0].id);
        }
      } else {
        setSelectedTaskId('');
      }

      setLogs(logsRes.logs || []);
      if (logsRes.metrics) {
        setMetrics(logsRes.metrics);
      }
    } catch (err) {
      console.error('Failed to load employee daily logs data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [user?.id, activeWorkspace?.id]);

  const handleSubmitDailyLog = async (e) => {
    e.preventDefault();
    if (!selectedTaskId) {
      alert('Please select an assigned task to log your update.');
      return;
    }

    if (hasWorked && !workText.trim()) {
      alert('Please enter your daily accomplishments or notes.');
      return;
    }

    if (!hasWorked && !noWorkReason.trim()) {
      alert('Please describe the blocker or reason for impediment.');
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        has_worked: hasWorked,
        work_text: hasWorked ? workText.trim() : null,
        no_work_reason: !hasWorked ? noWorkReason.trim() : null,
        log_date: logDate
      };

      const res = await api.dailyLogs.submit(selectedTaskId, payload);

      if (hasWorked) {
        confetti({
          particleCount: 75,
          spread: 55,
          origin: { y: 0.65 }
        });
      }

      setFeedback({
        type: hasWorked ? 'success' : 'warning',
        message: hasWorked
          ? 'Daily log recorded successfully! Metrics and calendar matrix updated.'
          : 'Blocker flagged for management review. Your PM has been notified.'
      });

      // Reset text inputs
      setWorkText('');
      setNoWorkReason('');

      // Refresh logbook and metrics
      await fetchEmployeeData();
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered logbook entries
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Status filter
      if (filterStatus === 'productive' && log.has_worked !== 1) return false;
      if (filterStatus === 'blocker' && log.has_worked === 1) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTask = (log.task_title || '').toLowerCase().includes(q);
        const matchesWork = (log.work_text || '').toLowerCase().includes(q);
        const matchesBlocker = (log.no_work_reason || '').toLowerCase().includes(q);
        const matchesDate = (log.log_date || '').toLowerCase().includes(q);
        return matchesTask || matchesWork || matchesBlocker || matchesDate;
      }
      return true;
    });
  }, [logs, filterStatus, searchQuery]);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="space-y-6 animate-fade-up max-w-7xl mx-auto pb-12">
      {/* ── HEADER BANNER ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                <FileText className="w-3.5 h-3.5" />
                Personal Daily Logbook
              </span>
              {activeWorkspace && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <FolderGit2 className="w-3 h-3 text-yellow-500" />
                  {activeWorkspace.name || activeWorkspace.title || 'Vidyarthi_Vigyan_Manthan_2026-27'}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Daily Logs & Standup — {user?.full_name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {user?.role_title || 'Contributor'} • Zero Agile overhead daily logging & progress synchronization
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <Calendar className="w-4 h-4 text-yellow-500" />
              <span>{todayFormatted}</span>
            </div>
            <button
              onClick={fetchEmployeeData}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Refresh logs & metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-yellow-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── METRICS KPI STRIP ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm dark:shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{metrics.totalLogged}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Entries Logged</div>
          </div>
        </div>

        {/* Productive Updates */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm dark:shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.totalProductive}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Productive Updates</div>
          </div>
        </div>

        {/* Blockers Reported */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm dark:shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-500 dark:text-rose-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{metrics.totalBlockers}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Blockers Reported</div>
          </div>
        </div>

        {/* Productivity Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm dark:shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-yellow-600 dark:text-yellow-500">{metrics.productivityRate}%</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Consistency & Productivity</div>
          </div>
        </div>
      </div>

      {/* ── TODAY'S LOG SUBMISSION PANEL ───────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm dark:shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Submit Daily Standup Log</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Provide your daily progress or report blockers directly to your project heatmap</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Auto-syncs with Calendar Matrix</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {feedback && (
          <div className={`p-4 rounded-xl mb-6 border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
          }`}>
            <div className="flex items-center gap-2.5 text-sm">
              {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500 dark:text-emerald-400" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500 dark:text-rose-400" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmitDailyLog} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Task Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Select Assigned Task / Deliverable <span className="text-yellow-500">*</span>
              </label>
              {tasks.length === 0 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
                  No active tasks assigned yet. You can still log updates once assigned tasks are provisioned.
                </div>
              ) : (
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-yellow-500 transition-colors"
                  required
                >
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} {t.project_title ? `(${t.project_title})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Log Date
              </label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-yellow-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Work Status Radio Tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Progress Status
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setHasWorked(true)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  hasWorked
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  hasWorked ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                }`}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Productive Work Done</div>
                  <div className="text-xs opacity-75">Achieved milestones, commits, or deliverables</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setHasWorked(false)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  !hasWorked
                    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 shadow-sm ring-1 ring-rose-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  !hasWorked ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-slate-200 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Blocker / No Work Done</div>
                  <div className="text-xs opacity-75">Flag impediment or reason for stall to manager</div>
                </div>
              </button>
            </div>
          </div>

          {/* Details input */}
          {hasWorked ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Work Summary & Achievements <span className="text-yellow-500">*</span>
              </label>
              <textarea
                value={workText}
                onChange={(e) => setWorkText(e.target.value)}
                placeholder="What did you achieve today? E.g., Implemented Daily Logs sidebar routing, updated database schema, tested end-to-end integration..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition-colors"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1.5">
                Impediment Explanation / Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={noWorkReason}
                onChange={(e) => setNoWorkReason(e.target.value)}
                placeholder="Explain the specific blocker or reason. E.g., Awaiting API credentials, blocked on PR review, dependency environment down..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-rose-300 dark:border-rose-500/40 rounded-xl p-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                required
              />
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || tasks.length === 0}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-yellow-500 hover:bg-yellow-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Recording Log...' : 'Record Daily Log'}
            </button>
          </div>
        </form>
      </div>

      {/* ── HISTORICAL LOGBOOK AUDIT TRAIL ─────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              My Daily Logbook History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Complete archive of your daily standup logs and blocker reports</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter pills */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  filterStatus === 'all' ? 'bg-yellow-500 text-slate-950 shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All ({logs.length})
              </button>
              <button
                onClick={() => setFilterStatus('productive')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  filterStatus === 'productive' ? 'bg-emerald-500 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Productive ({metrics.totalProductive})
              </button>
              <button
                onClick={() => setFilterStatus('blocker')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  filterStatus === 'blocker' ? 'bg-rose-500 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Blockers ({metrics.totalBlockers})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-yellow-500 w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Table / List */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No daily logs found</p>
            <p className="text-xs text-slate-500 mt-1">Submit your first standup log above to populate your logbook.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Task & Project</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Daily Notes / Reason</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredLogs.map(log => {
                  const isLogged = log.has_worked === 1;
                  return (
                    <tr key={log.id || `${log.task_id}-${log.log_date}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-slate-200">
                        {log.log_date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-200">{log.task_title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{log.project_title}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isLogged ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Logged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Blocker
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <p className="line-clamp-2 text-slate-700 dark:text-slate-300">
                          {isLogged ? log.work_text : log.no_work_reason}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLogDetail(log)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-yellow-500" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ───────────────────────────────────────────── */}
      {selectedLogDetail && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Daily Log Details</h3>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Date</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{selectedLogDetail.log_date}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Status</span>
                  {selectedLogDetail.has_worked === 1 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Productive Work Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-3.5 h-3.5" /> Impediment / Blocker
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Deliverable</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{selectedLogDetail.task_title}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Project</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{selectedLogDetail.project_title}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  {selectedLogDetail.has_worked === 1 ? 'Detailed Work Notes' : 'Blocker Explanation'}
                </span>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedLogDetail.has_worked === 1
                    ? selectedLogDetail.work_text
                    : selectedLogDetail.no_work_reason}
                </div>
              </div>

              {selectedLogDetail.created_at && (
                <div className="text-[11px] text-slate-500 text-right">
                  Recorded at: {new Date(selectedLogDetail.created_at).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold border border-slate-300 dark:border-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
