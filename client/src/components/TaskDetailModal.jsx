import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Briefcase,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  FileText,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

export default function TaskDetailModal({ task, employee, days = [], onClose, onTaskUpdate }) {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!task) return;
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
  }, [task, onClose]);

  if (!task) return null;

  const totalDays = days.length;
  const loggedDays = days.filter(d => d.status === 'logged').length;
  const blockedDays = days.filter(d => d.status === 'no_work').length;
  const missedDays = days.filter(d => d.status === 'missed').length;
  const pendingDays = days.filter(d => d.status === 'pending').length;

  let maxStreak = 0;
  let currentStreak = 0;
  for (const d of days) {
    if (d.status === 'no_work' || d.status === 'missed') {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }
  const showWarningButtons = maxStreak >= 5;

  const handleSendWarning = async () => {
    if (!employee || !task) return;
    try {
      setIsProcessing(true);
      await api.employees.sendWarning(employee.id, {
        task_id: task.id,
        project_id: task.project_id,
        message: `Warning: You have been blocked or missed ${maxStreak} consecutive days on task "${task.title}". Please take immediate action.`
      });
      alert('Warning sent successfully');
    } catch (err) {
      alert(err.message || 'Failed to send warning');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveContributor = async () => {
    if (!employee || !task) return;
    if (!window.confirm(`Are you sure you want to remove ${employee.full_name} from this project?`)) return;
    
    try {
      setIsProcessing(true);
      await api.projects.removeMember(task.project_id, employee.id);
      alert(`${employee.full_name} has been removed from the project.`);
      if (onTaskUpdate) onTaskUpdate();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to remove contributor');
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      style={{
        background: 'rgba(9, 30, 66, 0.54)',
        backdropFilter: 'blur(3px)',
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] z-[10000]"
        style={{
          boxShadow: '0 20px 60px rgba(9,30,66,0.25)',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-lg"
              style={{ background: 'rgba(238,178,13,0.12)', color: '#eeb20d' }}
            >
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Allocated Task Specification
                </span>
                {task.status && (
                  <span className={`lozenge ${task.status === 'in_progress' ? 'lozenge-blue' : 'lozenge-success'}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-base mt-0.5 text-gray-900 leading-tight">
                {task.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Project & Timeline Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Project Box */}
            <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50 flex items-start gap-3">
              <div className="p-2 rounded bg-white border border-gray-200 text-blue-600">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Assigned Project
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
                  {task.project_title || 'Project Deliverable'}
                </div>
              </div>
            </div>

            {/* Schedule Box */}
            <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50 flex items-start gap-3">
              <div className="p-2 rounded bg-white border border-gray-200 text-indigo-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Timeline Window
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-0.5">
                  {task.start_date} <span className="text-gray-400">→</span> {task.end_date}
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Employee Card */}
          {employee && (
            <div className="p-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={employee.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.full_name}`}
                  alt={employee.full_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Allocated Contributor
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {employee.full_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {employee.role_title || 'Team Member'} {employee.email && `• ${employee.email}`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Specifications & Deliverable Scope Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Deliverable Scope &amp; Specifications
              </h4>
            </div>

            <div
              className="p-4 rounded-xl border text-sm leading-relaxed"
              style={{
                background: '#FAFBFC',
                borderColor: 'rgba(255,255,255,0.10)',
                color: '#f0ede8',
              }}
            >
              <div className="flex items-start gap-2 mb-2 font-semibold text-blue-800 text-xs">
                <span>📌</span>
                <span>{task.title}</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {task.description || 'No detailed technical specifications were attached to this deliverable.'}
              </p>
            </div>
          </div>

          {/* Progress / Activity Breakdown if days provided */}
          {days.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span>Sprint Matrix Progress Overview</span>
                </div>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="text-emerald-700 font-semibold">{loggedDays} Logged</span>
                  {blockedDays > 0 && <span className="text-rose-600 font-semibold">• {blockedDays} Blocked</span>}
                  {missedDays > 0 && <span className="text-amber-700 font-semibold">• {missedDays} Missed</span>}
                  <span className="text-gray-500">• {pendingDays} Pending</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                {/* Done Logs */}
                <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-center">
                  <div className="text-[10px] font-bold uppercase text-emerald-800">Done Logs</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">{loggedDays}</div>
                </div>

                {/* Blockers */}
                <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50 text-center">
                  <div className="text-[10px] font-bold uppercase text-rose-800">Blockers</div>
                  <div className="text-lg font-black text-rose-700 mt-0.5">{blockedDays}</div>
                </div>

                {/* Missed Logs */}
                <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-center">
                  <div className="text-[10px] font-bold uppercase text-amber-800">Missed</div>
                  <div className="text-lg font-black text-amber-700 mt-0.5">{missedDays}</div>
                </div>

                {/* Pending */}
                <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 text-center">
                  <div className="text-[10px] font-bold uppercase text-gray-600">Pending</div>
                  <div className="text-lg font-black text-gray-700 mt-0.5">{pendingDays}</div>
                </div>

                {/* Total Tracked */}
                <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50 text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-bold uppercase text-blue-800">Total Tracked</div>
                  <div className="text-lg font-black text-blue-700 mt-0.5">{totalDays} days</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div
          className="flex justify-between items-center px-6 py-3"
          style={{ borderTop: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.04)' }}
        >
          <div className="flex gap-2">
            {showWarningButtons && (
              <>
                <button
                  onClick={handleSendWarning}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Send Warning
                </button>
                <button
                  onClick={handleRemoveContributor}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove Contributor
                </button>
              </>
            )}
          </div>
          <button onClick={onClose} disabled={isProcessing} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
