import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  FolderGit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Sparkles,
  ArrowRight,
  Users,
  Calendar,
  Layers,
  Activity,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Trash2
} from 'lucide-react';
import CalendarMatrix from './CalendarMatrix';
import { NewProjectModal, NewTaskModal } from './ProjectTaskModal';
import ProjectChatModal from './ProjectChatModal';

export default function PMDashboard({ onNavigateTab, onSelectEmployee360 }) {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedProjectIdForTask, setSelectedProjectIdForTask] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChatProjectId, setSelectedChatProjectId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [projRes, empRes] = await Promise.all([
        api.projects.getAll(),
        api.employees.getAll()
      ]);
      setProjects(projRes.projects || []);
      setEmployees(empRes.employees || []);
    } catch (err) {
      console.error('Failed to load PM dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalProjects = projects.length;
  const totalTasks = projects.reduce((acc, p) => acc + (p.task_count || 0), 0);
  const activeTasks = projects.reduce((acc, p) => acc + (p.active_task_count || 0), 0);
  const activeContributors = employees.length;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Top Executive Banner & Action Bar ──────────────────────── */}
      <div className="jira-card p-6 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="lozenge lozenge-blue flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Project Manager Executive Center
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--color-text-1)' }}>
              Frictionless Team &amp; Milestone Command
            </h1>

          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="btn-secondary"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>New Project</span>
            </button>

            <button
              onClick={() => {
                setSelectedProjectIdForTask(projects[0]?.id || null);
                setShowNewTaskModal(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Task</span>
            </button>

            <button
              onClick={() => onNavigateTab('ai_summary')}
              className="btn-ai-glow"
              style={{ width: 'auto', padding: '7px 16px' }}
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>AI Executive Hub</span>
            </button>
          </div>
        </div>

        {/* Executive High-Level KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100">
          <div className="stat-card" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-3)' }}>
              Active Projects
            </div>
            <div className="text-2xl font-black mt-0.5" style={{ color: 'var(--color-text-1)' }}>
              {totalProjects}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
              <span>All initiatives active</span>
            </div>
          </div>

          <div className="stat-card" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-3)' }}>
              Tracked Deliverables
            </div>
            <div className="text-2xl font-black mt-0.5" style={{ color: '#eeb20d' }}>
              {totalTasks}
            </div>
            <div className="text-[11px] font-medium" style={{ color: 'var(--color-text-3)' }}>
              {activeTasks} in flight
            </div>
          </div>

          <div className="stat-card" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-3)' }}>
              Workforce Headcount
            </div>
            <div className="text-2xl font-black mt-0.5" style={{ color: 'var(--color-text-1)' }}>
              {activeContributors}
            </div>
            <div className="text-[11px] font-medium text-blue-600">
              100% daily active
            </div>
          </div>

          <div className="stat-card" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-3)' }}>
              Avg Logging Compliance
            </div>
            <div className="text-2xl font-black mt-0.5" style={{ color: 'var(--color-success)' }}>
              94.2%
            </div>
            <div className="text-[11px] font-medium" style={{ color: 'var(--color-text-3)' }}>
              On-time daily submissions
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Projects Portfolio Grid ────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--color-text-2)' }}>
            <FolderGit2 className="w-4 h-4 text-blue-600" />
            <span>Active Project Containers ({projects.length})</span>
          </h2>
          <button
            onClick={() => onNavigateTab('calendar_matrix')}
            className="text-xs font-bold flex items-center gap-1 hover:underline"
            style={{ color: '#eeb20d' }}
          >
            <span>Open Calendar Heatmap Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map(proj => (
            <div
              key={proj.id}
              className="jira-card p-5 flex flex-col justify-between group transition-all"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <span className="lozenge lozenge-success">
                    {proj.status || 'Active'}
                  </span>
                  <span className="lozenge lozenge-default font-mono">
                    {proj.task_count || 0} Tasks
                  </span>
                </div>

                {/* Project Title — Clean, High Contrast, Always Visible */}
                <h3
                  className="font-bold text-base transition-colors leading-snug"
                  style={{ color: '#f0ede8' }}
                >
                  {proj.title}
                </h3>
                
                {/* Description */}
                <p
                  className="text-xs line-clamp-2 mt-1.5 leading-relaxed"
                  style={{ color: '#c5c4c1' }}
                >
                  {proj.description || 'No description provided.'}
                </p>

                {/* Team Avatars */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center -space-x-2 overflow-hidden">
                    {proj.members?.slice(0, 4).map(m => (
                      <img
                        key={m.id}
                        src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.full_name}`}
                        alt={m.full_name}
                        title={`${m.full_name} (${m.role_title})`}
                        className="inline-block h-7 w-7 rounded-full ring-2 ring-white/10 object-cover border border-white/10"
                      />
                    ))}
                    {proj.members?.length > 4 && (
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-[10px] font-bold text-white/60 ring-2 ring-white/10 border border-white/10">
                        +{proj.members.length - 4}
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-semibold flex items-center gap-1" style={{ color: '#eeb20d' }}>
                    <Users className="w-3.5 h-3.5" />
                    <span>{proj.member_count} Members</span>
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
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

                <button
                  onClick={() => {
                    setSelectedChatProjectId(proj.id);
                    setShowChatModal(true);
                  }}
                  className="btn-secondary text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 flex-1 justify-center text-xs px-2"
                  title="Open Team Chat & Meeting Scheduler"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Chat</span>
                </button>

                <button
                  onClick={() => onNavigateTab('calendar_matrix', proj.id)}
                  className="btn-primary flex-1 justify-center text-xs px-2"
                  title="Open Calendar Heatmap Matrix"
                >
                  <span>Matrix</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
                      try {
                        await api.projects.delete(proj.id);
                        fetchDashboardData();
                      } catch (err) {
                        alert(err.message || 'Failed to delete project');
                      }
                    }
                  }}
                  className="btn-secondary text-red-600 bg-red-50 hover:bg-red-100 border-red-200 justify-center text-xs px-2"
                  title="Delete Project"
                  style={{ padding: '0 8px' }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Embedded Calendar Heatmap Matrix Section ────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text-1)' }}>
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Interactive Calendar Matrix Heatmap (The GUI)</span>
            </h2>

          </div>
        </div>

        <CalendarMatrix
          onOpenAISummary={() => onNavigateTab('ai_summary')}
        />
      </div>

      {/* Modals */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {showNewTaskModal && (
        <NewTaskModal
          projectId={selectedProjectIdForTask}
          projects={projects}
          onClose={() => setShowNewTaskModal(false)}
          onSuccess={fetchDashboardData}
        />
      )}

      {showChatModal && (
        <ProjectChatModal
          projectId={selectedChatProjectId || (projects[0]?.id ?? null)}
          projects={projects}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </div>
  );
}
