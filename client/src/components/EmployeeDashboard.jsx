import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Calendar,
  Briefcase,
  Flame,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FolderGit2,
  MessageSquare
} from 'lucide-react';
import ProjectChatModal from './ProjectChatModal';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form submission state
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [didNotWork, setDidNotWork] = useState(false);
  const [workText, setWorkText] = useState('');
  const [noWorkReason, setNoWorkReason] = useState('');
  const [submissionFeedback, setSubmissionFeedback] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChatProjectId, setSelectedChatProjectId] = useState(null);

  const fetchTasksAndWarnings = async () => {
    try {
      setLoading(true);
      const [resTasks, resWarnings] = await Promise.all([
        api.tasks.getMyTasks(),
        api.employees.getMyWarnings().catch(() => ({ warnings: [] }))
      ]);
      
      setTasks(resTasks.tasks || []);
      setWarnings(resWarnings.warnings || []);
      
      if (resTasks.tasks?.length > 0 && !selectedTaskId) {
        setSelectedTaskId(resTasks.tasks[0].id);
        // Pre-fill if already logged today
        if (resTasks.tasks[0].has_submitted_today) {
          if (resTasks.tasks[0].today_submission_status === 1) {
            setDidNotWork(false);
            setWorkText(resTasks.tasks[0].today_work_text || '');
          } else {
            setDidNotWork(true);
            setNoWorkReason(resTasks.tasks[0].today_no_work_reason || '');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndWarnings();
  }, [user]);

  const handleTaskSelect = (task) => {
    setSelectedTaskId(task.id);
    setSubmissionFeedback(null);
    if (task.has_submitted_today) {
      if (task.today_submission_status === 1) {
        setDidNotWork(false);
        setWorkText(task.today_work_text || '');
        setNoWorkReason('');
      } else {
        setDidNotWork(true);
        setNoWorkReason(task.today_no_work_reason || '');
        setWorkText('');
      }
    } else {
      setWorkText('');
      setNoWorkReason('');
      setDidNotWork(false);
    }
  };

  const handleSubmitDailyLog = async (e) => {
    e.preventDefault();
    if (!selectedTaskId) {
      alert('Please select an active task to log your update.');
      return;
    }

    setSubmitting(true);
    setSubmissionFeedback(null);

    try {
      const payload = {
        has_worked: !didNotWork,
        work_text: didNotWork ? null : workText,
        no_work_reason: didNotWork ? noWorkReason : null,
        log_date: new Date().toISOString().split('T')[0]
      };

      const res = await api.dailyLogs.submit(selectedTaskId, payload);

      if (!didNotWork) {
        // Trigger celebratory confetti on productive log
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

      setSubmissionFeedback({
        type: didNotWork ? 'warning' : 'success',
        message: didNotWork
          ? 'Blocker recorded. Your Project Manager has been alerted.'
          : 'Great work! Daily log successfully ingested and indexed by AI.'
      });

      fetchTasksAndWarnings();
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Employee Greeting & Quick Status Strip ──────────────────── */}
      <div className="jira-card p-6 border-l-4 border-l-[var(--acube-gold)]" style={{ background: 'var(--color-surface-solid)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text-1)' }}>
                  Welcome, {user?.full_name}
                </h1>
                <span className="lozenge" style={{ background: 'var(--acube-gold)', color: 'var(--color-surface-solid)', fontWeight: 'bold' }}>
                  CONTRIBUTOR PORTAL
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-3)' }}>
                {user?.role_title} • Zero Agile overhead daily logging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const firstProjectId = tasks[0]?.project_id || null;
                setSelectedChatProjectId(firstProjectId);
                setShowChatModal(true);
              }}
              className="btn-secondary text-[var(--acube-gold)] hover:bg-[#2a2824] border-[#333] text-xs font-bold"
              style={{ background: 'var(--table-th-bg)' }}
              title="Open Project Team Chat & Meeting Sync"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Project Chat &amp; Sync</span>
            </button>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#333] text-xs" style={{ background: 'var(--table-th-bg)' }}>
              <Calendar className="w-4 h-4 text-[var(--acube-gold)]" />
              <span className="font-semibold" style={{ color: 'var(--color-text-1)' }}>{todayFormatted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-rose-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Urgent Warnings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warnings.map(w => (
              <div key={w.id} className="p-4 rounded-xl border border-rose-900/50 flex items-start gap-3" style={{ background: 'rgba(255,0,0,0.05)' }}>
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-400">{w.project_title} - {w.task_title}</h4>
                  <p className="text-xs text-rose-300 mt-1 leading-relaxed">{w.message}</p>
                  <div className="text-[10px] text-rose-600 font-semibold mt-2">
                    {new Date(w.created_at + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'medium' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center jira-card" style={{ background: 'var(--color-surface-solid)' }}>
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--acube-gold)] mx-auto mb-2" />
          <p className="text-sm" style={{ color: 'var(--color-text-3)' }}>Loading your assigned deliverables...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="jira-card p-12 text-center" style={{ background: 'var(--color-surface-solid)' }}>
          <FolderGit2 className="w-12 h-12 mx-auto text-gray-600 mb-2" />
          <h3 className="font-bold text-base" style={{ color: 'var(--color-text-1)' }}>No Active Tasks Assigned</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-3)' }}>
            Your Project Manager has not provisioned tasks to your profile yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── Left Column: My Active Tasks Cards List (5 Cols) ─────── */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text-2)' }}>
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>My Active Deliverables ({tasks.length})</span>
              </h2>
            </div>

            <div className="space-y-3">
              {tasks.map(t => {
                const isSelected = t.id === selectedTaskId;
                const isSubmitted = t.has_submitted_today;
                const isGreen = t.today_submission_status === 1;

                return (
                  <div
                    key={t.id}
                    onClick={() => handleTaskSelect(t)}
                    className="jira-card p-4 transition-all cursor-pointer"
                    style={{
                      background: isSelected ? '#2a2824' : 'var(--color-surface-solid)',
                      borderColor: isSelected ? 'var(--acube-gold)' : 'rgba(255,255,255,0.10)',
                      boxShadow: isSelected ? '0 0 0 1px var(--acube-gold)' : undefined
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="lozenge font-mono uppercase font-bold" style={{ fontSize: '9px', background: 'var(--acube-gold)', color: 'var(--color-surface-solid)' }}>
                          {t.project_title}
                        </span>
                        <h3 className="text-sm font-bold mt-2 leading-snug" style={{ color: 'var(--color-text-1)' }}>
                          {t.title}
                        </h3>
                      </div>

                      {/* Countdown Tag */}
                      <span className={`lozenge ${t.days_remaining <= 1 ? 'lozenge-danger animate-pulse' : 'lozenge-default'}`}>
                        {t.countdown_tag}
                      </span>
                    </div>

                    <p className="text-xs line-clamp-2 leading-relaxed mb-3" style={{ color: 'var(--color-text-2)' }}>
                      {t.description || 'No detailed specifications provided.'}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-700/50 text-[11px] gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold" style={{ color: 'var(--color-text-3)' }}>
                          {t.start_date} → {t.end_date}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChatProjectId(t.project_id);
                            setShowChatModal(true);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold text-blue-400 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900/50 flex items-center gap-1 transition-colors"
                          title="Open Team Chat for this project"
                        >
                          <MessageSquare className="w-3 h-3 text-blue-400" />
                          <span>Chat</span>
                        </button>
                      </div>

                      {isSubmitted ? (
                        <span className={`flex items-center gap-1 font-bold ${
                          isGreen ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isGreen ? "Today's Log Recorded" : "Stalled"}</span>
                        </span>
                      ) : (
                        <span className="text-amber-500 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Awaiting Today's Log</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right Column: Frictionless Daily Log Submission Card ─── */}
          <div className="lg:col-span-7">
            <div className="jira-card p-6 space-y-5 sticky top-20" style={{ background: 'var(--color-surface-solid)' }}>
              
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-700/80">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-emerald-400" />
                    <span>Frictionless Daily Progress Entry</span>
                  </div>
                  <h2 className="text-lg font-bold mt-0.5" style={{ color: 'var(--color-text-1)' }}>
                    {selectedTask ? selectedTask.title : 'Select a Deliverable'}
                  </h2>
                </div>

                {selectedTask?.has_submitted_today && (
                  <span className="lozenge lozenge-success font-bold px-2 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                    Submitted for Today
                  </span>
                )}
              </div>

              {/* Submission Feedback Alert */}
              {submissionFeedback && (
                <div
                  className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 ${
                    submissionFeedback.type === 'success'
                      ? 'bg-emerald-900/20 border border-emerald-900/50 text-emerald-400'
                      : 'bg-orange-900/20 border border-orange-900/50 text-orange-400'
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${submissionFeedback.type === 'success' ? 'text-emerald-500' : 'text-orange-500'}`} />
                  <span>{submissionFeedback.message}</span>
                </div>
              )}

              {/* The Form */}
              <form onSubmit={handleSubmitDailyLog} className="space-y-4">
                
                {/* Mode Toggle Switch */}
                <div
                  className="flex items-center justify-between p-3.5 rounded-lg border border-gray-700/80 transition-colors"
                  style={{ background: didNotWork ? 'rgba(255,0,0,0.05)' : 'var(--table-th-bg)' }}
                >
                  <div>
                    <span className={`text-xs font-bold block mb-0.5 ${didNotWork ? 'text-rose-400' : 'text-[#f0ede8]'}`}>
                      Encountered a Blocker Today?
                    </span>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>
                      Toggle on if third-party APIs, vendor dependencies, or internal assets prevented work
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDidNotWork(!didNotWork);
                      setSubmissionFeedback(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      didNotWork
                        ? 'bg-rose-900/30 text-rose-300 border-rose-800'
                        : 'bg-[#0d0c0a] text-[#c5c4c1] border-[#333] hover:bg-[#2a2824]'
                    }`}
                  >
                    <AlertTriangle className={`w-3.5 h-3.5 ${didNotWork ? 'text-rose-400' : ''}`} />
                    <span>{didNotWork ? 'Stalling Mode (ON)' : 'No Stalling'}</span>
                  </button>
                </div>

                {/* Input Fields */}
                {!didNotWork ? (
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--color-text-1)' }}>
                      What did you accomplish today? *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={workText}
                      onChange={e => setWorkText(e.target.value)}
                      placeholder="e.g., Integrated refund event handler and partial settlement reconciliation routines..."
                      className="jira-input text-xs w-full leading-relaxed border-[#333] focus:border-[var(--acube-gold)]"
                      style={{ background: '#0d0c0a', color: 'var(--color-text-2)' }}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-rose-400 mb-1.5">
                      Specify Blocker Reason &amp; Impacted Dependency *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={noWorkReason}
                      onChange={e => setNoWorkReason(e.target.value)}
                      placeholder="e.g., Stalled: Awaiting payment gateway API documentation and sandbox credentials from third-party vendor..."
                      className="jira-input text-xs w-full leading-relaxed border-rose-900/50 focus:border-rose-500 placeholder-rose-900/50"
                      style={{ background: 'rgba(255,0,0,0.05)', color: '#ff8a80' }}
                    />
                  </div>
                )}

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`btn-primary w-full justify-center text-sm py-3 font-bold border-0 ${
                      didNotWork ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-[#eeb20d] hover:bg-[#d6a00a] text-[#1a1814]'
                    }`}
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>
                      {submitting
                        ? 'Recording Daily Entry...'
                        : didNotWork
                        ? 'Submit Stalling Notification'
                        : selectedTask?.has_submitted_today
                        ? 'Update Today\'s Daily Work Log'
                        : 'Submit Daily Work Log'}
                    </span>
                  </button>
                </div>

              </form>
            </div>
          </div>

        </div>
      )}

      {/* Project Team Chat & Meeting Scheduler Modal */}
      {showChatModal && (
        <ProjectChatModal
          projectId={selectedChatProjectId || (tasks[0]?.project_id ?? null)}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </div>
  );
}
