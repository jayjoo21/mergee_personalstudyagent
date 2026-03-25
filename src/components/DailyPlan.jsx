import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getTodayMission } from '../utils/claude';
import { storage } from '../utils/storage';
import { getTodayStr } from '../utils/helpers';

const PLAN_STORAGE_KEY = 'mergee_daily_plan';

const PRIORITY_STYLES = {
  high: { badge: 'bg-red-50 text-red-600', dot: '#ef4444' },
  medium: { badge: 'bg-yellow-50 text-yellow-600', dot: '#f59e0b' },
  low: { badge: 'bg-gray-100 text-gray-500', dot: '#9ca3af' },
};

/**
 * Parse a duration string and return estimated minutes.
 */
const parseDurationToMinutes = (duration) => {
  if (!duration) return 0;
  let total = 0;
  const hoursKo = duration.match(/(\d+(?:\.\d+)?)\s*시간/);
  if (hoursKo) total += Math.round(parseFloat(hoursKo[1]) * 60);
  const minsKo = duration.match(/(\d+)\s*분/);
  if (minsKo) total += parseInt(minsKo[1], 10);
  if (total === 0) {
    const hoursEn = duration.match(/(\d+(?:\.\d+)?)\s*hour/i);
    if (hoursEn) total += Math.round(parseFloat(hoursEn[1]) * 60);
    const minsEn = duration.match(/(\d+)\s*min/i);
    if (minsEn) total += parseInt(minsEn[1], 10);
  }
  if (total === 0) {
    const num = duration.match(/\d+/);
    if (num) total = parseInt(num[0], 10);
  }
  return total;
};

const SkeletonRow = () => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 animate-pulse">
    <div className="w-12 h-5 bg-gray-100 rounded-full mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <div className="h-4 bg-gray-100 rounded w-1/3" />
      <div className="h-3 bg-gray-100 rounded w-3/4" />
    </div>
    <div className="w-14 h-4 bg-gray-100 rounded flex-shrink-0" />
  </div>
);

export default function DailyPlan({ stacks, apiKey, onAcceptPlan, onNavigateToStack, tasks = [] }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [done, setDone] = useState(new Set());

  // Inline editing
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Manual add
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualForm, setManualForm] = useState({ stack: '', mission: '', duration: '', priority: 'medium' });

  // MY TASKS picker
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const taskPickerRef = useRef(null);

  // Drag reorder
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragIdx = useRef(null);

  useEffect(() => {
    if (!showTaskPicker) return;
    const handler = (e) => {
      if (taskPickerRef.current && !taskPickerRef.current.contains(e.target)) {
        setShowTaskPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTaskPicker]);

  const toggleDone = (i) => setDone((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  const activeStacks = (stacks || []).filter((s) => !s.passed);

  const loadOrGenerate = useCallback(
    async (force = false) => {
      const today = getTodayStr();
      if (!force) {
        const cached = storage.get(PLAN_STORAGE_KEY);
        if (cached && cached.date === today && Array.isArray(cached.plan) && cached.plan.length > 0) {
          setPlan(cached.plan);
          return;
        }
      }
      if (!apiKey) return;
      if (activeStacks.length === 0) {
        setPlan([]);
        return;
      }
      setLoading(true);
      setError(null);
      setAccepted(false);
      try {
        const result = await getTodayMission(apiKey, activeStacks);
        const enriched = (result || []).map((item) => {
          const matched = activeStacks.find(
            (s) => s.name === item.stack || (item.stack && s.name.includes(item.stack))
          );
          return {
            ...item,
            stackId: matched?.id || null,
            goalMinutes: parseDurationToMinutes(item.duration),
          };
        });
        setPlan(enriched);
        storage.set(PLAN_STORAGE_KEY, { date: today, plan: enriched });
      } catch (e) {
        setError(e.message || 'Failed to generate plan');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiKey, JSON.stringify(activeStacks.map((s) => s.id))]
  );

  useEffect(() => {
    loadOrGenerate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = () => {
    if (!plan || plan.length === 0) return;
    const timerGoals = {};
    plan.forEach((item) => {
      if (item.stackId && item.goalMinutes > 0) {
        timerGoals[item.stackId] = item.goalMinutes;
      }
    });
    setAccepted(true);
    onAcceptPlan?.(timerGoals);
  };

  const handleRegenerate = () => {
    loadOrGenerate(true);
  };

  // Inline edit handlers
  const startEdit = (i) => {
    setEditingIdx(i);
    setEditForm({ ...plan[i] });
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    const updated = plan.map((item, i) => i === editingIdx ? { ...editForm, goalMinutes: parseDurationToMinutes(editForm.duration) } : item);
    setPlan(updated);
    storage.set(PLAN_STORAGE_KEY, { date: getTodayStr(), plan: updated });
    setEditingIdx(null);
  };

  const deleteItem = (idx) => {
    const updated = plan.filter((_, i) => i !== idx);
    setPlan(updated);
    storage.set(PLAN_STORAGE_KEY, { date: getTodayStr(), plan: updated });
    setDone((prev) => {
      const next = new Set();
      prev.forEach((i) => { if (i < idx) next.add(i); else if (i > idx) next.add(i - 1); });
      return next;
    });
  };

  // Manual add
  const addManualItem = () => {
    if (!manualForm.stack.trim() && !manualForm.mission.trim()) return;
    const newItem = {
      stack: manualForm.stack,
      mission: manualForm.mission,
      duration: manualForm.duration,
      priority: manualForm.priority,
      stackId: null,
      goalMinutes: parseDurationToMinutes(manualForm.duration),
    };
    const updated = [...(plan || []), newItem];
    setPlan(updated);
    storage.set(PLAN_STORAGE_KEY, { date: getTodayStr(), plan: updated });
    setManualForm({ stack: '', mission: '', duration: '', priority: 'medium' });
    setShowManualAdd(false);
  };

  // MY TASKS add
  const addFromTask = (task) => {
    const newItem = {
      stack: task.name,
      mission: task.name + ' 완료',
      duration: '',
      priority: 'medium',
      stackId: null,
      goalMinutes: 0,
    };
    const updated = [...(plan || []), newItem];
    setPlan(updated);
    storage.set(PLAN_STORAGE_KEY, { date: getTodayStr(), plan: updated });
  };

  // Drag reorder
  const handleDragStart = (idx) => {
    dragIdx.current = idx;
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx) => {
    const from = dragIdx.current;
    if (from === null || from === idx) { setDragOverIdx(null); return; }
    const updated = [...plan];
    const [item] = updated.splice(from, 1);
    updated.splice(idx, 0, item);
    setPlan(updated);
    storage.set(PLAN_STORAGE_KEY, { date: getTodayStr(), plan: updated });
    dragIdx.current = null;
    setDragOverIdx(null);
  };

  const activeTasks = (tasks || []).filter(t => !t.done);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            today's plan
          </span>
          {plan && plan.length > 0 && !loading && (
            <span className="text-xs text-gray-400">
              · {done.size}/{plan.length}
            </span>
          )}
        </div>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded-lg hover:bg-gray-50"
        >
          <svg
            className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4.93 15A9 9 0 1 0 6.5 6.5L4 9" />
          </svg>
          regenerate
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : error ? (
        <div className="py-4 text-center">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button onClick={handleRegenerate} className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors">
            try again
          </button>
        </div>
      ) : !plan || plan.length === 0 ? (
        <div className="py-6 text-center text-gray-400 text-sm">
          {activeStacks.length === 0
            ? 'Add a study stack to generate your daily plan.'
            : !apiKey
            ? 'Set your API key to auto-generate a daily plan.'
            : 'No plan generated yet.'}
        </div>
      ) : (
        <div>
          {plan.map((item, i) => {
            const pStyle = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.low;
            const isDone = done.has(i);
            const isDragOver = dragOverIdx === i;

            if (editingIdx === i) {
              return (
                <div key={i} className="py-3 border-b border-gray-50 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={editForm.stack || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, stack: e.target.value }))}
                      placeholder="Stack"
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
                    />
                    <select
                      value={editForm.priority || 'medium'}
                      onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none bg-white"
                    >
                      <option value="high">high</option>
                      <option value="medium">medium</option>
                      <option value="low">low</option>
                    </select>
                  </div>
                  <input
                    value={editForm.mission || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, mission: e.target.value }))}
                    placeholder="Mission"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  <input
                    value={editForm.duration || ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, duration: e.target.value }))}
                    placeholder="Duration (e.g. 1시간 30분)"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  <div className="flex gap-1.5">
                    <button onClick={saveEdit} className="flex-1 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">저장</button>
                    <button onClick={() => setEditingIdx(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">취소</button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={i}
                draggable={true}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => setDragOverIdx(null)}
                className={`group flex items-start gap-3 py-3.5 border-b border-gray-50 last:border-0 transition-opacity duration-150 cursor-grab active:cursor-grabbing ${isDone ? 'opacity-50' : ''} ${isDragOver ? 'bg-gray-50 rounded-xl' : ''}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleDone(i)}
                  className={`flex-shrink-0 w-4.5 h-4.5 mt-0.5 rounded border transition-all duration-150 flex items-center justify-center ${
                    isDone ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ width: '18px', height: '18px', borderRadius: '5px' }}
                >
                  {isDone && (
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Priority badge */}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${pStyle.badge}`}>
                  {item.priority || 'low'}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold text-gray-800 leading-tight ${isDone ? 'line-through' : ''}`}>
                    {item.stack}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                    {item.mission}
                  </p>
                  {item.duration && (
                    <span className="text-[11px] text-gray-400 mt-1 block">{item.duration}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.stackId && onNavigateToStack && (
                    <button
                      onClick={() => onNavigateToStack(item.stackId)}
                      className="text-xs font-semibold px-2.5 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-900 hover:text-white rounded-xl transition-all duration-150 whitespace-nowrap"
                    >
                      시작 →
                    </button>
                  )}
                  {/* Edit button */}
                  <button
                    onClick={() => startEdit(i)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => deleteItem(i)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Control buttons */}
          <div className="flex gap-2 mt-3 mb-2">
            <button
              onClick={() => setShowManualAdd((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors font-medium"
            >
              + 직접 추가
            </button>
            {activeTasks.length > 0 && (
              <div className="relative" ref={taskPickerRef}>
                <button
                  onClick={() => setShowTaskPicker((v) => !v)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors font-medium"
                >
                  MY TASKS에서 추가
                </button>
                {showTaskPicker && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 min-w-[160px]">
                    {activeTasks.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { addFromTask(t); setShowTaskPicker(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual add form */}
          {showManualAdd && (
            <div className="mb-3 p-3 bg-gray-50 rounded-xl space-y-2">
              <div className="flex gap-2">
                <input
                  value={manualForm.stack}
                  onChange={(e) => setManualForm((p) => ({ ...p, stack: e.target.value }))}
                  placeholder="Stack 이름"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 bg-white"
                />
                <select
                  value={manualForm.priority}
                  onChange={(e) => setManualForm((p) => ({ ...p, priority: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none bg-white"
                >
                  <option value="high">high</option>
                  <option value="medium">medium</option>
                  <option value="low">low</option>
                </select>
              </div>
              <input
                value={manualForm.mission}
                onChange={(e) => setManualForm((p) => ({ ...p, mission: e.target.value }))}
                placeholder="미션 내용"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 bg-white"
              />
              <input
                value={manualForm.duration}
                onChange={(e) => setManualForm((p) => ({ ...p, duration: e.target.value }))}
                placeholder="시간 (예: 1시간 30분)"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 bg-white"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={addManualItem}
                  className="flex-1 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  추가
                </button>
                <button
                  onClick={() => { setShowManualAdd(false); setManualForm({ stack: '', mission: '', duration: '', priority: 'medium' }); }}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* Accept / Accepted button */}
          <div className="mt-4">
            {accepted ? (
              <button
                disabled
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-green-50 text-green-600 cursor-default flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                plan set
              </button>
            ) : (
              <button
                onClick={handleAccept}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all duration-150 active:scale-95 hover:scale-[1.01]"
              >
                accept plan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
