import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  ChevronUp, 
  ChevronsUp, 
  ChevronDown, 
  ChevronsDown, 
  Equal, 
  Calendar, 
  Plus, 
  Check, 
  User, 
  Clock, 
  Tag, 
  CheckCircle2,
  X
} from 'lucide-react';

const TASK_PRIORITY_OPTIONS = [
  { id: 'Highest', label: 'Highest', color: 'text-red-500', iconType: 'chevrons-up' },
  { id: 'High',    label: 'High',    color: 'text-red-500', iconType: 'chevron-up' },
  { id: 'Medium',  label: 'Medium',  color: 'text-amber-500', iconType: 'equal' },
  { id: 'Low',     label: 'Low',     color: 'text-blue-500', iconType: 'chevron-down' },
  { id: 'Lowest',  label: 'Lowest',  color: 'text-blue-500', iconType: 'chevrons-down' },
];

const DEFAULT_TYPES = ['Task', 'Bug', 'Epic', 'Testing'];
const DEFAULT_STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];

export default function TaskFilterPanel({
  isOpen,
  onClose,
  filters = {
    priorities: [],
    dueDate: '',
    types: [],
    statuses: [],
    assignees: []
  },
  onChange,
  buttonRef,
  taskTypes = DEFAULT_TYPES,
  taskStatuses = DEFAULT_STATUSES,
  onAddType,
  onAddStatus,
  dynamicAssignees = ['Unassigned'],
  align = 'auto'
}) {
  const panelRef = useRef(null);
  const [selectedField, setSelectedField] = useState('Priority');

  // Search states for right-column lists
  const [prioritySearch, setPrioritySearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');

  // Local inputs for adding custom types / statuses / due date
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [customStatusInput, setCustomStatusInput] = useState('');
  const [localDueDate, setLocalDueDate] = useState(filters.dueDate || '');

  // Keep localDueDate in sync with filters.dueDate
  useEffect(() => {
    setLocalDueDate(filters.dueDate || '');
  }, [filters.dueDate]);

  const [panelStyle, setPanelStyle] = useState(() => {
    if (align === 'left') {
      return { left: '0px', right: 'auto' };
    }
    if (typeof window !== 'undefined' && buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      if (rect.left < window.innerWidth / 2) {
        return { left: '0px', right: 'auto' };
      }
    }
    return { right: '0px', left: 'auto' };
  });

  // Viewport-aware positioning: ensure the panel never clips against the right or left edge of the screen
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef?.current) return;
      const btnRect = buttonRef.current.getBoundingClientRect();
      const panelWidth = Math.min(460, window.innerWidth - 32);

      // Safe left margin: prevents panel from clipping into the 56px collapsed sidebar
      const minLeft = window.innerWidth > 640 ? 72 : 16;
      const maxRight = window.innerWidth - 16;

      // Determine orientation:
      // If explicitly 'left', or if 'auto' and the button is on the left half of the viewport
      const shouldAlignLeft = 
        align === 'left' || 
        (align !== 'right' && (btnRect.left < window.innerWidth / 2 || btnRect.right - panelWidth < minLeft));

      if (shouldAlignLeft) {
        // Align with button's left edge and adjust if it would overflow left or right
        let targetLeft = btnRect.left;
        if (targetLeft < minLeft) {
          targetLeft = minLeft;
        }
        if (targetLeft + panelWidth > maxRight) {
          targetLeft = Math.max(minLeft, maxRight - panelWidth);
        }

        const offsetLeft = targetLeft - btnRect.left;
        setPanelStyle({
          left: `${offsetLeft}px`,
          right: 'auto',
          maxWidth: 'min(460px, calc(100vw - 32px))'
        });
      } else {
        // Align with button's right edge and adjust if it would overflow right or left
        let targetRight = btnRect.right;
        if (targetRight > maxRight) {
          targetRight = maxRight;
        }
        if (targetRight - panelWidth < minLeft) {
          targetRight = Math.min(maxRight, minLeft + panelWidth);
        }

        const offsetRight = btnRect.right - targetRight;
        setPanelStyle({
          right: `${offsetRight}px`,
          left: 'auto',
          maxWidth: 'min(460px, calc(100vw - 32px))'
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, buttonRef, align]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        (!buttonRef?.current || !buttonRef.current.contains(event.target))
      ) {
        onClose();
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, buttonRef]);

  // Compute all available types
  const allTypes = useMemo(() => {
    const set = new Set([...DEFAULT_TYPES, ...(taskTypes || []), ...(filters.types || [])]);
    return Array.from(set);
  }, [taskTypes, filters.types]);

  // Compute all available statuses
  const allStatuses = useMemo(() => {
    const set = new Set([...DEFAULT_STATUSES, ...(taskStatuses || []), ...(filters.statuses || [])]);
    return Array.from(set);
  }, [taskStatuses, filters.statuses]);

  // Compute all available assignees
  const allAssignees = useMemo(() => {
    const list = Array.from(new Set([...(dynamicAssignees || []), ...(filters.assignees || [])]));
    return list;
  }, [dynamicAssignees, filters.assignees]);

  // Filtered lists by search
  const filteredPriorities = useMemo(() => {
    if (!prioritySearch.trim()) return TASK_PRIORITY_OPTIONS;
    const q = prioritySearch.toLowerCase();
    return TASK_PRIORITY_OPTIONS.filter(p => p.label.toLowerCase().includes(q));
  }, [prioritySearch]);

  const filteredTypes = useMemo(() => {
    if (!typeSearch.trim()) return allTypes;
    const q = typeSearch.toLowerCase();
    return allTypes.filter(t => t.toLowerCase().includes(q));
  }, [allTypes, typeSearch]);

  const filteredStatuses = useMemo(() => {
    if (!statusSearch.trim()) return allStatuses;
    const q = statusSearch.toLowerCase();
    return allStatuses.filter(s => s.toLowerCase().includes(q));
  }, [allStatuses, statusSearch]);

  const filteredAssignees = useMemo(() => {
    if (!assigneeSearch.trim()) return allAssignees;
    const q = assigneeSearch.toLowerCase();
    return allAssignees.filter(a => a.toLowerCase().includes(q));
  }, [allAssignees, assigneeSearch]);

  if (!isOpen) return null;

  // Handlers for toggles
  const togglePriority = (pId) => {
    const exists = filters.priorities.includes(pId);
    const updated = exists
      ? filters.priorities.filter(p => p !== pId)
      : [...filters.priorities, pId];
    onChange({ ...filters, priorities: updated });
  };

  const toggleType = (typeVal) => {
    const exists = filters.types.includes(typeVal);
    const updated = exists
      ? filters.types.filter(t => t !== typeVal)
      : [...filters.types, typeVal];
    onChange({ ...filters, types: updated });
  };

  const toggleStatus = (statusVal) => {
    const exists = filters.statuses.includes(statusVal);
    const updated = exists
      ? filters.statuses.filter(s => s !== statusVal)
      : [...filters.statuses, statusVal];
    onChange({ ...filters, statuses: updated });
  };

  const toggleAssignee = (assigneeVal) => {
    const exists = filters.assignees.includes(assigneeVal);
    const updated = exists
      ? filters.assignees.filter(a => a !== assigneeVal)
      : [...filters.assignees, assigneeVal];
    onChange({ ...filters, assignees: updated });
  };

  // Due Date handler
  const handleApplyDueDate = (e) => {
    if (e) e.preventDefault();
    onChange({ ...filters, dueDate: localDueDate });
  };

  const handleClearDueDate = () => {
    setLocalDueDate('');
    onChange({ ...filters, dueDate: '' });
  };

  // Add Custom Type
  const handleAddCustomType = (e) => {
    if (e) e.preventDefault();
    const val = customTypeInput.trim();
    if (!val) return;
    if (!filters.types.includes(val)) {
      onChange({ ...filters, types: [...filters.types, val] });
    }
    if (onAddType) {
      onAddType(val);
    }
    setCustomTypeInput('');
  };

  // Add Custom Status
  const handleAddCustomStatus = (e) => {
    if (e) e.preventDefault();
    const val = customStatusInput.trim();
    if (!val) return;
    if (!filters.statuses.includes(val)) {
      onChange({ ...filters, statuses: [...filters.statuses, val] });
    }
    if (onAddStatus) {
      onAddStatus(val);
    }
    setCustomStatusInput('');
  };

  // Clear all filters
  const handleClearAll = () => {
    setLocalDueDate('');
    onChange({
      priorities: [],
      dueDate: '',
      types: [],
      statuses: [],
      assignees: []
    });
  };

  // Count active filters per category
  const activeCount = {
    Priority: filters.priorities.length,
    'Due Date': filters.dueDate ? 1 : 0,
    Type: filters.types.length,
    Status: filters.statuses.length,
    Assignee: filters.assignees.length,
  };

  const totalActiveCount = 
    activeCount.Priority + 
    activeCount['Due Date'] + 
    activeCount.Type + 
    activeCount.Status + 
    activeCount.Assignee;

  // Render Priority Icon
  const renderPriorityIcon = (iconType) => {
    switch (iconType) {
      case 'chevrons-up':
        return <ChevronsUp className="w-4 h-4 text-red-500 stroke-[2.5]" />;
      case 'chevron-up':
        return <ChevronUp className="w-4 h-4 text-red-500 stroke-[2.5]" />;
      case 'equal':
        return <Equal className="w-4 h-4 text-amber-500 stroke-[2.5]" />;
      case 'chevron-down':
        return <ChevronDown className="w-4 h-4 text-blue-500 stroke-[2.5]" />;
      case 'chevrons-down':
        return <ChevronsDown className="w-4 h-4 text-blue-500 stroke-[2.5]" />;
      default:
        return <Equal className="w-4 h-4 text-amber-500 stroke-[2.5]" />;
    }
  };

  return (
    <div
      ref={panelRef}
      style={panelStyle}
      className="absolute top-full mt-1.5 z-50 w-[460px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-2xl overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-100"
    >
      {/* 2-Column Body */}
      <div className="flex h-[360px]">
        {/* Left Column: Filter Fields */}
        <div className="w-36 sm:w-40 border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col justify-between select-none">
          <div className="py-2">
            {[
              { id: 'Priority', label: 'Priority' },
              { id: 'Due Date', label: 'Due Date' },
              { id: 'Type', label: 'Type' },
              { id: 'Status', label: 'Status' },
              { id: 'Assignee', label: 'Assignee' },
            ].map(field => {
              const isSelected = selectedField === field.id;
              const hasActive = activeCount[field.id] > 0;
              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => setSelectedField(field.id)}
                  className={`w-full text-left px-3.5 py-2.5 text-xs font-medium flex items-center justify-between transition-colors border-l-[3px] ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-600 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate">{field.label}</span>
                  {hasActive && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Left: Clear all */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClearAll}
              disabled={totalActiveCount === 0}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Right Column: Selected Field Options */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
          {selectedField === 'Priority' && (
            <>
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search priority"
                    value={prioritySearch}
                    onChange={e => setPrioritySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {filteredPriorities.map(p => {
                  const isChecked = filters.priorities.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-xs select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePriority(p.id)}
                        className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer accent-blue-600"
                      />
                      <span className="flex items-center justify-center shrink-0">
                        {renderPriorityIcon(p.iconType)}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                        {p.label}
                      </span>
                    </label>
                  );
                })}
                {filteredPriorities.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No priorities found</p>
                )}
              </div>

              <div className="p-2.5 px-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, priorities: [] })}
                  disabled={filters.priorities.length === 0}
                  className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  Clear
                </button>
                <span className="text-[11px] font-mono text-slate-400">
                  {filters.priorities.length} of {TASK_PRIORITY_OPTIONS.length}
                </span>
              </div>
            </>
          )}

          {selectedField === 'Due Date' && (
            <>
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  Filter by Due Date
                </h4>
              </div>

              <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-3">
                  <label className="block text-xs text-slate-600 dark:text-slate-400">
                    Select target due date:
                  </label>
                  <form onSubmit={handleApplyDueDate} className="flex flex-col gap-2.5">
                    <input
                      type="date"
                      value={localDueDate}
                      onChange={e => setLocalDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                    />
                    <button
                      type="submit"
                      disabled={!localDueDate}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs py-2 px-3 rounded-md transition-colors shadow-sm cursor-pointer"
                    >
                      Apply Date Filter
                    </button>
                  </form>

                  {filters.dueDate && (
                    <div className="mt-3 p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-md flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
                      <span className="truncate">Active filter: <b>{filters.dueDate}</b></span>
                      <button
                        type="button"
                        onClick={handleClearDueDate}
                        className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-200 text-xs font-semibold underline ml-2 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-2.5 px-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={handleClearDueDate}
                  disabled={!filters.dueDate}
                  className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  Clear
                </button>
                <span className="text-[11px] font-mono text-slate-400">
                  {filters.dueDate ? '1 active' : 'None'}
                </span>
              </div>
            </>
          )}

          {selectedField === 'Type' && (
            <>
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search type"
                    value={typeSearch}
                    onChange={e => setTypeSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {filteredTypes.map(t => {
                  const isChecked = filters.types.includes(t);
                  return (
                    <label
                      key={t}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-xs select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleType(t)}
                        className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer accent-blue-600"
                      />
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {t}
                      </span>
                    </label>
                  );
                })}
                {filteredTypes.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No types found</p>
                )}
              </div>

              {/* Inline Custom Type Creator */}
              <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <form onSubmit={handleAddCustomType} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="New type..."
                    value={customTypeInput}
                    onChange={e => setCustomTypeInput(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="submit"
                    disabled={!customTypeInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add type</span>
                  </button>
                </form>
              </div>

              <div className="p-2.5 px-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, types: [] })}
                  disabled={filters.types.length === 0}
                  className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  Clear
                </button>
                <span className="text-[11px] font-mono text-slate-400">
                  {filters.types.length} of {allTypes.length}
                </span>
              </div>
            </>
          )}

          {selectedField === 'Status' && (
            <>
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search status"
                    value={statusSearch}
                    onChange={e => setStatusSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {filteredStatuses.map(s => {
                  const isChecked = filters.statuses.includes(s);
                  return (
                    <label
                      key={s}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-xs select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStatus(s)}
                        className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer accent-blue-600"
                      />
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {s}
                      </span>
                    </label>
                  );
                })}
                {filteredStatuses.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No statuses found</p>
                )}
              </div>

              {/* Inline Custom Status Creator */}
              <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <form onSubmit={handleAddCustomStatus} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="New status..."
                    value={customStatusInput}
                    onChange={e => setCustomStatusInput(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="submit"
                    disabled={!customStatusInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add status</span>
                  </button>
                </form>
              </div>

              <div className="p-2.5 px-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, statuses: [] })}
                  disabled={filters.statuses.length === 0}
                  className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  Clear
                </button>
                <span className="text-[11px] font-mono text-slate-400">
                  {filters.statuses.length} of {allStatuses.length}
                </span>
              </div>
            </>
          )}

          {selectedField === 'Assignee' && (
            <>
              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search assignee"
                    value={assigneeSearch}
                    onChange={e => setAssigneeSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {filteredAssignees.map(a => {
                  const isChecked = filters.assignees.includes(a);
                  const isPM = a.includes('(PM)');
                  const isUnassigned = a === 'Unassigned';

                  return (
                    <label
                      key={a}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-xs select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAssignee(a)}
                        className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer accent-blue-600"
                      />
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                        {isUnassigned ? '—' : a.charAt(0).toUpperCase()}
                      </span>
                      <span className={`truncate ${isPM ? 'font-semibold text-yellow-600 dark:text-yellow-500' : isUnassigned ? 'italic text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                        {a}
                      </span>
                    </label>
                  );
                })}
                {filteredAssignees.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No assignees found</p>
                )}
              </div>

              <div className="p-2.5 px-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, assignees: [] })}
                  disabled={filters.assignees.length === 0}
                  className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  Clear
                </button>
                <span className="text-[11px] font-mono text-slate-400">
                  {filters.assignees.length} of {allAssignees.length}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
