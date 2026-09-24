import React, { useState } from 'react';
import { api } from '../services/api';
import {
  FolderGit2,
  Plus,
  Users,
  MessageSquare,
  Trash2,
  Layout,
  ArrowRight,
} from 'lucide-react';
import { NewTaskModal } from './ProjectTaskModal';
import ProjectChatModal from './ProjectChatModal';
import { PriorityBadge, CategoryBadge } from './OtherWorkspaces';

/* ── Status badge colour mapping (mirrors OtherWorkspaces / PMDashboard tokens) ── */
function StatusBadge({ status }) {
  const s = (status || 'active').toLowerCase();
  let cls = 'lozenge ';
  if (s === 'active')         cls += 'lozenge-success';
  else if (s === 'in-review') cls += 'lozenge-warning';
  else if (s === 'completed') cls += 'lozenge-info';
  else if (s === 'archived')  cls += 'lozenge-default';
  else                        cls += 'lozenge-success';
  return <span className={cls}>{status || 'Active'}</span>;
}

export default function ActiveProjectContainers({ projects = [], allProjects = [], onRefresh, onOpenWorkspace }) {
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedProjectIdForTask, setSelectedProjectIdForTask] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChatProjectId, setSelectedChatProjectId] = useState(null);

  const modalProjectList = allProjects.length > 0 ? allProjects : projects;

  return (
    <div className="active-project-containers-section mt-6 mb-8">
      {/* ── Section Header matching OtherWorkspaces ── */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          style={{ color: 'var(--color-text-2)' }}
        >
          <FolderGit2 className="w-4 h-4 text-slate-400 dark:text-slate-400" />
          <span>Project Archives ({projects.length})</span>
        </h2>
      </div>

      {/* ── Project Card Grid ── */}
      {projects.length === 0 ? (
        <div
          className="jira-card p-6 flex flex-col items-center justify-center text-center space-y-2"
          style={{ background: 'var(--table-th-bg)' }}
        >
          <FolderGit2 className="w-8 h-8 text-gray-500" />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-2)' }}>
            No active project containers found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="jira-card p-5 flex flex-col justify-between group transition-all"
              style={{ background: 'var(--table-th-bg)' }}
            >
              {/* Card body */}
              <div>
                {/* Status + priority KPI + task count badges */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={proj.status} />
                    <PriorityBadge priority={proj.priority} />
                  </div>
                  <span className="lozenge lozenge-default font-mono">
                    {proj.task_count ?? 0} Tasks
                  </span>
                </div>

                {/* Project title */}
                <h3
                  className="font-bold text-base transition-colors leading-snug"
                  style={{ color: 'var(--color-text-1)' }}
                >
                  {proj.title || proj.name}
                </h3>

                {/* Description — 2-line clamp */}
                <p
                  className="text-xs line-clamp-2 mt-1.5 leading-relaxed"
                  style={{ color: 'var(--color-text-2)' }}
                >
                  {proj.description || 'No description provided.'}
                </p>

                {/* Category KPI & Members count */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <CategoryBadge category={proj.category} />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{proj.member_count ?? 0} Members</span>
                  </span>
                </div>
              </div>

              {/* Quick-action footer */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">

                {/* 💬 Chat */}
                <button
                  onClick={() => {
                    setSelectedChatProjectId(proj.id);
                    setShowChatModal(true);
                  }}
                  className="btn-secondary flex-1 justify-center text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
                  title="Open Team Chat & Meeting Scheduler"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>

                {/* Workspace → */}
                <button
                  onClick={() => {
                    if (typeof onOpenWorkspace === 'function') {
                      onOpenWorkspace(proj);
                    }
                  }}
                  className="btn-primary flex-1 justify-center text-xs px-2"
                  title="Open Workspace for this Project"
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span>Workspace</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                {/* 🗑 Delete */}
                <button
                  onClick={async () => {
                    if (window.confirm(`Delete "${proj.title || proj.name}"? This cannot be undone.`)) {
                      try {
                        await api.projects.delete(proj.id);
                        if (typeof onRefresh === 'function') {
                          onRefresh();
                        }
                      } catch (err) {
                        alert(err.message || 'Failed to delete project');
                      }
                    }
                  }}
                  className="btn-secondary text-slate-400 hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10 justify-center text-xs p-1.5"
                  title="Delete Project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showNewTaskModal && (
        <NewTaskModal
          projectId={selectedProjectIdForTask}
          projects={modalProjectList}
          onClose={() => setShowNewTaskModal(false)}
          onSuccess={() => {
            setShowNewTaskModal(false);
            if (typeof onRefresh === 'function') {
              onRefresh();
            }
          }}
        />
      )}

      {showChatModal && (
        <ProjectChatModal
          projectId={selectedChatProjectId ?? (modalProjectList[0]?.id ?? null)}
          projects={modalProjectList}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </div>
  );
}
