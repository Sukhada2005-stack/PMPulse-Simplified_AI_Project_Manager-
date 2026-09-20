import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { PROJECT_CATEGORIES } from './ProjectTaskModal';

const PRIORITY_OPTIONS = [
  { id: 'Critical', label: 'Critical', icon: '⚡', color: 'text-red-500' },
  { id: 'High',     label: 'High',     icon: '🔥', color: 'text-amber-500' },
  { id: 'Medium',   label: 'Medium',   icon: '＝', color: 'text-yellow-500' },
  { id: 'Low',      label: 'Low',      icon: '↓',  color: 'text-emerald-500' },
];

const PREDEFINED_MEMBER_RANGES = [
  { id: 'lte5',   label: '≤ 5',     min: 0,  max: 5 },
  { id: '6to10',  label: '6 to 10', min: 6,  max: 10 },
  { id: '11to20', label: '11 to 20', min: 11, max: 20 },
];

const PREDEFINED_STATUSES = [
  { id: 'Active',   label: 'Active',   subtext: 'active / in-progress' },
  { id: 'Inactive', label: 'Inactive', subtext: 'completed / archived' },
];

export default function FilterPanel({
  isOpen,
  onClose,
  filters,
  onChange,
  projects = [],
  buttonRef,
}) {
  const panelRef = useRef(null);
  const [selectedField, setSelectedField] = useState(null);

  // Search states for right-column lists
  const [categorySearch, setCategorySearch] = useState('');
  const [prioritySearch, setPrioritySearch] = useState('');

  // Custom members range local inputs
  const [customMin, setCustomMin] = useState(
    filters.members.type === 'custom' && filters.members.min !== '' ? filters.members.min : ''
  );
  const [customMax, setCustomMax] = useState(
    filters.members.type === 'custom' && filters.members.max !== '' ? filters.members.max : ''
  );

  // Custom status input
  const [customStatusInput, setCustomStatusInput] = useState('');

  const [panelStyle, setPanelStyle] = useState(() => {
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

      const shouldAlignLeft = btnRect.left < window.innerWidth / 2 || btnRect.right - panelWidth < minLeft;

      if (shouldAlignLeft) {
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
  }, [isOpen, buttonRef]);

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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  // Dynamically compute all available categories
  const allCategoryOptions = useMemo(() => {
    const list = [...PROJECT_CATEGORIES];
    const existingIds = new Set(list.map(c => c.value.toLowerCase()));

    // Collect any extra distinct categories present on loaded projects
    projects.forEach(p => {
      if (p.category && !existingIds.has(p.category.toLowerCase())) {
        list.push({
          value: p.category,
          label: p.category,
          icon: '📁',
        });
        existingIds.add(p.category.toLowerCase());
      }
    });
    return list;
  }, [projects]);

  // Filtered categories by search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return allCategoryOptions;
    const q = categorySearch.toLowerCase();
    return allCategoryOptions.filter(c => c.label.toLowerCase().includes(q));
  }, [allCategoryOptions, categorySearch]);

  // Filtered priorities by search
  const filteredPriorities = useMemo(() => {
    if (!prioritySearch.trim()) return PRIORITY_OPTIONS;
    const q = prioritySearch.toLowerCase();
    return PRIORITY_OPTIONS.filter(p => p.label.toLowerCase().includes(q));
  }, [prioritySearch]);

  if (!isOpen) return null;

  // Handlers for Category
  const toggleCategory = (catVal) => {
    const exists = filters.categories.includes(catVal);
    const updated = exists
      ? filters.categories.filter(c => c !== catVal)
      : [...filters.categories, catVal];
    onChange({ ...filters, categories: updated });
  };

  // Handlers for Priority
  const togglePriority = (pVal) => {
    const exists = filters.priorities.includes(pVal);
    const updated = exists
      ? filters.priorities.filter(p => p !== pVal)
      : [...filters.priorities, pVal];
    onChange({ ...filters, priorities: updated });
  };

  // Handlers for Members
  const selectPredefinedRange = (rangeId) => {
    if (filters.members.type === rangeId) {
      // Toggle off
      onChange({ ...filters, members: { type: 'all', min: '', max: '' } });
    } else {
      const match = PREDEFINED_MEMBER_RANGES.find(r => r.id === rangeId);
      onChange({
        ...filters,
        members: { type: rangeId, min: match.min, max: match.max },
      });
    }
  };

  const applyCustomMemberRange = (e) => {
    e.preventDefault();
    const minVal = customMin === '' ? 0 : parseInt(customMin, 10);
    const maxVal = customMax === '' ? 99999 : parseInt(customMax, 10);
    onChange({
      ...filters,
      members: { type: 'custom', min: minVal, max: maxVal },
    });
  };

  // Handlers for Status
  const toggleStatus = (statusId) => {
    const exists = filters.status.selected.includes(statusId);
    const updated = exists
      ? filters.status.selected.filter(s => s !== statusId)
      : [...filters.status.selected, statusId];
    onChange({
      ...filters,
      status: { ...filters.status, selected: updated },
    });
  };

  const addCustomStatus = (e) => {
    e.preventDefault();
    const val = customStatusInput.trim().toLowerCase();
    if (!val) return;
    if (!filters.status.custom.includes(val)) {
      onChange({
        ...filters,
        status: {
          ...filters.status,
          custom: [...filters.status.custom, val],
          selected: [...filters.status.selected, val],
        },
      });
    }
    setCustomStatusInput('');
  };

  // Clear all filters
  const handleClearAll = () => {
    onChange({
      categories: [],
      priorities: [],
      members: { type: 'all', min: '', max: '' },
      status: { selected: [], custom: [] },
    });
    setCustomMin('');
    setCustomMax('');
  };

  const hasAnyActiveFilters =
    filters.categories.length > 0 ||
    filters.priorities.length > 0 ||
    filters.members.type !== 'all' ||
    filters.status.selected.length > 0;

  const FIELDS = [
    { id: 'Category', label: 'Category', count: filters.categories.length },
    { id: 'Priority', label: 'Priority', count: filters.priorities.length },
    { id: 'Members',  label: 'Members',  count: filters.members.type !== 'all' ? 1 : 0 },
    { id: 'Status',   label: 'Status',   count: filters.status.selected.length },
  ];

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[480px] max-w-[calc(100vw-2rem)] h-[360px] bg-white dark:bg-[#151922] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 flex flex-row overflow-hidden animate-fade-in font-sans"
      style={{
        boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.35), 0 4px 12px -2px rgba(0, 0, 0, 0.25)',
        ...panelStyle,
      }}
    >
      {/* ── Left Column: Field Names List (Ends after Status) ────────── */}
      <div className="w-40 sm:w-44 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between bg-slate-50/70 dark:bg-[#12151c]/90 flex-shrink-0">
        <div className="py-2.5">
          {FIELDS.map(field => {
            const isSelected = selectedField === field.id;
            return (
              <button
                key={field.id}
                type="button"
                onClick={() => setSelectedField(field.id)}
                className={`w-full px-4 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors text-left cursor-pointer border-l-[3px] select-none ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 border-transparent'
                }`}
              >
                <span>{field.label}</span>
                {field.count > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 inline-block" />
                )}
              </button>
            );
          })}
        </div>

        {/* Clear all text at bottom left */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={!hasAnyActiveFilters}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* ── Right Column: Dynamic Filter Content ──────────────────────── */}
      <div className="flex-1 flex flex-col justify-between bg-white dark:bg-[#151922] min-w-0">
        {selectedField === null ? (
          /* Default state when no field is clicked */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500 select-none">
            <SlidersHorizontal className="w-8 h-8 mb-2.5 opacity-30 stroke-1" />
            <p className="text-xs font-medium max-w-[200px]">
              Select a field to start creating a filter.
            </p>
          </div>
        ) : selectedField === 'Category' ? (
          /* Category Filter Content */
          <>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search category"
                  value={categorySearch}
                  onChange={e => setCategorySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {filteredCategories.map(cat => {
                const isChecked = filters.categories.includes(cat.value);
                return (
                  <label
                    key={cat.value}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-xs select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCategory(cat.value)}
                      className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer accent-blue-600"
                    />
                    <span className="text-sm leading-none">{cat.icon}</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                      {cat.label}
                    </span>
                  </label>
                );
              })}
              {filteredCategories.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No categories found</p>
              )}
            </div>

            <div className="p-2.5 px-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={() => onChange({ ...filters, categories: [] })}
                disabled={filters.categories.length === 0}
                className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer transition-colors"
              >
                Clear
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                {filters.categories.length} of {allCategoryOptions.length}
              </span>
            </div>
          </>
        ) : selectedField === 'Priority' ? (
          /* Priority Filter Content */
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
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-xs select-none transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePriority(p.id)}
                      className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer accent-blue-600"
                    />
                    <span className={`text-sm font-bold ${p.color}`}>{p.icon}</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                      {p.label}
                    </span>
                  </label>
                );
              })}
              {filteredPriorities.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No priorities found</p>
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
                {filters.priorities.length} of {PRIORITY_OPTIONS.length}
              </span>
            </div>
          </>
        ) : selectedField === 'Members' ? (
          /* Members Range Filter Content */
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                  PREDEFINED RANGES
                </p>
                <div className="space-y-1">
                  {PREDEFINED_MEMBER_RANGES.map(range => {
                    const isSelected = filters.members.type === range.id;
                    return (
                      <label
                        key={range.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs select-none transition-all ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => selectPredefinedRange(range.id)}
                          className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer accent-blue-600"
                        />
                        <span>{range.label} members</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                  CUSTOM RANGE
                </p>
                <form onSubmit={applyCustomMemberRange} className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={customMin}
                    onChange={e => setCustomMin(e.target.value)}
                    className="w-16 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={customMax}
                    onChange={e => setCustomMax(e.target.value)}
                    className="w-16 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
                {filters.members.type === 'custom' && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1.5">
                    Active range: {filters.members.min} to {filters.members.max} members
                  </p>
                )}
              </div>
            </div>

            <div className="p-2.5 px-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, members: { type: 'all', min: '', max: '' } });
                  setCustomMin('');
                  setCustomMax('');
                }}
                disabled={filters.members.type === 'all'}
                className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer transition-colors"
              >
                Clear
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                {filters.members.type !== 'all' ? 'Filtered' : 'All'}
              </span>
            </div>
          </>
        ) : (
          /* Status Filter Content */
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                  PREDEFINED STATUS
                </p>
                <div className="space-y-1">
                  {PREDEFINED_STATUSES.map(status => {
                    const isChecked = filters.status.selected.includes(status.id);
                    return (
                      <label
                        key={status.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-xs select-none transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleStatus(status.id)}
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer accent-blue-600"
                          />
                          <span className="text-slate-800 dark:text-slate-200 font-medium">
                            {status.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {status.subtext}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Custom Statuses Added */}
              {filters.status.custom.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                    CUSTOM STATUSES
                  </p>
                  <div className="space-y-1">
                    {filters.status.custom.map(cust => {
                      const isChecked = filters.status.selected.includes(cust);
                      return (
                        <label
                          key={cust}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-xs select-none transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleStatus(cust)}
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer accent-blue-600"
                          />
                          <span className="text-slate-800 dark:text-slate-200 font-medium capitalize">
                            {cust}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add Custom Status Input */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                  ADD CUSTOM STATUS
                </p>
                <form onSubmit={addCustomStatus} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. in-review, archived"
                    value={customStatusInput}
                    onChange={e => setCustomStatusInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </form>
              </div>
            </div>

            <div className="p-2.5 px-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    status: { ...filters.status, selected: [] },
                  })
                }
                disabled={filters.status.selected.length === 0}
                className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer transition-colors"
              >
                Clear
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                {filters.status.selected.length} selected
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
