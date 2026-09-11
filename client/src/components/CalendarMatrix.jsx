import React, { useState, useEffect, useCallback } from 'react';
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
  UserPlus,
  Search,
  MessageSquare
} from 'lucide-react';
import LogDetailModal from './LogDetailModal';
import TaskDetailModal from './TaskDetailModal';
import ProjectChatModal from './ProjectChatModal';

/* ── Main CalendarMatrix Component ──────────────────────────────────── */
export default function CalendarMatrix({ selectedProjectId, onSelectProject, onOpenAISummary }) {
  const [teamMembers, setTeamMembers] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('pmpulse_workspaceMembers')) || []; }
    catch { return []; }
  });
  const [matrixTasks, setMatrixTasks] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('pmpulse_listTasks')) || []; }
    catch { return []; }
  });

  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(selectedProjectId || 'fleet');
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);

  const [selectedCellInfo, setSelectedCellInfo] = useState(null);

  const [employeeLogs] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('pmpulse_employeeLogs')) || []; }
    catch { return []; }
  });

  const [sprintConfig] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('pmpulse_sprintConfig')) || null; }
    catch { return null; }
  });
  const [selectedTaskModal, setSelectedTaskModal] = useState(null);

  // Add Member modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [addingMember, setAddingMember] = useState(null); // id being added
  const [addMemberMsg, setAddMemberMsg] = useState(null); // { type: 'success'|'error', text }

  // Date filters
  const [dateFrom, setDateFrom] = useState('2026-08-27');
  const [dateTo, setDateTo] = useState('2026-09-06');

  // Stores the computed Active Sprint bounds so the 'Full Sprint' button
  // can reference them dynamically instead of using hardcoded strings.
  const [sprintDateFrom, setSprintDateFrom] = useState('2026-08-27');
  const [sprintDateTo, setSprintDateTo] = useState('2026-09-06');

  // Auto-set date range to the Active Sprint when a project is selected.
  // Derives sprint bounds from task date ranges (in_progress tasks take priority),
  // falling back to all tasks, then to the macro project deadline.
  useEffect(() => {
    if (!matrixData) return;

    const rows = matrixData.rows || [];

    // Collect task dates — prefer in_progress tasks to represent the active sprint
    const activeTasks = rows
      .map(r => r.task)
      .filter(t => t && t.status === 'in_progress' && t.start_date && t.end_date);

    const candidateTasks = activeTasks.length > 0
      ? activeTasks
      : rows.map(r => r.task).filter(t => t && t.start_date && t.end_date);

    if (candidateTasks.length > 0) {
      const initialStart = candidateTasks
        .map(t => t.start_date)
        .sort()[0];                                        // earliest task start
      const initialEnd = candidateTasks
        .map(t => t.end_date)
        .sort()
        .reverse()[0];                                     // latest task end

      setDateFrom(initialStart);
      setDateTo(initialEnd);
      setSprintDateFrom(initialStart); // keep sprint bounds in sync
      setSprintDateTo(initialEnd);
    } else {
      // Last resort: fall back to the macro project deadline dates
      const initialStart = matrixData?.project?.start_date || '';
      const initialEnd = matrixData?.project?.end_date || '';
      if (initialStart && initialEnd) {
        setDateFrom(initialStart);
        setDateTo(initialEnd);
        setSprintDateFrom(initialStart);
        setSprintDateTo(initialEnd);
      }
    }
  }, [matrixData]); // Re-runs only when a new project's matrix data arrives

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
  }, [selectedProjectId]);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
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

  // Lock body scroll when add-member modal is open
  useEffect(() => {
    document.body.style.overflow = showAddMemberModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showAddMemberModal]);

  const openAddMemberModal = async () => {
    if (!currentProjectId || currentProjectId === 'fleet') return;
    setAddMemberMsg(null);
    setMemberSearch('');
    setShowAddMemberModal(true);
    setLoadingMembers(true);
    try {
      const [empRes, projRes] = await Promise.all([
        api.employees.getAll(),
        api.projects.getById(currentProjectId)
      ]);
      const existingMembers = projRes.project?.members || [];
      const existingIds = new Set(existingMembers.map(m => m.id));
      const allEmps = empRes.employees || [];
      // Show all employees from Workforce Directory who are not yet in this project
      const available = allEmps.filter(e => !existingIds.has(e.id));
      setAllEmployees(available);
    } catch (err) {
      console.error('Failed to load available employees for project:', err);
      setAllEmployees([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async (employeeId) => {
    setAddingMember(employeeId);
    setAddMemberMsg(null);
    try {
      const res = await api.projects.addMember(currentProjectId, employeeId);
      setAddMemberMsg({ type: 'success', text: res.message });
      // Remove from available list
      setAllEmployees(prev => prev.filter(e => e.id !== employeeId));
      // Refresh matrix and projects list to reflect new member immediately
      fetchMatrix();
      api.projects.getAll().then(r => setProjects(r.projects || [])).catch(() => { });
    } catch (err) {
      setAddMemberMsg({ type: 'error', text: err.message });
    } finally {
      setAddingMember(null);
    }
  };

  /* Stats */
  let totalCells = 0, loggedCount = 0, blockerCount = 0, pendingCount = 0;
  if (matrixTasks) {
    loggedCount = matrixTasks.filter(t => t.status === 'Done').length;
    pendingCount = matrixTasks.filter(t => t.status !== 'Done').length;
    totalCells = matrixTasks.length;
  }
  const health = totalCells > 0 ? Math.round((loggedCount / totalCells) * 100) : 0;

  const fmtDate = (str) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [, m, d] = str.split('-');
    return { month: months[+m - 1], day: +d };
  };

  const today = new Date().toISOString().split('T')[0];

  const isTaskOnDate = (taskDateStr, columnDateObj) => {
    if (!taskDateStr || !columnDateObj) return false;
    const tDate = new Date(taskDateStr);
    const cDate = new Date(columnDateObj);
    return tDate.getFullYear() === cDate.getFullYear() && tDate.getMonth() === cDate.getMonth() && tDate.getDate() === cDate.getDate();
  };

  const isTaskActiveWindow = (task, columnDateObj, sprintStartDate) => {
    if (!task.dueDate || !columnDateObj) return false;
    const cDate = new Date(columnDateObj).setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate).setHours(0, 0, 0, 0);
    let startDateObj = sprintStartDate ? new Date(sprintStartDate).setHours(0, 0, 0, 0) : new Date('2026-09-07').setHours(0, 0, 0, 0);
    if (task.startDate || task.addedOn) startDateObj = new Date(task.startDate || task.addedOn).setHours(0, 0, 0, 0);
    return cDate >= startDateObj && cDate <= dueDate;
  };

  return (
    <div className="flex gap-5 items-start animate-fade-up">

      {/* ── LEFT: Main Matrix Panel ───────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {matrixData?.project?.start_date && matrixData?.project?.end_date && (
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="lozenge" style={{ background: '#EAE6FF', color: '#403294' }}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  Deadline: {matrixData.project.start_date} to {matrixData.project.end_date}
                </span>
              </div>
            )}
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-1)' }}>
              Calendar Matrix Tracker
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Team Chat & Discussions Button */}
            <button
              onClick={() => setShowChatModal(true)}
              className="btn-secondary text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 font-semibold"
              title="Open Project Team Chat & Meeting Scheduler"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Team Chat &amp; Sync</span>
            </button>

            {/* Add Member — only when a specific project is selected */}
            {currentProjectId !== 'fleet' && currentProjectId && (
              <>
                <button
                  onClick={openAddMemberModal}
                  className="btn-secondary"
                  title="Add employee to this project"
                >
                  <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                  Add Member
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone and will delete all associated tasks and logs.')) {
                      try {
                        await api.projects.delete(currentProjectId);
                        if (onSelectProject) onSelectProject('fleet');
                        setCurrentProjectId('fleet');
                        // refetch will happen due to currentProjectId change
                      } catch (err) {
                        alert(err.message || 'Failed to delete project');
                      }
                    }
                  }}
                  className="btn-secondary text-red-600 bg-red-50 hover:bg-red-100 border-red-200"
                  title="Delete this project"
                >
                  Delete Project
                </button>
              </>
            )}
            <button
              onClick={fetchMatrix}
              className="btn-secondary"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="jira-card p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" style={{ color: 'var(--color-text-3)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-3)' }}>Filters:</span>
          </div>

          {/* Project Scope */}
          <div style={{ minWidth: '220px' }}>
            <select
              className="jira-select"
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
            className="jira-input"
            style={{ width: '140px' }}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            className="jira-input"
            style={{ width: '140px' }}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />

          {/* Quick windows */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => { setDateFrom(sprintDateFrom); setDateTo(sprintDateTo); }}
              className={`text-[11px] px-2.5 py-1 rounded font-semibold border transition-colors ${dateFrom === sprintDateFrom && dateTo === sprintDateTo
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
            >
              Full Sprint
            </button>
            <button
              onClick={() => { setDateFrom('2026-08-30'); setDateTo('2026-09-03'); }}
              className={`text-[11px] px-2.5 py-1 rounded font-semibold border transition-colors ${dateFrom === '2026-08-30' && dateTo === '2026-09-03'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
            >
              5-Day Window
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-3)' }}>
                Logged Days
              </span>
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
            </div>
            <div className="text-2xl font-black" style={{ color: 'var(--color-success)' }}>
              {loggedCount}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>successful submissions</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-3)' }}>
                Blockers
              </span>
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--color-danger)' }} />
            </div>
            <div className="text-2xl font-black" style={{ color: 'var(--color-danger)' }}>
              {blockerCount}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>no-work impediments</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-3)' }}>
                Pending
              </span>
              <Clock className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="text-2xl font-black text-gray-500">
              {pendingCount}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>scheduled windows</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-3)' }}>
                Health Index
              </span>
              <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="text-2xl font-black" style={{ color: 'var(--color-primary)' }}>
              {health}%
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>on-time completion</div>
          </div>
        </div>

        {/* Legend */}
        <div
          className="flex flex-wrap items-center gap-4 px-1"
          style={{ fontSize: '12px', color: 'var(--color-text-3)' }}
        >
          <span className="font-semibold" style={{ color: 'var(--color-text-2)' }}>Legend:</span>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
            <span className="font-medium" style={{ color: 'var(--color-success)' }}>Logged Work</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--color-danger)' }} />
            <span className="font-medium" style={{ color: 'var(--color-danger)' }}>Blocker / No Work</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-medium text-amber-700">Missed Log</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3.5 h-3.5 rounded-full border-2 border-dashed"
              style={{ borderColor: '#C1C7D0' }}
            />
            <span>Pending Window</span>
          </div>

        </div>

        {/* Matrix Grid */}
        <div className="jira-card overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3" style={{ color: 'var(--color-text-3)' }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
              <p className="text-sm font-medium">Rendering Calendar Heatmap Matrix…</p>
            </div>
          ) : !matrixData?.dates?.length ? (
            <div className="py-16 text-center" style={{ color: 'var(--color-text-3)' }}>
              <FolderGit2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-semibold" style={{ color: 'var(--color-text-2)' }}>No tasks in this scope</p>
              <p className="text-xs mt-1">Provision tasks in the Project Dashboard to populate the grid.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="matrix-table w-full border-collapse" style={{ minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th
                      className="sticky-col text-left"
                      style={{
                        width: '280px',
                        minWidth: '280px',
                        padding: '12px 16px',
                        borderBottom: '2px solid var(--color-border)',
                        borderRight: '2px solid var(--color-border)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-3)' }}>
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
                          className="text-center"
                          style={{
                            minWidth: '72px',
                            background: isToday ? 'rgba(238,178,13,0.12)' : 'rgba(255,255,255,0.03)',
                            borderBottom: '2px solid var(--color-border)',
                            borderLeft: '1px solid var(--color-border-soft)',
                            padding: '8px 4px',
                          }}
                        >
                          <div
                            className="text-[9px] uppercase tracking-widest font-bold"
                            style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-3)' }}
                          >
                            {month}
                          </div>
                          <div
                            className="text-sm font-extrabold"
                            style={{
                              color: isToday ? 'var(--color-primary)' : 'var(--color-text-1)',
                              textDecoration: isToday ? 'underline' : 'none',
                              textUnderlineOffset: '3px',
                            }}
                          >
                            {day}
                          </div>
                          {isToday && (
                            <div
                              className="text-[8px] font-bold uppercase tracking-wider mt-0.5"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              Today
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {teamMembers.length === 0 ? (
                    <tr>
                      <td colSpan={matrixData?.dates?.length + 1 || 8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No members added to this workspace yet.
                      </td>
                    </tr>
                  ) : (
                    teamMembers.map((member, idx) => (
                      <tr key={`${member.id || member.email}-${idx}`}>
                        {/* Sticky Label Cell */}
                        <td
                          className="sticky-col"
                          style={{ padding: '10px 14px', minWidth: '280px', width: '280px' }}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="min-w-0 flex-1">
                              <div
                                className="text-xs font-bold truncate"
                                style={{ color: 'var(--color-text-1)' }}
                              >
                                {member.name || member.full_name || member.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Day Cells */}
                        {matrixData.dates.map(dateStr => {
                          const date = dateStr;
                          return (
                            <td
                              key={dateStr}
                              style={{
                                padding: '8px 5px',
                                borderLeft: '1px solid var(--color-border-soft)',
                                minWidth: '72px',
                                verticalAlign: 'top'
                              }}
                            >
                              {(() => {
                                const daysTasks = matrixTasks.filter(task =>
                                  task.assignee === (member.name || member.full_name || member.email) && isTaskActiveWindow(task, date, sprintConfig?.startDate)
                                );

                                if (daysTasks.length > 0) {
                                  return (
                                    <div className="flex flex-col gap-1.5 w-full px-2 py-1">
                                      {daysTasks.map(t => {
                                        const taskLog = employeeLogs.find(log => (log.taskId === t.id || log.taskKey === t.key) && isTaskOnDate(log.date, date));
                                        const isPastDate = new Date(date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

                                        let status = 'pending';
                                        let bgColor = 'bg-transparent border-slate-800 text-slate-600';

                                        if (taskLog) {
                                          if (taskLog.status?.toLowerCase() === 'stalled' || taskLog.status?.toLowerCase() === 'blocked') {
                                            status = 'stalled';
                                            bgColor = 'bg-red-900/30 border-red-800 text-red-400';
                                          } else {
                                            status = 'logged';
                                            bgColor = 'bg-emerald-900/30 border-emerald-800 text-emerald-400';
                                          }
                                        } else if (isPastDate) {
                                          status = 'missing';
                                          bgColor = 'bg-transparent border-zinc-700 border-dashed text-zinc-500';
                                        }

                                        let StatusIcon = Clock;
                                        let statusText = 'Pending';

                                        if (status === 'logged') {
                                          StatusIcon = CheckCircle2;
                                          statusText = 'Done';
                                        } else if (status === 'stalled') {
                                          StatusIcon = AlertTriangle;
                                          statusText = 'Stalled';
                                        } else if (status === 'missing') {
                                          StatusIcon = Clock;
                                          statusText = 'Missed';
                                        }

                                        return (
                                          <div
                                            key={t.id || t.key}
                                            onClick={() => setSelectedCellInfo({ task: t, log: taskLog, status, date })}
                                            className={`flex items-center justify-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border cursor-pointer hover:opacity-80 transition-opacity shadow-sm ${bgColor}`}
                                            title={`${t.key} - Click to inspect`}
                                          >
                                            <StatusIcon size={12} className="shrink-0" />
                                            <span className="tracking-wide">{statusText}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                }
                                return <div className="text-center"><span className="text-slate-700">—</span></div>;
                              })()}
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

      {/* ── Add Member to Project Modal ───────────────────── */}
      {showAddMemberModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setShowAddMemberModal(false)}
        >
          <div
            className="w-full max-w-md jira-card border shadow-2xl animate-fade-up flex flex-col"
            style={{ background: 'var(--color-surface-solid)', maxHeight: '80vh' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-yellow-500/10">
                  <UserPlus className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
                    Add Member to Project
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>
                    {projects.find(p => String(p.id) === String(currentProjectId))?.title || 'Current Project'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-white/40 hover:text-[var(--color-text-1)]/70 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pt-4 pb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search employees..."
                  className="jira-input pl-9 pr-3 text-xs w-full"
                  autoFocus
                />
              </div>
            </div>

            {/* Status message */}
            {addMemberMsg && (
              <div
                className="mx-5 mb-2 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2"
                style={{
                  background: addMemberMsg.type === 'success' ? 'rgba(56,221,159,0.12)' : 'rgba(255,107,107,0.12)',
                  color: addMemberMsg.type === 'success' ? '#38dd9f' : '#ff6b6b',
                  border: `1px solid ${addMemberMsg.type === 'success' ? 'rgba(56,221,159,0.3)' : 'rgba(255,107,107,0.3)'}`
                }}
              >
                {addMemberMsg.type === 'success'
                  ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                {addMemberMsg.text}
              </div>
            )}

            {/* Employee list */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 mt-1">
              {loadingMembers ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--color-text-3)' }}>
                  <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                  <p className="text-xs">Fetching available workforce members...</p>
                </div>
              ) : allEmployees.length === 0 ? (
                <div className="text-center py-10 text-xs" style={{ color: 'var(--color-text-3)' }}>
                  {memberSearch
                    ? 'No available contributors match your search.'
                    : 'All workforce contributors are already members of this project.'}
                </div>
              ) : (
                allEmployees
                  .filter(e =>
                    !memberSearch ||
                    e.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                    e.role_title.toLowerCase().includes(memberSearch.toLowerCase())
                  )
                  .map(emp => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:border-yellow-500/30 transition-colors"
                      style={{ background: 'var(--table-th-bg)' }}
                    >
                      <img
                        src={emp.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.full_name}`}
                        alt={emp.full_name}
                        className="w-9 h-9 rounded-full border border-white/10 object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs truncate" style={{ color: 'var(--color-text-1)' }}>
                          {emp.full_name}
                        </div>
                        <div className="text-[11px] text-yellow-400 font-medium truncate">
                          {emp.role_title}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(emp.id)}
                        disabled={addingMember === emp.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white flex-shrink-0 transition-all"
                        style={{
                          background: addingMember === emp.id ? '#d9a00a' : '#eeb20d',
                          border: '1px solid #eeb20d',
                          color: 'var(--navy)'
                        }}
                      >
                        {addingMember === emp.id
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <UserPlus className="w-3 h-3" />}
                        {addingMember === emp.id ? 'Adding...' : 'Add to Project'}
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
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
            className="w-full max-w-md jira-card border shadow-2xl animate-fade-up flex flex-col p-6"
            style={{ background: 'var(--color-surface-solid)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded bg-amber-50">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-1)' }}>Project Deadline Reached</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>
                  {deadlineProject.title} ended on {deadlineProject.end_date}.
                </p>
              </div>
            </div>

            <p className="text-sm mb-6" style={{ color: 'var(--color-text-2)' }}>
              The scheduled deadline for this project has been reached. Please mark the project as completed or extend the deadline to continue tracking work.
            </p>

            {extendMode ? (
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 mb-1">New End Date</label>
                <input
                  type="date"
                  className="jira-input w-full"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setExtendMode(false)}
                    className="btn-secondary"
                    disabled={deadlineActionLoading}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => handleDeadlineSubmit('extend')}
                    className="btn-primary"
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

      {/* Matrix Cell Inspection Modal */}
      {selectedCellInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0F172A] dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {selectedCellInfo.status === 'logged' && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
                {selectedCellInfo.status === 'stalled' && <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>}
                {selectedCellInfo.status === 'missing' && <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 shadow-[0_0_8px_rgba(161,161,170,0.5)]"></span>}
                {selectedCellInfo.status === 'pending' && <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>}
                Task Inspection
              </h3>
              <button onClick={() => setSelectedCellInfo(null)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Base Allocation Info */}
              <div className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Allocated Task</p>
                <p className="text-sm font-medium text-white">{selectedCellInfo.task.key}: {selectedCellInfo.task.description || selectedCellInfo.task.task}</p>
                <div className="flex gap-4 mt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">Assignee: <span className="text-slate-300 font-medium">{selectedCellInfo.task.assignee}</span></span>
                  <span className="flex items-center gap-1">Date: <span className="text-slate-300 font-medium">{new Date(selectedCellInfo.date).toLocaleDateString('en-GB')}</span></span>
                </div>
              </div>

              {/* Universal Daily Update Space */}
              <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-lg shadow-inner">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Daily Update</p>
                {selectedCellInfo.log ? (
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedCellInfo.log.dailyUpdate || selectedCellInfo.log.update || selectedCellInfo.log.details || selectedCellInfo.log.description || "Task activity recorded by the contributor."}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">The employee has not logged in yet for today!</p>
                )}
              </div>

              {/* Contextual Blocks */}
              {selectedCellInfo.status === 'stalled' && (
                <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Reason for Inactivity / Blocker</p>
                  <p className="text-sm text-red-100/90 leading-relaxed">
                    {selectedCellInfo.log?.reason || selectedCellInfo.log?.blocker || 'Inactivity reported without specific details.'}
                  </p>
                </div>
              )}

              {selectedCellInfo.status === 'missing' && (
                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-300 mb-1">Missed Log</p>
                    <p className="text-sm text-zinc-400">Contributor missed to provide today's log!</p>
                  </div>
                </div>
              )}

              {selectedCellInfo.status === 'pending' && (
                <div className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-lg">
                  <p className="text-sm text-slate-400">This task is scheduled for this date but the window has not closed yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
