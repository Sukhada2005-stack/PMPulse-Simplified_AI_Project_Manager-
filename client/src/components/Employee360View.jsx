import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  User,
  Briefcase,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Printer,
  Search,
  Filter,
  ShieldCheck,
  TrendingUp,
  Clock,
  Layers,
  ArrowUpRight,
  ChevronDown,
  ArrowLeft,
  FolderGit2,
  Zap,
  Target
} from 'lucide-react';
import LogDetailModal from './LogDetailModal';

export default function Employee360View({ employeeId, onBack }) {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState(employeeId || null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedLogForDetail, setSelectedLogForDetail] = useState(null);

  // Load complete employee directory from Workforce
  useEffect(() => {
    async function loadDirectory() {
      try {
        const res = await api.employees.getAll();
        const emps = res.employees || [];
        setEmployees(emps);
        if (!selectedId && emps.length > 0) {
          setSelectedId(emps[0].id);
        } else if (employeeId) {
          setSelectedId(employeeId);
        }
      } catch (err) {
        console.error('Failed to load employee directory:', err);
      }
    }
    loadDirectory();
  }, [employeeId]);

  // Fetch 360 analytics when selected employee changes
  useEffect(() => {
    if (!selectedId) return;
    async function fetch360() {
      setLoading(true);
      try {
        const data = await api.employees.getAnalytics(selectedId);
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to fetch 360 analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetch360();
  }, [selectedId]);

  const handlePrintDossier = () => {
    window.print();
  };

  const emp = analytics?.employee;
  const mod1 = analytics?.module1_allocation;
  const mod2 = analytics?.module2_history;
  const mod3 = analytics?.module3_inactivity;
  const mod4 = analytics?.module4_ai_profile;

  // Filter logs in Module 2 / Activity stream
  const allLogs = mod2?.logs || [];
  const filteredLogs = allLogs.filter(l => {
    if (!searchKeyword.trim()) return true;
    const term = searchKeyword.toLowerCase();
    const text = (l.work_text || l.no_work_reason || '').toLowerCase();
    const task = (l.task_title || '').toLowerCase();
    const project = (l.project_title || '').toLowerCase();
    return text.includes(term) || task.includes(term) || project.includes(term);
  });

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top Header & Contributor Selector */}
      <div className="jira-card p-5 flex flex-wrap items-center justify-between gap-4 no-print" style={{ background: '#1a1814' }}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors mr-1"
              title="Back to Workforce Directory"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">360° Employee Analysis Portal</div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: '#f0ede8' }}>Holistic Contributor Intelligence</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Employee Dropdown - Contains all employees from Workforce Directory */}
          <div className="flex items-center gap-2" style={{ minWidth: '240px' }}>
            <select
              value={selectedId || ''}
              onChange={(e) => setSelectedId(parseInt(e.target.value, 10))}
              className="jira-select"
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  👤 {e.full_name} ({e.role_title})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrintDossier}
            className="btn-secondary"
            title="Export 1-Click Executive PDF Dossier"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">1-Click Dossier</span>
          </button>
        </div>
      </div>

      {loading || !analytics || !emp ? (
        <div className="py-24 text-center jira-card" style={{ background: '#1a1814' }}>
          <Sparkles className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-semibold" style={{ color: '#f0ede8' }}>Synthesizing 4-Module 360° Intelligence Dossier...</p>
          <p className="text-xs mt-1 text-gray-500">Aggregating project allocations, log compliance, and AI diagnostics</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── MODULE 1: Executive Contributor Snapshot Card ───────── */}
          <div className="jira-card p-6 border-l-4 border-l-blue-600" style={{ background: '#1a1814' }}>
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <img
                  src={emp.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.full_name}`}
                  alt={emp.full_name}
                  className="w-16 h-16 rounded-full border-2 border-gray-200 object-cover shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black" style={{ color: '#f0ede8' }}>{emp.full_name}</h2>
                    <span className="lozenge lozenge-blue">{emp.role_title}</span>
                    <span className="lozenge lozenge-success font-mono uppercase">{emp.status || 'Active'}</span>
                  </div>
                  <p className="text-xs font-mono mt-1" style={{ color: '#8e8b85' }}>{emp.email}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Allocated to <b className="text-blue-700">{mod1?.projects?.length || 0} Project(s)</b> • <b className="text-indigo-700">{mod1?.tasks?.length || 0} Task Deliverable(s)</b>
                  </p>
                </div>
              </div>

              {/* Module 1 Metrics Strip */}
              <div className="flex flex-wrap gap-3">
                <div className="stat-card" style={{ background: 'rgba(255,255,255,0.04)', minWidth: '120px' }}>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Consistency Index</div>
                  <div className="text-2xl font-black mt-0.5 text-emerald-700">
                    {mod2?.consistency_score ?? 100}%
                  </div>
                  <div className="text-[10px] font-medium text-emerald-600 mt-0.5">Daily Log Health</div>
                </div>

                <div className="stat-card" style={{ background: 'rgba(255,255,255,0.04)', minWidth: '120px' }}>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Done Logs</div>
                  <div className="text-2xl font-black mt-0.5 text-blue-700">
                    {mod2?.green_logs_count || 0}
                  </div>
                  <div className="text-[10px] font-medium text-blue-600 mt-0.5">Submissions</div>
                </div>

                <div className="stat-card" style={{ background: 'rgba(255,255,255,0.04)', minWidth: '120px' }}>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Blockers</div>
                  <div className="text-2xl font-black mt-0.5 text-rose-700">
                    {mod2?.blocker_logs_count || 0}
                  </div>
                  <div className="text-[10px] font-medium text-rose-600 mt-0.5">Reported Days</div>
                </div>

                <div className="stat-card" style={{ background: 'rgba(255,255,255,0.04)', minWidth: '120px' }}>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Tasks</div>
                  <div className="text-2xl font-black mt-0.5" style={{ color: '#f0ede8' }}>
                    {mod1?.active_task_count || 0}
                  </div>
                  <div className="text-[10px] font-medium text-gray-500 mt-0.5">In Progress</div>
                </div>
              </div>
            </div>

            {/* Workload Capacity Bar */}
            <div className="mt-5 pt-4 border-t border-gray-200/80 flex items-center justify-between flex-wrap gap-4 bg-gray-50/80 -mx-6 -mb-6 p-4 rounded-b-xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                  <Target className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">Workload Capacity:</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${
                  (mod1?.active_task_count || 0) >= 4
                    ? 'text-red-800 bg-red-100 border-red-300'
                    : (mod1?.active_task_count || 0) >= 2
                    ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                    : (mod1?.active_task_count || 0) === 1
                    ? 'text-blue-800 bg-blue-100 border-blue-300'
                    : 'text-gray-800 bg-gray-200 border-gray-300'
                }`}>
                  {mod1?.workload_status || 'Optimal Balanced Flow'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-black text-gray-800">
                    {mod1?.workload_capacity_pct ?? 50}%
                  </span>
                  <span className="text-[11px] text-gray-500 ml-1 font-medium">
                    ({mod1?.active_task_count || 0} active / {mod1?.tasks?.length || 0} total)
                  </span>
                </div>
                <div className="w-40 sm:w-52 bg-gray-200 rounded-full h-3 overflow-hidden border border-gray-300/80 p-0.5 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 font-bold ${
                      (mod1?.active_task_count || 0) >= 4
                        ? 'bg-gradient-to-r from-orange-500 to-red-600'
                        : (mod1?.active_task_count || 0) >= 2
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-600'
                        : (mod1?.active_task_count || 0) === 1
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600'
                        : 'bg-gray-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(8, mod1?.workload_capacity_pct || 50))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── MODULE 3 & 4: Deep Insights Row ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* MODULE 3: Blockers & Risk Identification */}
            <div className="jira-card p-6 flex flex-col justify-between" style={{ background: '#1a1814' }}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-sm" style={{ color: '#f0ede8' }}>
                    Module 3: Impediment &amp; Inactivity Analysis
                  </h3>
                </div>
                <p className="text-xs mb-4" style={{ color: '#8e8b85' }}>
                  AI-aggregated breakdown of friction points, vendor delays, and dependency wait-times
                </p>

                {/* Blocker Category Chips */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-orange-50 border border-orange-200 text-center">
                    <div className="text-[10px] font-bold text-orange-800 uppercase">External Vendor</div>
                    <div className="text-base font-black text-orange-700 mt-0.5">
                      {mod3?.breakdown?.external_count || 0}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-center">
                    <div className="text-[10px] font-bold text-rose-800 uppercase">Internal Dept</div>
                    <div className="text-base font-black text-rose-700 mt-0.5">
                      {mod3?.breakdown?.internal_count || 0}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-center">
                    <div className="text-[10px] font-bold text-purple-800 uppercase">Personal/Leave</div>
                    <div className="text-base font-black text-purple-700 mt-0.5">
                      {mod3?.breakdown?.personal_count || 0}
                    </div>
                  </div>
                </div>

                {(!mod3?.blocker_logs || mod3.blocker_logs.length === 0) ? (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Clean Record — Zero recorded blockers or unexcused delays.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {mod3.blocker_logs.map((b, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-rose-200 space-y-1"
                        style={{ background: '#FFF5F5' }}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-rose-900">{b.task_title || 'Project Deliverable'}</span>
                          <span className="font-mono text-[10px] text-rose-600 font-semibold">{b.log_date}</span>
                        </div>
                        <p className="text-xs text-rose-800 italic leading-snug">
                          "{b.no_work_reason}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {mod3?.recurring_impediment_note && (
                <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-600 flex items-center gap-1.5">
                  <span className="font-bold text-gray-700">Diagnostic Note:</span>
                  <span>{mod3.recurring_impediment_note}</span>
                </div>
              )}
            </div>

            {/* MODULE 4: Multi-Dimensional AI Executive Profile (PM Perspective) */}
            <div className="jira-card p-6 flex flex-col justify-between" style={{ background: '#1a1814' }}>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-sm" style={{ color: '#f0ede8' }}>
                      Module 4: PM Performance &amp; Diagnostic Profile
                    </h3>
                  </div>
                  <span className={`lozenge font-bold ${
                    (mod4?.productivity_score || '').includes('Exceptional')
                      ? 'lozenge-success'
                      : (mod4?.productivity_score || '').includes('Strong')
                      ? 'lozenge-blue'
                      : 'lozenge-danger'
                  }`}>
                    {mod4?.productivity_score || 'Strong (A)'}
                  </span>
                </div>
                <p className="text-xs -mt-2" style={{ color: '#8e8b85' }}>
                  Comprehensive performance assessment formulated from direct sprint milestones, daily logs, and impediment frequency
                </p>

                {/* Elaborated Executive Summary from PM Perspective */}
                {mod4?.executive_assessment && (
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-950 leading-relaxed space-y-1">
                    <div className="font-bold text-[11px] uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Executive PM Performance Summary</span>
                    </div>
                    <p className="text-xs text-gray-800 leading-relaxed font-sans">
                      {mod4.executive_assessment}
                    </p>
                  </div>
                )}

                {/* Core Strengths Badges */}
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Validated Core Competencies</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(mod4?.core_strengths || []).map((strength, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                      >
                        <Zap className="w-3 h-3 text-indigo-500" />
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Elaborated Technical & Operational Trajectories */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">PM Key Observations &amp; Action Plan</div>
                  {(mod4?.summary_bullet_points || []).map((point, i) => {
                    const parts = point.split(':');
                    const title = parts.length > 1 ? parts[0] : null;
                    const desc = parts.length > 1 ? parts.slice(1).join(':') : point;
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-lg border text-xs leading-relaxed transition-colors"
                        style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }}
                      >
                        {title ? (
                          <>
                            <span className="font-bold text-gray-900 block mb-0.5">{title}</span>
                            <span className="text-gray-700">{desc}</span>
                          </>
                        ) : (
                          <span className="text-gray-700">{desc}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {mod4?.key_milestone_delivery && (
                <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span><b>Primary Milestone:</b> {mod4.key_milestone_delivery}</span>
                </div>
              )}
            </div>

          </div>

          {/* ── MODULE 2: Chronological Activity Stream ────────────── */}
          <div className="jira-card p-6 space-y-4" style={{ background: '#1a1814' }}>
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-sm" style={{ color: '#f0ede8' }}>
                  Module 2: Complete Activity &amp; Ingestion History
                </h3>
                <p className="text-xs mt-0.5" style={{ color: '#8e8b85' }}>
                  Chronological raw developer updates submitted across all initiatives ({filteredLogs.length} entries)
                </p>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Filter logs by keyword..."
                  className="jira-input pl-9 pr-3 text-xs w-48 sm:w-64"
                />
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs" style={{ color: '#8e8b85' }}>
                No daily logs recorded matching the filter criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map(log => {
                  const isWorked = log.has_worked === 1;
                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLogForDetail({
                        employee: emp,
                        task: { title: log.task_title, start_date: log.start_date, end_date: log.end_date, project_title: log.project_title },
                        dayStatus: {
                          date: log.log_date,
                          status: isWorked ? 'logged' : 'no_work',
                          text: log.work_text,
                          reason: log.no_work_reason,
                          label: isWorked ? 'Logged Work' : 'Blocker'
                        }
                      })}
                      className="p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md hover:border-blue-300"
                      style={{
                        background: isWorked ? '#FAFBFC' : '#FFF5F5',
                        borderColor: isWorked ? 'rgba(255,255,255,0.10)' : '#FFBDAD'
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`lozenge ${isWorked ? 'lozenge-success' : 'lozenge-danger'}`}>
                            {isWorked ? 'Done' : 'Blocker'}
                          </span>
                          <span className="font-bold text-xs" style={{ color: '#f0ede8' }}>{log.task_title}</span>
                          {log.project_title && (
                            <span className="lozenge lozenge-default font-mono text-[10px]">{log.project_title}</span>
                          )}
                        </div>
                        <span className="font-mono text-xs text-gray-500 font-semibold">{log.log_date}</span>
                      </div>

                      <p className="text-xs leading-relaxed" style={{ color: isWorked ? '#c5c4c1' : '#BF2600' }}>
                        {isWorked ? log.work_text : `Blocker: "${log.no_work_reason}"`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Inspection Modal */}
      {selectedLogForDetail && (
        <LogDetailModal
          logData={selectedLogForDetail}
          onClose={() => setSelectedLogForDetail(null)}
        />
      )}
    </div>
  );
}
