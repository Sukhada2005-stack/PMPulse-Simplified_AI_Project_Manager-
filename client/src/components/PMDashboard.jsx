import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Layout, Upload, Loader2, Inbox, Trash2, Plus, Users, X, FileText, UploadCloud, File, UserCheck, DownloadCloud, Home, Folder, Target, AlertTriangle, SearchCheck, Bug, Clock, LayoutList, ChevronDown, Calendar, User, CornerDownLeft, MoreHorizontal, Edit2 } from 'lucide-react';
const getSafeStorage = (key, fallback) => {
    if (typeof window === 'undefined') return fallback;
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        return fallback;
    }
};

export default function PMDashboard({ onNavigateTab, onSelectEmployee360, selectedWorkspace }) {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      // Parse the stored user object from login
      const storedUser = localStorage.getItem('pulsepm_user'); 
      const parsed = storedUser ? JSON.parse(storedUser) : (user || null);
      if (parsed) {
        return {
          ...parsed,
          fullName: parsed.fullName || parsed.full_name || parsed.name,
          name: parsed.name || parsed.full_name || parsed.fullName
        };
      }
      return null;
    } catch (error) {
      console.error("Failed to parse user session", error);
      return user ? { ...user, fullName: user.fullName || user.full_name, name: user.name || user.full_name } : null;
    }
  });

  useEffect(() => {
    if (user && !currentUser) {
      setCurrentUser({
        ...user,
        fullName: user.fullName || user.full_name || user.name,
        name: user.name || user.full_name || user.fullName
      });
    }
  }, [user, currentUser]);

  const [sidebarView, setSidebarView] = useState('overview');
  const [overviewFilter, setOverviewFilter] = useState('all'); // 'all' or specific projectId
  const [workspaces, setWorkspaces] = useState([]);
  const [allWorkspacesTasks, setAllWorkspacesTasks] = useState([]);
  const [allWorkspacesDocs, setAllWorkspacesDocs] = useState([]);

  const fetchAllWorkspacesData = async () => {
    try {
      const res = await api.projects.getAll();
      const projectList = res.projects || [];
      setWorkspaces(projectList);

      const tasksRes = await api.projects.getAllTasks();
      if (tasksRes?.tasks) {
        setAllWorkspacesTasks(tasksRes.tasks);
      }

      const token = localStorage.getItem('pulsepm_token');
      const docPromises = projectList.map(p => 
        fetch(`/api/workspaces/${p.id}/docs`, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => (data.docs || []).map(d => ({ ...d, workspace_id: p.id, project_id: p.id, workspaceId: p.id, projectId: p.id })))
          .catch(() => [])
      );
      const docsArrays = await Promise.all(docPromises);
      setAllWorkspacesDocs(docsArrays.flat());
    } catch (err) {
      console.error('Failed to load global workspaces data:', err);
    }
  };

  useEffect(() => {
    fetchAllWorkspacesData();

    const handleSyncGlobal = () => {
      fetchAllWorkspacesData();
    };

    window.addEventListener('pmpulse_workspaceTasks_updated', handleSyncGlobal);
    window.addEventListener('pmpulse_listTasks_updated', handleSyncGlobal);
    window.addEventListener('pmpulse_boardTasks_updated', handleSyncGlobal);
    window.addEventListener('pmpulse_boardBacklogTasks_updated', handleSyncGlobal);

    return () => {
      window.removeEventListener('pmpulse_workspaceTasks_updated', handleSyncGlobal);
      window.removeEventListener('pmpulse_listTasks_updated', handleSyncGlobal);
      window.removeEventListener('pmpulse_boardTasks_updated', handleSyncGlobal);
      window.removeEventListener('pmpulse_boardBacklogTasks_updated', handleSyncGlobal);
    };
  }, [user?.id, overviewFilter]);
  const [activeView, setActiveView] = useState('overall');
  const [workspaceTasks, setWorkspaceTasks] = useState(() => getSafeStorage('pmpulse_workspaceTasks', []));
  const [isUploading, setIsUploading] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [listTasks, setListTasks] = useState(() => getSafeStorage('pmpulse_listTasks', []));
  const [isCreateListTaskOpen, setIsCreateListTaskOpen] = useState(false);
  const [listTaskForm, setListTaskForm] = useState({
    type: 'Task',
    description: '',
    status: 'To Do',
    assignee: '',
    dueDate: '',
    priority: 'Medium'
  });
  const [boardTasks, setBoardTasks] = useState(() => getSafeStorage('pmpulse_boardTasks', []));
  const [boardBacklogTasks, setBoardBacklogTasks] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('pmpulse_boardBacklogTasks')) || []; } 
    catch { return []; }
  });
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragInfo, setDragInfo] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [actionModalTasks, setActionModalTasks] = useState(null);
  const [pullOrigin, setPullOrigin] = useState(null);
  const [isCreationSourceModalOpen, setIsCreationSourceModalOpen] = useState(false);
  const [isPullConfirmModalOpen, setIsPullConfirmModalOpen] = useState(false);
  const [sprintConfig, setSprintConfig] = useState(() => getSafeStorage('pmpulse_sprintConfig', null));
  const [isSprintSetupOpen, setIsSprintSetupOpen] = useState(false);
  const boardColumns = ['To Do', 'In Progress', 'In Review', 'Done', 'Remove'];
  const fileInputRef = useRef(null);
  const [sprintBacklogTasks, setSprintBacklogTasks] = useState(() => getSafeStorage('pmpulse_sprintBacklogTasks', []));
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [memberTab, setMemberTab] = useState('directory'); // 'directory' or 'email'
  const [emailInput, setEmailInput] = useState('');
  const [workspaceMembers, setWorkspaceMembers] = useState(() => getSafeStorage('pmpulse_workspaceMembers', []));
  const [workspaceDocs, setWorkspaceDocs] = useState(() => getSafeStorage('pmpulse_workspaceDocs', []));
  const [taskTypes, setTaskTypes] = useState(() => getSafeStorage('pmpulse_taskTypes', ['Task', 'Bug', 'Epic']));
  const [taskStatuses, setTaskStatuses] = useState(() => getSafeStorage('pmpulse_taskStatuses', ['To Do', 'In Progress', 'In Review', 'Done']));

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
      localStorage.setItem('pmpulse_workspaceDocs', JSON.stringify(workspaceDocs));
    } catch (e) {
      console.error("Failed to stringify docs", e);
    }
  }, [workspaceDocs]);

  // Cross-tab synchronization for live UI updates
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pmpulse_workspaceTasks' && e.newValue) {
        try { setWorkspaceTasks(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      }
      // Add Document Sync Listener
      if (e.key === 'pmpulse_workspaceDocs' && e.newValue) {
        try { setWorkspaceDocs(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      }
      if (e.key === 'pmpulse_boardBacklogTasks' && e.newValue) {
        try { setBoardBacklogTasks(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      }
      if (e.key === 'pmpulse_listTasks' && e.newValue) {
        try { setListTasks(JSON.parse(e.newValue)); } catch (err) { console.error(err); }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => { try { window.localStorage.setItem('pmpulse_taskTypes', JSON.stringify(taskTypes)); } catch (e) {} }, [taskTypes]);
  useEffect(() => { try { window.localStorage.setItem('pmpulse_taskStatuses', JSON.stringify(taskStatuses)); } catch (e) {} }, [taskStatuses]);
  useEffect(() => { try { window.localStorage.setItem('pmpulse_boardTasks', JSON.stringify(boardTasks)); } catch (e) {} }, [boardTasks]);
  useEffect(() => { try { window.localStorage.setItem('pmpulse_boardBacklogTasks', JSON.stringify(boardBacklogTasks)); } catch (e) {} }, [boardBacklogTasks]);

  const handleInlineUpdate = (taskId, field, value) => {
    // Handle custom additions
    if (field === 'type' && value === '+ Type') {
      const newType = window.prompt('Enter new task type:');
      if (newType && newType.trim()) {
        setTaskTypes(prev => Array.from(new Set([...prev, newType.trim()])));
        value = newType.trim();
      } else return;
    }
    if (field === 'status' && value === '+ State') {
      const newState = window.prompt('Enter new status:');
      if (newState && newState.trim()) {
        setTaskStatuses(prev => Array.from(new Set([...prev, newState.trim()])));
        value = newState.trim();
      } else return;
    }

    // Sync Sprint List
    setListTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
    
    // Sync Master Backlog Data Mapping
    setWorkspaceTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updatedTask = { ...t, [field]: value };
        if (field === 'description') updatedTask['Issue / Task / Enhancement'] = value;
        if (field === 'status') updatedTask['Status'] = value;
        if (field === 'assignee') updatedTask['Responsible'] = value;
        if (field === 'dueDate') updatedTask['Completed'] = value;
        if (field === 'priority') updatedTask['Priority'] = value;
        return updatedTask;
      }
      return t;
    }));
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

  const handleDocsUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        
        const newDoc = {
          id: Date.now() + Math.random(),
          name: file.name,
          extension: ext,
          size: sizeMB > 1 ? `${sizeMB} MB` : `${(file.size / 1024).toFixed(0)} KB`,
          uploadDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          dataUrl: event.target.result // Base64 encoded string
        };
        
        setWorkspaceDocs(prev => [newDoc, ...prev]);

        // Persist to backend database
        if (selectedWorkspace) {
          const token = localStorage.getItem('pulsepm_token');
          fetch(`/api/workspaces/${selectedWorkspace.id}/docs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newDoc)
          }).catch(err => console.error('Failed to save document to database:', err));
        }
      };
      reader.readAsDataURL(file); // Trigger the read
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteDoc = (e, id) => {
    e.stopPropagation();
    setWorkspaceDocs(prev => prev.filter(doc => doc.id !== id));
  };

  const [workspaceDirectory, setWorkspaceDirectory] = useState([]);
  const [selectedDirectoryUsers, setSelectedDirectoryUsers] = useState([]);
  const [isCheckMembersModalOpen, setIsCheckMembersModalOpen] = useState(false);
  const [isRemoveMemberMode, setIsRemoveMemberMode] = useState(false);
  const [membersToRemove, setMembersToRemove] = useState([]);

  const handleRemoveSelectedMembers = () => {
    setWorkspaceMembers(prev => prev.filter(m => !membersToRemove.includes(m.id || m.email)));
    setIsRemoveMemberMode(false);
    setMembersToRemove([]);
  };

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        const res = await api.employees.getAll();
        setWorkspaceDirectory(res.employees || []);
      } catch (err) {
        console.error('Failed to fetch workforce directory:', err);
      }
    };
    fetchDirectory();
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('pmpulse_workspaceMembers', JSON.stringify(workspaceMembers)); } 
    catch (e) { console.error(e); }
  }, [workspaceMembers]);

  const handleAddMembers = (e) => {
    e.preventDefault();
    let newMembers = [];

    if (memberTab === 'email' && emailInput.trim()) {
      const newEmails = emailInput.split(',').map(email => email.trim()).filter(Boolean);
      newMembers = newEmails.map(email => ({ 
        id: Date.now() + Math.random(), 
        name: email.split('@')[0], 
        email, 
        role: 'External' 
      }));
    } else if (memberTab === 'directory' && selectedDirectoryUsers.length > 0) {
      newMembers = selectedDirectoryUsers.map(user => ({ 
        ...user, 
        name: user.full_name || user.name,
        id: Date.now() + Math.random(), 
        role: 'Internal' 
      }));
    }

    if (newMembers.length > 0) {
      setWorkspaceMembers(prev => {
        const combined = [...prev, ...newMembers];
        // Deduplicate based on exact email match
        return Array.from(new Map(combined.map(item => [item.email, item])).values());
      });
    }

    setEmailInput('');
    setSelectedDirectoryUsers([]);
    setIsAddMembersModalOpen(false);
  };

  useEffect(() => { 
    try { 
      localStorage.setItem('pmpulse_workspaceTasks', JSON.stringify(workspaceTasks)); 
      window.dispatchEvent(new CustomEvent('pmpulse_workspaceTasks_updated', { detail: workspaceTasks }));
    } catch (e) {} 
  }, [workspaceTasks]);

  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = JSON.parse(window.localStorage.getItem('pmpulse_workspaceTasks'));
        if (stored) setWorkspaceTasks(stored);
        const storedList = JSON.parse(window.localStorage.getItem('pmpulse_listTasks'));
        if (storedList) setListTasks(storedList);
        const storedBoard = JSON.parse(window.localStorage.getItem('pmpulse_boardTasks'));
        if (storedBoard) setBoardTasks(storedBoard);
        const storedBoardBacklog = JSON.parse(window.localStorage.getItem('pmpulse_boardBacklogTasks'));
        if (storedBoardBacklog) setBoardBacklogTasks(storedBoardBacklog);
        const storedSprint = JSON.parse(window.localStorage.getItem('pmpulse_sprintConfig'));
        if (storedSprint) setSprintConfig(storedSprint);
        const storedBacklog = JSON.parse(window.localStorage.getItem('pmpulse_sprintBacklogTasks'));
        if (storedBacklog) setSprintBacklogTasks(storedBacklog);
      } catch (err) {}
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('pmpulse_workspaceTasks_updated', handleSync);
    window.addEventListener('pmpulse_listTasks_updated', handleSync);
    window.addEventListener('pmpulse_boardTasks_updated', handleSync);
    window.addEventListener('pmpulse_boardBacklogTasks_updated', handleSync);
    window.addEventListener('pmpulse_sprintConfig_updated', handleSync);
    window.addEventListener('pmpulse_sprintBacklogTasks_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('pmpulse_workspaceTasks_updated', handleSync);
      window.removeEventListener('pmpulse_listTasks_updated', handleSync);
      window.removeEventListener('pmpulse_boardTasks_updated', handleSync);
      window.removeEventListener('pmpulse_boardBacklogTasks_updated', handleSync);
      window.removeEventListener('pmpulse_sprintConfig_updated', handleSync);
      window.removeEventListener('pmpulse_sprintBacklogTasks_updated', handleSync);
    };
  }, []);

  useEffect(() => { 
    try { 
      localStorage.setItem('pmpulse_listTasks', JSON.stringify(listTasks)); 
      window.dispatchEvent(new CustomEvent('pmpulse_listTasks_updated', { detail: listTasks }));
    } catch (e) {} 
  }, [listTasks]);
  useEffect(() => { 
    try { 
      localStorage.setItem('pmpulse_boardTasks', JSON.stringify(boardTasks)); 
      window.dispatchEvent(new CustomEvent('pmpulse_boardTasks_updated', { detail: boardTasks }));
    } catch (e) {} 
  }, [boardTasks]);
  useEffect(() => {
    try {
      localStorage.setItem('pmpulse_boardBacklogTasks', JSON.stringify(boardBacklogTasks));
      window.dispatchEvent(new CustomEvent('pmpulse_boardBacklogTasks_updated', { detail: boardBacklogTasks }));
    } catch (e) {}
  }, [boardBacklogTasks]);
  useEffect(() => { 
    try { 
      localStorage.setItem('pmpulse_sprintConfig', JSON.stringify(sprintConfig)); 
      window.dispatchEvent(new CustomEvent('pmpulse_sprintConfig_updated', { detail: sprintConfig }));
    } catch (e) {} 
  }, [sprintConfig]);
  useEffect(() => {
    try {
      window.localStorage.setItem('pmpulse_sprintBacklogTasks', JSON.stringify(sprintBacklogTasks));
      window.dispatchEvent(new CustomEvent('pmpulse_sprintBacklogTasks_updated', { detail: sprintBacklogTasks }));
    } catch (e) {
      console.error('Failed to save sprintBacklogTasks to storage', e);
    }
  }, [sprintBacklogTasks]);

  useEffect(() => {
    // Guard clause: Do not wipe state on initial mount when workspace is loading
    if (!selectedWorkspace) return; 

    const token = localStorage.getItem('pulsepm_token');
    fetch(`/api/workspaces/${selectedWorkspace.id}/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.tasks) {
          setWorkspaceTasks(prev => {
            const localAddedTasks = prev.filter(task => task.id && !data.tasks.some(dt => dt.id === task.id));
            return [...localAddedTasks, ...data.tasks];
          });
        }
      })
      .catch(err => console.error("Error fetching tasks:", err));

    // Fetch Documents
    fetch(`/api/workspaces/${selectedWorkspace.id}/docs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.docs) setWorkspaceDocs(data.docs);
      })
      .catch(err => console.error("Error fetching docs:", err));
  }, [selectedWorkspace]);

  const handleSetSprintDuration = (weeks) => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + (weeks * 7));

    const formatDate = (date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    setSprintConfig({ start: formatDate(startDate), end: formatDate(endDate) });
    setIsSprintSetupOpen(false);
    setIsCreationSourceModalOpen(true);
  };

  const routeTasksToView = (tasksToRoute, destination) => {
    const formattedTasks = tasksToRoute.map((t, index) => {
        return {
            id: Date.now() + index, // Required for Kanban drag-and-drop
            key: `VVM-${listTasks.length + boardTasks.length + boardBacklogTasks.length + index + 1}`, // Auto-generate issue key
            type: 'Task',
            description: t['Issue / Task / Enhancement'] || 'Untitled Task',
            status: destination === 'board' || destination === 'boardBacklog' ? 'To Do' : (t['Status'] || 'To Do'),
            assignee: t['Responsible'] || t['Added by'] || 'Unassigned',
            dueDate: t['Completed'] || '',
            priority: t['Priority'] || 'Medium'
        };
    });
    if (destination === 'list') setListTasks(prev => [...prev, ...formattedTasks]);
    if (destination === 'board') setBoardTasks(prev => [...prev, ...formattedTasks]);
    if (destination === 'boardBacklog' || destination === 'backlog') setBoardBacklogTasks(prev => [...prev, ...formattedTasks]);

    // Cleanup state
    setActionModalTasks(null);
    setSelectedTasks([]);
    setIsMultiSelectMode(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Prevent any other file types from processing
    if (!file.name.endsWith('.xlsx') && file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      alert("Please upload a valid .xlsx file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    try {
      const token = localStorage.getItem('pulsepm_token');
      // Secure POST request to backend API
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/tasks/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      
      if (response.ok && data.tasks) {
        setWorkspaceTasks(data.tasks);
      } else {
        alert(data.error || "Failed to import tasks.");
      }
    } catch (err) {
      console.error("Upload error", err);
      alert("An error occurred during upload. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset input to allow re-uploading the same file if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveData = async () => {
    try {
      const token = localStorage.getItem('pulsepm_token');
      const response = await fetch(`/api/workspaces/${selectedWorkspace.id}/tasks`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setWorkspaceTasks([]);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to remove data.");
      }
    } catch (err) {
      console.error("Remove data error", err);
      alert("An error occurred while removing data.");
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    const dateObj = new Date();
    const todayDate = dateObj.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const newTask = {
      'Issue / Task / Enhancement': newTaskName,
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
        console.error('Failed to persist task to database:', err);
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
    
    // --- INJECT NEW BACKEND PERSISTENCE ---
    if (selectedWorkspace) {
      try {
        const token = localStorage.getItem('pulsepm_token');
        // Await the POST request to ensure the database receives the new task
        await fetch(`/api/workspaces/${selectedWorkspace.id}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(backlogTask)
        });
      } catch (error) {
        console.error('Failed to persist task to database:', error);
      }
    }
    // --------------------------------------

    // (Keep your existing state updates below this line exactly as they are)
    if (pullOrigin === 'boardBacklog' || pullOrigin === 'backlog') {
      setBoardBacklogTasks(prev => [...prev, sprintTask]);
    } else if (activeView === 'board' || pullOrigin === 'board') { 
      setBoardTasks(prev => [...prev, sprintTask]); 
    } else { 
      setListTasks(prev => [...prev, sprintTask]); 
    }
    setWorkspaceTasks(prev => [backlogTask, ...prev]);

    setListTaskForm({ type: 'Task', description: '', status: 'To Do', assignee: '', dueDate: '', priority: 'Medium' }); setIsCreateListTaskOpen(false);
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

  const handleCompleteSprint = () => {
    if (!window.confirm("Are you sure you want to complete this sprint? Incomplete tasks will be moved to the backlog.")) return;

    // 1. Identify tasks that are NOT completed
    const incompleteTasks = boardTasks.filter(task => 
      task.status !== 'Done' && task.status !== 'Remove'
    );

    // 2. Automatically roll incomplete tasks into the Backlog
    if (incompleteTasks.length > 0) {
      setBoardBacklogTasks(prev => {
        const updatedBacklog = [...prev];
        incompleteTasks.forEach(task => {
          // Prevent duplicates, reset status to 'To Do' for the backlog
          if (!updatedBacklog.some(t => t.id === task.id)) {
            updatedBacklog.push({ ...task, status: 'To Do' });
          }
        });
        return updatedBacklog;
      });
    }

    // 3. Clear the Active Sprint board
    setBoardTasks([]);
    
    // Note: Your existing useEffects will automatically catch these state changes 
    // and push them to localStorage, triggering the cross-tab sync instantly!
  };

  const handleCompleteListSprint = () => {
    if (!window.confirm("Are you sure you want to complete this list sprint? Incomplete tasks will be rolled over to the Overall Backlog.")) return;

    // 1. Identify tasks in the active list that are NOT completed
    const incompleteTasks = listTasks.filter(task => 
      task.status !== 'Done' && task.status !== 'Completed' && task.status !== 'Remove'
    );

    // 2. Sync incomplete tasks back to the master workspace backlog with a reset status
    if (incompleteTasks.length > 0) {
      setWorkspaceTasks(prev => {
        const updatedWorkspace = [...prev];
        incompleteTasks.forEach(task => {
          const existingIndex = updatedWorkspace.findIndex(t => t.id === task.id);
          if (existingIndex !== -1) {
            // Reset status if it already exists in the master list
            updatedWorkspace[existingIndex] = { ...updatedWorkspace[existingIndex], status: 'To Do' };
          } else {
            // Append if it somehow missing from the master list
            updatedWorkspace.push({ ...task, status: 'To Do' });
          }
        });
        return updatedWorkspace;
      });
    }

    // 3. Clear the Active Sprint List table
    setListTasks([]);
    
    // Ensure listTasks is synchronized to localStorage to trigger cross-tab updates
    try {
      localStorage.setItem('pmpulse_listTasks', JSON.stringify([]));
      window.dispatchEvent(new CustomEvent('pmpulse_listTasks_updated', { detail: [] }));
    } catch (e) {
      console.error("Failed to sync cleared list tasks", e);
    }
  };

  const kpiData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const DONE = new Set(['Done', 'Completed', 'Remove', 'completed', 'archived', 'Archived']);

    const parseDate = (val) => {
      if (!val || val === '—' || val === '-') return null;
      if (typeof val === 'number') {
        if (val > 25000 && val < 60000) return new Date((val - 25569) * 86400 * 1000);
        return new Date(val);
      }
      const s = String(val).trim();
      if (!isNaN(Number(s)) && Number(s) > 25000 && Number(s) < 60000) {
        return new Date((Number(s) - 25569) * 86400 * 1000);
      }
      const parts = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (parts) {
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1;
        const year = parseInt(parts[3], 10);
        return new Date(year, month, day);
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    // ── Step 1: Deduplicate rows by task id or key ────────────────────────
    const dedupeById = (arr) => {
      const seen = new Map();
      (arr || []).forEach(t => {
        if (!t) return;
        const key = String(t.id ?? t.key ?? t.title ?? Math.random());
        if (!seen.has(key)) seen.set(key, t);
      });
      return Array.from(seen.values());
    };

    // ── Step 2: Build local task map across all views ──────────────────────
    const localTaskMap = new Map();
    const allLocalTasks = dedupeById([
      ...(workspaceTasks || []),
      ...(listTasks || []),
      ...(boardTasks || []),
      ...(boardBacklogTasks || [])
    ]);

    allLocalTasks.forEach(t => {
      if (t.id != null) localTaskMap.set(String(t.id), t);
      if (t.key != null) localTaskMap.set(String(t.key), t);
      if (t.title) localTaskMap.set(String(t.title).toLowerCase().trim(), t);
      if (t['Issue / Task / Enhancement']) localTaskMap.set(String(t['Issue / Task / Enhancement']).toLowerCase().trim(), t);
      if (t.task) localTaskMap.set(String(t.task).toLowerCase().trim(), t);
      if (t.taskName) localTaskMap.set(String(t.taskName).toLowerCase().trim(), t);
      if (t.description) localTaskMap.set(String(t.description).toLowerCase().trim(), t);
    });

    const mergeTask = (task) => {
      const titleKey = (task.title || task['Issue / Task / Enhancement'] || task.task || task.taskName || task.description || '').toLowerCase().trim();
      const local = localTaskMap.get(String(task.id)) ||
                    (task.key ? localTaskMap.get(String(task.key)) : null) ||
                    (titleKey ? localTaskMap.get(titleKey) : null);
      const merged = local ? { ...task, ...local } : { ...task };
      const due = merged.dueDate || merged['Completed'] || merged.end_date;
      const prio = merged.priority || merged['Priority'] || 'Medium';
      const stat = merged.status || merged['Status'] || 'To Do';
      return {
        ...merged,
        dueDate: due,
        priority: prio,
        status: stat
      };
    };

    // Determine target task set
    let rawTasks = [];
    if (overviewFilter === 'all') {
      rawTasks = dedupeById(allWorkspacesTasks.length > 0 ? allWorkspacesTasks : workspaceTasks);
    } else {
      rawTasks = dedupeById(workspaceTasks);
    }

    const dbMerged = rawTasks.map(mergeTask);
    const dbIds = new Set(rawTasks.map(t => String(t.id)));
    const localOnlyTasks = allLocalTasks
      .filter(t => t.id != null && !dbIds.has(String(t.id)))
      .map(mergeTask);

    const fullTasks = dedupeById([...dbMerged, ...localOnlyTasks]);

    // ── Global & Shared KPIs ───────────────────────────────────────────
    // 1. Overdue: due date < today AND not in a done-like status
    const overdueTasks = fullTasks.filter(t => {
      const due = t.dueDate || t['Completed'] || t.end_date;
      const d = parseDate(due);
      if (!d) return false;
      d.setHours(0, 0, 0, 0);
      const s = t.status || t['Status'];
      return d < today && !DONE.has(s);
    }).length;

    // 2. Escalated: exact UI value 'Highest' or synonyms
    const escalatedTasks = fullTasks.filter(t => {
      const p = t.priority || t['Priority'];
      if (!p) return false;
      const norm = String(p).trim().toLowerCase();
      return norm === 'highest' || norm === 'escalated' || norm === 'critical';
    }).length;

    // 3. In Review: exact Kanban column name 'In Review' or synonyms
    const inReviewTasks = fullTasks.filter(t => {
      const s = t.status || t['Status'];
      if (!s) return false;
      const norm = String(s).trim().toLowerCase().replace(/[_\s-]+/g, ' ');
      return norm === 'in review' || norm === 'in review / qa' || norm === 'qa' || norm === 'review';
    }).length;

    // ── Project-specific KPIs ─────────────────────────────────────────────
    let bugCount = 0, featureCount = 0, backlogSize = 0, unassignedCount = 0;
    let workloadMap = {};
    let activeBucketTotal = 0;

    if (overviewFilter !== 'all') {
      bugCount     = fullTasks.filter(t => (t.type === 'Bug' || t.Type === 'Bug')).length;
      featureCount = fullTasks.filter(t => (t.type && t.type !== 'Bug') || (t.Type && t.Type !== 'Bug')).length;
      backlogSize  = (boardBacklogTasks || []).length;

      // 6. Workload Distribution — scope to active+backlog localStorage buckets only.
      const activeBucketSeen = new Set();
      const activeBucketTasks = [];
      [...(listTasks || []), ...(boardTasks || []), ...(boardBacklogTasks || [])].forEach(t => {
        const key = String(t.id ?? t.key ?? Math.random());
        const s = t.status || t['Status'];
        if (!activeBucketSeen.has(key) && !DONE.has(s)) {
          activeBucketSeen.add(key);
          activeBucketTasks.push(t);
        }
      });

      activeBucketTotal = activeBucketTasks.length;
      unassignedCount = activeBucketTasks.filter(t => {
        const a = t.assignee || t['Responsible'] || t['Added by'];
        return !a || a === 'Unassigned';
      }).length;

      // Group by canonical user_id
      const userLookup = new Map();
      const allKnown = [
        ...(user ? [user] : []),
        ...(workspaceDirectory || []),
        ...(workspaceMembers || [])
      ];
      allKnown.forEach(u => {
        const uid = u.id || u.email;
        const name = u.full_name || u.name || u.username;
        if (name && uid) {
          const entry = { id: String(uid), name: String(name).trim() };
          userLookup.set(String(uid), entry);
          userLookup.set(String(name).toLowerCase().trim(), entry);
          const clean = String(name).replace(/\s*\(pm\)$/i, '').toLowerCase().trim();
          userLookup.set(clean, entry);
        }
      });

      const workloadGroup = new Map();
      activeBucketTasks.forEach(t => {
        const raw = t.assignee || t['Responsible'] || t['Added by'];
        if (!raw || raw === 'Unassigned') return;
        const clean = String(raw).replace(/\s*\(pm\)$/i, '').toLowerCase().trim();
        const matched = userLookup.get(clean) || userLookup.get(String(t.user_id)) || userLookup.get(String(t.assignee_id));
        const finalKey = matched ? matched.id : clean;
        const finalName = matched ? matched.name : raw;

        if (!workloadGroup.has(finalKey)) {
          workloadGroup.set(finalKey, { name: finalName, count: 1 });
        } else {
          workloadGroup.get(finalKey).count += 1;
        }
      });

      workloadGroup.forEach(({ name, count }) => {
        workloadMap[name] = count;
      });
    }

    return {
      overdueTasks, escalatedTasks, inReviewTasks,
      bugCount, featureCount, backlogSize, unassignedCount, workloadMap,
      totalTasks: activeBucketTotal || fullTasks.length || 1,
      totalProjectTasks: (workspaceTasks || []).length,
      docsCount: (workspaceDocs || []).length,
    };
  }, [overviewFilter, workspaceTasks, workspaceDocs, allWorkspacesTasks, allWorkspacesDocs, listTasks, boardTasks, boardBacklogTasks, user, workspaceDirectory, workspaceMembers]);

  const dynamicAssignees = useMemo(() => {
    const pmName = user?.full_name || user?.name || currentUser?.fullName || currentUser?.name || 'Project Manager';
    const pmLabel = `${pmName} (PM)`;
    const teamMembers = (workspaceMembers || []).map(member => (typeof member === 'string' ? member : (member.name || member.full_name || member.username))).filter(Boolean);
    const uniqueTeam = Array.from(new Set(teamMembers)).filter(name => name !== pmName && name !== pmLabel);
    return ['Unassigned', pmLabel, ...uniqueTeam];
  }, [user, currentUser, workspaceMembers]);

  const handleSaveDraftTask = () => {
    if (!draftTask.title.trim()) {
      setDraftTask({ columnId: null, boardType: null, title: '', assignee: 'Unassigned', dueDate: '' });
      return;
    }

    const newTask = {
      id: `KAN-${Date.now()}`, // Or your standard ID generator
      taskName: draftTask.title,
      description: draftTask.title,
      status: draftTask.columnId,
      assignee: draftTask.assignee,
      dueDate: draftTask.dueDate,
      priority: 'Medium', // Default
      type: 'Task' // Default
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
    <div className="flex flex-1 min-h-[calc(100vh-5rem)] -m-6">
      {/* Inside your Sidebar container */}
      <div className="w-16 flex flex-col items-center py-4 border-r border-slate-200 dark:border-slate-800/60 gap-2 shrink-0">
        <button 
          onClick={() => setSidebarView('overview')}
          className={`p-3 rounded-xl transition-colors ${sidebarView === 'overview' ? 'bg-yellow-500/10 text-yellow-500' : 'text-slate-400 hover:bg-transparent hover:text-white'}`}
          title="Overview"
        >
          <Home size={24} />
        </button>

        <button 
          onClick={() => setSidebarView('workspace')}
          className={`p-3 rounded-xl transition-colors ${sidebarView === 'workspace' ? 'bg-yellow-500/10 text-yellow-500' : 'text-slate-400 hover:bg-transparent hover:text-white'}`}
          title="Workspace"
        >
          <Folder size={24} /> {/* Or your existing workspace/project icon */}
        </button>
        {/* Keep any other existing sidebar icons below this */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6">
        {sidebarView === 'overview' && (
          <div className="overview-container space-y-8 p-2">
            
            {/* Seamless Welcome Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-transparent">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                  Welcome, {currentUser?.fullName || currentUser?.name || currentUser?.full_name || user?.full_name || 'Project Manager'}
                </h1>
                <p className="text-sm text-slate-400 font-medium">
                  Project Manager • Workspace Overview & Analytics
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-400 bg-transparent px-2 py-1">
                   <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Overview Header & Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-8 mb-6 bg-transparent">
              <h2 className="text-xl font-bold text-white">Performance Overview</h2>
              <div className="relative mt-4 sm:mt-0">
                <select 
                  value={overviewFilter}
                  onChange={(e) => setOverviewFilter(e.target.value)}
                  className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:border-yellow-500 shadow-sm transition-colors cursor-pointer min-w-[200px]"
                >
                  <option value="all">All Projects (Global)</option>
                  {workspaces && workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name || workspace.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* GLOBAL KPIs (Render if 'all' is selected) */}
            {overviewFilter === 'all' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/60 transition-colors">
                  <div className="flex justify-between items-start">
                    <div><p className="text-slate-400 text-sm font-medium mb-1">Global Overdue Tasks</p><h3 className="text-3xl font-bold text-red-500">{kpiData.overdueTasks}</h3></div>
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><Clock size={20} /></div>
                  </div>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/60 transition-colors">
                  <div className="flex justify-between items-start">
                    <div><p className="text-slate-400 text-sm font-medium mb-1">Global Escalated Tasks</p><h3 className="text-3xl font-bold text-orange-500">{kpiData.escalatedTasks}</h3></div>
                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><AlertTriangle size={20} /></div>
                  </div>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/60 transition-colors">
                  <div className="flex justify-between items-start">
                    <div><p className="text-slate-400 text-sm font-medium mb-1">Global In-Review / QA</p><h3 className="text-3xl font-bold text-blue-500">{kpiData.inReviewTasks}</h3></div>
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><SearchCheck size={20} /></div>
                  </div>
                </div>
              </div>
            )}

            {/* PROJECT SPECIFIC KPIs (Render if a specific project is selected) */}
            {overviewFilter !== 'all' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* 1. Bug-to-Feature Ratio */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div><p className="text-slate-400 text-sm font-medium mb-1">Bug-to-Feature Ratio</p>
                    <h3 className="text-2xl font-bold text-white">{kpiData.bugCount} <span className="text-sm text-slate-500 font-normal">vs {kpiData.featureCount}</span></h3></div>
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Bug size={20} /></div>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(kpiData.bugCount / (kpiData.bugCount + kpiData.featureCount || 1)) * 100}%` }}></div></div>
                </div>

                {/* 2. Overdue Tasks */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
                  <div className="flex justify-between items-start"><p className="text-slate-400 text-sm font-medium mb-1">Overdue Tasks</p><div className="p-2 bg-red-500/10 rounded-lg text-red-500"><Clock size={20} /></div></div>
                  <h3 className="text-3xl font-bold text-red-500 mt-2">{kpiData.overdueTasks}</h3>
                </div>

                {/* 3. Escalated Tasks */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
                  <div className="flex justify-between items-start"><p className="text-slate-400 text-sm font-medium mb-1">Escalated (Highest)</p><div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><AlertTriangle size={20} /></div></div>
                  <h3 className="text-3xl font-bold text-orange-500 mt-2">{kpiData.escalatedTasks}</h3>
                </div>

                {/* 4. In Review */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
                  <div className="flex justify-between items-start"><p className="text-slate-400 text-sm font-medium mb-1">In Review / QA</p><div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><SearchCheck size={20} /></div></div>
                  <h3 className="text-3xl font-bold text-blue-500 mt-2">{kpiData.inReviewTasks}</h3>
                </div>

                {/* 5. Backlog Size */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
                  <div className="flex justify-between items-start"><p className="text-slate-400 text-sm font-medium mb-1">Backlog Size</p><div className="p-2 bg-slate-600/20 rounded-lg text-slate-400"><LayoutList size={20} /></div></div>
                  <h3 className="text-3xl font-bold text-white mt-2">{kpiData.backlogSize}</h3>
                </div>

                {/* 5b. Total Tasks — same source as the Overall/List view for this project */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
                  <div className="flex justify-between items-start"><p className="text-slate-400 text-sm font-medium mb-1">Total Tasks</p><div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Target size={20} /></div></div>
                  <h3 className="text-3xl font-bold text-white mt-2">{kpiData.totalProjectTasks}</h3>
                  <p className="text-xs text-slate-500 mt-1">across all sprint &amp; backlog</p>
                </div>

                {/* 6. Workload Distribution */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 col-span-1 md:col-span-2 xl:col-span-2">
                  <div className="flex justify-between items-start mb-3">
                    <div><p className="text-slate-400 text-sm font-medium mb-1">Workload Distribution</p><h3 className="text-2xl font-bold text-white">{kpiData.unassignedCount} <span className="text-sm text-slate-500 font-normal">unassigned tasks</span></h3></div>
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><Users size={20} /></div>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 mb-1"><div className="bg-yellow-500 h-1.5 rounded-full transition-all" style={{ width: `${(kpiData.unassignedCount / kpiData.totalTasks) * 100}%` }}></div></div>
                  <p className="text-xs text-slate-500 mb-3">{Math.round((kpiData.unassignedCount / kpiData.totalTasks) * 100)}% unassigned</p>
                  {Object.keys(kpiData.workloadMap || {}).length > 0 && (
                    <div className="space-y-1.5">
                      {Object.entries(kpiData.workloadMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => (
                        <div key={name} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 truncate w-28 shrink-0">{name}</span>
                          <div className="flex-1 bg-slate-900 rounded-full h-1.5"><div className="bg-yellow-500/60 h-1.5 rounded-full transition-all" style={{ width: `${(count / kpiData.totalTasks) * 100}%` }}></div></div>
                          <span className="text-slate-500 w-5 text-right shrink-0">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7. Active Documentation */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
                  <div className="flex justify-between items-start"><p className="text-slate-400 text-sm font-medium mb-1">Active Docs</p><div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><FileText size={20} /></div></div>
                  <h3 className="text-3xl font-bold text-white mt-2">{kpiData.docsCount}</h3>
                </div>
              </div>
            )}

          </div>
        )}

        {sidebarView === 'workspace' && (
          <div className="workspace-container">
            <div className="flex flex-col items-start gap-1 mb-8">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Spaces
              </span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Layout className="w-6 h-6 text-yellow-500" />
          {selectedWorkspace ? (selectedWorkspace.name || selectedWorkspace.title) : 'Select a Workspace'}
          {selectedWorkspace && (
            <div className="ml-4 flex items-center gap-2">
              <button
                onClick={() => setIsAddMembersModalOpen(true)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700"
              >
                <Users size={16} />
                + Members
              </button>
              <button
                onClick={() => setIsCheckMembersModalOpen(true)}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <UserCheck size={16} />
                Check members
              </button>
            </div>
          )}
        </h1>
      </div>

      {selectedWorkspace && (
        <>
          {/* Sub-Navigation Addition */}
          <div className="border-b border-slate-200 dark:border-slate-800 mb-6 flex items-center gap-6">
            <button
              onClick={() => setActiveView('overall')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeView === 'overall'
                  ? 'border-yellow-500 text-yellow-600 dark:text-yellow-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              Overall Tasks
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeView === 'list'
                  ? 'border-yellow-500 text-yellow-600 dark:text-yellow-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setActiveView('board')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeView === 'board'
                  ? 'border-yellow-500 text-yellow-600 dark:text-yellow-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              Board
            </button>
            <button 
              onClick={() => setActiveView('docs')} 
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeView === 'docs' ? 'border-yellow-500 text-yellow-600 dark:text-yellow-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Docs
            </button>
          </div>

          {/* The 'OverallTasks' Render Block */}
          {activeView === 'overall' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
              
              {/* File Input Integration */}
              <input 
                type="file" 
                accept=".xlsx" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />

              {/* Condition A (No Data) */}
              {workspaceTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                    No overall tasks available for this workspace
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Import data
                  </button>
                </div>
              ) : (
                /* Condition B (Data Exists) */
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Imported Tasks</h3>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[11px] font-medium italic text-red-500/90 dark:text-red-400/90 tracking-wide">
                        *Clicking the Button Deletes Entire Imported Data*
                      </span>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={handleRemoveData}
                          className="px-3 py-1.5 text-sm font-medium rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-800/30 transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove Imported Data
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          Import More
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-medium">Task Name</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Assignee</th>
                          <th className="px-4 py-3 font-medium">Due Date</th>
                          <th className="px-4 py-3 font-medium">Priority</th>
                          <th className="px-4 py-3 font-medium">Added On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {workspaceTasks.map((task, idx) => (
                          <tr 
                            key={task.id || idx} 
                            onClick={() => { if (isMultiSelectMode) { setSelectedTasks(prev => prev.some(t => t === task) ? prev.filter(t => t !== task) : [...prev, task]); } else { setActionModalTasks([task]); } }}
                            className={`border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedTasks.some(t => t === task) ? 'bg-yellow-500/10 dark:bg-yellow-500/20' : ''}`}
                          >
                            <td className="px-4 py-3 text-slate-900 dark:text-white">{task['Issue / Task / Enhancement'] || 'Untitled Task'}</td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{task['Status'] || 'To Do'}</td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{task['Responsible'] || task['Added by'] || 'Unassigned'}</td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{task['Completed'] || '—'}</td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs">{task['Priority'] || 'Medium'}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{task['Added '] || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {isMultiSelectMode && selectedTasks.length > 0 && ( <div className="mt-4 flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedTasks.length} tasks selected</span><div className="flex gap-2"><button onClick={() => { setIsMultiSelectMode(false); setSelectedTasks([]); setPullOrigin(null); }} className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md">Cancel</button><button onClick={() => pullOrigin ? setIsPullConfirmModalOpen(true) : setActionModalTasks(selectedTasks)} className="px-3 py-1.5 text-sm font-medium text-slate-900 bg-yellow-500 hover:bg-yellow-600 rounded-md shadow-sm">Proceed</button></div></div> )}

                  <div className="flex justify-between items-center p-3 border-t border-slate-200 dark:border-slate-800 mt-auto">
                    <button 
                      onClick={() => setIsAddTaskModalOpen(true)}
                      className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <Plus size={16} /> Create
                    </button>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* The 'List' Render Block */}
          {activeView === 'list' && (
            <>
              {/* Active Sprint Header (List View) */}
              <div className="flex flex-col md:flex-row md:items-center justify-between px-5 py-3 mb-6 bg-slate-800/40 border border-slate-700/50 rounded-lg shadow-sm">
                <div>
                  <h2 className="text-md font-semibold text-white">Active Sprint</h2>
                  <span className="text-xs text-slate-400">{sprintConfig ? `${sprintConfig.start} — ${sprintConfig.end}` : '07 Sept 2026 — 14 Sept 2026'}</span>
                </div>
                
                <div className="mt-3 md:mt-0">
                  <button 
                    onClick={handleCompleteListSprint}
                    className="text-sm bg-slate-700 hover:bg-slate-600 text-white font-medium px-4 py-1.5 rounded-md shadow-sm transition-colors"
                  >
                    Complete Sprint
                  </button>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col min-h-[400px]">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Active tasks</h2>
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
                    {listTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          There are no active tasks in this sprint.
                        </td>
                      </tr>
                    ) : (
                      listTasks.map((task) => (
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
                                value={task.assignee || 'Unassigned'} 
                                onChange={(e) => handleInlineUpdate(task.id, 'assignee', e.target.value)}
                                className="bg-transparent border-none text-slate-600 dark:text-slate-400 text-sm py-1 px-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-2 focus:ring-yellow-500 cursor-pointer appearance-none outline-none"
                              >
                                <option value="Unassigned" className="bg-white dark:bg-slate-800 text-slate-400 italic">Unassigned</option>
                                {user && <option value={user.full_name || user.name} className="bg-white dark:bg-slate-800 font-medium text-yellow-600">{user.full_name || user.name} (PM)</option>}
                                {workspaceMembers.map(member => (
                                  <option key={member.id} value={member.name} className="bg-white dark:bg-slate-800">{member.name}</option>
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
                  onClick={() => { if (!sprintConfig) { setIsSprintSetupOpen(true); } else { setPullOrigin(activeView); setIsCreationSourceModalOpen(true); } }} 
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
                    {sprintBacklogTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          There are no incomplete tasks from previous sprints yet.
                        </td>
                      </tr>
                    ) : (
                      sprintBacklogTasks.map((task, index) => (
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

          {/* The 'Board' Render Block */}
          {activeView === 'board' && (
            <>
              {/* Active Sprint Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between px-5 py-3 mb-6 bg-slate-800/40 border border-slate-700/50 rounded-lg shadow-sm">
                <div>
                  <h2 className="text-md font-semibold text-white">Active Sprint</h2>
                  <span className="text-xs text-slate-400">{sprintConfig ? `${sprintConfig.start} — ${sprintConfig.end}` : '07 Sept 2026 — 14 Sept 2026'}</span>
                </div>
                
                <div className="mt-3 md:mt-0">
                  <button 
                    onClick={handleCompleteSprint}
                    className="text-sm bg-slate-700 hover:bg-slate-600 text-white font-medium px-4 py-1.5 rounded-md shadow-sm transition-colors"
                  >
                    Complete Sprint
                  </button>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-2 h-full min-h-[600px] items-start">
              {boardColumns.map(column => (
                <div key={column} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column, column)} className="min-w-[280px] w-[280px] bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{column}</h3>
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full">
                      {boardTasks.filter(t => t.status === column).length}
                    </span>
                  </div>
                  
                  {boardTasks.filter(t => t.status === column).length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                      </div>
                      <p className="text-sm font-semibold mb-1">No work items</p>
                      <p className="text-xs text-slate-500">Create a work item to get started. Work will appear here.</p>
                    </div>
                  ) : (
                    boardTasks.filter(t => t.status === column).map(task => (
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
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {activeDropdownId === task.id && (
                            <div className="absolute right-0 mt-1 w-32 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 overflow-hidden text-left">
                              <button
                                onClick={(e) => handleOpenBoardEditModal(e, task)}
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
                        </div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white mb-2 pr-6" onClick={() => setSelectedTaskModal(task)} style={{cursor:'pointer'}}>{task.taskName || task.description || task.title}</div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{task.key || task.id}</span>
                          {task.assignee && task.assignee !== 'Unassigned' && (
                            <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{task.assignee}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {/* Inside the Kanban Column Mapping, at the bottom of the task list */}
                  {draftTask.columnId === column && draftTask.boardType === 'active' ? (
                    <div className="bg-slate-800 border-2 border-blue-500 rounded-lg p-3 mt-2 shadow-lg">
                      <textarea 
                        autoFocus
                        placeholder="What needs to be done?"
                        className="w-full bg-transparent text-sm text-white resize-none outline-none mb-3"
                        rows={2}
                        value={draftTask.title}
                        onChange={(e) => setDraftTask({...draftTask, title: e.target.value})}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSaveDraftTask())}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Due Date Picker (Like Screenshot 1) */}
                          <div className="relative group flex items-center justify-center p-1.5 hover:bg-slate-700 rounded cursor-pointer" title={draftTask.dueDate || "Set due date"}>
                            <Calendar size={14} className={draftTask.dueDate ? "text-blue-400" : "text-slate-400"} />
                            <input 
                              type="date" 
                              value={draftTask.dueDate}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => setDraftTask({...draftTask, dueDate: e.target.value})}
                            />
                          </div>
                          {/* Assignee Picker (Like Screenshot 2) */}
                          <div className="relative group flex items-center justify-center p-1.5 hover:bg-slate-700 rounded cursor-pointer" title={draftTask.assignee || "Assign member"}>
                            <User size={14} className={draftTask.assignee !== 'Unassigned' ? "text-blue-400" : "text-slate-400"} />
                            <select 
                              value={draftTask.assignee}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full"
                              onChange={(e) => setDraftTask({...draftTask, assignee: e.target.value})}
                            >
                              <option value="Unassigned" className="bg-slate-800 text-slate-300">Unassigned</option>
                              {dynamicAssignees && dynamicAssignees.filter(a => a !== 'Unassigned').map((assigneeName, index) => (
                                <option key={index} value={assigneeName} className="bg-slate-800 text-white">{assigneeName}</option>
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
                      onClick={() => setDraftTask({ columnId: column, boardType: 'active', title: '', assignee: 'Unassigned', dueDate: '' })}
                      className="flex items-center gap-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 p-2 rounded-md w-full mt-2 transition-colors text-sm font-medium"
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
              <div className="flex items-center justify-between px-5 py-3 mb-6 bg-slate-800/30 border border-slate-700/50 rounded-lg">
                <h2 className="text-md font-semibold text-slate-300">Project Backlog</h2>
                <span className="text-xs text-slate-500">Staging area for upcoming sprints</span>
              </div>

              {/* Backlog Columns Container */}
              <div className="flex gap-4 overflow-x-auto pb-4 opacity-80 hover:opacity-100 transition-opacity">
                {boardColumns.map(column => {
                  // CRITICAL: Prefix ID to prevent drag-and-drop collision
                  const dropId = `backlog-${column.toLowerCase().replace(' ', '')}`;
                  const columnTasks = boardBacklogTasks.filter(task => task.status === column);

                  return (
                    <div 
                      key={dropId} 
                      id={dropId}
                      onDragOver={handleDragOver} 
                      onDrop={(e) => handleDrop(e, dropId, column)}
                      className="flex-shrink-0 w-80 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 flex flex-col gap-3"
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
                          <p className="text-sm font-semibold mb-1">No work items</p>
                          <p className="text-xs text-slate-500">Create a work item to get started. Work will appear here.</p>
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
                                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              {activeDropdownId === task.id && (
                                <div className="absolute right-0 mt-1 w-32 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 overflow-hidden text-left">
                                  <button
                                    onClick={(e) => handleOpenBoardEditModal(e, task)}
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
                            </div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white mb-2 pr-6" onClick={() => setSelectedTaskModal(task)} style={{cursor:'pointer'}}>{task.taskName || task.description || task.title}</div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{task.key || task.id}</span>
                              {task.assignee && task.assignee !== 'Unassigned' && (
                                <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{task.assignee}</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {/* Inside the Kanban Column Mapping, at the bottom of the task list */}
                      {draftTask.columnId === column && draftTask.boardType === 'backlog' ? (
                        <div className="bg-slate-800 border-2 border-blue-500 rounded-lg p-3 mt-2 shadow-lg">
                          <textarea 
                            autoFocus
                            placeholder="What needs to be done?"
                            className="w-full bg-transparent text-sm text-white resize-none outline-none mb-3"
                            rows={2}
                            value={draftTask.title}
                            onChange={(e) => setDraftTask({...draftTask, title: e.target.value})}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSaveDraftTask())}
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Due Date Picker (Like Screenshot 1) */}
                              <div className="relative group flex items-center justify-center p-1.5 hover:bg-slate-700 rounded cursor-pointer" title={draftTask.dueDate || "Set due date"}>
                                <Calendar size={14} className={draftTask.dueDate ? "text-blue-400" : "text-slate-400"} />
                                <input 
                                  type="date" 
                                  value={draftTask.dueDate}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  onChange={(e) => setDraftTask({...draftTask, dueDate: e.target.value})}
                                />
                              </div>
                              {/* Assignee Picker (Like Screenshot 2) */}
                              <div className="relative group flex items-center justify-center p-1.5 hover:bg-slate-700 rounded cursor-pointer" title={draftTask.assignee || "Assign member"}>
                                <User size={14} className={draftTask.assignee !== 'Unassigned' ? "text-blue-400" : "text-slate-400"} />
                                <select 
                                  value={draftTask.assignee}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                  onChange={(e) => setDraftTask({...draftTask, assignee: e.target.value})}
                                >
                                  <option value="Unassigned" className="bg-slate-800 text-slate-300">Unassigned</option>
                                  {dynamicAssignees && dynamicAssignees.filter(a => a !== 'Unassigned').map((assigneeName, index) => (
                                    <option key={index} value={assigneeName} className="bg-slate-800 text-white">{assigneeName}</option>
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
                          className="flex items-center gap-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 p-2 rounded-md w-full mt-2 transition-colors text-sm font-medium"
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
            </>
          )}
          {/* Docs View */}
          {activeView === 'docs' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col min-h-[500px]">
              {/* Header & Actions */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Project Documentation</h2>
                
                {/* Hidden Input & Trigger Button */}
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
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-yellow-500 hover:bg-yellow-600 rounded-md shadow-sm transition-colors"
                >
                  <UploadCloud size={16} />
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
        </>
      )}
          </div>
        )}
      </div>

      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 relative">
            <form onSubmit={handleAddTask}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Task Name
                </label>
                <input 
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddTaskModalOpen(false)}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-lg shadow-xl relative">
            <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Add {actionModalTasks.length} Task(s) To:</h2>
            <button onClick={() => routeTasksToView(actionModalTasks, 'list')} className="w-full text-left px-4 py-2 mb-2 rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Add in List view</button>
            <button onClick={() => routeTasksToView(actionModalTasks, 'board')} className="w-full text-left px-4 py-2 mb-2 rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Add in Board view</button>
            <button onClick={() => { setIsMultiSelectMode(true); setSelectedTasks(prev => [...new Set([...prev, ...actionModalTasks])]); setActionModalTasks(null); }} className="w-full text-left px-4 py-2 rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 font-medium text-yellow-600 dark:text-yellow-500">Select more tasks</button>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setActionModalTasks(null)} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isCreationSourceModalOpen && ( <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"><div className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-lg shadow-xl"><h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Make current selection from..</h3><div className="flex flex-col gap-3"><button onClick={() => { setIsCreationSourceModalOpen(false); setActiveView('overall'); setIsMultiSelectMode(true); }} className="w-full text-left px-4 py-2 rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 font-medium">Select from overall task list</button><button onClick={() => { setIsCreationSourceModalOpen(false); setIsCreateListTaskOpen(true); }} className="w-full text-left px-4 py-2 rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 font-medium">Create new task</button></div><div className="mt-4 flex justify-end"><button onClick={() => { setIsCreationSourceModalOpen(false); setPullOrigin(null); }} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button></div></div></div> )}

      {isPullConfirmModalOpen && ( <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"><div className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-lg shadow-xl"><h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Proceed with the current selection?</h3><div className="flex justify-end gap-3"><button onClick={() => setIsPullConfirmModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">Cancel</button><button onClick={() => { routeTasksToView(selectedTasks, pullOrigin); setActiveView(pullOrigin === 'boardBacklog' ? 'board' : pullOrigin); setPullOrigin(null); setIsPullConfirmModalOpen(false); }} className="px-4 py-2 text-sm font-medium text-slate-900 bg-yellow-500 hover:bg-yellow-600 rounded-md shadow-sm transition-colors">Proceed</button></div></div></div> )}
      {/* Add Members Modal */}
      {isAddMembersModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Add people to Workspace</h3>
              <button onClick={() => setIsAddMembersModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                <button 
                  onClick={() => setMemberTab('directory')} 
                  className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${memberTab === 'directory' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  Add from workspace directory
                </button>
                <button 
                  onClick={() => setMemberTab('email')} 
                  className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${memberTab === 'email' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  Add from emails
                </button>
              </div>

              <form onSubmit={handleAddMembers}>
                {memberTab === 'directory' ? (
                  <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto pr-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Suggested Colleagues</p>
                    
                    {/* Dynamic Filtering Logic */}
                    {workspaceDirectory.filter(user => !workspaceMembers.some(member => member.email === user.email)).length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">All directory members are already in this workspace.</p>
                      </div>
                    ) : (
                      workspaceDirectory
                        .filter(user => !workspaceMembers.some(member => member.email === user.email))
                        .map(user => (
                          <label key={user.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name || user.full_name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={selectedDirectoryUsers.some(u => u.email === user.email)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDirectoryUsers(prev => [...prev, user]);
                                } else {
                                  setSelectedDirectoryUsers(prev => prev.filter(u => u.email !== user.email));
                                }
                              }}
                              className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-500 dark:border-slate-600 dark:bg-slate-700 cursor-pointer shrink-0" 
                            />
                          </label>
                        ))
                    )}
                  </div>
                ) : (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Names or emails *</label>
                    <textarea 
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="e.g., maria@company.com, alex@company.com"
                      className="w-full h-24 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                      required
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button type="button" onClick={() => setIsAddMembersModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-slate-900 bg-yellow-500 hover:bg-yellow-600 rounded-md shadow-sm transition-colors">
                    Add Members
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Check Members Modal */}
      {isCheckMembersModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0F172A] dark:bg-slate-900 rounded-lg shadow-xl border border-slate-700/50 flex flex-col max-h-[80vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-white">Workspace Members</h3>
              <button 
                onClick={() => { setIsCheckMembersModalOpen(false); setIsRemoveMemberMode(false); setMembersToRemove([]); }} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {workspaceMembers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Users size={24} />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">No members yet</p>
                  <p className="text-xs text-slate-400">Click '+ Members' to invite your team.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header row with Total and Trash Toggle */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">TOTAL: {workspaceMembers.length}</span>
                    <button 
                      onClick={() => { setIsRemoveMemberMode(!isRemoveMemberMode); setMembersToRemove([]); }}
                      className={`p-1.5 rounded transition-colors flex items-center gap-2 text-xs font-medium ${isRemoveMemberMode ? 'bg-red-900/30 text-red-400' : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'}`}
                      title={isRemoveMemberMode ? "Cancel removal" : "Remove members"}
                    >
                      <Trash2 size={14} />
                      {isRemoveMemberMode ? 'Cancel' : 'Remove'}
                    </button>
                  </div>
                  
                  {/* Member List */}
                  {workspaceMembers.map(member => (
                    <div key={member.id || member.email} className="flex items-center justify-between p-3 border border-slate-700/50 rounded-lg bg-slate-800/30">
                      <div className="flex items-center gap-3 min-w-0">
                        
                        {/* Dynamic Checkbox (Only visible in Remove Mode) */}
                        {isRemoveMemberMode && (
                          <input 
                            type="checkbox"
                            checked={membersToRemove.includes(member.id || member.email)}
                            onChange={(e) => {
                              const identifier = member.id || member.email;
                              if (e.target.checked) setMembersToRemove(prev => [...prev, identifier]);
                              else setMembersToRemove(prev => prev.filter(id => id !== identifier));
                            }}
                            className="w-4 h-4 text-red-600 rounded border-slate-600 bg-slate-700 focus:ring-red-500 cursor-pointer shrink-0"
                          />
                        )}
                        
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-yellow-900/30 text-yellow-500 flex items-center justify-center text-sm font-bold uppercase shrink-0">
                          {member.name ? member.name.charAt(0) : '?'}
                        </div>
                        
                        {/* Name & Email */}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{member.name}</p>
                          <p className="text-xs text-slate-400 truncate">{member.email}</p>
                        </div>
                      </div>
                      
                      {/* Role Badge */}
                      <span className="text-[10px] px-2 py-1 rounded-full font-medium shrink-0 ml-2 bg-purple-900/30 text-purple-400 border border-purple-800/30">
                        {member.role || 'Member'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Action Footer (Only visible in Remove Mode) */}
            {isRemoveMemberMode && (
              <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/80 flex items-center justify-between mt-auto">
                <span className="text-sm font-medium text-slate-300">{membersToRemove.length} selected</span>
                <button 
                  onClick={handleRemoveSelectedMembers}
                  disabled={membersToRemove.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 rounded-md shadow-sm transition-colors"
                >
                  Remove Selected
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Detail Modal Overlay */}
      {selectedTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedTaskModal(null); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">{selectedTaskModal.id}</span>
                <span className="text-sm font-medium text-slate-300">{selectedTaskModal.status}</span>
              </div>
              <button onClick={() => setSelectedTaskModal(null)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <h2 className="text-2xl font-bold text-white">{selectedTaskModal.taskName || selectedTaskModal.title || selectedTaskModal.description || 'Untitled Task'}</h2>
              
              <div className="grid grid-cols-2 gap-6 bg-slate-800/30 p-4 rounded-lg border border-slate-800/50">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Assignee</label>
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><User size={12}/></div>
                    {selectedTaskModal.assignee || 'Unassigned'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label>
                  <div className="text-slate-300 font-medium">{selectedTaskModal.dueDate || 'No date set'}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
                  <div className="text-slate-300 font-medium">{selectedTaskModal.priority || 'Medium'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Kanban Task Edit Modal */}
      {boardEditTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Edit Task: {boardEditTask.key || boardEditTask.id}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Task Title</label>
                  <input
                    type="text"
                    value={boardEditTask.task || boardEditTask.title || ''}
                    onChange={(e) => setBoardEditTask({...boardEditTask, task: e.target.value, title: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                    <select
                      value={boardEditTask.status || 'To Do'}
                      onChange={(e) => setBoardEditTask({...boardEditTask, status: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="In Review">In Review</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                    <select
                      value={boardEditTask.priority || 'Medium'}
                      onChange={(e) => setBoardEditTask({...boardEditTask, priority: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Highest">Highest</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Assignee</label>
                    <input
                      type="text"
                      value={boardEditTask.assignee || ''}
                      onChange={(e) => setBoardEditTask({...boardEditTask, assignee: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Unassigned"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={boardEditTask.dueDate || ''}
                      onChange={(e) => setBoardEditTask({...boardEditTask, dueDate: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
              <button
                onClick={() => setBoardEditTask(null)}
                className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg transition-colors"
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
    </div>
  );
}
