import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertTriangle, Calendar, User, Briefcase, Clock } from 'lucide-react';

export default function LogDetailModal({ logData, onClose }) {
  useEffect(() => {
    if (!logData) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow || '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [logData, onClose]);

  if (!logData) return null;

  const { employee, task, dayStatus, status, date, log } = logData;
  const rawStatus = dayStatus?.status || status;
  const isWorked = rawStatus === 'logged';
  const isNoWork = rawStatus === 'no_work' || rawStatus === 'stalled';
  const isMissed = rawStatus === 'missed' || rawStatus === 'missing';
  const isPending = rawStatus === 'pending';
  const isNA = rawStatus === 'na';
  const rawLog = dayStatus?.log || log;
  const displayDate = dayStatus?.date || date || (rawLog?.log_date) || 'Today';

  const statusLabel = isWorked
    ? 'DONE'
    : isNoWork
    ? 'STALLED'
    : isMissed
    ? 'MISSED'
    : isPending
    ? 'PENDING'
    : 'N/A';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      style={{
        background: 'rgba(9, 14, 26, 0.65)',
        backdropFilter: 'blur(4px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh] z-[10000] animate-fade-up"
        style={{
          background: 'var(--color-surface-solid, #1a1814)',
          borderColor: 'var(--color-border, rgba(255,255,255,0.1))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          margin: 'auto',
        }}
      >
        {/* Header Bar */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            borderColor: 'var(--color-border, rgba(255,255,255,0.1))',
            background: 'var(--table-th-bg, rgba(255,255,255,0.03))'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                background: isWorked
                  ? 'rgba(56, 221, 159, 0.12)'
                  : isNoWork
                  ? 'rgba(255, 107, 107, 0.12)'
                  : isMissed
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(255, 255, 255, 0.05)',
                borderColor: isWorked
                  ? 'rgba(56, 221, 159, 0.25)'
                  : isNoWork
                  ? 'rgba(255, 107, 107, 0.25)'
                  : isMissed
                  ? 'rgba(245, 158, 11, 0.25)'
                  : 'var(--color-border, rgba(255,255,255,0.1))',
                color: isWorked
                  ? '#38dd9f'
                  : isNoWork
                  ? '#ff6b6b'
                  : isMissed
                  ? '#f59e0b'
                  : 'var(--color-text-3, #94a3b8)'
              }}
            >
              {isWorked ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isNoWork ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight" style={{ color: 'var(--color-text-1, #f0ede8)' }}>
                Daily Log Inspection
              </h3>
              <p className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'var(--color-text-3, #94a3b8)' }}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{displayDate}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:opacity-75"
            style={{ color: 'var(--color-text-3, #94a3b8)' }}
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Metadata: Contributor & Task Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Contributor Card */}
            <div
              className="rounded-xl p-3.5 border transition-all"
              style={{
                background: 'var(--table-th-bg, rgba(255,255,255,0.03))',
                borderColor: 'var(--color-border-soft, rgba(255,255,255,0.08))'
              }}
            >
              <div
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--color-text-3, #94a3b8)' }}
              >
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>CONTRIBUTOR</span>
              </div>
              <div className="font-bold text-sm leading-snug" style={{ color: 'var(--color-text-1, #f0ede8)' }}>
                {employee?.full_name || employee?.name || 'Team Member'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-3, #94a3b8)' }}>
                {employee?.role_title || 'Assignee'}
              </div>
            </div>

            {/* Task Card */}
            <div
              className="rounded-xl p-3.5 border transition-all"
              style={{
                background: 'var(--table-th-bg, rgba(255,255,255,0.03))',
                borderColor: 'var(--color-border-soft, rgba(255,255,255,0.08))'
              }}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-3, #94a3b8)' }}
                >
                  <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                  <span>TASK</span>
                </div>
                {task?.project_title && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                    {task.project_title}
                  </span>
                )}
              </div>
              <div
                className="font-bold text-sm leading-snug truncate"
                title={task?.title || task?.task || 'Assigned Task'}
                style={{ color: 'var(--color-text-1, #f0ede8)' }}
              >
                {task?.title || task?.task || task?.description || 'Assigned Task'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-3, #94a3b8)' }}>
                {task?.start_date && task?.end_date
                  ? `${task.start_date} → ${task.end_date}`
                  : task?.dueDate
                  ? `Due: ${task.dueDate}`
                  : 'Active Window'}
              </div>
            </div>
          </div>

          {/* Status Row */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-3, #94a3b8)' }}>
              Status:
            </span>
            <span
              className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded tracking-wide inline-flex items-center gap-1"
              style={{
                background: isWorked
                  ? 'rgba(56, 221, 159, 0.15)'
                  : isNoWork
                  ? 'rgba(255, 107, 107, 0.15)'
                  : isMissed
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(148, 163, 184, 0.15)',
                color: isWorked
                  ? '#38dd9f'
                  : isNoWork
                  ? '#ff6b6b'
                  : isMissed
                  ? '#f59e0b'
                  : 'var(--color-text-2, #cbd5e1)',
                border: isWorked
                  ? '1px solid rgba(56, 221, 159, 0.3)'
                  : isNoWork
                  ? '1px solid rgba(255, 107, 107, 0.3)'
                  : isMissed
                  ? '1px solid rgba(245, 158, 11, 0.3)'
                  : '1px solid rgba(148, 163, 184, 0.2)'
              }}
            >
              {statusLabel}
            </span>
          </div>

          {/* Deliverable Scope & Specifications */}
          <div>
            <div
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--color-text-3, #94a3b8)' }}
            >
              DELIVERABLE SCOPE &amp; SPECIFICATIONS
            </div>
            <div
              className="p-3.5 rounded-xl border text-sm leading-relaxed"
              style={{
                background: 'var(--table-th-bg, rgba(255,255,255,0.03))',
                borderColor: 'var(--color-border-soft, rgba(255,255,255,0.08))'
              }}
            >
              <p className="font-semibold text-xs text-blue-400 mb-1 flex items-center gap-1.5">
                <span>📌</span>
                <span className="truncate">{task?.title || task?.task || 'Deliverable Task'}</span>
              </p>
              <p
                className="text-xs leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--color-text-3, #94a3b8)' }}
              >
                {task?.description || 'No detailed specifications provided for this deliverable.'}
              </p>
            </div>
          </div>

          {/* Contextual Workday Card (Missed / Logged / Stalled / Pending) */}
          {isMissed && (
            <div
              className="p-4 rounded-xl border"
              style={{
                background: 'rgba(245, 158, 11, 0.10)',
                borderColor: 'rgba(245, 158, 11, 0.25)',
                color: '#f59e0b'
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                <Clock className="w-4 h-4" />
                <span>Submission Awaited / Past Due</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-2, #e2e8f0)' }}>
                No daily log was submitted by {employee?.full_name || employee?.name || 'the contributor'} for this workday.
              </p>
            </div>
          )}

          {isWorked && (
            <div
              className="p-4 rounded-xl border"
              style={{
                background: 'rgba(56, 221, 159, 0.10)',
                borderColor: 'rgba(56, 221, 159, 0.25)',
                color: '#38dd9f'
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Daily Log Submitted</span>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-1, #f0ede8)' }}>
                {dayStatus?.text || rawLog?.work_text || rawLog?.dailyUpdate || 'Successfully completed scheduled tasks for this day.'}
              </p>
            </div>
          )}

          {isNoWork && (
            <div
              className="p-4 rounded-xl border"
              style={{
                background: 'rgba(255, 107, 107, 0.10)',
                borderColor: 'rgba(255, 107, 107, 0.25)',
                color: '#ff6b6b'
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Impediment / Blocker Reported</span>
              </div>
              <p className="text-xs leading-relaxed italic" style={{ color: 'var(--color-text-1, #f0ede8)' }}>
                "{dayStatus?.reason || rawLog?.no_work_reason || rawLog?.blocker || 'Blocker encountered during workday.'}"
              </p>
            </div>
          )}

          {isPending && (
            <div
              className="p-4 rounded-xl border"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'var(--color-border-soft, rgba(255,255,255,0.08))',
                color: 'var(--color-text-3, #94a3b8)'
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs mb-1 text-slate-300">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Scheduled Workday / In Progress</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-3, #94a3b8)' }}>
                This task is scheduled within the active window. Daily log will be submitted by {employee?.full_name || employee?.name || 'the assignee'} upon progress completion.
              </p>
            </div>
          )}

          {isNA && (
            <div
              className="p-4 rounded-xl border text-center text-xs"
              style={{
                background: 'var(--table-th-bg, rgba(255,255,255,0.03))',
                borderColor: 'var(--color-border-soft, rgba(255,255,255,0.08))',
                color: 'var(--color-text-3, #94a3b8)'
              }}
            >
              This date is outside the deliverable's active scheduled window.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end px-6 py-3.5 border-t"
          style={{
            borderColor: 'var(--color-border, rgba(255,255,255,0.1))',
            background: 'var(--table-th-bg, rgba(255,255,255,0.02))'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-medium border shadow-sm transition-all hover:opacity-90"
            style={{
              background: 'var(--btn-secondary-bg, rgba(255,255,255,0.08))',
              borderColor: 'var(--color-border, rgba(255,255,255,0.15))',
              color: 'var(--color-text-1, #f0ede8)'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
