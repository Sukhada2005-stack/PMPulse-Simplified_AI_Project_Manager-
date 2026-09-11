import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  FolderGit2,
  Plus,
  Users,
  MessageSquare,
  ArrowRight,
  Trash2,
  Search,
  Loader2,
  Grid2x2,
} from 'lucide-react';
import { NewProjectModal, NewTaskModal } from './ProjectTaskModal';
import ProjectChatModal from './ProjectChatModal';

/* ── Status badge colour mapping (mirrors PMDashboard tokens) ────────── */
function StatusBadge({ status }) {
  const s = (status || 'active').toLowerCase();
  let cls = 'lozenge ';
  if (s === 'active')      cls += 'lozenge-success';
  else if (s === 'in-review') cls += 'lozenge-warning';
  else if (s === 'completed') cls += 'lozenge-info';
  else if (s === 'archived')  cls += 'lozenge-default';
  else                        cls += 'lozenge-success';
  return <span className={cls}>{status || 'Active'}</span>;
}

export default function OtherWorkspaces({ onNavigateTab }) {
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showNewProjectModal, setShowNewProjectModal]         = useState(false);
  const [showNewTaskModal, setShowNewTaskModal]               = useState(false);
  const [selectedProjectIdForTask, setSelectedProjectIdForTask] = useState(null);
  const [showChatModal, setShowChatModal]                     = useState(false);
  const [selectedChatProjectId, setSelectedChatProjectId]     = useState(null);

  /* ── Data fetch ───────────────────────────────────────────────────── */
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const projRes = await api.projects.getAll();
      setProjects(projRes.projects || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  /* ── Client-side search filter ────────────────────────────────────── */
  const filteredProjects = projects.filter(proj => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (proj.title       && proj.title.toLowerCase().includes(q)) ||
      (proj.description && proj.description.toLowerCase().includes(q))
    );
  });

  /* ── Open "Provision Task" from the top bar ───────────────────────── */
  const handleTopProvisionTask = () => {
    // Pre-select the first project; the NewTaskModal lets the PM pick another.
    setSelectedProjectIdForTask(projects[0]?.id || null);
    setShowNewTaskModal(true);
  };

  /* ── Navigate to Calendar Matrix scoped to a project ─────────────── */
  const handleOpenMatrix = (projectId) => {
    if (typeof onNavigateTab === 'function') {
      onNavigateTab('calendar_matrix', projectId);
    }
  };

  /* ── Loading spinner ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#eeb20d' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-3)' }}>
          Loading project workspaces…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Header row ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">

          {/* Title */}
          <h2
            className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            style={{ color: 'var(--color-text-2)' }}
          >
            <FolderGit2 className="w-4 h-4 text-blue-600" />
            <span>Active Project Containers ({projects.length})</span>
          </h2>

          {/* Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-gray-900 dark:text-slate-100"
              />
            </div>

            {/* + Provision Task */}
            <button
              onClick={handleTopProvisionTask}
              disabled={projects.length === 0}
              className="btn-primary whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Task</span>
            </button>

            {/* + New Project */}
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-semibold px-4 py-2 rounded-md flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* ── Project card grid ────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* Empty state */}
          {filteredProjects.length === 0 ? (
            <div
              className="col-span-full jira-card p-10 flex flex-col items-center justify-center text-center space-y-4"
              style={{ background: 'var(--table-th-bg)' }}
            >
              <FolderGit2 className="w-12 h-12 text-gray-500" />
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--color-text-1)' }}>
                  {searchQuery ? 'No Results Found' : 'No Workspaces Yet'}
                </h3>
                <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: 'var(--color-text-3)' }}>
                  {searchQuery
                    ? `No projects matched "${searchQuery}".`
                    : 'Your workspace is completely clean. No active projects are provisioned yet. Start by creating your first project container to begin tracking deliverables.'}
                </p>
              </div>
              {!searchQuery && (
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="btn-primary mt-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Project</span>
                </button>
              )}
            </div>
          ) : (

            filteredProjects.map(proj => (
              <div
                key={proj.id}
                className="jira-card p-5 flex flex-col justify-between group transition-all"
                style={{ background: 'var(--table-th-bg)' }}
              >
                {/* Card body */}
                <div>
                  {/* Status + task count badges */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <StatusBadge status={proj.status} />
                    <span className="lozenge lozenge-default font-mono">
                      {proj.task_count ?? 0} Tasks
                    </span>
                  </div>

                  {/* Project title */}
                  <h3
                    className="font-bold text-base transition-colors leading-snug"
                    style={{ color: 'var(--color-text-1)' }}
                  >
                    {proj.title}
                  </h3>

                  {/* Description — 2-line clamp */}
                  <p
                    className="text-xs line-clamp-2 mt-1.5 leading-relaxed"
                    style={{ color: 'var(--color-text-2)' }}
                  >
                    {proj.description || 'No description provided.'}
                  </p>

                  {/* Members count */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end">
                    <span
                      className="text-xs font-semibold flex items-center gap-1"
                      style={{ color: '#eeb20d' }}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{proj.member_count ?? 0} Members</span>
                    </span>
                  </div>
                </div>

                {/* Quick-action footer */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">

                  {/* + Task */}
                  <button
                    onClick={() => {
                      setSelectedProjectIdForTask(proj.id);
                      setShowNewTaskModal(true);
                    }}
                    className="btn-secondary flex-1 justify-center text-xs px-2"
                    title="Provision New Task in Project"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Task</span>
                  </button>

                  {/* 💬 Chat */}
                  <button
                    onClick={() => {
                      setSelectedChatProjectId(proj.id);
                      setShowChatModal(true);
                    }}
                    className="btn-secondary flex-1 justify-center text-xs px-2 text-blue-700 bg-blue-50 border-blue-200 hover:bg-slate-100 hover:text-slate-900 dark:text-blue-400 dark:bg-transparent dark:border-blue-800/50 dark:hover:bg-white/10 dark:hover:text-white transition-colors duration-200"
                    title="Open Team Chat & Meeting Scheduler"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>

                  {/* Matrix → */}
                  <button
                    onClick={() => handleOpenMatrix(proj.id)}
                    className="btn-primary flex-1 justify-center text-xs px-2"
                    title="Open Calendar Matrix for this Project"
                  >
                    <Grid2x2 className="w-3.5 h-3.5" />
                    <span>Matrix</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  {/* 🗑 Delete */}
                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete "${proj.title}"? This cannot be undone.`)) {
                        try {
                          await api.projects.delete(proj.id);
                          fetchProjects();
                        } catch (err) {
                          alert(err.message || 'Failed to delete project');
                        }
                      }
                    }}
                    className="btn-secondary text-red-600 bg-red-50 hover:bg-red-100 border-red-200 justify-center text-xs"
                    style={{ padding: '0 8px' }}
                    title="Delete Project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onSuccess={fetchProjects}
        />
      )}

      {showNewTaskModal && (
        <NewTaskModal
          projectId={selectedProjectIdForTask}
          projects={projects}
          onClose={() => setShowNewTaskModal(false)}
          onSuccess={fetchProjects}
        />
      )}

      {showChatModal && (
        <ProjectChatModal
          projectId={selectedChatProjectId ?? (projects[0]?.id ?? null)}
          projects={projects}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </div>
  );
}
