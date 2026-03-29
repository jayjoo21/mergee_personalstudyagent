import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/* ── Helpers ── */
function toDateStr(date) {
  return date.toISOString().split('T')[0];
}
function todayStr() {
  return toDateStr(new Date());
}
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
function loadLog(dateStr) {
  return storage.get(logKey(dateStr), { todos: [], memo: '' });
}
function saveLog(dateStr, data) {
  storage.set(logKey(dateStr), data);
}
function hasTodosOnDate(dateStr) {
  const d = storage.get(logKey(dateStr));
  return !!(d && Array.isArray(d.todos) && d.todos.some(t => t.text?.trim()));
}

/* ── Main component ── */
export default function DailyLogCalendar({ tasks = [], stacks = [], compact = false }) {
  const TODAY = todayStr();
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [viewMode, setViewMode] = useState('month');
  const [calDate, setCalDate] = useState(new Date());

  const [todos, setTodos] = useState([]);
  const [memo, setMemo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const inputRefs = useRef({});
  const memoTimer = useRef(null);

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
  const addTodo = (afterId = null) => {
    const item = { id: `dl_${Date.now()}`, text: '', done: false };
    let next;
    if (afterId === null) {
      next = [...todos, item];
    } else {
      const idx = todos.findIndex(t => t.id === afterId);
      next = [...todos.slice(0, idx + 1), item, ...todos.slice(idx + 1)];
    }
    setTodos(next);
    save(next, memo);
    setEditingId(item.id);
    setTimeout(() => inputRefs.current[item.id]?.focus(), 30);
  };

  const updateText = (id, text) => {
    const next = todos.map(t => t.id === id ? { ...t, text } : t);
    setTodos(next);
    save(next, memo);
  };

  const toggleTodo = (id) => {
    const next = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(next);
    save(next, memo);
  };

  const deleteTodo = (id) => {
    const idx = todos.findIndex(t => t.id === id);
    const next = todos.filter(t => t.id !== id);
    setTodos(next);
    save(next, memo);
    if (editingId === id) {
      if (idx > 0) {
        const prevId = todos[idx - 1].id;
        setEditingId(prevId);
        setTimeout(() => inputRefs.current[prevId]?.focus(), 30);
      } else setEditingId(null);
    }
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTodo(id);
    } else if (e.key === 'Backspace') {
      const todo = todos.find(t => t.id === id);
      if (todo?.text === '') {
        e.preventDefault();
        deleteTodo(id);
      }
    }
  };

  /* Drag & drop */
  const onDragStart = (e, idx) => { e.dataTransfer.effectAllowed = 'move'; setDragIndex(idx); };
  const onDragOver = (e, idx) => { e.preventDefault(); setDragOverIndex(idx); };
  const onDrop = (e, idx) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) { setDragIndex(null); setDragOverIndex(null); return; }
    const next = [...todos];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(idx, 0, moved);
    setTodos(next);
    save(next, memo);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const onDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  /* Memo debounce */
  const handleMemoChange = (val) => {
    setMemo(val);
    if (memoTimer.current) clearTimeout(memoTimer.current);
    memoTimer.current = setTimeout(() => save(todos, val), 500);
  };

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

  /* ── Sub-renders ── */
  const DayCell = ({ dateStr, stretch = false }) => {
    if (!dateStr) return <div />;
    const isToday = dateStr === TODAY;
    const isSelected = dateStr === selectedDate;
    const hasTodos = hasTodosOnDate(dateStr);
    const hasDeadline = !!deadlineDates[dateStr];
    const dayNum = parseInt(dateStr.split('-')[2], 10);
    const h = compact ? 'h-7' : 'h-9';
    return (
      <button
        onClick={() => { setSelectedDate(dateStr); if (viewMode === 'week') setCalDate(new Date(dateStr + 'T00:00:00')); }}
        className={`relative flex flex-col items-center justify-center rounded-lg transition-all duration-100 ${h} ${stretch ? 'flex-1' : ''} ${
          isToday
            ? 'bg-gray-900 text-white'
            : isSelected
            ? 'bg-gray-100 text-gray-900 ring-1 ring-gray-300'
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
  };

  const CalendarGrid = () => (
    <>
      {/* DOW labels */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map(l => (
          <div key={l} className={`text-center font-semibold text-gray-300 ${compact ? 'text-[10px] py-0.5' : 'text-[11px] py-1'}`}>{l}</div>
        ))}
      </div>
      {/* Days */}
      {viewMode === 'month' ? (
        <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'}`}>
          {calDays.map((dateStr, i) =>
            dateStr ? <DayCell key={dateStr} dateStr={dateStr} /> : <div key={i} />
          )}
        </div>
      ) : (
        <div className="flex gap-1">
          {calDays.map(dateStr => <DayCell key={dateStr} dateStr={dateStr} stretch />)}
        </div>
      )}
    </>
  );

  const TodoList = () => (
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

            {/* Text */}
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

  const DeadlineSection = () => {
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

  const NavButtons = ({ small = false }) => (
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

  /* ─── COMPACT (Dashboard embed) ─── */
  if (compact) {
    return (
      <div className="bg-white rounded-2xl p-5 flex flex-col gap-3 h-full">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">daily log</span>
          <NavButtons small />
        </div>

        {/* Calendar */}
        <div className="flex-shrink-0">
          <CalendarGrid />
        </div>

        <div className="border-t border-gray-50 flex-shrink-0" />

        {/* Selected date label */}
        <p className="text-xs font-semibold text-gray-700 flex-shrink-0">{selectedDateLabel}</p>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-0">
          <TodoList />
          <DeadlineSection />
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
      {/* Left: Calendar panel */}
      <div className="w-[380px] bg-white border-r border-gray-100 p-6 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-gray-900 tracking-tight">daily log</span>
          <NavButtons />
        </div>

        <CalendarGrid />

        {/* Legend */}
        <div className="flex items-center gap-4 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-gray-400">할 일 있음</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[11px] text-gray-400">마감일</span>
          </div>
        </div>
      </div>

      {/* Right: Todo + Memo */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-xl mx-auto space-y-4">
          {/* Date heading */}
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{selectedDateLabel}</h2>

          {/* Todo card */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
            <TodoList />
          </div>

          {/* Deadlines card */}
          {selectedDeadlines.length > 0 && (
            <div className="bg-white rounded-2xl p-6" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
              <DeadlineSection />
            </div>
          )}

          {/* Memo card */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">메모</p>
            <textarea
              value={memo}
              onChange={(e) => handleMemoChange(e.target.value)}
              placeholder="오늘의 메모를 자유롭게 작성하세요..."
              rows={8}
              className="w-full resize-none text-sm text-gray-700 bg-transparent focus:outline-none placeholder-gray-300 leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
