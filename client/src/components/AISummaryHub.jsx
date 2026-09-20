import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Sparkles,
  Filter,
  User,
  Users,
  CheckSquare,
  FolderGit2,
  Globe,
  Calendar,
  Layers,
  Copy,
  Check,
  Download,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Clock,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

const DIMENSIONS = [
  {
    id: 'single_employee',
    name: '1. Single Employee Drilldown',
    short: 'Single Contributor',
    icon: User,
    desc: 'Individual achievements, blockers, consistency score, and technical trajectory.'
  },
  {
    id: 'multi_employee',
    name: '2. Team Cohort Analysis',
    short: 'Team Cohort',
    icon: Users,
    desc: 'Relative output contribution, cross-functional dependencies, and shared impediments.'
  },
  {
    id: 'task_based',
    name: '3. Task & Milestone Tracking',
    short: 'Task / Milestone',
    icon: CheckSquare,
    desc: 'Timeline progression, percentage towards completion, solved sub-tasks, and risk.'
  },
  {
    id: 'project_based',
    name: '4. Project Health & Status',
    short: 'Project Health',
    icon: FolderGit2,
    desc: 'Executive milestone review, completed vs lagging tasks, and delivery forecast.'
  },
  {
    id: 'fleet_level',
    name: '5. Fleet-Level Macro Overview',
    short: 'Company Fleet',
    icon: Globe,
    desc: 'Macro productivity trends, high-performing vs stalled initiatives, and organizational bottlenecks.'
  }
];

const formatDateISO = (d) => {
  if (!d) return '';
  const date = (d instanceof Date) ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getSprintDates = (workspaceId) => {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
  let defaultRange = {
    start: formatDateISO(fourteenDaysAgo),
    end: formatDateISO(now),
    label: 'Current Sprint'
  };

  if (workspaceId) {
    try {
      const stored = localStorage.getItem(`pmpulse_sprintConfig_${workspaceId}`);
      if (stored) {
        const config = JSON.parse(stored);
        if (config.startDateISO && config.endDateISO) {
          return { start: config.startDateISO, end: config.endDateISO, label: `${config.start || config.startDateISO} — ${config.end || config.endDateISO}` };
        }
        if (config.start && config.end) {
          const parseSprintDate = (str) => {
            if (!str) return null;
            const direct = new Date(String(str).replace(/Sept/i, 'Sep'));
            if (!isNaN(direct.getTime())) return formatDateISO(direct);
            return null;
          };
          const s = parseSprintDate(config.start);
          const e = parseSprintDate(config.end);
          if (s && e) {
            return { start: s, end: e, label: `${config.start} — ${config.end}` };
          }
        }
      }
    } catch (e) {}
  }
  return defaultRange;
};

export default function AISummaryHub({ selectedWorkspace }) {
  const [selectedDimension, setSelectedDimension] = useState('project_based');
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Dynamic filter state
  const initialSprint = getSprintDates(selectedWorkspace?.id);
  const [dateRangePreset, setDateRangePreset] = useState('full_sprint');
  const [dateFrom, setDateFrom] = useState(initialSprint.start);
  const [dateTo, setDateTo] = useState(initialSprint.end);
  const [sprintLabel, setSprintLabel] = useState(initialSprint.label);
  const [statusFilter, setStatusFilter] = useState('all');

  // Multi-select entities
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  // Sync with selectedWorkspace changes
  useEffect(() => {
    if (selectedWorkspace?.id) {
      const sp = getSprintDates(selectedWorkspace.id);
      setSprintLabel(sp.label);
      if (dateRangePreset === 'full_sprint') {
        setDateFrom(sp.start);
        setDateTo(sp.end);
      }
      if (projects.length > 0) {
        const match = projects.find(p => p.id === selectedWorkspace.id || String(p.id) === String(selectedWorkspace.id));
        if (match) {
          setSelectedProjectIds([match.id]);
        }
      }
    }
  }, [selectedWorkspace?.id]);

  // Load projects and employees for filter dropdowns
  useEffect(() => {
    async function loadFilterCorpus() {
      try {
        const [projRes, empRes] = await Promise.all([
          api.projects.getAll(),
          api.employees.getAll()
        ]);
        const projectList = projRes.projects || [];
        const empList = empRes.employees || [];
        setProjects(projectList);
        setEmployees(empList);

        if (selectedWorkspace?.id) {
          const match = projectList.find(p => p.id === selectedWorkspace.id || String(p.id) === String(selectedWorkspace.id));
          if (match) {
            setSelectedProjectIds([match.id]);
          } else if (projectList.length > 0) {
            setSelectedProjectIds([projectList[0].id]);
          }
        } else if (projectList.length > 0) {
          setSelectedProjectIds([projectList[0].id]);
        }

        if (empList.length > 0) {
          setSelectedEmployeeIds([empList[0].id]);
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadFilterCorpus();
  }, []);

  const handleDatePresetChange = (preset) => {
    setDateRangePreset(preset);
    const now = new Date();
    const todayStr = formatDateISO(now);
    const yesterdayStr = formatDateISO(new Date(now.getTime() - 86400000));
    const sevenDaysAgoStr = formatDateISO(new Date(now.getTime() - 7 * 86400000));

    if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'yesterday') {
      setDateFrom(yesterdayStr);
      setDateTo(yesterdayStr);
    } else if (preset === 'this_week') {
      setDateFrom(sevenDaysAgoStr);
      setDateTo(todayStr);
    } else if (preset === 'full_sprint') {
      const sp = getSprintDates(selectedWorkspace?.id);
      setDateFrom(sp.start);
      setDateTo(sp.end);
    } else if (preset === 'all_time') {
      setDateFrom('2026-01-01');
      setDateTo(todayStr);
    }
  };

  const handleGenerateSummary = async () => {
    setLoading(true);
    try {
      const payload = {
        dimension: selectedDimension,
        date_from: dateFrom,
        date_to: dateTo,
        status_filter: statusFilter,
        project_ids: selectedDimension === 'fleet_level' ? [] : selectedProjectIds,
        employee_ids: selectedEmployeeIds
      };

      const res = await api.ai.summarize(payload);
      setSummaryData(res);
    } catch (err) {
      alert(`AI Synthesis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Run synthesis when dimension or selectedProjectIds changes (after initial load)
  useEffect(() => {
    if (selectedProjectIds.length > 0 || selectedDimension === 'fleet_level') {
      handleGenerateSummary();
    }
  }, [selectedDimension, selectedProjectIds]);

  const copyExecutiveSummary = () => {
    if (!summaryData?.summary) return;
    const s = summaryData.summary;
    const textToCopy = `PULSEPM AI SYNTHESIS REPORT\nDimension: ${s.dimension}\nTitle: ${s.title}\nTimeframe: ${s.timeframe}\n\nEXECUTIVE SUMMARY:\n${s.executive_summary}\n\nKEY METRICS:\n${JSON.stringify(s.metrics, null, 2)}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const s = summaryData?.summary;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Dimension Selector Tabs Strip */}
      <div className="jira-card p-2 overflow-x-auto" style={{ background: 'var(--color-surface-solid)' }}>
        <div className="flex items-center gap-1.5 min-w-max">
          {DIMENSIONS.map(dim => {
            const Icon = dim.icon;
            const isSelected = selectedDimension === dim.id;
            return (
              <button
                key={dim.id}
                onClick={() => setSelectedDimension(dim.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                style={isSelected ? { background: '#eeb20d' } : {}}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-yellow-300' : 'text-blue-600'}`} />
                <span>{dim.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Dimensional Filter Control Panel & Synthesis Action */}
      <div className="jira-card p-5 space-y-4" style={{ background: 'var(--color-surface-solid)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
            <Filter className="w-4 h-4" />
            <span>Multi-Dimensional Filter Configuration</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateSummary}
              disabled={loading}
              className="btn-ai-glow"
              style={{ width: 'auto', padding: '8px 18px' }}
            >
              <Sparkles className={`w-4 h-4 text-yellow-300 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Synthesizing with AI...' : '✨ Generate AI Summary'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* 1. Date Range Preset & Custom Range */}
          <div className="p-3 rounded-lg border border-gray-200 space-y-1.5" style={{ background: 'var(--table-th-bg)' }}>
            <div className="flex items-center justify-between">
              <label className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-2)' }}>
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Timeframe Window:</span>
              </label>
              <span className="text-[10px] font-mono text-blue-600 font-bold">{dateFrom} → {dateTo}</span>
            </div>
            <select
              value={dateRangePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              className="jira-select"
            >
              <option value="full_sprint">Active Sprint ({sprintLabel})</option>
              <option value="this_week">Last 7 Days</option>
              <option value="today">Today Only</option>
              <option value="yesterday">Yesterday</option>
              <option value="all_time">All-Time (Full History)</option>
              <option value="custom">Custom Date Range</option>
            </select>
            <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-[10px] block text-gray-500 font-medium">From:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setDateRangePreset('custom');
                  }}
                  className="w-full text-xs px-1.5 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <span className="text-[10px] block text-gray-500 font-medium">To:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setDateRangePreset('custom');
                  }}
                  className="w-full text-xs px-1.5 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* 2. Project Filter */}
          <div className="p-3 rounded-lg border border-gray-200 space-y-1.5" style={{ background: 'var(--table-th-bg)' }}>
            <label className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-2)' }}>
              <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Project Scope:</span>
            </label>
            <select
              value={selectedProjectIds[0] || 'all'}
              onChange={(e) => setSelectedProjectIds(e.target.value === 'all' ? [] : [parseInt(e.target.value, 10)])}
              className="jira-select"
            >
              <option value="all">🌐 All Active Projects</option>
              {projects.map(p => {
                const isCurrentWs = selectedWorkspace && (p.id === selectedWorkspace.id || String(p.id) === String(selectedWorkspace.id));
                return (
                  <option key={p.id} value={p.id}>
                    📁 {p.title} {isCurrentWs ? ' ★ (Active Workspace)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Employee Filter */}
          <div className="p-3 rounded-lg border border-gray-200 space-y-1.5" style={{ background: 'var(--table-th-bg)' }}>
            <label className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-2)' }}>
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Personnel Filter:</span>
            </label>
            <select
              value={selectedEmployeeIds[0] || 'all'}
              onChange={(e) => setSelectedEmployeeIds(e.target.value === 'all' ? [] : [parseInt(e.target.value, 10)])}
              className="jira-select"
            >
              <option value="all">All Contributors</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name} ({e.role_title})</option>
              ))}
            </select>
          </div>

          {/* 4. Status Filter */}
          <div className="p-3 rounded-lg border border-gray-200 space-y-1.5" style={{ background: 'var(--table-th-bg)' }}>
            <label className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text-2)' }}>
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Log Status Filter:</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="jira-select"
            >
              <option value="all">All Submissions (Logged + Blockers)</option>
              <option value="worked_only">Logged Work Only (Green)</option>
              <option value="blockers_only">Blockers Only (Red)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Generated Multi-Dimensional Report Card */}
      {loading ? (
        <div className="py-24 text-center jira-card" style={{ background: 'var(--color-surface-solid)' }}>
          <Sparkles className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-1)' }}>AI Synthesis In Progress</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
            Transforming unstructured daily text logs into executive insights across the selected dimension...
          </p>
        </div>
      ) : !s ? (
        <div className="py-16 text-center jira-card" style={{ background: 'var(--color-surface-solid)', color: 'var(--color-text-3)' }}>
          Click "Generate AI Summary" to trigger real-time multi-dimensional synthesis.
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up">
          
          {/* Executive Header & Meta Strip */}
          <div className="jira-card p-6 border-l-4 border-l-blue-600" style={{ background: 'var(--color-surface-solid)' }}>
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="lozenge lozenge-blue">
                    {s.dimension?.toUpperCase()}
                  </span>
                  <span className="lozenge lozenge-default font-mono">
                    {s.timeframe}
                  </span>
                </div>
                <h2 className="text-xl font-bold mt-1" style={{ color: 'var(--color-text-1)' }}>
                  {s.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyExecutiveSummary}
                  className="btn-secondary"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                </button>
              </div>
            </div>

            {/* Synthesized Executive Summary Narrative */}
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-blue-600">
                <Sparkles className="w-4 h-4" />
                <span>Executive Synthesis Narrative</span>
              </h3>
              <div
                className="p-4 rounded-lg text-xs sm:text-sm leading-relaxed"
                style={{ background: 'rgba(238,178,13,0.08)', border: '1px solid rgba(238,178,13,0.12)', color: 'var(--color-text-1)' }}
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {s.executive_summary}
                </p>
              </div>
            </div>
          </div>

          {/* Deep Insight Columns (Key Accomplishments & Blockers) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Key Accomplishments */}
            <div className="jira-card p-6" style={{ background: 'var(--color-surface-solid)' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
                  Key Accomplishments &amp; Solved Work
                </h3>
              </div>

              <div className="space-y-2.5">
                {(s.key_accomplishments || s.key_achievements || s.cross_functional_dependencies || s.solved_subtasks || s.milestone_review || s.macro_productivity_trends || [])?.map((acc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-green-200 text-xs flex items-start gap-2.5"
                    style={{ background: 'rgba(56,221,159,0.12)' }}
                  >
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="font-medium text-emerald-900">{acc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Impediments & Action Items */}
            <div className="jira-card p-6" style={{ background: 'var(--color-surface-solid)' }}>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
                  Critical Impediments &amp; Action Items
                </h3>
              </div>

              <div className="space-y-2.5">
                {(s.critical_impediments || s.logged_blockers || s.shared_impediments || s.unresolved_bugs_and_blockers || s.cumulative_blocker_analysis || (s.organizational_bottlenecks ? (Array.isArray(s.organizational_bottlenecks) ? s.organizational_bottlenecks : [s.organizational_bottlenecks]) : []))?.map((imp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-rose-200 text-xs flex items-start gap-2.5"
                    style={{ background: 'rgba(255,107,107,0.12)' }}
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span className="font-medium text-rose-900">{imp}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
