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
  Sparkles,
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

/* ── Floating AI Summary Control Panel ──────────────────────────────── */
function AISummaryPanel({ projects, onClose, onOpenAISummary }) {
  const [dateRange, setDateRange]    = useState('last_7');
  const [project, setProject]        = useState('all');
  const [role, setRole]              = useState('all');
  const [generating, setGenerating]  = useState(false);
  const [summary, setSummary]        = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setSummary(null);
    try {
      const payload = {
        dimension: 'project_based',
        project_ids: project !== 'all' ? [Number(project)] : [],
        date_from: dateRange === 'last_7'
          ? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
          : dateRange === 'last_14'
          ? new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]
          : '2026-08-01',
        date_to: new Date().toISOString().split('T')[0],
      };
      const result = await api.ai.summarize(payload);
      
      // Extract string to prevent React "Objects are not valid as a React child" error
      let summaryText = 'Summary generated successfully.';
      if (result.summary) {
        summaryText = typeof result.summary === 'string' 
          ? result.summary 
          : (result.summary.executive_summary || JSON.stringify(result.summary));
      } else if (result.text) {
        summaryText = result.text;
      }
      
      setSummary(summaryText);
    } catch (err) {
      setSummary('⚠️ Could not generate summary. Please check backend connection.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="ai-panel w-full animate-fade-up">
      {/* Header */}
      <div className="ai-panel-header flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">AI Summary Control</span>
          </div>
          <h3 className="text-white font-bold text-sm">Generate Executive Summary</h3>
          <p className="text-blue-200 text-[11px] mt-0.5">
            Synthesize matrix data into AI-powered insights
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white transition-colors p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 space-y-3 border-b border-gray-100">
        {/* Date Range */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Date Range
          </label>
          <div className="relative">
            <select
              className="jira-select"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
            >
              <option value="last_7">Last 7 Days</option>
              <option value="last_14">Last 14 Days</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>

        {/* Project */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Project Scope
          </label>
          <select
            className="jira-select"
            value={project}
            onChange={e => setProject(e.target.value)}
          >
            <option value="all">🌐 All Projects (Fleet)</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>📁 {p.title}</option>
            ))}
          </select>
        </div>

        {/* Role Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Employee Role
          </label>
          <select
            className="jira-select"
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="engineer">Engineers</option>
            <option value="designer">Designers</option>
            <option value="manager">Managers</option>
            <option value="analyst">Analysts</option>
          </select>
        </div>
      </div>

      {/* Generate Button */}
      <div className="p-4 space-y-3">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-ai-glow"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-yellow-300" />
              ✨ Generate AI Summary
            </>
          )}
        </button>

        {summary && (
          <div
            className="text-[12px] text-gray-700 leading-relaxed p-3 rounded-lg animate-fade-up"
            style={{ background: 'rgba(238,178,13,0.08)', border: '1px solid rgba(238,178,13,0.12)' }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span className="font-bold text-blue-700 text-[11px] uppercase tracking-wide">AI Synthesis Result</span>
            </div>
            <p className="whitespace-pre-wrap text-gray-600 text-[11px]">{summary}</p>
          </div>
        )}

        <button
          onClick={onOpenAISummary}
          className="btn-secondary w-full justify-center text-xs"
        >
          Open Full AI Hub →
        </button>
      </div>
    </div>
  );
}

/* ── Main CalendarMatrix Component ──────────────────────────────────── */
export default function CalendarMatrix({ selectedProjectId, onSelectProject, onOpenAISummary }) {
  const [projects, setProjects]           = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(selectedProjectId || 'fleet');
  const [matrixData, setMatrixData]       = useState(null);
  const [loading, setLoading]             = useState(true);
  const [selectedCell, setSelectedCell]   = useState(null);  
  const [showChatModal, setShowChatModal]           = useState(false);
  const [selectedTaskModal, setSelectedTaskModal] = useState(null);
  const [showAIPanel, setShowAIPanel]     = useState(true);

  // Add Member modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [allEmployees, setAllEmployees]             = useState([]);
  const [loadingMembers, setLoadingMembers]         = useState(false);
  const [memberSearch, setMemberSearch]             = useState('');
  const [addingMember, setAddingMember]             = useState(null); // id being added
  const [addMemberMsg, setAddMemberMsg]             = useState(null); // { type: 'success'|'error', text }

  // Date filters
  const [dateFrom, setDateFrom] = useState('2026-08-27');
  const [dateTo, setDateTo]     = useState('2026-09-06');

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
    }).catch(() => {});
  }, [selectedProjectId]);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      if (currentProjectId === 'fleet' || !currentProjectId) {
        const data = await api.dailyLogs.getFleetMatrix(dateFrom, dateTo);
        setMatrixData({
          project: { title: 'All Projects — Fleet-Level Heatmap' },
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
      api.projects.getAll().then(r => setProjects(r.projects || [])).catch(() => {});
    } catch (err) {
      setAddMemberMsg({ type: 'error', text: err.message });
    } finally {
      setAddingMember(null);
    }
  };

  /* Stats */
  let totalCells = 0, loggedCount = 0, blockerCount = 0, pendingCount = 0;
  if (matrixData?.rows) {
    matrixData.rows.forEach(row =>
      row.days.forEach(day => {
        if (day.status === 'logged')                            loggedCount++;
        else if (day.status === 'no_work')                      blockerCount++;
        else if (day.status === 'pending' || day.status === 'missed') pendingCount++;
        if (day.status !== 'na') totalCells++;
      })
    );
  }
  const health = totalCells > 0 ? Math.round((loggedCount / totalCells) * 100) : 0;

  const fmtDate = (str) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [, m, d] = str.split('-');
    return { month: months[+m - 1], day: +d };
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex gap-5 items-start animate-fade-up">

      {/* ── LEFT: Main Matrix Panel ───────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="lozenge lozenge-blue">
                <CalendarIcon className="w-3 h-3 inline mr-1" />
                Live Matrix
              </span>
              <span className="lozenge lozenge-default">
                {matrixData?.project?.title || 'Loading...'}
              </span>
              {matrixData?.project?.start_date && matrixData?.project?.end_date && (
                <span className="lozenge" style={{ background: '#EAE6FF', color: '#403294' }}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  Deadline: {matrixData.project.start_date} to {matrixData.project.end_date}
                </span>
              )}
            </div>
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
            <button
              onClick={() => setShowAIPanel(v => !v)}
              className="btn-primary"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              {showAIPanel ? 'Hide AI Panel' : 'AI Summary'}
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
              onClick={() => { setDateFrom('2026-08-27'); setDateTo('2026-09-06'); }}
              className={`text-[11px] px-2.5 py-1 rounded font-semibold border transition-colors ${
                dateFrom === '2026-08-27' && dateTo === '2026-09-06'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              Full Sprint
            </button>
            <button
              onClick={() => { setDateFrom('2026-08-30'); setDateTo('2026-09-03'); }}
              className={`text-[11px] px-2.5 py-1 rounded font-semibold border transition-colors ${
                dateFrom === '2026-08-30' && dateTo === '2026-09-03'
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
          ) : !matrixData?.rows?.length ? (
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
                  {matrixData.rows.map((row, idx) => (
                    <tr key={`${row.employee.id}-${row.task.id}-${idx}`}>
                      {/* Sticky Label Cell */}
                      <td
                        className="sticky-col"
                        style={{ padding: '10px 14px', minWidth: '280px', width: '280px' }}
                      >
                        <div className="flex items-start gap-2.5">
                          <img
                            src={row.employee.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.employee.full_name}`}
                            alt={row.employee.full_name}
                            className="w-7 h-7 rounded-full object-cover border border-white/10 flex-shrink-0 mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-xs font-bold truncate"
                              style={{ color: 'var(--color-text-1)' }}
                            >
                              {row.employee.full_name}
                            </div>

                            {/* Clickable Task Div to inspect full task & specifications */}
                            <div
                              onClick={() => setSelectedTaskModal({ task: row.task, employee: row.employee, days: row.days })}
                              className="group cursor-pointer mt-1 p-1.5 rounded-lg bg-white/5 hover:bg-yellow-500/10 border border-white/10 hover:border-yellow-500/30 transition-all duration-150"
                              title="Click to view complete task specifications & allocation details"
                            >
                              {row.task.project_title && (
                                <div className="mb-0.5">
                                  <span className="lozenge lozenge-blue" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                    {row.task.project_title}
                                  </span>
                                </div>
                              )}
                              <div
                                className="text-[11px] font-medium text-white/60 group-hover:text-yellow-400 leading-snug transition-colors line-clamp-2"
                              >
                                {row.task.title}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {row.days.map(dayStatus => {
                        const s = dayStatus.status;
                        return (
                          <td
                            key={dayStatus.date}
                            style={{
                              padding: '8px 5px',
                              borderLeft: '1px solid var(--color-border-soft)',
                              minWidth: '72px',
                            }}
                          >
                            {s === 'logged' && (
                              <button
                                className="badge-logged"
                                onClick={() => setSelectedCell({ employee: row.employee, task: row.task, dayStatus })}
                                title="Click to view submitted daily log"
                              >
                                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                <span className="hidden sm:inline">Done</span>
                              </button>
                            )}
                            {s === 'no_work' && (
                              <button
                                className="badge-blocker"
                                onClick={() => setSelectedCell({ employee: row.employee, task: row.task, dayStatus })}
                                title="Click to view blocker reason"
                              >
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                <span className="hidden sm:inline">Blocked</span>
                              </button>
                            )}
                            {(s === 'pending' || s === 'missed') && (
                              <button
                                className="badge-pending cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-all transform hover:scale-105"
                                onClick={() => setSelectedCell({ employee: row.employee, task: row.task, dayStatus })}
                                title={`Click to view pending task details (${row.task.title})`}
                              >
                                <Clock className="w-3 h-3 flex-shrink-0 text-gray-500" />
                                <span className="hidden sm:inline">
                                  {s === 'missed' ? 'Missed' : 'Pending'}
                                </span>
                              </button>
                            )}
                            {s === 'na' && (
                              <div className="badge-na">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Floating AI Panel ──────────────────────── */}
      {showAIPanel && (
        <div
          className="flex-shrink-0 animate-fade-up"
          style={{ width: '280px', position: 'sticky', top: '68px' }}
        >
          <AISummaryPanel
            projects={projects}
            onClose={() => setShowAIPanel(false)}
            onOpenAISummary={onOpenAISummary}
          />
        </div>
      )}

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
            style={{ background: '#1a1814', maxHeight: '80vh' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-yellow-500/10">
                  <UserPlus className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: '#f0ede8' }}>
                    Add Member to Project
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: '#8e8b85' }}>
                    {projects.find(p => String(p.id) === String(currentProjectId))?.title || 'Current Project'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-white/40 hover:text-white/70 p-1 rounded"
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
                <div className="text-center py-10 text-xs" style={{ color: '#8e8b85' }}>
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
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <img
                        src={emp.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.full_name}`}
                        alt={emp.full_name}
                        className="w-9 h-9 rounded-full border border-white/10 object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs truncate" style={{ color: '#f0ede8' }}>
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
                          color: '#161410'
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
            style={{ background: '#1a1814' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded bg-amber-50">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: '#f0ede8' }}>Project Deadline Reached</h3>
                <p className="text-sm" style={{ color: '#8e8b85' }}>
                  {deadlineProject.title} ended on {deadlineProject.end_date}.
                </p>
              </div>
            </div>

            <p className="text-sm mb-6" style={{ color: '#c5c4c1' }}>
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
    </div>
  );
}
