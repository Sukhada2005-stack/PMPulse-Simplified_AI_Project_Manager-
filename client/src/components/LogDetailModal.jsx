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

  const { employee, task, dayStatus } = logData;
  const isWorked = dayStatus?.status === 'logged';
  const isNoWork = dayStatus?.status === 'no_work';
  const rawLog   = dayStatus?.log;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      style={{
        background: 'rgba(9,30,66,0.54)',
        backdropFilter: 'blur(3px)',
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] z-[10000]"
        style={{
          boxShadow: '0 20px 60px rgba(9,30,66,0.25)',
          margin: 'auto',
        }}
      >
        {/* Header Bar */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            background: isWorked ? 'rgba(56,221,159,0.12)' : isNoWork ? 'rgba(255,107,107,0.12)' : 'rgba(255,255,255,0.04)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{
                background: isWorked ? '#38dd9f' : isNoWork ? '#ff6b6b' : '#8e8b85',
              }}
            >
              {isWorked
                ? <CheckCircle2 className="w-4 h-4 text-white" />
                : isNoWork
                ? <AlertTriangle className="w-4 h-4 text-white" />
                : <Clock className="w-4 h-4 text-white" />
              }
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
                Daily Log Inspection
              </h3>
              <p className="flex items-center gap-1.5 text-[11px] mt-0.5" style={{ color: 'var(--color-text-3)' }}>
                <Calendar className="w-3 h-3" />
                {dayStatus?.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-200"
            style={{ color: 'var(--color-text-3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5 pb-0">
          {/* Contributor Card */}
          <div
            className="rounded-lg p-3"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-soft)' }}
          >
            <div
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--color-text-3)' }}
            >
              <User className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
              Contributor
            </div>
            <div className="font-bold text-sm" style={{ color: 'var(--color-text-1)' }}>
              {employee?.full_name || 'Team Member'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-3)' }}>
              {employee?.role_title || 'Assignee'}
            </div>
          </div>

          {/* Task Card - Fully visible without truncation */}
          <div
            className="rounded-lg p-3 transition-colors"
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border-soft)',
            }}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <div
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-3)' }}
              >
                <Briefcase className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                Allocated Task
              </div>
              {task?.project_title && (
                <span className="lozenge lozenge-blue" style={{ fontSize: '9px', padding: '0 4px' }}>
                  {task.project_title}
                </span>
              )}
            </div>
            <div className="font-bold text-sm leading-snug break-words" style={{ color: 'var(--color-text-1)' }}>
              {task?.title || 'Assigned Task'}
            </div>
            <div className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-3)' }}>
              {task?.start_date} → {task?.end_date}
            </div>
          </div>
        </div>

        {/* Status Content */}
        <div className="p-5 space-y-3.5">
          {/* Status Lozenge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-3)' }}>Status:</span>
            <span className={`lozenge ${
              isWorked ? 'lozenge-success' : isNoWork ? 'lozenge-danger' : 'lozenge-default'
            }`}>
              {isWorked ? '✓ LOGGED' : isNoWork ? '⚠ BLOCKED' : dayStatus?.label || 'PENDING'}
            </span>
          </div>

          {/* Deliverable Scope & Specifications - ALWAYS VISIBLE */}
          <div>
            <div
              className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--color-text-3)' }}
            >
              Deliverable Scope &amp; Specifications
            </div>
            <div
              className="text-sm leading-relaxed p-3.5 rounded-lg border"
              style={{
                background: '#FAFBFC',
                borderColor: 'rgba(255,255,255,0.10)',
                color: 'var(--color-text-1)',
              }}
            >
              <p className="font-semibold text-xs text-blue-700 mb-1 flex items-center gap-1.5">
                <span>📌</span>
                <span>{task?.title}</span>
              </p>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {task?.description || 'No detailed specifications provided for this deliverable.'}
              </p>
            </div>
          </div>

          {/* Work Log Content */}
          {isWorked && (
            <div>
              <div
                className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--color-text-3)' }}
              >
                Submitted Work Log
              </div>
              <div
                className="text-sm leading-relaxed p-3.5 rounded-lg whitespace-pre-wrap"
                style={{
                  background: 'rgba(56,221,159,0.12)',
                  border: '1px solid rgba(0,135,90,0.2)',
                  color: '#38dd9f',
                  fontFamily: 'inherit',
                }}
              >
                {dayStatus?.text || rawLog?.work_text || 'No description entered.'}
              </div>
            </div>
          )}

          {/* No Work / Blocker Reason */}
          {isNoWork && (
            <div>
              <div
                className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--color-danger)' }}
              >
                Blocker / Inactivity Reason
              </div>
              <div
                className="text-sm leading-relaxed p-3.5 rounded-lg"
                style={{
                  background: 'rgba(255,107,107,0.12)',
                  border: '1px solid rgba(222,53,11,0.2)',
                  color: '#BF2600',
                  fontStyle: 'italic',
                }}
              >
                "{dayStatus?.reason || rawLog?.no_work_reason || 'No specific blocker logged.'}"
              </div>
            </div>
          )}

          {/* Pending / Missed Notice */}
          {(dayStatus?.status === 'pending' || dayStatus?.status === 'missed') && (
            <div
              className="p-3.5 rounded-lg border text-xs leading-relaxed"
              style={{
                background: dayStatus?.status === 'missed' ? '#FFF0B3' : 'rgba(238,178,13,0.08)',
                borderColor: dayStatus?.status === 'missed' ? '#FFE380' : 'rgba(238,178,13,0.12)',
                color: dayStatus?.status === 'missed' ? '#f0ede8' : '#eeb20d',
              }}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {dayStatus?.status === 'missed' ? 'Submission Awaited / Past Due' : 'Scheduled Workday'}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>
                {dayStatus?.status === 'missed'
                  ? `No daily log was submitted by ${employee?.full_name || 'contributor'} for this workday.`
                  : `This task is scheduled within the active window (${task?.start_date} → ${task?.end_date}). Daily log entry will be submitted by ${employee?.full_name || 'the assignee'} upon progress completion.`}
              </p>
            </div>
          )}

          {/* N/A state */}
          {dayStatus?.status === 'na' && (
            <div
              className="text-sm p-3.5 rounded-lg text-center"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-3)' }}
            >
              This date is outside the task's scheduled active window.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.04)' }}
        >
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
