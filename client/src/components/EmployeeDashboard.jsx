import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  MessageSquare,
  Layout,
  Users,
  UserCheck,
  File,
  FileText,
  DownloadCloud,
  UploadCloud,
  Trash2,
  Plus,
  X,
  User,
  CornerDownLeft,
  MoreHorizontal,
  Edit2,
  List,
  LayoutGrid,
  CheckSquare,
  Layers,
  ListFilter
} from 'lucide-react';
import ProjectChatModal from './ProjectChatModal';
import AICopilotPanel from './AICopilotPanel';
import TaskFilterPanel from './TaskFilterPanel';

const parseSprintEndDate = (dateStr) => {
  if (!dateStr) return null;
  const direct = new Date(String(dateStr).replace(/Sept/i, 'Sep'));
  if (!isNaN(direct.getTime())) {
    direct.setHours(23, 59, 59, 999);
    return direct;
  }
  const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, sept:8, oct:9, nov:10, dec:11 };
  const parts = String(dateStr).trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase().slice(0, 4);
    const month = months[mStr] !== undefined ? months[mStr] : months[mStr.slice(0, 3)];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day, 23, 59, 59, 999);
    }
  }
  return null;
};

const isSprintExpired = (config) => {
  if (!config) return true;
  if (config.isCompleted) return true;
  if (config.endTimestamp) {
    return Date.now() > config.endTimestamp;
  }
  if (config.endDateISO) {
    return new Date() > new Date(config.endDateISO);
  }
  if (config.end) {
    const parsed = parseSprintEndDate(config.end);
    if (parsed) return Date.now() > parsed.getTime();
  }
  return false;
};

export default function EmployeeDashboard({ selectedWorkspace: propWorkspace }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const selectedWorkspace = propWorkspace || (tasks[0]?.project_id ? { id: tasks[0].project_id } : null);
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
  const [activeView, setActiveView] = useState(() => {
    try {
      return localStorage.getItem('pmpulse_employee_active_view') || 'list';
    } catch {
      return 'list';
    }
  });

  useEffect(() => {
    if (activeView) {
      try {
        localStorage.setItem('pmpulse_employee_active_view', activeView);
      } catch (e) {}
    }
  }, [activeView]);

  // Single source of truth for navigation tabs
  const NAVIGATION_TABS = [
    { id: 'overall', label: 'Overall Tasks' },
    { id: 'list', label: 'List' },
    { id: 'board', label: 'Board' },
    { id: 'docs', label: 'Docs' }
  ];

  const activeWsIdRef = useRef(selectedWorkspace?.id);
  const [workspaceTasks, setWorkspaceTasks] = useState(() => {
    const wsId = selectedWorkspace?.id;
    try { return (wsId ? JSON.parse(window.localStorage.getItem(`pmpulse_workspaceTasks_${wsId}`)) : null) || []; } 
    catch { return []; }
  });
  const [listTasks, setListTasks] = useState(() => {
    const wsId = selectedWorkspace?.id;
    try { return (wsId ? JSON.parse(window.localStorage.getItem(`pmpulse_listTasks_${wsId}`)) : null) || []; } 
    catch { return []; }
  });
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [boardTasks, setBoardTasks] = useState(() => {
    const wsId = selectedWorkspace?.id;
    try { return (wsId ? JSON.parse(window.localStorage.getItem(`pmpulse_boardTasks_${wsId}`)) : null) || []; } 
    catch { return []; }
  });
  const [boardBacklogTasks, setBoardBacklogTasks] = useState(() => {
    const wsId = selectedWorkspace?.id;
    try { return (wsId ? JSON.parse(window.localStorage.getItem(`pmpulse_boardBacklogTasks_${wsId}`)) : null) || []; } 
    catch { return []; }
  });
  const [workspaceDocs, setWorkspaceDocs] = useState(() => {
    const wsId = selectedWorkspace?.id;
    try { return (wsId ? JSON.parse(window.localStorage.getItem(`pmpulse_workspaceDocs_${wsId}`)) : null) || []; } 
    catch { return []; }
  });
  const [isCreateListTaskOpen, setIsCreateListTaskOpen] = useState(false);
  const [listTaskForm, setListTaskForm] = useState({
    type: 'Task',
    description: '',
    status: 'To Do',
    assignee: '',
    dueDate: '',
    priority: 'Medium'
  });
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [actionModalTasks, setActionModalTasks] = useState(null);
  const [isPullConfirmModalOpen, setIsPullConfirmModalOpen] = useState(false);
  const [sprintBacklogTasks, setSprintBacklogTasks] = useState(() => {
    const wsId = selectedWorkspace?.id;
    try { return (wsId ? JSON.parse(window.localStorage.getItem(`pmpulse_sprintBacklogTasks_${wsId}`)) : null) || []; } 
    catch { return []; }
  });
  const [workspaceMembers, setWorkspaceMembers] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('pmpulse_workspaceMembers')) || []; } 
    catch { return []; }
  });
  const [taskTypes, setTaskTypes] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('pmpulse_taskTypes')) || ['Task', 'Bug', 'Epic']; } 
    catch { return ['Task', 'Bug', 'Epic']; }
  });
  const [taskStatuses, setTaskStatuses] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('pmpulse_taskStatuses')) || ['To Do', 'In Progress', 'In Review', 'Done']; } 
    catch { return ['To Do', 'In Progress', 'In Review', 'Done']; }
  });

  // Inline Creation State
  const [draftTask, setDraftTask] = useState({ 
    columnId: null, 
    boardType: null, // 'active' or 'backlog'
    title: '', 
    assignee: 'Unassigned', 
    dueDate: '' 
  });

  // Task Detail Modal State
  const [selectedTaskModal, setSelectedTaskModal] = useState(null);

  // Action Menu & Edit States
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);

  // Kanban Board Edit Modal State
  const [boardEditTask, setBoardEditTask] = useState(null);

  const handleOpenBoardEditModal = (e, task) => {
    e.stopPropagation();
    setBoardEditTask({ ...task }); // Create a working copy for the modal
    setActiveDropdownId(null);
  };

  const handleSaveBoardEdit = () => {
    // Safely update the task across all relevant arrays
    const updateArray = (prev) => prev?.map(t => t.id === boardEditTask.id ? boardEditTask : t) || [];

    if (typeof setWorkspaceTasks === 'function') setWorkspaceTasks(updateArray);
    if (typeof setListTasks === 'function') setListTasks(updateArray);
    if (typeof setBoardTasks === 'function') setBoardTasks(updateArray);
    if (typeof setBoardBacklogTasks === 'function') setBoardBacklogTasks(updateArray);

    setBoardEditTask(null);
  };

  // Global Click Listener for Dropdowns and Edit Mode
  useEffect(() => {
    const handleClickOutside = (e) => {
      // 1. Close the action menu if clicking outside of it
      if (!e.target.closest('.action-menu-container')) {
        setActiveDropdownId(null);
      }

      // 2. Revoke edit privileges if clicking outside the SPECIFIC task being edited
      if (!e.target.closest('.editing-active') && !e.target.closest('.action-menu-container')) {
        setEditingTaskId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleActionMenu = (e, taskId) => {
    e.stopPropagation();
    setActiveDropdownId(prev => prev === taskId ? null : taskId);
  };

  const handleEnableEdit = (e, taskId) => {
    e.stopPropagation();
    setEditingTaskId(taskId);
    setActiveDropdownId(null);
  };

  const handleDeleteTask = (e, taskId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    if (typeof setWorkspaceTasks === 'function') setWorkspaceTasks(prev => prev.filter(t => t.id !== taskId));
    if (typeof setListTasks === 'function') setListTasks(prev => prev.filter(t => t.id !== taskId));
    if (typeof setBoardTasks === 'function') setBoardTasks(prev => prev.filter(t => t.id !== taskId));
    if (typeof setBoardBacklogTasks === 'function') setBoardBacklogTasks(prev => prev.filter(t => t.id !== taskId));
    setActiveDropdownId(null);
  };

  // Push to localStorage to trigger cross-tab sync in other windows
  useEffect(() => {
    try {
      if (selectedWorkspace?.id && activeWsIdRef.current === selectedWorkspace.id) {
        localStorage.setItem(`pmpulse_workspaceDocs_${selectedWorkspace.id}`, JSON.stringify(workspaceDocs));
      }
    } catch (e) {
      console.warn("Failed to stringify docs", e);
    }
  }, [workspaceDocs, selectedWorkspace?.id]);

  // Cross-tab synchronization for live UI updates
  useEffect(() => {
    const handleStorageChange = (e) => {
      const wsId = selectedWorkspace?.id;
      if (!wsId) return;
      if (e.key === `pmpulse_workspaceTasks_${wsId}` && e.newValue) {
        try { setWorkspaceTasks(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      }
      if (e.key === `pmpulse_workspaceDocs_${wsId}` && e.newValue) {
        try { setWorkspaceDocs(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      }
      if (e.key === `pmpulse_boardBacklogTasks_${wsId}` && e.newValue) {
        try { setBoardBacklogTasks(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      }
      if (e.key === `pmpulse_boardTasks_${wsId}` && e.newValue) {
        try { setBoardTasks(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      }
      if (e.key === `pmpulse_listTasks_${wsId}` && e.newValue) {
        try { setListTasks(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      }
      if (e.key === `pmpulse_sprintBacklogTasks_${wsId}` && e.newValue) {
        try { setSprintBacklogTasks(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedWorkspace?.id]);

  // 1) Wipe & Reload Context Loader on Project Change
  useEffect(() => {
    const id = selectedWorkspace?.id;
    if (!id) {
      activeWsIdRef.current = null;
      setWorkspaceTasks([]);
      setListTasks([]);
      setBoardTasks([]);
      setBoardBacklogTasks([]);
      setWorkspaceDocs([]);
      setSprintBacklogTasks([]);
      setSprintConfig(null);
      return;
    }
    try {
      setWorkspaceTasks(JSON.parse(localStorage.getItem(`pmpulse_workspaceTasks_${id}`)) || []);
      setListTasks(JSON.parse(localStorage.getItem(`pmpulse_listTasks_${id}`)) || []);
      setBoardTasks(JSON.parse(localStorage.getItem(`pmpulse_boardTasks_${id}`)) || []);
      setBoardBacklogTasks(JSON.parse(localStorage.getItem(`pmpulse_boardBacklogTasks_${id}`)) || []);
      setWorkspaceDocs(JSON.parse(localStorage.getItem(`pmpulse_workspaceDocs_${id}`)) || []);
      setSprintBacklogTasks(JSON.parse(localStorage.getItem(`pmpulse_sprintBacklogTasks_${id}`)) || []);
      setSprintConfig(JSON.parse(localStorage.getItem(`pmpulse_sprintConfig_${id}`)) || null);
    } catch (e) {}
    activeWsIdRef.current = id;
  }, [selectedWorkspace?.id]);

  // Project-Scoped Storage Writers
  useEffect(() => {
    if (!selectedWorkspace?.id || activeWsIdRef.current !== selectedWorkspace.id) return;
    try { window.localStorage.setItem(`pmpulse_boardTasks_${selectedWorkspace.id}`, JSON.stringify(boardTasks)); } catch (e) {}
  }, [boardTasks, selectedWorkspace?.id]);

  useEffect(() => {
    if (!selectedWorkspace?.id || activeWsIdRef.current !== selectedWorkspace.id) return;
    try { window.localStorage.setItem(`pmpulse_listTasks_${selectedWorkspace.id}`, JSON.stringify(listTasks)); } catch (e) {}
  }, [listTasks, selectedWorkspace?.id]);

  useEffect(() => {
    if (!selectedWorkspace?.id || activeWsIdRef.current !== selectedWorkspace.id) return;
    try { window.localStorage.setItem(`pmpulse_boardBacklogTasks_${selectedWorkspace.id}`, JSON.stringify(boardBacklogTasks)); } catch (e) {}
  }, [boardBacklogTasks, selectedWorkspace?.id]);

  useEffect(() => {
    if (!selectedWorkspace?.id || activeWsIdRef.current !== selectedWorkspace.id) return;
    try { window.localStorage.setItem(`pmpulse_sprintBacklogTasks_${selectedWorkspace.id}`, JSON.stringify(sprintBacklogTasks)); } catch (e) {}
  }, [sprintBacklogTasks, selectedWorkspace?.id]);

  // Fetch overall workspace tasks from backend database
  useEffect(() => {
    const targetWsId = selectedWorkspace?.id;
    if (!targetWsId) return;
    
    const token = localStorage.getItem('pulsepm_token');
    fetch(`/api/workspaces/${targetWsId}/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (selectedWorkspace?.id === targetWsId && Array.isArray(data.tasks)) {
          const currentList = JSON.parse(window.localStorage.getItem(`pmpulse_listTasks_${targetWsId}`)) || [];
          const currentBoard = JSON.parse(window.localStorage.getItem(`pmpulse_boardTasks_${targetWsId}`)) || [];
          const activeTasks = [...currentList, ...currentBoard];
          const normalizeTitle = (str) => !str ? '' : str.trim().replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, ' ').toLowerCase();

          const reconciled = data.tasks.map(t => {
            const tTitle = normalizeTitle(t['Issue / Task / Enhancement'] || t.title || t.description || '');
            const activeMatch = activeTasks.find(at => 
              (at.id && String(at.id) === String(t.id)) ||
              (at.key && t.key && at.key === t.key) ||
              (tTitle && normalizeTitle(at.task || at.title || at.description || at.taskName || '') === tTitle)
            );
            const activeAssignee = activeMatch?.assignee || activeMatch?.['Responsible'];
            const activeStatus = activeMatch?.status || activeMatch?.['Status'];
            const activeDueDate = (activeMatch?.dueDate && activeMatch.dueDate !== '—') 
              ? activeMatch.dueDate 
              : (activeMatch?.['Completed'] && activeMatch['Completed'] !== '—' ? activeMatch['Completed'] : null);
            const activePriority = activeMatch?.priority || activeMatch?.['Priority'];

            const effectiveAssignee = (activeAssignee && activeAssignee !== 'Unassigned') ? activeAssignee : (t['Responsible'] || t.assignee || 'Unassigned');
            const effectiveStatus = activeStatus || t['Status'] || (t.status === 'in_progress' ? 'In Progress' : (t.status || 'To Do'));
            const effectiveDueDate = activeDueDate 
              ? activeDueDate 
              : ((t.due_date && t.due_date !== '—') 
                  ? t.due_date 
                  : ((t.dueDate && t.dueDate !== '—') 
                      ? t.dueDate 
                      : ((t['Completed'] && t['Completed'] !== '—') ? t['Completed'] : '—')));
            const effectivePriority = activePriority || t['Priority'] || t.priority || 'Medium';

            return {
              ...t,
              'Responsible': effectiveAssignee,
              assignee: effectiveAssignee,
              'Status': effectiveStatus,
              status: effectiveStatus,
              'Completed': effectiveDueDate,
              dueDate: effectiveDueDate,
              'Priority': effectivePriority,
              priority: effectivePriority
            };
          });

          setWorkspaceTasks(reconciled);
          try { window.localStorage.setItem(`pmpulse_workspaceTasks_${targetWsId}`, JSON.stringify(reconciled)); } catch (e) {}
        }
      })
      .catch(err => console.error("Error fetching tasks for employee:", err));
  }, [selectedWorkspace?.id]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    const dateObj = new Date();
    const todayDate = dateObj.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const newTask = {
      'Issue / Task / Enhancement': newTaskName.trim(),
      'Added ': todayDate,
      'Status': 'In Progress',
      'Priority': 'Medium',
      'Responsible': user?.full_name || 'Unassigned',
      'Completed': '—'
    };

    if (selectedWorkspace) {
      try {
        const token = localStorage.getItem('pulsepm_token');
        const res = await fetch(`/api/workspaces/${selectedWorkspace.id}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newTask)
        });
        const data = await res.json();
        if (data.task) {
          newTask.id = data.task.id;
        }
      } catch (err) {
        console.error('Failed to persist employee task to database:', err);
      }
    }

    // Update local state immediately for snappy UI reflection
    setWorkspaceTasks(prev => {
      // Ensure we don't duplicate if a cross-tab sync already caught it
      if (prev.some(t => t.id === newTask.id)) return prev;
      return [...prev, newTask]; 
    });
    setNewTaskName('');
    setIsAddTaskModalOpen(false);
  };

  useEffect(() => {
    if (!selectedWorkspace?.id) return;
    
    const token = localStorage.getItem('pulsepm_token');
    fetch(`/api/workspaces/${selectedWorkspace.id}/docs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data.docs)) setWorkspaceDocs(data.docs);
      })
      .catch(err => console.error("Error fetching docs for employee:", err));
  }, [selectedWorkspace?.id]);

  const [sprintConfig, setSprintConfig] = useState(() => {
    const wsId = selectedWorkspace?.id;
    try { return (wsId ? JSON.parse(window.localStorage.getItem(`pmpulse_sprintConfig_${wsId}`)) : null) || null; }
    catch { return null; }
  });
  const boardColumns = ['To Do', 'In Progress', 'In Review', 'Done', 'Remove'];
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragInfo, setDragInfo] = useState(null);
  const [isSprintSetupOpen, setIsSprintSetupOpen] = useState(false);
  const [isCreationSourceModalOpen, setIsCreationSourceModalOpen] = useState(false);
  const [isBacklogPickerOpen, setIsBacklogPickerOpen] = useState(false);
  const [targetBoardColumn, setTargetBoardColumn] = useState('To Do');
  const [pullOrigin, setPullOrigin] = useState(null);
  const fileInputRef = useRef(null);

  const routeTasksToView = (tasksToRoute, destination) => {
    const formattedTasks = tasksToRoute.map((t, index) => {
        return {
            id: t.id || (Date.now() + index),
            key: t.key || `VVM-${listTasks.length + boardTasks.length + boardBacklogTasks.length + index + 1}`,
            type: t.type || 'Task',
            description: t['Issue / Task / Enhancement'] || t.description || t.title || 'Untitled Task',
            status: destination === 'board' || destination === 'boardBacklog' ? 'To Do' : (t['Status'] || t.status || 'To Do'),
            assignee: t['Responsible'] || t.assignee || t['Added by'] || 'Unassigned',
            dueDate: t['Completed'] || t.dueDate || '',
            priority: t['Priority'] || t.priority || 'Medium'
        };
    });
    if (destination === 'list') {
      setListTasks(prev => {
        const updated = [...prev, ...formattedTasks];
        try {
          if (selectedWorkspace?.id) {
            window.localStorage.setItem(`pmpulse_listTasks_${selectedWorkspace.id}`, JSON.stringify(updated));
          }
        } catch (e) {}
        return updated;
      });
    }
    if (destination === 'board') {
      setBoardTasks(prev => {
        const updated = [...prev, ...formattedTasks];
        try {
          if (selectedWorkspace?.id) {
            window.localStorage.setItem(`pmpulse_boardTasks_${selectedWorkspace.id}`, JSON.stringify(updated));
          }
        } catch (e) {}
        return updated;
      });
    }
    if (destination === 'boardBacklog' || destination === 'backlog') {
      setBoardBacklogTasks(prev => {
        const updated = [...prev, ...formattedTasks];
        try {
          if (selectedWorkspace?.id) {
            window.localStorage.setItem(`pmpulse_boardBacklogTasks_${selectedWorkspace.id}`, JSON.stringify(updated));
          }
        } catch (e) {}
        return updated;
      });
    }

    setActionModalTasks(null);
    setSelectedTasks([]);
    setIsMultiSelectMode(false);
  };

  const handleInlineUpdate = (taskId, field, value) => {
    if (field === 'type' && value === '+ Type') {
      const newType = window.prompt('Enter new task type:');
      if (newType && newType.trim()) {
        const updatedTypes = Array.from(new Set([...taskTypes, newType.trim()]));
        setTaskTypes(updatedTypes);
        try { window.localStorage.setItem('pmpulse_taskTypes', JSON.stringify(updatedTypes)); } catch (e) {}
        value = newType.trim();
      } else return;
    }
    if (field === 'status' && value === '+ State') {
      const newState = window.prompt('Enter new status:');
      if (newState && newState.trim()) {
        const updatedStatuses = Array.from(new Set([...taskStatuses, newState.trim()]));
        setTaskStatuses(updatedStatuses);
        try { window.localStorage.setItem('pmpulse_taskStatuses', JSON.stringify(updatedStatuses)); } catch (e) {}
        value = newState.trim();
      } else return;
    }

    setListTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, [field]: value } : t);
      try {
        if (selectedWorkspace?.id) {
          window.localStorage.setItem(`pmpulse_listTasks_${selectedWorkspace.id}`, JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });
    
    setWorkspaceTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          const updatedTask = { ...t };
          if (field === 'description') updatedTask['Issue / Task / Enhancement'] = value;
          if (field === 'status') updatedTask['Status'] = value;
          if (field === 'assignee') updatedTask['Responsible'] = value;
          if (field === 'dueDate') updatedTask['Completed'] = value;
          if (field === 'priority') updatedTask['Priority'] = value;
          return updatedTask;
        }
        return t;
      });
      try {
        if (selectedWorkspace?.id) {
          window.localStorage.setItem(`pmpulse_workspaceTasks_${selectedWorkspace.id}`, JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });
  };

  const handleAddListTask = async (e) => {
    e.preventDefault();
    const newKey = `VVM-${workspaceTasks.length + 1}`;
    const newId = Date.now();
    const sprintTask = { ...listTaskForm, id: newId, key: newKey };
    
    const todayDate = new Date().toLocaleDateString('en-GB');
    const backlogTask = {
        'Issue / Task / Enhancement': listTaskForm.description,
        'Status': listTaskForm.status,
        'Responsible': listTaskForm.assignee,
        'Completed': listTaskForm.dueDate,
        'Priority': listTaskForm.priority,
        'Added ': todayDate, 
        'id': newId,
        'key': newKey
    };
    
    if (selectedWorkspace) {
      try {
        const token = localStorage.getItem('pulsepm_token');
        const res = await fetch(`/api/workspaces/${selectedWorkspace.id}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(backlogTask)
        });
        const data = await res.json();
        if (data && data.task && data.task.id) {
          sprintTask.id = data.task.id;
          backlogTask.id = data.task.id;
        }
      } catch (error) {
        console.error('Failed to persist task to database:', error);
      }
    }

    if (pullOrigin === 'boardBacklog' || pullOrigin === 'backlog') {
      setBoardBacklogTasks(prev => {
        const updated = [...prev, sprintTask];
        try {
          if (selectedWorkspace?.id) {
            window.localStorage.setItem(`pmpulse_boardBacklogTasks_${selectedWorkspace.id}`, JSON.stringify(updated));
          }
        } catch (e) {}
        return updated;
      });
    } else if (activeView === 'board' || pullOrigin === 'board') { 
      const boardItem = { ...sprintTask, status: targetBoardColumn || sprintTask.status || 'To Do' };
      setBoardTasks(prev => {
        const updated = [...prev, boardItem];
        try {
          if (selectedWorkspace?.id) {
            window.localStorage.setItem(`pmpulse_boardTasks_${selectedWorkspace.id}`, JSON.stringify(updated));
          }
        } catch (e) {}
        return updated;
      }); 
    } else { 
      setListTasks(prev => {
        const updated = [...prev, sprintTask];
        try {
          if (selectedWorkspace?.id) {
            window.localStorage.setItem(`pmpulse_listTasks_${selectedWorkspace.id}`, JSON.stringify(updated));
          }
        } catch (e) {}
        return updated;
      }); 
    }
    setWorkspaceTasks(prev => {
      const updated = [backlogTask, ...prev];
      try {
        if (selectedWorkspace?.id) {
          window.localStorage.setItem(`pmpulse_workspaceTasks_${selectedWorkspace.id}`, JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });

    setListTaskForm({ type: 'Task', description: '', status: 'To Do', assignee: '', dueDate: '', priority: 'Medium' }); 
    setIsCreateListTaskOpen(false);
  };

  const allBacklogTasks = useMemo(() => {
    const listItems = (sprintBacklogTasks || []).map(t => ({ ...t, backlogSource: 'list' }));
    const boardItems = (boardBacklogTasks || []).map(t => ({ ...t, backlogSource: 'board' }));
    const combined = [...listItems];
    boardItems.forEach(item => {
      if (!combined.some(c => String(c.id) === String(item.id) || (c.key && c.key === item.key))) {
        combined.push(item);
      }
    });
    return combined;
  }, [sprintBacklogTasks, boardBacklogTasks]);

  const autoCompleteSprintInternal = () => {
    const wsId = selectedWorkspace?.id;
    if (!wsId) return;

    let nextSprintBacklog = [...sprintBacklogTasks];
    if (listTasks.length > 0) {
      listTasks.forEach(task => {
        if (!nextSprintBacklog.some(t => String(t.id) === String(task.id) || (t.key && t.key === task.key))) {
          nextSprintBacklog.push({
            ...task,
            status: (task.status === 'Done' || task.status === 'Completed') ? 'Done' : 'To Do',
            sprintNumber: sprintConfig ? `${sprintConfig.start} — ${sprintConfig.end}` : (task.sprintNumber || 'Sprint 1')
          });
        }
      });
      setSprintBacklogTasks(nextSprintBacklog);
    }

    let nextBoardBacklog = [...boardBacklogTasks];
    if (boardTasks.length > 0) {
      boardTasks.forEach(task => {
        if (!nextBoardBacklog.some(t => String(t.id) === String(task.id) || (t.key && t.key === task.key))) {
          nextBoardBacklog.push({
            ...task,
            status: (task.status === 'Done' || task.status === 'Completed') ? 'Done' : 'To Do'
          });
        }
      });
      setBoardBacklogTasks(nextBoardBacklog);
    }

    setListTasks([]);
    setBoardTasks([]);

    const updatedConfig = sprintConfig ? { ...sprintConfig, isCompleted: true } : { isCompleted: true };
    setSprintConfig(updatedConfig);

    try {
      window.localStorage.setItem(`pmpulse_listTasks_${wsId}`, JSON.stringify([]));
      window.localStorage.setItem(`pmpulse_boardTasks_${wsId}`, JSON.stringify([]));
      window.localStorage.setItem(`pmpulse_sprintBacklogTasks_${wsId}`, JSON.stringify(nextSprintBacklog));
      window.localStorage.setItem(`pmpulse_boardBacklogTasks_${wsId}`, JSON.stringify(nextBoardBacklog));
      window.localStorage.setItem(`pmpulse_sprintConfig_${wsId}`, JSON.stringify(updatedConfig));
    } catch (e) {
      console.error("Failed to auto-complete expired sprint:", e);
    }
  };

  useEffect(() => {
    if (!selectedWorkspace?.id || !sprintConfig) return;
    if (isSprintExpired(sprintConfig) && !sprintConfig.isCompleted) {
      autoCompleteSprintInternal();
    }
    const interval = setInterval(() => {
      if (isSprintExpired(sprintConfig) && !sprintConfig.isCompleted) {
        autoCompleteSprintInternal();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedWorkspace?.id, sprintConfig]);

  const handleSetSprintDuration = (weeks) => {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (weeks * 7));

    const formatDate = (date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const config = {
      start: formatDate(startDate),
      end: formatDate(endDate),
      endTimestamp: endDate.getTime(),
      isCompleted: false
    };
    setSprintConfig(config);
    try {
      if (selectedWorkspace?.id) {
        window.localStorage.setItem(`pmpulse_sprintConfig_${selectedWorkspace.id}`, JSON.stringify(config));
      }
    } catch (e) {}
    setIsSprintSetupOpen(false);
    setIsCreationSourceModalOpen(true);
  };

  const handleInitiateTaskCreation = (origin = 'list', targetCol = 'To Do') => {
    setPullOrigin(origin);
    setTargetBoardColumn(targetCol);

    const expired = isSprintExpired(sprintConfig);
    if (!sprintConfig || sprintConfig.isCompleted || expired) {
      if (expired && sprintConfig && !sprintConfig.isCompleted) {
        autoCompleteSprintInternal();
      }
      setIsSprintSetupOpen(true);
    } else {
      setIsCreationSourceModalOpen(true);
    }
  };

  const handleAddBacklogTaskToActive = (task) => {
    const wsId = selectedWorkspace?.id;
    if (!wsId || !task) return;

    const isBoard = (pullOrigin === 'board' || activeView === 'board');

    if (isBoard) {
      let nextBoard = [...boardTasks];
      if (!nextBoard.some(t => String(t.id) === String(task.id) || (t.key && t.key === task.key))) {
        nextBoard.push({ ...task, status: targetBoardColumn || task.status || 'To Do' });
        setBoardTasks(nextBoard);
        try { window.localStorage.setItem(`pmpulse_boardTasks_${wsId}`, JSON.stringify(nextBoard)); } catch (e) {}
      }
      const nextBoardBacklog = boardBacklogTasks.filter(t => String(t.id) !== String(task.id) && (!task.key || t.key !== task.key));
      setBoardBacklogTasks(nextBoardBacklog);
      try { window.localStorage.setItem(`pmpulse_boardBacklogTasks_${wsId}`, JSON.stringify(nextBoardBacklog)); } catch (e) {}

      const nextSprintBacklog = sprintBacklogTasks.filter(t => String(t.id) !== String(task.id) && (!task.key || t.key !== task.key));
      setSprintBacklogTasks(nextSprintBacklog);
      try { window.localStorage.setItem(`pmpulse_sprintBacklogTasks_${wsId}`, JSON.stringify(nextSprintBacklog)); } catch (e) {}
    } else {
      let nextList = [...listTasks];
      if (!nextList.some(t => String(t.id) === String(task.id) || (t.key && t.key === task.key))) {
        nextList.push({ ...task });
        setListTasks(nextList);
        try { window.localStorage.setItem(`pmpulse_listTasks_${wsId}`, JSON.stringify(nextList)); } catch (e) {}
      }
      const nextSprintBacklog = sprintBacklogTasks.filter(t => String(t.id) !== String(task.id) && (!task.key || t.key !== task.key));
      setSprintBacklogTasks(nextSprintBacklog);
      try { window.localStorage.setItem(`pmpulse_sprintBacklogTasks_${wsId}`, JSON.stringify(nextSprintBacklog)); } catch (e) {}

      const nextBoardBacklog = boardBacklogTasks.filter(t => String(t.id) !== String(task.id) && (!task.key || t.key !== task.key));
      setBoardBacklogTasks(nextBoardBacklog);
      try { window.localStorage.setItem(`pmpulse_boardBacklogTasks_${wsId}`, JSON.stringify(nextBoardBacklog)); } catch (e) {}
    }
  };

  const handleDragStart = (e, id, sourceDroppableId = 'active') => {
    setDraggedTaskId(id);
    setDragInfo({ id, sourceDroppableId });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, destinationDroppableId, targetColumnName) => {
    e.preventDefault();
    const taskId = dragInfo?.id || draggedTaskId;
    if (!taskId) return;

    const sourceDroppableId = dragInfo?.sourceDroppableId || 'active';
    const isSourceBacklog = String(sourceDroppableId).includes('backlog-');
    const isDestBacklog = String(destinationDroppableId).includes('backlog-');

    const targetStatus = targetColumnName || (isDestBacklog 
      ? boardColumns.find(c => `backlog-${c.toLowerCase().replace(' ', '')}` === destinationDroppableId) || destinationDroppableId.replace('backlog-', '')
      : destinationDroppableId);

    if (!isSourceBacklog && !isDestBacklog) {
      setBoardTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: targetStatus } : task));
    } else if (isSourceBacklog && isDestBacklog) {
      setBoardBacklogTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: targetStatus } : task));
    } else if (!isSourceBacklog && isDestBacklog) {
      const taskToMove = boardTasks.find(t => t.id === taskId);
      if (taskToMove) {
        setBoardTasks(prev => prev.filter(t => t.id !== taskId));
        setBoardBacklogTasks(prev => [...prev, { ...taskToMove, status: targetStatus }]);
      }
    } else if (isSourceBacklog && !isDestBacklog) {
      const taskToMove = boardBacklogTasks.find(t => t.id === taskId);
      if (taskToMove) {
        setBoardBacklogTasks(prev => prev.filter(t => t.id !== taskId));
        setBoardTasks(prev => [...prev, { ...taskToMove, status: targetStatus }]);
      }
    }

    setDraggedTaskId(null);
    setDragInfo(null);
  };

  const handleDownloadDoc = (doc) => {
    if (!doc.dataUrl) return;
    const link = document.createElement('a');
    link.href = doc.dataUrl;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = (doc) => {
    if (!doc.dataUrl) return;
    try {
      const byteString = atob(doc.dataUrl.split(',')[1]);
      const mimeString = doc.dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Failed to open document:', err);
    }
  };



  const handleDeleteDoc = (e, id) => {
    e.stopPropagation();
    setWorkspaceDocs(prev => prev.filter(doc => String(doc.id) !== String(id)));
    if (selectedWorkspace?.id) {
      const token = localStorage.getItem('pulsepm_token');
      fetch(`/api/workspaces/${selectedWorkspace.id}/docs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => console.error('Failed to delete document from database:', err));
    }
  };

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

  // Dynamically compute assignees based on the active workspace data
  const dynamicAssignees = useMemo(() => {
    if (!selectedWorkspace && (!workspaceMembers || workspaceMembers.length === 0)) return ['Unassigned'];

    // 1. Identify the PM (Adjust the property names based on your actual database schema)
    const pmName = selectedWorkspace?.managerName || selectedWorkspace?.manager_name || selectedWorkspace?.owner || selectedWorkspace?.manager || 'Alex Mercer';
    const pmLabel = `${pmName} (PM)`;

    // 2. Map the active workforce directory
    const membersSource = [
      ...(selectedWorkspace?.members || []),
      ...(workspaceMembers || [])
    ];
    const teamMembers = membersSource
      ? membersSource.map(member => (typeof member === 'string' ? member : (member.name || member.full_name || member.username))).filter(Boolean)
      : []; // Fallback if members array isn't populated yet

    // 3. Combine into a single unique array, removing duplicates if the PM is also in the members array
    const uniqueTeam = Array.from(new Set(teamMembers)).filter(name => name !== pmName && name !== pmLabel);
    
    return ['Unassigned', pmLabel, ...uniqueTeam];
  }, [selectedWorkspace, workspaceMembers]);

  // ── Jira-Style Task Filtering States (per section) ────────────────────────
  const [activeListFilters, setActiveListFilters] = useState({
    priorities: [],
    dueDate: '',
    types: [],
    statuses: [],
    assignees: []
  });
  const [isActiveListFilterOpen, setIsActiveListFilterOpen] = useState(false);
  const activeListFilterBtnRef = useRef(null);

  const [backlogListFilters, setBacklogListFilters] = useState({
    priorities: [],
    dueDate: '',
    types: [],
    statuses: [],
    assignees: []
  });
  const [isBacklogListFilterOpen, setIsBacklogListFilterOpen] = useState(false);
  const backlogListFilterBtnRef = useRef(null);

  const [activeBoardFilters, setActiveBoardFilters] = useState({
    priorities: [],
    dueDate: '',
    types: [],
    statuses: [],
    assignees: []
  });
  const [isActiveBoardFilterOpen, setIsActiveBoardFilterOpen] = useState(false);
  const activeBoardFilterBtnRef = useRef(null);

  const [backlogBoardFilters, setBacklogBoardFilters] = useState({
    priorities: [],
    dueDate: '',
    types: [],
    statuses: [],
    assignees: []
  });
  const [isBacklogBoardFilterOpen, setIsBacklogBoardFilterOpen] = useState(false);
  const backlogBoardFilterBtnRef = useRef(null);

  const getActiveTaskFilterCount = (f) => {
    if (!f) return 0;
    let c = 0;
    if (f.priorities?.length > 0) c++;
    if (f.dueDate) c++;
    if (f.types?.length > 0) c++;
    if (f.statuses?.length > 0) c++;
    if (f.assignees?.length > 0) c++;
    return c;
  };

  const activeListFilterCount = useMemo(() => getActiveTaskFilterCount(activeListFilters), [activeListFilters]);
  const backlogListFilterCount = useMemo(() => getActiveTaskFilterCount(backlogListFilters), [backlogListFilters]);
  const activeBoardFilterCount = useMemo(() => getActiveTaskFilterCount(activeBoardFilters), [activeBoardFilters]);
  const backlogBoardFilterCount = useMemo(() => getActiveTaskFilterCount(backlogBoardFilters), [backlogBoardFilters]);

  const handleAddCustomType = (newType) => {
    if (!newType) return;
    setTaskTypes(prev => {
      if (prev.includes(newType)) return prev;
      const next = [...prev, newType];
      try { window.localStorage.setItem('pmpulse_taskTypes', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const handleAddCustomStatus = (newStatus) => {
    if (!newStatus) return;
    setTaskStatuses(prev => {
      if (prev.includes(newStatus)) return prev;
      const next = [...prev, newStatus];
      try { window.localStorage.setItem('pmpulse_taskStatuses', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const applyTaskFilter = (tasks, filter) => {
    if (!tasks || tasks.length === 0) return [];
    if (!filter) return tasks;

    const hasPriorities = filter.priorities && filter.priorities.length > 0;
    const hasDueDate = filter.dueDate && filter.dueDate.trim() !== '';
    const hasTypes = filter.types && filter.types.length > 0;
    const hasStatuses = filter.statuses && filter.statuses.length > 0;
    const hasAssignees = filter.assignees && filter.assignees.length > 0;

    if (!hasPriorities && !hasDueDate && !hasTypes && !hasStatuses && !hasAssignees) {
      return tasks;
    }

    return tasks.filter(task => {
      // 1. Priority
      if (hasPriorities) {
        const taskPriority = (task.priority || task.Priority || 'Medium').trim().toLowerCase();
        const match = filter.priorities.some(p => p.trim().toLowerCase() === taskPriority);
        if (!match) return false;
      }

      // 2. Due Date
      if (hasDueDate) {
        const rawDue = (task.dueDate || task.due_date || task.Completed || '').trim();
        if (!rawDue || rawDue === '—') return false;

        const target = filter.dueDate.trim(); // YYYY-MM-DD
        let normalized = rawDue;
        if (rawDue.includes('/')) {
          const parts = rawDue.split('/');
          if (parts.length === 3) {
            normalized = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
        if (normalized !== target) return false;
      }

      // 3. Type
      if (hasTypes) {
        const taskType = (task.type || task.Type || 'Task').trim().toLowerCase();
        const match = filter.types.some(t => t.trim().toLowerCase() === taskType);
        if (!match) return false;
      }

      // 4. Status
      if (hasStatuses) {
        const taskStatus = (task.status || task.Status || 'To Do').trim().toLowerCase();
        const match = filter.statuses.some(s => s.trim().toLowerCase() === taskStatus);
        if (!match) return false;
      }

      // 5. Assignee
      if (hasAssignees) {
        const rawAssignee = (task.assignee || task.Responsible || 'Unassigned').trim();
        const isUnassigned = !rawAssignee || rawAssignee.toLowerCase() === 'unassigned';

        const match = filter.assignees.some(sel => {
          if (sel === 'Unassigned') {
            return isUnassigned;
          }
          if (isUnassigned) return false;

          const cleanSel = sel.replace(/\s*\(pm\)$/i, '').trim().toLowerCase();
          const cleanTask = rawAssignee.replace(/\s*\(pm\)$/i, '').trim().toLowerCase();
          return cleanSel === cleanTask || rawAssignee.toLowerCase() === sel.toLowerCase();
        });
        if (!match) return false;
      }

      return true;
    });
  };

  const filteredListTasks = useMemo(() => applyTaskFilter(listTasks, activeListFilters), [listTasks, activeListFilters]);
  const filteredSprintBacklogTasks = useMemo(() => applyTaskFilter(sprintBacklogTasks, backlogListFilters), [sprintBacklogTasks, backlogListFilters]);
  const filteredBoardTasks = useMemo(() => applyTaskFilter(boardTasks, activeBoardFilters), [boardTasks, activeBoardFilters]);
  const filteredBoardBacklogTasks = useMemo(() => applyTaskFilter(boardBacklogTasks, backlogBoardFilters), [boardBacklogTasks, backlogBoardFilters]);

  const handleDocsUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        
        const newDoc = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          extension: ext,
          size: Number(sizeMB) > 1 ? `${sizeMB} MB` : `${(file.size / 1024).toFixed(0)} KB`,
          uploadDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          dataUrl: event.target.result // Base64 encoded string
        };
        
        setWorkspaceDocs(prev => [newDoc, ...prev]);

        // Persist to backend database
        if (selectedWorkspace?.id) {
          const token = localStorage.getItem('pulsepm_token');
          fetch(`/api/workspaces/${selectedWorkspace.id}/docs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newDoc)
          })
            .then(res => res.json())
            .then(data => {
              if (data?.doc?.id) {
                setWorkspaceDocs(prev => prev.map(d => d.id === newDoc.id ? { ...d, id: data.doc.id } : d));
              }
            })
            .catch(err => console.error('Failed to save document to database:', err));
        }
      };
      reader.readAsDataURL(file); // Trigger the read
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCompleteListSprint = () => {
    if (!window.confirm("Are you sure you want to complete this list sprint? Active list tasks will be moved to the backlog list.")) return;
    const wsId = selectedWorkspace?.id;
    if (!wsId) return;

    // Move all tasks from active listTasks to sprintBacklogTasks (List Backlog)
    let nextSprintBacklog = [...sprintBacklogTasks];
    if (listTasks.length > 0) {
      listTasks.forEach(task => {
        if (!nextSprintBacklog.some(t => String(t.id) === String(task.id) || (t.key && t.key === task.key))) {
          nextSprintBacklog.push({
            ...task,
            status: (task.status === 'Done' || task.status === 'Completed') ? 'Done' : 'To Do',
            sprintNumber: sprintConfig ? `${sprintConfig.start} — ${sprintConfig.end}` : (task.sprintNumber || 'Sprint 1')
          });
        }
      });
      setSprintBacklogTasks(nextSprintBacklog);
    }

    // Clear Active Sprint List table
    setListTasks([]);

    const updatedConfig = sprintConfig ? { ...sprintConfig, isCompleted: true } : { isCompleted: true };
    setSprintConfig(updatedConfig);

    // Persist only list-related collections to project-scoped localStorage
    try {
      window.localStorage.setItem(`pmpulse_listTasks_${wsId}`, JSON.stringify([]));
      window.localStorage.setItem(`pmpulse_sprintBacklogTasks_${wsId}`, JSON.stringify(nextSprintBacklog));
      window.localStorage.setItem(`pmpulse_sprintConfig_${wsId}`, JSON.stringify(updatedConfig));
    } catch (e) {
      console.error("Failed to persist completed list sprint", e);
    }
  };

  const handleCompleteSprint = () => {
    if (!window.confirm("Are you sure you want to complete this board sprint? Active board tasks will be moved to the backlog board.")) return;
    const wsId = selectedWorkspace?.id;
    if (!wsId) return;

    // Move all tasks from active boardTasks to boardBacklogTasks (Board Backlog)
    let nextBoardBacklog = [...boardBacklogTasks];
    if (boardTasks.length > 0) {
      boardTasks.forEach(task => {
        if (!nextBoardBacklog.some(t => String(t.id) === String(task.id) || (t.key && t.key === task.key))) {
          nextBoardBacklog.push({
            ...task,
            status: (task.status === 'Done' || task.status === 'Completed') ? 'Done' : 'To Do'
          });
        }
      });
      setBoardBacklogTasks(nextBoardBacklog);
    }

    // Clear Active Sprint Board
    setBoardTasks([]);

    const updatedConfig = sprintConfig ? { ...sprintConfig, isCompleted: true } : { isCompleted: true };
    setSprintConfig(updatedConfig);

    // Persist only board-related collections to project-scoped localStorage
    try {
      window.localStorage.setItem(`pmpulse_boardTasks_${wsId}`, JSON.stringify([]));
      window.localStorage.setItem(`pmpulse_boardBacklogTasks_${wsId}`, JSON.stringify(nextBoardBacklog));
      window.localStorage.setItem(`pmpulse_sprintConfig_${wsId}`, JSON.stringify(updatedConfig));
    } catch (e) {
      console.error("Failed to persist completed board sprint", e);
    }
  };

  const handleSaveDraftTask = () => {
    if (!draftTask.title.trim()) {
      setDraftTask({ columnId: null, boardType: null, title: '', assignee: 'Unassigned', dueDate: '' });
      return;
    }

    const newTask = {
      id: `KAN-${Date.now()}`,
      taskName: draftTask.title,
      description: draftTask.title,
      status: draftTask.columnId,
      assignee: draftTask.assignee,
      dueDate: draftTask.dueDate,
      priority: 'Medium',
      type: 'Task'
    };

    if (draftTask.boardType === 'active') {
      setBoardTasks(prev => [...prev, newTask]);
    } else {
      setBoardBacklogTasks(prev => [...prev, newTask]);
    }

    // Reset Draft
    setDraftTask({ columnId: null, boardType: null, title: '', assignee: 'Unassigned', dueDate: '' });
  };

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

      {/* Shared Project Header Shell */}
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500 mb-2">Spaces</p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-yellow-500">
              <Layout size={24} />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              {selectedWorkspace ? (selectedWorkspace.title || selectedWorkspace.name) : 'Vidyarthi_Vigyan_Manthan_2026-27'}
            </h1>
          </div>
          
          {/* Read-Only Member Action Buttons for UI Consistency */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-slate-700 opacity-70 cursor-not-allowed" disabled>
              <Users size={16} />
              + Members
            </button>
            <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-slate-700 opacity-70 cursor-not-allowed" disabled>
              <UserCheck size={16} />
              Check members
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Navigation Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-x-6 border-b border-slate-200 dark:border-slate-800 mb-6">
        {NAVIGATION_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeView === tab.id
                ? 'border-b-2 border-yellow-500 text-yellow-600 dark:text-yellow-500'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border-b-2 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* The 'List' Render Block */}
      {activeView === 'list' && (
        <>
          {/* Active Sprint Header (List View) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between px-5 py-3 mb-6 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-lg shadow-sm">
            <div>
              <h2 className="text-md font-semibold text-slate-900 dark:text-white">Active Sprint</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{sprintConfig ? `${sprintConfig.start} — ${sprintConfig.end}${sprintConfig.isCompleted ? ' (Completed)' : ''}` : '07 Sept 2026 — 14 Sept 2026'}</span>
            </div>
            
            <div className="mt-3 md:mt-0">
              <button 
                onClick={handleCompleteListSprint}
                className="text-sm bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium px-4 py-1.5 rounded-md shadow-sm transition-colors"
              >
                Complete Sprint
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col min-h-[400px]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Active tasks</h2>

              {/* Filter with Anchored Jira-style TaskFilterPanel */}
              <div className="relative">
                <button
                  ref={activeListFilterBtnRef}
                  type="button"
                  onClick={() => setIsActiveListFilterOpen(prev => !prev)}
                  className={`border rounded-md px-3.5 py-1.5 text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer select-none ${
                    isActiveListFilterOpen || activeListFilterCount > 0
                      ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-500 dark:border-blue-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                  title={isActiveListFilterOpen ? "Close filters" : "Open filter panel"}
                >
                  <ListFilter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>Filter</span>
                  {activeListFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center -mr-0.5">
                      {activeListFilterCount}
                    </span>
                  )}
                </button>

                <TaskFilterPanel
                  isOpen={isActiveListFilterOpen}
                  onClose={() => setIsActiveListFilterOpen(false)}
                  filters={activeListFilters}
                  onChange={setActiveListFilters}
                  buttonRef={activeListFilterBtnRef}
                  taskTypes={taskTypes}
                  taskStatuses={taskStatuses}
                  onAddType={handleAddCustomType}
                  onAddStatus={handleAddCustomStatus}
                  dynamicAssignees={dynamicAssignees}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Key</th>
                    <th className="px-4 py-3 font-medium">Task</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Assignee</th>
                    <th className="px-4 py-3 font-medium">Due Date</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredListTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        There are no active tasks in this sprint.
                      </td>
                    </tr>
                  ) : (
                    filteredListTasks.map((task) => (
                      <tr key={task.id || task.key} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${editingTaskId === task.id ? 'editing-active' : ''}`}>
                        
                        {/* Type: Dynamic Dropdown */}
                        <td className="px-2 py-2">
                          {editingTaskId === task.id ? (
                            <select 
                              value={task.type || 'Task'} 
                              onChange={(e) => handleInlineUpdate(task.id, 'type', e.target.value)}
                              className="bg-transparent border-none text-slate-700 dark:text-slate-300 font-medium text-sm py-1 px-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-2 focus:ring-yellow-500 cursor-pointer appearance-none outline-none"
                            >
                              {taskTypes.map(t => <option key={t} value={t} className="bg-white dark:bg-slate-800">{t}</option>)}
                              <option value="+ Type" className="bg-white dark:bg-slate-800 font-bold text-yellow-600">+ Add Type...</option>
                            </select>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300 font-medium text-sm py-1 px-2">{task.type || 'Task'}</span>
                          )}
                        </td>
                        
                        {/* Key (Read Only) */}
                        <td className="px-4 py-3 text-blue-600 dark:text-blue-400 text-sm">{task.key}</td>
                        
                        {/* Task / Description: Text Input */}
                        <td className="px-2 py-2 w-full max-w-md">
                          {editingTaskId === task.id ? (
                            <input 
                              type="text" 
                              value={task.description || task.task || ''} 
                              onChange={(e) => handleInlineUpdate(task.id, 'description', e.target.value)}
                              className="w-full bg-transparent border-none text-slate-700 dark:text-slate-300 text-sm py-1 px-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-yellow-500 outline-none truncate"
                            />
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300 text-sm py-1 px-2 truncate block max-w-md">{task.description || task.task || '—'}</span>
                          )}
                        </td>
                        
                        {/* Status: Dynamic Dropdown */}
                        <td className="px-2 py-2 whitespace-nowrap">
                          {editingTaskId === task.id ? (
                            <select 
                              value={task.status || 'To Do'} 
                              onChange={(e) => handleInlineUpdate(task.id, 'status', e.target.value)}
                              className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none text-xs py-1 px-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-2 focus:ring-yellow-500 cursor-pointer appearance-none outline-none font-medium"
                            >
                              {taskStatuses.map(s => <option key={s} value={s} className="bg-white dark:bg-slate-800">{s}</option>)}
                              <option value="+ State" className="bg-white dark:bg-slate-800 font-bold text-yellow-600">+ Add State...</option>
                            </select>
                          ) : (
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs font-medium">{task.status || 'To Do'}</span>
                          )}
                        </td>
                        
                        {/* Assignee: Directory Dropdown */}
                        <td className="px-2 py-2 whitespace-nowrap">
                          {editingTaskId === task.id ? (
                            <select 
                              value={task.assignee && dynamicAssignees.includes(task.assignee) ? task.assignee : (task.assignee ? (dynamicAssignees.find(a => a.startsWith(task.assignee)) || task.assignee) : 'Unassigned')} 
                              onChange={(e) => handleInlineUpdate(task.id, 'assignee', e.target.value)}
                              className="bg-transparent border-none text-slate-600 dark:text-slate-400 text-sm py-1 px-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-2 focus:ring-yellow-500 cursor-pointer appearance-none outline-none"
                            >
                              {dynamicAssignees.map((assigneeName, index) => (
                                <option key={index} value={assigneeName} className="bg-white dark:bg-slate-800">
                                  {assigneeName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400 text-sm py-1 px-2">{task.assignee || 'Unassigned'}</span>
                          )}
                        </td>
                        
                        {/* Due Date: Date Input */}
                        <td className="px-2 py-2 whitespace-nowrap">
                          {editingTaskId === task.id ? (
                            <input 
                              type="date" 
                              value={task.dueDate || ''} 
                              onChange={(e) => handleInlineUpdate(task.id, 'dueDate', e.target.value)}
                              className="bg-transparent border-none text-slate-600 dark:text-slate-400 text-sm py-1 px-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-2 focus:ring-yellow-500 cursor-pointer outline-none"
                            />
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400 text-sm py-1 px-2">{task.dueDate || '—'}</span>
                          )}
                        </td>
                        
                        {/* Priority: Static Dropdown */}
                        <td className="px-2 py-2 whitespace-nowrap">
                          {editingTaskId === task.id ? (
                            <select 
                              value={task.priority || 'Medium'} 
                              onChange={(e) => handleInlineUpdate(task.id, 'priority', e.target.value)}
                              className="bg-transparent border-none text-slate-600 dark:text-slate-400 text-sm py-1 px-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-2 focus:ring-yellow-500 cursor-pointer appearance-none outline-none"
                            >
                              <option value="Highest" className="bg-white dark:bg-slate-800">Highest</option>
                              <option value="High" className="bg-white dark:bg-slate-800">High</option>
                              <option value="Medium" className="bg-white dark:bg-slate-800">Medium</option>
                              <option value="Low" className="bg-white dark:bg-slate-800">Low</option>
                              <option value="Lowest" className="bg-white dark:bg-slate-800">Lowest</option>
                            </select>
                          ) : (
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs">{task.priority || 'Medium'}</span>
                          )}
                        </td>

                        {/* Actions: Three-dots Menu */}
                        <td className="px-4 py-3 text-right relative action-menu-container">
                          <button
                            onClick={(e) => handleToggleActionMenu(e, task.id)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          {activeDropdownId === task.id && (
                            <div className="absolute right-8 top-8 w-32 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 overflow-hidden text-left">
                              <button
                                onClick={(e) => handleEnableEdit(e, task.id)}
                                className="w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                              >
                                <Edit2 size={14} /> Edit
                              </button>
                              <button
                                onClick={(e) => handleDeleteTask(e, task.id)}
                                className="w-full px-4 py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                        
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center p-3 border-t border-slate-200 dark:border-slate-800 mt-auto">
              <button 
                onClick={() => handleInitiateTaskCreation('list', 'To Do')} 
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-md transition-colors"
              >
                <Plus size={16} /> Create
              </button>
            </div>
          </div>

          {/* Sprint Rollover Backlog Table */}
          <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col min-h-[300px]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Backlog tasks from previous sprints</h2>

              {/* Filter with Anchored Jira-style TaskFilterPanel */}
              <div className="relative">
                <button
                  ref={backlogListFilterBtnRef}
                  type="button"
                  onClick={() => setIsBacklogListFilterOpen(prev => !prev)}
                  className={`border rounded-md px-3.5 py-1.5 text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer select-none ${
                    isBacklogListFilterOpen || backlogListFilterCount > 0
                      ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-500 dark:border-blue-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                  title={isBacklogListFilterOpen ? "Close filters" : "Open filter panel"}
                >
                  <ListFilter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>Filter</span>
                  {backlogListFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center -mr-0.5">
                      {backlogListFilterCount}
                    </span>
                  )}
                </button>

                <TaskFilterPanel
                  isOpen={isBacklogListFilterOpen}
                  onClose={() => setIsBacklogListFilterOpen(false)}
                  filters={backlogListFilters}
                  onChange={setBacklogListFilters}
                  buttonRef={backlogListFilterBtnRef}
                  taskTypes={taskTypes}
                  taskStatuses={taskStatuses}
                  onAddType={handleAddCustomType}
                  onAddStatus={handleAddCustomStatus}
                  dynamicAssignees={dynamicAssignees}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50 uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Key</th>
                    <th className="px-4 py-3 font-medium">Task</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Assignee</th>
                    <th className="px-4 py-3 font-medium">Due Date</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Sprint Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredSprintBacklogTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        There are no incomplete tasks from previous sprints yet.
                      </td>
                    </tr>
                  ) : (
                    filteredSprintBacklogTasks.map((task, index) => (
                      <tr key={task.id || task.key || `backlog-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{task.type || 'Task'}</td>
                        <td className="px-4 py-3 text-blue-600 dark:text-blue-400">{task.key}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{task.description || task.task}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs">{task.status || 'To Do'}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{task.assignee || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{task.dueDate || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{task.priority || 'Medium'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 rounded text-xs font-medium">
                            {task.sprintNumber || 'Sprint 1'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Overall Tasks View */}
      {activeView === 'overall' && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Overall Project Tasks</h2>
            <button 
              onClick={() => setIsAddTaskModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-900 rounded-md transition-colors shadow-sm"
            >
              <Plus size={14} /> Add Task
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 uppercase border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Task Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assignee</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Added On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {workspaceTasks.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No overall tasks available for this workspace.</td></tr>
                ) : (
                  workspaceTasks.map((task, i) => {
                    const normalizeTitle = (str) => !str ? '' : str.trim().replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, ' ').toLowerCase();
                    const tTitle = normalizeTitle(task['Issue / Task / Enhancement'] || task.title || task.description || '');
                    
                    const activeMatch = [...(listTasks || []), ...(boardTasks || []), ...(boardBacklogTasks || [])].find(at => 
                      (at.id && String(at.id) === String(task.id)) ||
                      (at.key && task.key && at.key === task.key) ||
                      (tTitle && normalizeTitle(at.task || at.title || at.description || at.taskName || '') === tTitle)
                    );

                    const displayAssignee = (activeMatch?.assignee && activeMatch.assignee !== 'Unassigned')
                      ? activeMatch.assignee
                      : (activeMatch?.['Responsible'] && activeMatch['Responsible'] !== 'Unassigned')
                        ? activeMatch['Responsible']
                        : (task['Responsible'] || task.assignee || task['Added by'] || 'Unassigned');

                    const displayStatus = activeMatch?.status || activeMatch?.['Status'] || task['Status'] || (task.status === 'in_progress' ? 'In Progress' : (task.status || 'To Do'));
                    const displayDueDate = (activeMatch?.dueDate && activeMatch.dueDate !== '—')
                      ? activeMatch.dueDate
                      : (activeMatch?.['Completed'] && activeMatch['Completed'] !== '—')
                        ? activeMatch['Completed']
                        : ((task.due_date && task.due_date !== '—') 
                            ? task.due_date 
                            : ((task.dueDate && task.dueDate !== '—') 
                                ? task.dueDate 
                                : ((task['Completed'] && task['Completed'] !== '—') ? task['Completed'] : '—')));
                    const displayPriority = activeMatch?.priority || activeMatch?.['Priority'] || task['Priority'] || task.priority || 'Medium';

                    return (
                      <tr 
                        key={task.id || i} 
                        onClick={() => { if (isMultiSelectMode) { setSelectedTasks(prev => prev.some(t => t === task) ? prev.filter(t => t !== task) : [...prev, task]); } else { setActionModalTasks([task]); } }}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedTasks.some(t => t === task) ? 'bg-yellow-500/10' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">
                          {task['Issue / Task / Enhancement'] || task.title || task.task || 'Untitled Task'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs">
                            {displayStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {displayAssignee}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {displayDueDate}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs">
                            {displayPriority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {task['Added '] || (task.description && task.description !== (task['Issue / Task / Enhancement'] || task.title) ? task.description : '—')}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Inline task creation row */}
                {isAddTaskModalOpen && (
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700/50">
                    <td colSpan={6} className="px-4 py-3">
                      <form onSubmit={handleAddTask} className="flex items-center gap-3">
                        <input 
                          type="text" 
                          autoFocus
                          placeholder="Enter task name..."
                          value={newTaskName}
                          onChange={(e) => setNewTaskName(e.target.value)}
                          required
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-yellow-500"
                        />
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setIsAddTaskModalOpen(false)}
                            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="text-sm bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-medium px-4 py-1.5 rounded-md shadow-sm transition-colors"
                          >
                            Save Task
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}

                {/* '+ Create' button row */}
                {!isAddTaskModalOpen && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3">
                      <button 
                        onClick={() => setIsAddTaskModalOpen(true)}
                        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-md transition-colors"
                      >
                        <Plus size={16} /> Create
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {isMultiSelectMode && selectedTasks.length > 0 && (
            <div className="m-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedTasks.length} tasks selected</span>
              <div className="flex gap-2">
                <button onClick={() => { setIsMultiSelectMode(false); setSelectedTasks([]); setPullOrigin(null); }} className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md">Cancel</button>
                <button onClick={() => pullOrigin ? setIsPullConfirmModalOpen(true) : setActionModalTasks(selectedTasks)} className="px-3 py-1.5 text-sm font-medium text-slate-900 bg-yellow-500 hover:bg-yellow-600 rounded-md shadow-sm">Proceed</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* The 'Board' Render Block */}
      {activeView === 'board' && (
        <>
          {/* Active Sprint Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between px-5 py-3 mb-6 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-lg shadow-sm">
            <div>
              <h2 className="text-md font-semibold text-slate-900 dark:text-white">Active Sprint</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{sprintConfig ? `${sprintConfig.start} — ${sprintConfig.end}${sprintConfig.isCompleted ? ' (Completed)' : ''}` : '07 Sept 2026 — 14 Sept 2026'}</span>
            </div>
            
            <div className="mt-3 md:mt-0">
              <button 
                onClick={handleCompleteSprint}
                className="text-sm bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium px-4 py-1.5 rounded-md shadow-sm transition-colors"
              >
                Complete Sprint
              </button>
            </div>
          </div>

          {/* Filter just below the Active Sprint div in the board view */}
          <div className="flex items-center justify-start mb-4">
            <div className="relative">
              <button
                ref={activeBoardFilterBtnRef}
                type="button"
                onClick={() => setIsActiveBoardFilterOpen(prev => !prev)}
                className={`border rounded-md px-3.5 py-1.5 text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer select-none ${
                  isActiveBoardFilterOpen || activeBoardFilterCount > 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-500 dark:border-blue-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
                title={isActiveBoardFilterOpen ? "Close filters" : "Open filter panel"}
              >
                <ListFilter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Filter</span>
                {activeBoardFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center -mr-0.5">
                    {activeBoardFilterCount}
                  </span>
                )}
              </button>

              <TaskFilterPanel
                isOpen={isActiveBoardFilterOpen}
                onClose={() => setIsActiveBoardFilterOpen(false)}
                filters={activeBoardFilters}
                onChange={setActiveBoardFilters}
                buttonRef={activeBoardFilterBtnRef}
                taskTypes={taskTypes}
                taskStatuses={taskStatuses}
                onAddType={handleAddCustomType}
                onAddStatus={handleAddCustomStatus}
                dynamicAssignees={dynamicAssignees}
                align="left"
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 h-full min-h-[600px] items-start">
            {boardColumns.map(column => (
              <div key={column} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column, column)} className="min-w-[280px] w-[280px] bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 flex flex-col gap-3 border border-slate-200/60 dark:border-slate-700/30">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{column}</h3>
                  <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full">
                    {filteredBoardTasks.filter(t => t.status === column).length}
                  </span>
                </div>
                
                {filteredBoardTasks.filter(t => t.status === column).length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                    </div>
                    <p className="text-sm font-semibold mb-1 text-slate-700 dark:text-slate-200">No work items</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Create a work item to get started. Work will appear here.</p>
                  </div>
                ) : (
                  filteredBoardTasks.filter(t => t.status === column).map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id, column)}
                      className={`relative bg-white dark:bg-slate-900 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors ${editingTaskId === task.id ? 'editing-active' : ''}`}
                    >
                      {/* Three-dots Action Menu */}
                      <div className="absolute top-2 right-2 action-menu-container z-20">
                        <button
                          onClick={(e) => handleToggleActionMenu(e, task.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {activeDropdownId === task.id && (
                          <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-50 overflow-hidden text-left">
                            <button
                              onClick={(e) => handleOpenBoardEditModal(e, task)}
                              className="w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              onClick={(e) => handleDeleteTask(e, task.id)}
                              className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white mb-2 pr-6" onClick={() => setSelectedTaskModal(task)} style={{cursor:'pointer'}}>{task.taskName || task.description || task.title}</div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{task.key || task.id}</span>
                        {task.assignee && task.assignee !== 'Unassigned' && (
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{task.assignee}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {draftTask.columnId === column && draftTask.boardType === 'active' ? (
                  <div className="bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-lg p-3 mt-2 shadow-lg">
                    <textarea
                      autoFocus
                      placeholder="What needs to be done?"
                      className="w-full bg-transparent text-sm text-slate-900 dark:text-white resize-none outline-none mb-3"
                      rows={2}
                      value={draftTask.title}
                      onChange={(e) => setDraftTask({...draftTask, title: e.target.value})}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSaveDraftTask())}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="relative group flex items-center justify-center p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer" title={draftTask.dueDate || 'Set due date'}>
                          <Calendar size={14} className={draftTask.dueDate ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'} />
                          <input
                            type="date"
                            value={draftTask.dueDate}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => setDraftTask({...draftTask, dueDate: e.target.value})}
                          />
                        </div>
                        <div className="relative group flex items-center justify-center p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer" title={draftTask.assignee || 'Assign member'}>
                          <User size={14} className={draftTask.assignee !== 'Unassigned' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'} />
                          <select
                            value={draftTask.assignee}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            onChange={(e) => setDraftTask({...draftTask, assignee: e.target.value})}
                          >
                            <option value="Unassigned" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300">Unassigned</option>
                            {dynamicAssignees && dynamicAssignees.filter(a => a !== 'Unassigned').map((name, i) => (
                              <option key={i} value={name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button onClick={handleSaveDraftTask} className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                        <CornerDownLeft size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleInitiateTaskCreation('board', column)}
                    className="flex items-center gap-2 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200 p-2 rounded-md w-full mt-2 transition-colors text-sm font-medium"
                  >
                    <span>+</span> Create
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* --- START BACKLOG BOARD UI --- */}
          <div className="mt-12">
            {/* Backlog Header */}
            <div className="w-full max-w-full box-border flex flex-col md:flex-row md:items-center justify-between px-5 py-3 mb-4 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-lg shadow-sm">
              <div>
                <h2 className="text-md font-semibold text-slate-900 dark:text-white">Project Backlog</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">Staging area for upcoming sprints</span>
              </div>

              {/* Filter at opposite end of Project Backlog div */}
              <div className="relative">
                <button
                  ref={backlogBoardFilterBtnRef}
                  type="button"
                  onClick={() => setIsBacklogBoardFilterOpen(prev => !prev)}
                  className={`border rounded-md px-3.5 py-1.5 text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer select-none ${
                    isBacklogBoardFilterOpen || backlogBoardFilterCount > 0
                      ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-500 dark:border-blue-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                  title={isBacklogBoardFilterOpen ? "Close filters" : "Open filter panel"}
                >
                  <ListFilter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>Filter</span>
                  {backlogBoardFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center -mr-0.5">
                      {backlogBoardFilterCount}
                    </span>
                  )}
                </button>

                <TaskFilterPanel
                  isOpen={isBacklogBoardFilterOpen}
                  onClose={() => setIsBacklogBoardFilterOpen(false)}
                  filters={backlogBoardFilters}
                  onChange={setBacklogBoardFilters}
                  buttonRef={backlogBoardFilterBtnRef}
                  taskTypes={taskTypes}
                  taskStatuses={taskStatuses}
                  onAddType={handleAddCustomType}
                  onAddStatus={handleAddCustomStatus}
                  dynamicAssignees={dynamicAssignees}
                  align="left"
                />
              </div>
            </div>

            {/* Backlog Columns Container */}
            <div className="flex gap-4 overflow-x-auto pb-4 opacity-80 hover:opacity-100 transition-opacity">
              {boardColumns.map(column => {
                // CRITICAL: Prefix ID to prevent drag-and-drop collision
                const dropId = `backlog-${column.toLowerCase().replace(' ', '')}`;
                const columnTasks = filteredBoardBacklogTasks.filter(task => task.status === column);

                return (
                  <div 
                    key={dropId} 
                    id={dropId}
                    onDragOver={handleDragOver} 
                    onDrop={(e) => handleDrop(e, dropId, column)}
                    className="flex-shrink-0 w-80 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 flex flex-col gap-3 border border-slate-200/60 dark:border-slate-700/30"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{column}</h3>
                      <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full">
                        {columnTasks.length}
                      </span>
                    </div>
                    
                    {columnTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                        </div>
                        <p className="text-sm font-semibold mb-1 text-slate-700 dark:text-slate-200">No work items</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Create a work item to get started. Work will appear here.</p>
                      </div>
                    ) : (
                      columnTasks.map(task => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id, dropId)}
                          className={`relative bg-white dark:bg-slate-900 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors ${editingTaskId === task.id ? 'editing-active' : ''}`}
                        >
                          {/* Three-dots Action Menu */}
                          <div className="absolute top-2 right-2 action-menu-container z-20">
                            <button
                              onClick={(e) => handleToggleActionMenu(e, task.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded transition-colors"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                            {activeDropdownId === task.id && (
                              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-50 overflow-hidden text-left">
                                <button
                                  onClick={(e) => handleOpenBoardEditModal(e, task)}
                                  className="w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <Edit2 size={14} /> Edit
                                </button>
                                <button
                                  onClick={(e) => handleDeleteTask(e, task.id)}
                                  className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white mb-2 pr-6" onClick={() => setSelectedTaskModal(task)} style={{cursor:'pointer'}}>{task.taskName || task.description || task.title}</div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{task.key || task.id}</span>
                            {task.assignee && task.assignee !== 'Unassigned' && (
                              <span className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{task.assignee}</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {draftTask.columnId === column && draftTask.boardType === 'backlog' ? (
                      <div className="bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-lg p-3 mt-2 shadow-lg">
                        <textarea
                          autoFocus
                          placeholder="What needs to be done?"
                          className="w-full bg-transparent text-sm text-slate-900 dark:text-white resize-none outline-none mb-3"
                          rows={2}
                          value={draftTask.title}
                          onChange={(e) => setDraftTask({...draftTask, title: e.target.value})}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSaveDraftTask())}
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="relative group flex items-center justify-center p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer" title={draftTask.dueDate || 'Set due date'}>
                              <Calendar size={14} className={draftTask.dueDate ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'} />
                              <input
                                type="date"
                                value={draftTask.dueDate}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => setDraftTask({...draftTask, dueDate: e.target.value})}
                              />
                            </div>
                            <div className="relative group flex items-center justify-center p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer" title={draftTask.assignee || 'Assign member'}>
                              <User size={14} className={draftTask.assignee !== 'Unassigned' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'} />
                              <select
                                value={draftTask.assignee}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                onChange={(e) => setDraftTask({...draftTask, assignee: e.target.value})}
                              >
                                <option value="Unassigned" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300">Unassigned</option>
                                {dynamicAssignees && dynamicAssignees.filter(a => a !== 'Unassigned').map((name, i) => (
                                  <option key={i} value={name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <button onClick={handleSaveDraftTask} className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                            <CornerDownLeft size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDraftTask({ columnId: column, boardType: 'backlog', title: '', assignee: 'Unassigned', dueDate: '' })}
                        className="flex items-center gap-2 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200 p-2 rounded-md w-full mt-2 transition-colors text-sm font-medium"
                      >
                        <span>+</span> Create
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* --- END BACKLOG BOARD UI --- */}
          </div>
        </>
      )}

      {/* Docs View */}
      {activeView === 'docs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col min-h-[500px]">
          {/* Header & Actions */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 bg-slate-800/50">
            <h2 className="text-lg font-semibold text-white">Project Documentation</h2>
            
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              onChange={handleDocsUpload} 
              className="hidden" 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-900 bg-yellow-500 hover:bg-yellow-600 rounded-md shadow-sm transition-transform active:scale-95"
            >
              <UploadCloud size={16} /> {/* Or whichever upload icon you are using */}
              Import data
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6 flex-1">
            {workspaceDocs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                  <FileText size={24} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">No documents added yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Upload project plans, architecture diagrams, and resource files to keep your team aligned.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {workspaceDocs.map(doc => (
                  <div key={doc.id} onClick={() => handleOpenInNewTab(doc)} className="group flex flex-col p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors bg-slate-50 dark:bg-slate-800/50 cursor-pointer relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-md ${['pdf'].includes(doc.extension) ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : ['xls', 'xlsx', 'csv'].includes(doc.extension) ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                        <File size={20} />
                      </div>
                      <button 
                        onClick={(e) => handleDeleteDoc(e, doc.id)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Delete document"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate mb-1" title={doc.name}>
                      {doc.name}
                    </h4>
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{doc.size}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{doc.uploadDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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



      {isCreateListTaskOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl p-6 relative">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create List Task</h2>
            <form onSubmit={handleAddListTask}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={listTaskForm.type}
                    onChange={(e) => setListTaskForm({ ...listTaskForm, type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  >
                    <option value="Task">Task</option>
                    <option value="Bug">Bug</option>
                    <option value="Epic">Epic</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <input 
                    type="text"
                    value={listTaskForm.description}
                    onChange={(e) => setListTaskForm({ ...listTaskForm, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={listTaskForm.status}
                    onChange={(e) => setListTaskForm({ ...listTaskForm, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assignee
                  </label>
                  <input 
                    type="text"
                    placeholder="Unassigned"
                    value={listTaskForm.assignee}
                    onChange={(e) => setListTaskForm({ ...listTaskForm, assignee: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={listTaskForm.priority}
                    onChange={(e) => setListTaskForm({ ...listTaskForm, priority: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input 
                    type="date"
                    value={listTaskForm.dueDate}
                    onChange={(e) => setListTaskForm({ ...listTaskForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreateListTaskOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-md transition-colors"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSprintSetupOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 relative">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Set Sprint Duration</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Choose the duration for this sprint to get started.</p>
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((weeks) => (
                <button
                  key={weeks}
                  onClick={() => handleSetSprintDuration(weeks)}
                  className="w-full py-2.5 px-4 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {weeks} Week{weeks > 1 ? 's' : ''}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsSprintSetupOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {actionModalTasks && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setActionModalTasks(null)}
        >
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-scale-up">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Add {actionModalTasks.length} Task(s) To:
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Route selected task to an active workspace view
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActionModalTasks(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <button 
                onClick={() => routeTasksToView(actionModalTasks, 'list')} 
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 hover:bg-blue-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all group text-left shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <List className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Add in List view
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Organize tasks into active sprint list table
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => routeTasksToView(actionModalTasks, 'board')} 
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 hover:bg-indigo-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group text-left shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Add in Board view
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Position tasks onto Kanban sprint workflow columns
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => { 
                  setIsMultiSelectMode(true); 
                  setSelectedTasks(prev => [...new Set([...prev, ...actionModalTasks])]); 
                  setActionModalTasks(null); 
                }} 
                className="w-full flex items-center justify-between p-3 rounded-xl border border-dashed border-yellow-400/80 dark:border-yellow-500/50 bg-yellow-50/50 hover:bg-yellow-100/50 dark:bg-yellow-500/5 dark:hover:bg-yellow-500/10 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-yellow-800 dark:text-yellow-400">
                      Select more tasks
                    </div>
                    <div className="text-[11px] text-yellow-700/70 dark:text-yellow-500/70">
                      Enable multi-select mode to choose additional tasks
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-yellow-600 dark:text-yellow-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setActionModalTasks(null)} 
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreationSourceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Make current selection from..</h3>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setIsCreationSourceModalOpen(false);
                  setActiveView('overall');
                  setIsMultiSelectMode(true);
                }}
                className="w-full text-left px-4 py-2 rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 font-medium text-slate-900 dark:text-white"
              >
                Select from overall task list
              </button>
              <button
                onClick={() => {
                  setIsCreationSourceModalOpen(false);
                  setIsCreateListTaskOpen(true);
                }}
                className="w-full text-left px-4 py-2 rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 font-medium text-slate-900 dark:text-white"
              >
                Create new task
              </button>
              {allBacklogTasks.length > 0 && (
                <button
                  onClick={() => {
                    setIsCreationSourceModalOpen(false);
                    setIsBacklogPickerOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 font-medium flex items-center justify-between text-slate-900 dark:text-white"
                >
                  <span>Add from backlog tasks</span>
                  <span className="text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-semibold px-2 py-0.5 rounded-full">
                    {allBacklogTasks.length}
                  </span>
                </button>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setIsCreationSourceModalOpen(false);
                  setPullOrigin(null);
                }}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isBacklogPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add from Backlog Tasks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any task to add it into the active {(pullOrigin === 'board' || activeView === 'board') ? 'board' : 'list'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsBacklogPickerOpen(false);
                  setPullOrigin(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {allBacklogTasks.length === 0 ? (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm">
                  No backlog tasks available for this project.
                </div>
              ) : (
                allBacklogTasks.map((task) => (
                  <div
                    key={task.id || task.key}
                    onClick={() => handleAddBacklogTaskToActive(task)}
                    className="pt-2 pb-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {task.key || task.id}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {task.type || 'Task'}
                        </span>
                        {task.priority && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {task.priority}
                          </span>
                        )}
                        {task.sprintNumber && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                            {task.sprintNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {task.description || task.task || task.taskName || task.title || 'Untitled Task'}
                      </p>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Assignee: {task.assignee || 'Unassigned'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddBacklogTaskToActive(task);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 group-hover:bg-yellow-500 group-hover:text-slate-900 transition-colors shrink-0"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setIsBacklogPickerOpen(false);
                  setPullOrigin(null);
                }}
                className="px-4 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {isPullConfirmModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Proceed with the current selection?</h3>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsPullConfirmModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">Cancel</button>
              <button onClick={() => { routeTasksToView(selectedTasks, pullOrigin); setActiveView(pullOrigin === 'boardBacklog' ? 'board' : pullOrigin); setPullOrigin(null); setIsPullConfirmModalOpen(false); }} className="px-4 py-2 text-sm font-medium text-slate-900 bg-yellow-500 hover:bg-yellow-600 rounded-md shadow-sm transition-colors">Proceed</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal Overlay */}
      {selectedTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTaskModal(null); }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{selectedTaskModal.id}</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedTaskModal.status}</span>
              </div>
              <button
                onClick={() => setSelectedTaskModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {selectedTaskModal.taskName || selectedTaskModal.title || selectedTaskModal.description || 'Untitled Task'}
              </h2>

              <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-800/50">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Assignee</label>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-300 font-medium">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400">
                      <User size={12} />
                    </div>
                    {selectedTaskModal.assignee || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label>
                  <div className="text-slate-800 dark:text-slate-300 font-medium">{selectedTaskModal.dueDate || 'No date set'}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
                  <div className="text-slate-800 dark:text-slate-300 font-medium">{selectedTaskModal.priority || 'Medium'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Kanban Task Edit Modal */}
      {boardEditTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Edit Task: {boardEditTask.key || boardEditTask.id}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Task Title</label>
                  <input
                    type="text"
                    value={boardEditTask.task || boardEditTask.title || ''}
                    onChange={(e) => setBoardEditTask({...boardEditTask, task: e.target.value, title: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                    <select
                      value={boardEditTask.status || 'To Do'}
                      onChange={(e) => setBoardEditTask({...boardEditTask, status: e.target.value})}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="In Review">In Review</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Priority</label>
                    <select
                      value={boardEditTask.priority || 'Medium'}
                      onChange={(e) => setBoardEditTask({...boardEditTask, priority: e.target.value})}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Highest">Highest</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Assignee</label>
                    <input
                      type="text"
                      value={boardEditTask.assignee || ''}
                      onChange={(e) => setBoardEditTask({...boardEditTask, assignee: e.target.value})}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Unassigned"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={boardEditTask.dueDate || ''}
                      onChange={(e) => setBoardEditTask({...boardEditTask, dueDate: e.target.value})}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setBoardEditTask(null)}
                className="px-4 py-2 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBoardEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role-Scoped Conversational AI Copilot */}
      <AICopilotPanel
        role="employee"
        title="Employee AI Copilot"
        subtitle="Personal Deliverables & Daily Logs"
        endpoint="/copilot/employee"
        userName={user?.full_name || user?.fullName || user?.name || 'Contributor'}
        suggestedInquiries={[
          "What tasks are assigned to me that are due this week?",
          "Summarize my submitted daily logs from the last 7 days.",
          "Are there any blockers mentioned in my recent work logs?",
          "What is my task completion rate across my assigned projects?"
        ]}
      />
    </div>
  );
}
