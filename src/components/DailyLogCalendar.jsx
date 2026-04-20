import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/* ── Helpers ── */
function toDateStr(date) { return date.toISOString().split('T')[0]; }
function todayStr() { return toDateStr(new Date()); }
function getMonthDays(year, month) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}
function getWeekDays(dateStr) {
  const base = new Date(dateStr + 'T00:00:00');
  const dow = base.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - dow + i);
    return toDateStr(d);
  });
}
function logKey(dateStr) { return `daily_log_${dateStr}`; }
function loadLog(dateStr) { return storage.get(logKey(dateStr), { todos: [], memo: '' }); }
function saveLog(dateStr, data) { storage.set(logKey(dateStr), data); }
function hasTodosOnDate(dateStr) {
  const d = storage.get(logKey(dateStr));
  return !!(d && Array.isArray(d.todos) && d.todos.some(t => t.text?.trim()));
}

/* ── DayCell: defined OUTSIDE main component to keep stable identity ── */
function DayCell({ dateStr, compact, isToday, isSelected, hasTodos, hasDeadline, onClick, isDragTarget, onDragOver, onDrop }) {
  if (!dateStr) return <div />;
  const dayNum = parseInt(dateStr.split('-')[2], 10);
  const h = compact ? 'h-7' : 'h-9';
  return (
    <button
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-center rounded-lg transition-all duration-100 ${h} ${
        isDragTarget ? 'bg-blue-100 ring-2 ring-blue-400 text-blue-700'
        : isToday ? 'bg-gray-900 text-white'
        : isSelected ? 'bg-gray-100 text-gray-900 ring-1 ring-gray-300'
        : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <span className={`font-medium leading-none ${compact ? 'text-[11px]' : 'text-xs'}`}>{dayNum}</span>
      {(hasTodos || hasDeadline) && (
        <div className="flex gap-0.5 mt-0.5">
          {hasTodos && <span className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />}
          {hasDeadline && <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />}
        </div>
      )}
    </button>
  );
}

/* ── Main component ── */
const DOW_KO = ['일','월','화','수','목','금','토'];

export default function DailyLogCalendar({ tasks = [], stacks = [], timetable = [], compact = false, onRecordActivity }) {
  const TODAY = todayStr();
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [viewMode, setViewMode] = useState('month');
  const [calDate, setCalDate] = useState(new Date());

  // Separate local state for the input to avoid unnecessary re-renders
  const [todos, setTodos] = useState([]);
  const [memo, setMemo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggingTask, setDraggingTask] = useState(null);
  const [dropTargetDate, setDropTargetDate] = useState(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [calendarCollapsed, setCalendarCollapsed] = useState(isMobile);
  const [tasksCollapsed, setTasksCollapsed] = useState(isMobile);
  const [noticeText, setNoticeText] = useState(() => storage.get('mergee_daily_notice', ''));
  const [noticeEditing, setNoticeEditing] = useState(false);
  const [dailyLinks, setDailyLinks] = useState(() => storage.get('mergee_daily_links', []));
  const [showLinkAdd, setShowLinkAdd] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const inputRefs = useRef({});
  const memoTimer = useRef(null);
  const noticeTimer = useRef(null);

  /* Load on date change */
  useEffect(() => {
    const data = loadLog(selectedDate);
    setTodos(data.todos || []);
    setMemo(data.memo || '');
    setEditingId(null);
  }, [selectedDate]);

  const save = useCallback((newTodos, newMemo) => {
    saveLog(selectedDate, { todos: newTodos, memo: newMemo });
  }, [selectedDate]);

  /* Todo operations */
  const addTodo = useCallback((afterId = null) => {
    setTodos(prev => {
      const item = { id: `dl_${Date.now()}`, text: '', done: false };
      let next;
      if (afterId === null) {
        next = [...prev, item];
      } else {
        const idx = prev.findIndex(t => t.id === afterId);
        next = [...prev.slice(0, idx + 1), item, ...prev.slice(idx + 1)];
      }
      saveLog(selectedDate, { todos: next, memo });
      setEditingId(item.id);
      setTimeout(() => inputRefs.current[item.id]?.focus(), 30);
      return next;
    });
  }, [selectedDate, memo]);

  // KEY FIX: updateText only updates local state immediately, saves debounced
  const updateText = useCallback((id, text) => {
    setTodos(prev => {
      const next = prev.map(t => t.id === id ? { ...t, text } : t);
      saveLog(selectedDate, { todos: next, memo });
      return next;
    });
  }, [selectedDate, memo]);

  const toggleTodo = useCallback((id) => {
    setTodos(prev => {
      const next = prev.map(t => t.id === id ? { ...t, done: !t.done } : t);
      saveLog(selectedDate, { todos: next, memo });
      return next;
    });
  }, [selectedDate, memo]);

  const deleteTodo = useCallback((id) => {
    setTodos(prev => {
      const idx = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      saveLog(selectedDate, { todos: next, memo });
      if (editingId === id) {
        if (idx > 0) {
          const prevId = prev[idx - 1].id;
          setEditingId(prevId);
          setTimeout(() => inputRefs.current[prevId]?.focus(), 30);
        } else {
          setEditingId(null);
        }
      }
      return next;
    });
  }, [selectedDate, memo, editingId]);

  const handleKeyDown = useCallback((e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTodo(id);
    } else if (e.key === 'Backspace') {
      setTodos(prev => {
        const todo = prev.find(t => t.id === id);
        if (todo?.text === '') {
          e.preventDefault();
          const idx = prev.findIndex(t => t.id === id);
          const next = prev.filter(t => t.id !== id);
          saveLog(selectedDate, { todos: next, memo });
          if (idx > 0) {
            const prevId = prev[idx - 1].id;
            setEditingId(prevId);
            setTimeout(() => inputRefs.current[prevId]?.focus(), 30);
          } else {
            setEditingId(null);
          }
          return next;
        }
        return prev;
      });
    }
  }, [addTodo, selectedDate, memo]);

  /* Drag & drop */
  const onDragStart = (e, idx) => { e.dataTransfer.effectAllowed = 'move'; setDragIndex(idx); };
  const onDragOver = (e, idx) => { e.preventDefault(); setDragOverIndex(idx); };
  const onDrop = useCallback((e, idx) => {
    e.preventDefault();
    setTodos(prev => {
      if (dragIndex === null || dragIndex === idx) { setDragIndex(null); setDragOverIndex(null); return prev; }
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(idx, 0, moved);
      saveLog(selectedDate, { todos: next, memo });
      setDragIndex(null);
      setDragOverIndex(null);
      return next;
    });
  }, [dragIndex, selectedDate, memo]);
  const onDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  /* Task → date drag-drop */
  const handleTaskDropOnDate = useCallback((dateStr, task) => {
    if (!task) return;
    const log = loadLog(dateStr);
    const newTodo = { id: `dl_${Date.now()}`, text: task.name, done: false };
    const updated = { todos: [...(log.todos || []), newTodo], memo: log.memo || '' };
    saveLog(dateStr, updated);
    if (dateStr === selectedDate) {
      setTodos(prev => [...prev, newTodo]);
    }
    setDraggingTask(null);
    setDropTargetDate(null);
  }, [selectedDate]);

  /* Task → selected date (click + button) */
  const addTaskAsTodo = useCallback((task) => {
    const newTodo = { id: `dl_${Date.now()}`, text: task.name, done: false };
    setTodos(prev => {
      const next = [...prev, newTodo];
      saveLog(selectedDate, { todos: next, memo });
      return next;
    });
  }, [selectedDate, memo]);

  /* Notice & daily links persistence */
  useEffect(() => {
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => storage.set('mergee_daily_notice', noticeText), 400);
    return () => clearTimeout(noticeTimer.current);
  }, [noticeText]);

  useEffect(() => {
    storage.set('mergee_daily_links', dailyLinks);
  }, [dailyLinks]);

  const addDailyLink = useCallback(() => {
    if (!newLinkUrl.trim()) return;
    const url = /^https?:\/\//.test(newLinkUrl.trim()) ? newLinkUrl.trim() : 'https://' + newLinkUrl.trim();
    setDailyLinks(prev => [...prev, { id: String(Date.now()), label: newLinkLabel.trim(), url }]);
    setNewLinkLabel('');
    setNewLinkUrl('');
    setShowLinkAdd(false);
  }, [newLinkLabel, newLinkUrl]);

  /* Memo: update local state immediately, debounce save */
  const handleMemoChange = useCallback((val) => {
    setMemo(val);
    clearTimeout(memoTimer.current);
    memoTimer.current = setTimeout(() => {
      setTodos(prev => { saveLog(selectedDate, { todos: prev, memo: val }); return prev; });
    }, 500);
  }, [selectedDate]);

  /* Calendar navigation */
  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() - 7);
      setSelectedDate(toDateStr(d));
      setCalDate(d);
    }
  };
  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else {
      const d = new Date(selectedDate + 'T00:00:00');
      d.setDate(d.getDate() + 7);
      setSelectedDate(toDateStr(d));
      setCalDate(d);
    }
  };

  /* Deadline index */
  const deadlineDates = useMemo(() => {
    const map = {};
    stacks.filter(s => s.examDate && !s.passed).forEach(s => {
      map[s.examDate] = [...(map[s.examDate] || []), { name: s.name, color: s.color, type: 'stack' }];
    });
    tasks.filter(t => t.dueDate && !t.done).forEach(t => {
      map[t.dueDate] = [...(map[t.dueDate] || []), { name: t.name, color: t.color || '#6366f1', type: 'task' }];
    });
    return map;
  }, [stacks, tasks]);

  const selectedDeadlines = deadlineDates[selectedDate] || [];

  /* Calendar days */
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const calDays = viewMode === 'month' ? getMonthDays(year, month) : getWeekDays(selectedDate);

  const calHeader = viewMode === 'month'
    ? `${year}년 ${month + 1}월`
    : (() => {
        const days = getWeekDays(selectedDate);
        const s = new Date(days[0] + 'T00:00:00');
        const e = new Date(days[6] + 'T00:00:00');
        return `${s.getMonth() + 1}월 ${s.getDate()}일 — ${e.getMonth() + 1}월 ${e.getDate()}일`;
      })();

  const selectedDateLabel = new Date(selectedDate + 'T00:00:00')
    .toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  /* ─── Render functions (called as functions, not as <Component />, to prevent remounting) ─── */

  const renderNavButtons = (small = false) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setViewMode(v => v === 'month' ? 'week' : 'month')}
        className={`font-semibold text-gray-400 hover:text-gray-700 px-2 rounded-lg hover:bg-gray-50 transition-colors ${small ? 'text-[10px] py-1' : 'text-xs py-1.5'}`}
      >
        {viewMode === 'month' ? 'week' : 'month'}
      </button>
      <button onClick={prevPeriod}
        className={`flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${small ? 'w-5 h-5' : 'w-6 h-6'}`}>
        <svg width={small ? 9 : 11} height={small ? 9 : 11} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className={`font-semibold text-gray-700 text-center ${small ? 'text-[10px] min-w-[64px]' : 'text-xs min-w-[80px]'}`}>{calHeader}</span>
      <button onClick={nextPeriod}
        className={`flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors ${small ? 'w-5 h-5' : 'w-6 h-6'}`}>
        <svg width={small ? 9 : 11} height={small ? 9 : 11} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );

  const renderCalendar = () => (
    <>
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map(l => (
          <div key={l} className={`text-center font-semibold text-gray-300 ${compact ? 'text-[10px] py-0.5' : 'text-[11px] py-1'}`}>{l}</div>
        ))}
      </div>
      {viewMode === 'month' ? (
        <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'}`}>
          {calDays.map((dateStr, i) =>
            dateStr
              ? <DayCell
                  key={dateStr}
                  dateStr={dateStr}
                  compact={compact}
                  isToday={dateStr === TODAY}
                  isSelected={dateStr === selectedDate}
                  hasTodos={hasTodosOnDate(dateStr)}
                  hasDeadline={!!deadlineDates[dateStr]}
                  onClick={() => { setSelectedDate(dateStr); if (viewMode === 'week') setCalDate(new Date(dateStr + 'T00:00:00')); }}
                  isDragTarget={!!draggingTask && dropTargetDate === dateStr}
                  onDragOver={draggingTask ? (e) => { e.preventDefault(); setDropTargetDate(dateStr); } : undefined}
                  onDrop={draggingTask ? (e) => { e.preventDefault(); handleTaskDropOnDate(dateStr, draggingTask); } : undefined}
                />
              : <div key={i} />
          )}
        </div>
      ) : (
        <div className="flex gap-1">
          {calDays.map(dateStr => (
            <DayCell
              key={dateStr}
              dateStr={dateStr}
              compact={compact}
              isToday={dateStr === TODAY}
              isSelected={dateStr === selectedDate}
              hasTodos={hasTodosOnDate(dateStr)}
              hasDeadline={!!deadlineDates[dateStr]}
              onClick={() => { setSelectedDate(dateStr); setCalDate(new Date(dateStr + 'T00:00:00')); }}
              isDragTarget={!!draggingTask && dropTargetDate === dateStr}
              onDragOver={draggingTask ? (e) => { e.preventDefault(); setDropTargetDate(dateStr); } : undefined}
              onDrop={draggingTask ? (e) => { e.preventDefault(); handleTaskDropOnDate(dateStr, draggingTask); } : undefined}
            />
          ))}
        </div>
      )}
    </>
  );

  const renderTodoList = () => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">할 일</p>
        <button
          onClick={() => addTodo()}
          className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="space-y-0.5">
        {todos.length === 0 && (
          <button
            onClick={() => addTodo()}
            className="w-full text-left text-xs text-gray-300 hover:text-gray-500 py-2 transition-colors"
          >
            + 할 일 추가...
          </button>
        )}
        {todos.map((todo, idx) => (
          <div
            key={todo.id}
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={onDragEnd}
            className={`group flex items-center gap-2 py-1.5 px-1.5 rounded-lg transition-all ${
              dragOverIndex === idx && dragIndex !== idx ? 'bg-blue-50' : 'hover:bg-gray-50'
            } ${dragIndex === idx ? 'opacity-40' : ''}`}
          >
            {/* Drag handle */}
            <div className="w-3 flex-shrink-0 cursor-grab flex flex-col gap-0.5 opacity-0 group-hover:opacity-30 transition-opacity">
              {[0, 1, 2].map(i => <span key={i} className="block w-3 h-0.5 bg-gray-400 rounded" />)}
            </div>

            {/* Checkbox */}
            <button
              onClick={() => toggleTodo(todo.id)}
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                todo.done ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-600'
              }`}
            >
              {todo.done && (
                <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {/* Text — input is always rendered to avoid focus loss; visibility controlled */}
            {editingId === todo.id ? (
              <input
                ref={el => { if (el) inputRefs.current[todo.id] = el; }}
                value={todo.text}
                onChange={(e) => updateText(todo.id, e.target.value)}
                onBlur={() => {
                  if (!todo.text.trim()) deleteTodo(todo.id);
                  else setEditingId(null);
                }}
                onKeyDown={(e) => handleKeyDown(e, todo.id)}
                className="flex-1 text-sm text-gray-800 bg-transparent outline-none min-w-0"
              />
            ) : (
              <span
                onClick={() => setEditingId(todo.id)}
                className={`flex-1 text-sm cursor-text truncate ${todo.done ? 'line-through text-gray-300' : 'text-gray-700'}`}
              >
                {todo.text || <span className="text-gray-300 italic text-xs">클릭하여 편집...</span>}
              </span>
            )}

            {/* Delete */}
            <button
              onClick={() => deleteTodo(todo.id)}
              className="w-5 h-5 flex items-center justify-center text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0 rounded transition-all"
            >
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {todos.length > 0 && !editingId && (
        <button
          onClick={() => addTodo()}
          className="mt-1 w-full text-left text-[11px] text-gray-300 hover:text-gray-500 py-1 px-1.5 transition-colors"
        >
          + 추가
        </button>
      )}
    </div>
  );

  const renderTasksPanel = () => {
    const available = tasks.filter(t => !t.done);
    if (available.length === 0) return null;
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tasks 가져오기</p>
          <button
            onClick={() => setShowTaskPanel(v => !v)}
            className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showTaskPanel ? '닫기 ↑' : `${available.length}개 펼치기 ↓`}
          </button>
        </div>
        {!showTaskPanel && (
          <p className="text-[11px] text-gray-300 py-0.5">
            Task를 달력 날짜에 드래그하거나 + 버튼으로 오늘에 추가하세요
          </p>
        )}
        {showTaskPanel && (
          <div className="space-y-0.5">
            {available.slice(0, 20).map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={() => setDraggingTask(task)}
                onDragEnd={() => { setDraggingTask(null); setDropTargetDate(null); }}
                className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-grab active:opacity-50 transition-all"
              >
                <div className="w-3 flex-shrink-0 flex flex-col gap-0.5 opacity-0 group-hover:opacity-30 transition-opacity cursor-grab">
                  {[0,1,2].map(i => <span key={i} className="block w-3 h-0.5 bg-gray-400 rounded" />)}
                </div>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: task.color || '#6366f1' }} />
                <span className="flex-1 text-xs text-gray-600 truncate">{task.name}</span>
                {task.dueDate && (
                  <span className="text-[10px] text-gray-300 flex-shrink-0">~{task.dueDate.slice(5)}</span>
                )}
                <button
                  onClick={() => addTaskAsTodo(task)}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all flex-shrink-0 text-sm font-bold"
                  title={`"${task.name}"을 오늘 할 일에 추가`}
                >
                  +
                </button>
              </div>
            ))}
            {available.length > 20 && (
              <p className="text-[10px] text-gray-300 px-2 py-1">+ {available.length - 20}개 더 있음</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTimeline = () => {
    if (!timetable || timetable.length === 0) return null;
    const selectedDow = new Date(selectedDate + 'T00:00:00').getDay();
    const todayClasses = timetable.filter(cls => {
      if (!cls.day) return false;
      return cls.day.split(',').map(d => d.trim()).includes(DOW_KO[selectedDow]);
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    if (todayClasses.length === 0) return null;
    return (
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">오늘 수업</p>
        <div className="space-y-1.5">
          {todayClasses.map(cls => (
            <div key={cls.id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ backgroundColor: cls.color + '15', borderLeft: `3px solid ${cls.color}` }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{cls.subject}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {cls.time && <span className="text-[10px] text-gray-500">{cls.time}</span>}
                  {cls.room && <span className="text-[10px] text-gray-400">📍{cls.room}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDeadlines = () => {
    if (selectedDeadlines.length === 0) return null;
    return (
      <div className="mt-4">
        <p className="text-[10px] font-bold text-red-300 uppercase tracking-widest mb-2">마감일</p>
        <div className="space-y-1.5">
          {selectedDeadlines.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-red-50 rounded-lg px-2.5 py-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-gray-700 font-medium flex-1 truncate">{d.name}</span>
              <span className="text-red-400 text-[10px] font-semibold flex-shrink-0">{d.type === 'stack' ? '시험' : 'task'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNotice = () => (
    <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 flex items-center gap-2 flex-shrink-0">
      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-amber-400 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
      {noticeEditing ? (
        <input
          autoFocus
          value={noticeText}
          onChange={(e) => setNoticeText(e.target.value)}
          onBlur={() => setNoticeEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setNoticeEditing(false); }}
          placeholder="공지사항을 입력하세요..."
          className="flex-1 text-xs text-amber-800 bg-transparent outline-none placeholder-amber-300 min-w-0"
        />
      ) : (
        <span
          onClick={() => setNoticeEditing(true)}
          className={`flex-1 text-xs cursor-text truncate ${noticeText ? 'text-amber-800' : 'text-amber-300 italic'}`}
        >
          {noticeText || '공지사항... (클릭하여 편집)'}
        </span>
      )}
      <button
        onClick={() => setNoticeEditing(v => !v)}
        className="w-4 h-4 flex items-center justify-center text-amber-300 hover:text-amber-600 flex-shrink-0 transition-colors rounded"
      >
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </div>
  );

  const renderDailyLinks = () => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">관련 링크</p>
        <button
          onClick={() => setShowLinkAdd(v => !v)}
          className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {dailyLinks.length === 0 && !showLinkAdd && (
        <p className="text-xs text-gray-300 py-0.5">링크를 추가해보세요</p>
      )}

      <div className="space-y-0.5">
        {dailyLinks.map(link => (
          <div key={link.id} className="group flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-gray-50 transition-colors">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-300 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 text-xs text-blue-500 hover:text-blue-700 hover:underline truncate"
            >
              {link.label || link.url.replace(/^https?:\/\//, '')}
            </a>
            <button
              onClick={() => setDailyLinks(prev => prev.filter(l => l.id !== link.id))}
              className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
            >
              <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {showLinkAdd && (
        <div className="mt-2 space-y-1.5">
          <input
            value={newLinkLabel}
            onChange={(e) => setNewLinkLabel(e.target.value)}
            placeholder="이름 (선택)"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
          <input
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="URL (예: github.com)"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
            onKeyDown={(e) => { if (e.key === 'Enter') addDailyLink(); }}
          />
          <div className="flex gap-1.5">
            <button
              onClick={addDailyLink}
              disabled={!newLinkUrl.trim()}
              className="flex-1 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-200 transition-colors"
            >
              추가
            </button>
            <button
              onClick={() => { setShowLinkAdd(false); setNewLinkLabel(''); setNewLinkUrl(''); }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /* ─── COMPACT ─── */
  if (compact) {
    return (
      <div className="bg-white rounded-2xl p-5 flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">daily log</span>
          {renderNavButtons(true)}
        </div>
        <div className="flex-shrink-0">{renderCalendar()}</div>
        <div className="border-t border-gray-50 flex-shrink-0" />
        <p className="text-xs font-semibold text-gray-700 flex-shrink-0">{selectedDateLabel}</p>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-0">
          {renderTimeline() && <div className="mb-3">{renderTimeline()}</div>}
          {renderTodoList()}
          {renderDeadlines()}
          <div className="mt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">메모</p>
            <textarea
              value={memo}
              onChange={(e) => handleMemoChange(e.target.value)}
              placeholder="오늘의 메모..."
              rows={3}
              className="w-full resize-none text-xs text-gray-700 bg-gray-50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-300"
            />
          </div>
        </div>
      </div>
    );
  }

  /* ─── FULL PAGE ─── */
  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: '#f8f8f6' }}>

      {/* Left: Calendar panel — collapsible */}
      {!calendarCollapsed ? (
        <div className="w-[260px] bg-white border-r border-gray-100 p-4 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          <div className="flex items-center justify-between">
            {renderNavButtons()}
            <button
              onClick={() => setCalendarCollapsed(true)}
              title="캘린더 접기"
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          {renderCalendar()}
          <div className="flex flex-col gap-1.5 pt-0.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-gray-300">할 일 있음</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-[10px] text-gray-300">마감일</span>
              </div>
            </div>
            {draggingTask && (
              <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-2 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-[10px] text-blue-600 font-semibold">날짜 위에 드롭하여 추가</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-9 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col items-center pt-3">
          <button
            onClick={() => setCalendarCollapsed(false)}
            title="캘린더 펼치기"
            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* My Tasks panel — collapsible */}
      {!tasksCollapsed ? (
        <div className="w-[300px] bg-white border-r border-gray-100 flex-shrink-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-gray-50">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">My Tasks</p>
              <p className="text-sm font-bold text-gray-900 truncate leading-tight">{selectedDateLabel}</p>
            </div>
            <button
              onClick={() => setTasksCollapsed(true)}
              title="할 일 패널 접기"
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex-shrink-0 ml-2"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 min-h-0">
            {renderTimeline()}
            {renderTodoList()}
            {renderDeadlines()}
          </div>
        </div>
      ) : (
        <div className="w-9 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col items-center pt-3">
          <button
            onClick={() => setTasksCollapsed(false)}
            title="할 일 패널 펼치기"
            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content: notice + upper split + memo */}
      <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-4 gap-2 md:gap-3 min-w-0">

        {/* 공통 공지 */}
        {renderNotice()}

        {/* Upper: Tasks 가져오기 + 관련 링크 — side by side on desktop, stacked on mobile */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-3 flex-shrink-0">
          {/* Tasks 가져오기 */}
          <div
            className="flex-1 bg-white rounded-2xl p-4 min-w-0 overflow-hidden"
            style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}
          >
            {tasks.filter(t => !t.done).length > 0 ? (
              renderTasksPanel()
            ) : (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Tasks 가져오기</p>
                <p className="text-xs text-gray-300">진행 중인 Task가 없습니다</p>
              </div>
            )}
          </div>
          {/* 관련 링크 */}
          <div
            className="flex-1 bg-white rounded-2xl p-4 min-w-0 overflow-hidden"
            style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}
          >
            {renderDailyLinks()}
          </div>
        </div>

        {/* 메모 — 전체 너비, 화면 하단까지 확장 */}
        <div
          className="flex-1 bg-white rounded-2xl flex flex-col min-h-0 overflow-hidden"
          style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0 border-b border-gray-50">
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">메모</span>
            <span className="text-[10px] text-gray-200">{memo.length > 0 ? `${memo.length}자` : ''}</span>
          </div>
          <textarea
            value={memo}
            onChange={(e) => handleMemoChange(e.target.value)}
            placeholder={`${selectedDateLabel.split(' ').slice(-1)[0]} 기록...`}
            className="flex-1 w-full resize-none px-5 py-4 text-sm text-gray-700 bg-transparent focus:outline-none placeholder-gray-200 leading-7 min-h-0"
            style={{ fontFamily: 'inherit' }}
          />
        </div>

      </div>
    </div>
  );
}
