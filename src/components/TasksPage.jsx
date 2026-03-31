import React, { useState, useEffect, useRef } from 'react';
import { getDday, formatDday, getDdayBadgeClass } from '../utils/helpers';
import AddTaskModal from './AddTaskModal';

const DETAIL_KEY = 'mergee_task_details';

function loadDetail(taskId) {
  try {
    const all = JSON.parse(localStorage.getItem(DETAIL_KEY) || '{}');
    return all[taskId] || { todos: [], memo: '', links: [] };
  } catch { return { todos: [], memo: '', links: [] }; }
}
function saveDetail(taskId, data) {
  try {
    const all = JSON.parse(localStorage.getItem(DETAIL_KEY) || '{}');
    all[taskId] = data;
    localStorage.setItem(DETAIL_KEY, JSON.stringify(all));
  } catch {}
}
function removeDetail(taskId) {
  try {
    const all = JSON.parse(localStorage.getItem(DETAIL_KEY) || '{}');
    delete all[taskId];
    localStorage.setItem(DETAIL_KEY, JSON.stringify(all));
  } catch {}
}

export default function TasksPage({
  tasks,
  selectedTaskId: propSelectedId,
  onAddTask, onUpdateTask, onToggleTask, onDeleteTask,
  allTags = [], onCreateTag, onUpdateTag, onDeleteTag,
}) {
  const [selectedId, setSelectedId] = useState(propSelectedId || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Detail state
  const [todos, setTodos] = useState([]);
  const [memo, setMemo] = useState('');
  const [links, setLinks] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  // Tag / filter / sort / group state
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState('dday');
  const [collapsed, setCollapsed] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const [dropGroup, setDropGroup] = useState(null);

  // Tag edit state
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [editingTagId, setEditingTagId] = useState(null);
  const [editingTagName, setEditingTagName] = useState('');

  const saveTimer = useRef(null);
  const justLoadedRef = useRef(false);

  // Sync prop (sidebar nav)
  useEffect(() => { if (propSelectedId) setSelectedId(propSelectedId); }, [propSelectedId]);

  // Load on task change
  useEffect(() => {
    justLoadedRef.current = true;
    if (selectedId) {
      const d = loadDetail(selectedId);
      setTodos(d.todos || []);
      setMemo(d.memo || '');
      setLinks(d.links || []);
    } else { setTodos([]); setMemo(''); setLinks([]); }
  }, [selectedId]);

  // Auto-save (debounce, skip after load)
  useEffect(() => {
    if (!selectedId) return;
    if (justLoadedRef.current) { justLoadedRef.current = false; return; }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDetail(selectedId, { todos, memo, links }), 500);
    return () => clearTimeout(saveTimer.current);
  }, [todos, memo, links]);

  const selectedTask = tasks.find(t => t.id === selectedId) || null;

  /* ── Sort ── */
  const sortTasks = (list) => [...list].sort((a, b) => {
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    if (sortBy === 'dday') {
      const da = getDday(a.dueDate) ?? 9999;
      const db = getDday(b.dueDate) ?? 9999;
      return da - db;
    }
    if (sortBy === 'created') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sortBy === 'tag') {
      const ta = allTags.find(t => t.id === (a.tags || [])[0])?.name || 'zzz';
      const tb = allTags.find(t => t.id === (b.tags || [])[0])?.name || 'zzz';
      return ta.localeCompare(tb);
    }
    return 0;
  });

  /* ── Group builder ── */
  const buildGroups = (list) => {
    const groups = {};
    sortTasks(list).forEach(task => {
      const key = (task.tags || [])[0] || 'none';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    const tagKeys = Object.keys(groups).filter(k => k !== 'none');
    tagKeys.sort((a, b) => {
      const ta = allTags.find(t => t.id === a)?.name || '';
      const tb = allTags.find(t => t.id === b)?.name || '';
      return ta.localeCompare(tb);
    });
    if (groups['none']) tagKeys.push('none');
    return { groups, keys: tagKeys };
  };

  /* ── Drag-drop between groups ── */
  const handleGroupDrop = (targetKey) => {
    if (!draggingId) return;
    const task = tasks.find(t => t.id === draggingId);
    if (!task) return;
    const currentFirst = (task.tags || [])[0] || 'none';
    if (currentFirst === targetKey) return;

    let newTags;
    if (targetKey === 'none') {
      newTags = (task.tags || []).slice(1);
    } else {
      newTags = [targetKey, ...(task.tags || []).filter(t => t !== targetKey)];
    }
    onUpdateTask({ ...task, tags: newTags });
    setDraggingId(null);
    setDropGroup(null);
  };

  /* ── Tag editor ── */
  const commitEditTag = () => {
    if (editingTagId && editingTagName.trim()) {
      const tag = allTags.find(t => t.id === editingTagId);
      if (tag) onUpdateTag?.({ ...tag, name: editingTagName.trim() });
    }
    setEditingTagId(null);
  };

  /* ── Task handlers ── */
  const handleDeleteTask = (id) => {
    removeDetail(id);
    onDeleteTask?.(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleAddTodo = () => {
    if (!newTodo.trim()) return;
    setTodos(prev => [...prev, { id: String(Date.now()), text: newTodo.trim(), done: false }]);
    setNewTodo('');
  };
  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    const url = /^https?:\/\//.test(newLinkUrl.trim()) ? newLinkUrl.trim() : 'https://' + newLinkUrl.trim();
    setLinks(prev => [...prev, { id: String(Date.now()), url, label: newLinkLabel.trim() || url }]);
    setNewLinkUrl(''); setNewLinkLabel(''); setShowLinkForm(false);
  };

  /* ── Task row renderer ── */
  const renderTaskRow = (task) => {
    const dday = getDday(task.dueDate);
    const isSelected = task.id === selectedId;
    return (
      <div
        key={task.id}
        onClick={() => setSelectedId(task.id)}
        className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
        style={{ opacity: draggingId === task.id ? 0.4 : 1 }}
        draggable={filterTag === 'all'}
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingId(task.id); }}
        onDragEnd={() => { setDraggingId(null); setDropGroup(null); }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleTask?.(task.id); }}
          className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all"
          style={{ borderColor: task.done ? '#d1d5db' : task.color }}
        >
          {task.done && (
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#9ca3af" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span className={`flex-1 text-[13px] font-medium truncate ${task.done ? 'line-through text-gray-300' : 'text-gray-700'}`}>
          {task.name}
        </span>
        {task.done ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-semibold flex-shrink-0">done</span>
        ) : dday !== null ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${getDdayBadgeClass(dday)}`}>
            {formatDday(dday)}
          </span>
        ) : null}
      </div>
    );
  };

  /* ── Task list renderer ── */
  const renderTaskList = () => {
    if (filterTag !== 'all') {
      const list = sortTasks(tasks.filter(t => (t.tags || []).includes(filterTag)));
      return (
        <div className="py-1.5">
          {list.length === 0 && <p className="text-xs text-gray-300 px-5 py-4">task가 없어요</p>}
          {list.map(t => renderTaskRow(t))}
        </div>
      );
    }
    const { groups, keys } = buildGroups(tasks);
    return (
      <div className="py-1.5">
        {keys.length === 0 && <p className="text-xs text-gray-300 px-5 py-4">task가 없어요</p>}
        {keys.map(key => {
          const tag = key !== 'none' ? allTags.find(t => t.id === key) : null;
          const groupTasks = groups[key];
          const isCollapsed = collapsed[key];
          const isDropTarget = dropGroup === key;
          return (
            <div
              key={key}
              onDragOver={(e) => { if (draggingId) { e.preventDefault(); setDropGroup(key); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropGroup(null); }}
              onDrop={(e) => { e.preventDefault(); handleGroupDrop(key); }}
              className={`transition-colors rounded-xl ${isDropTarget ? 'bg-indigo-50' : ''}`}
            >
              {/* Group header */}
              <button
                onClick={() => setCollapsed(p => ({ ...p, [key]: !p[key] }))}
                className="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-gray-50 transition-colors rounded-xl"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag?.color || '#d1d5db' }} />
                <span className="flex-1 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {tag?.name || '기타'}
                </span>
                <span className="text-[10px] text-gray-300">{groupTasks.length}</span>
                <svg
                  width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                  className={`text-gray-300 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!isCollapsed && groupTasks.map(t => renderTaskRow(t))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* ── Left panel ── */}
      <div className="w-[270px] border-r border-gray-200 flex flex-col bg-white flex-shrink-0">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800 tracking-tight">MY TASKS</h2>
            <button
              onClick={() => setShowTagEditor(v => !v)}
              className={`text-[10px] font-semibold transition-colors px-2 py-0.5 rounded-lg ${showTagEditor ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
            >
              태그 편집
            </button>
          </div>

          {/* Tag editor */}
          {showTagEditor && (
            <div className="mb-3 p-2.5 bg-gray-50 rounded-xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">태그 관리</p>
              {allTags.length === 0 && <p className="text-[11px] text-gray-300 mb-1">태그가 없어요</p>}
              {allTags.map(tag => (
                <div key={tag.id} className="flex items-center gap-2 py-0.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  {editingTagId === tag.id ? (
                    <input
                      autoFocus
                      value={editingTagName}
                      onChange={e => setEditingTagName(e.target.value)}
                      onBlur={commitEditTag}
                      onKeyDown={e => { if (e.key === 'Enter') commitEditTag(); if (e.key === 'Escape') setEditingTagId(null); }}
                      className="flex-1 text-xs border-b border-indigo-300 focus:outline-none bg-transparent"
                    />
                  ) : (
                    <span onClick={() => { setEditingTagId(tag.id); setEditingTagName(tag.name); }}
                      className="flex-1 text-xs text-gray-700 cursor-text"
                    >{tag.name}</span>
                  )}
                  <button onClick={() => onDeleteTag?.(tag.id)} className="text-gray-300 hover:text-red-400 text-sm transition-colors">×</button>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setFilterTag('all')}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${filterTag === 'all' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700'}`}
            >
              전체
            </button>
            {allTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setFilterTag(filterTag === tag.id ? 'all' : tag.id)}
                className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={filterTag === tag.id
                  ? { backgroundColor: tag.color, color: 'white' }
                  : { color: tag.color, opacity: 0.8 }
                }
              >
                {tag.name}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[10px] text-gray-300 mr-0.5">정렬</span>
            {[['dday', 'D-day'], ['created', '추가순'], ['tag', '태그순']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${sortBy === val ? 'font-bold text-gray-700 bg-gray-100' : 'text-gray-300 hover:text-gray-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">{renderTaskList()}</div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#111] hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            + task 추가
          </button>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-y-auto bg-[#f8f9fa]">
        {!selectedTask
          ? <EmptyDetail onAdd={() => setShowAddModal(true)} />
          : <TaskDetail
              task={selectedTask}
              allTags={allTags}
              todos={todos} memo={memo} links={links}
              newTodo={newTodo} setNewTodo={setNewTodo} setMemo={setMemo}
              onAddTodo={handleAddTodo}
              onToggleTodo={(id) => setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))}
              onDeleteTodo={(id) => setTodos(prev => prev.filter(t => t.id !== id))}
              onUpdateTodoText={(id, text) => setTodos(prev => prev.map(t => t.id === id ? { ...t, text } : t))}
              onDeleteLink={(id) => setLinks(prev => prev.filter(l => l.id !== id))}
              showLinkForm={showLinkForm} setShowLinkForm={setShowLinkForm}
              newLinkUrl={newLinkUrl} setNewLinkUrl={setNewLinkUrl}
              newLinkLabel={newLinkLabel} setNewLinkLabel={setNewLinkLabel}
              onAddLink={handleAddLink}
              onToggleDone={() => onToggleTask?.(selectedTask.id)}
              onEdit={() => setShowEditModal(true)}
            />
        }
      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <AddTaskModal
          allTags={allTags} onCreateTag={onCreateTag}
          onSave={(task) => { onAddTask?.(task); setSelectedId(task.id); }}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {showEditModal && selectedTask && (
        <AddTaskModal
          initialData={selectedTask}
          allTags={allTags} onCreateTag={onCreateTag}
          onSave={(updated) => { onUpdateTask?.(updated); }}
          onDelete={(id) => { handleDeleteTask(id); setShowEditModal(false); }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}

/* ─────────────── TaskDetail ─────────────── */
function TaskDetail({
  task, allTags = [], todos, memo, links, newTodo, setNewTodo, setMemo,
  onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodoText,
  onDeleteLink, showLinkForm, setShowLinkForm, newLinkUrl, setNewLinkUrl, newLinkLabel, setNewLinkLabel,
  onAddLink, onToggleDone, onEdit,
}) {
  const dday = getDday(task.dueDate);
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTodoText, setEditingTodoText] = useState('');

  const commitEditTodo = () => {
    if (editingTodoId && editingTodoText.trim()) onUpdateTodoText(editingTodoId, editingTodoText.trim());
    setEditingTodoId(null);
  };

  const taskTags = (task.tags || []).map(id => allTags.find(t => t.id === id)).filter(Boolean);

  const memoRef = useRef(null);

  return (
    <div className="p-6 flex flex-col" style={{ minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: task.color }} />
            <h1 className={`text-2xl font-black text-gray-900 leading-tight ${task.done ? 'line-through text-gray-400' : ''}`}>
              {task.name}
            </h1>
          </div>
          <div className="ml-6 flex items-center gap-2 flex-wrap">
            {task.dueDate && <span className="text-sm text-gray-400">{task.dueDate}</span>}
            {dday !== null && !task.done && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getDdayBadgeClass(dday)}`}>{formatDday(dday)}</span>
            )}
            {task.done && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-semibold">완료됨</span>}
            {taskTags.map(tag => (
              <span key={tag.id} className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: tag.color }}>
                {tag.name}
              </span>
            ))}
            {task.memo && <span className="text-xs text-gray-300 truncate max-w-[200px]">{task.memo}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onEdit} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-xl transition-colors">수정</button>
          <button
            onClick={onToggleDone}
            className={`px-3 py-1.5 text-sm font-medium rounded-xl transition-colors ${task.done ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-[#111] text-white hover:bg-gray-800'}`}
          >
            {task.done ? '되돌리기' : '완료 처리'}
          </button>
        </div>
      </div>

      {/* Single-column content stack */}
      <div className="flex flex-col gap-4 flex-1">

        {/* To-do */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">To-do</p>
          <div className="space-y-2 mb-3">
            {todos.length === 0 && <p className="text-xs text-gray-300 py-1">세부 할 일을 추가하세요</p>}
            {todos.map(todo => (
              <div key={todo.id} className="group flex items-center gap-2">
                <button
                  onClick={() => onToggleTodo(todo.id)}
                  className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ borderColor: todo.done ? '#d1d5db' : '#6366f1' }}
                >
                  {todo.done && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#9ca3af" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                {editingTodoId === todo.id ? (
                  <input autoFocus value={editingTodoText} onChange={e => setEditingTodoText(e.target.value)}
                    onBlur={commitEditTodo}
                    onKeyDown={e => { if (e.key === 'Enter') commitEditTodo(); if (e.key === 'Escape') setEditingTodoId(null); }}
                    className="flex-1 text-sm border-b border-indigo-300 focus:outline-none py-0.5 bg-transparent"
                  />
                ) : (
                  <span
                    onClick={() => !todo.done && (setEditingTodoId(todo.id), setEditingTodoText(todo.text))}
                    className={`flex-1 text-sm select-text ${todo.done ? 'line-through text-gray-300' : 'text-gray-700 hover:text-gray-900 cursor-text'}`}
                  >
                    {todo.text}
                  </span>
                )}
                <button onClick={() => onDeleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-gray-300 hover:text-red-400 transition-all flex-shrink-0 text-lg leading-none">×</button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-gray-100 pt-2.5">
            <input value={newTodo} onChange={e => setNewTodo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onAddTodo()}
              placeholder="할 일 추가..."
              className="flex-1 text-sm text-gray-600 placeholder-gray-300 bg-transparent focus:outline-none" />
            {newTodo.trim() && (
              <button onClick={onAddTodo} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold flex-shrink-0">추가</button>
            )}
          </div>
        </div>

        {/* Links — compact */}
        <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">관련 링크</p>
            {!showLinkForm && (
              <button onClick={() => setShowLinkForm(true)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                추가
              </button>
            )}
          </div>
          {links.length === 0 && !showLinkForm && (
            <p className="text-xs text-gray-300">등록된 링크가 없어요</p>
          )}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {links.map(link => (
                <div key={link.id} className="group flex items-center gap-1 bg-gray-50 rounded-lg px-2.5 py-1.5">
                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors max-w-[180px]">
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="truncate">{link.label}</span>
                  </a>
                  <button onClick={() => onDeleteLink(link.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-base leading-none transition-all ml-1">×</button>
                </div>
              ))}
            </div>
          )}
          {showLinkForm && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100 mt-2">
              <div className="flex gap-1.5">
                <input value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} placeholder="링크 이름 (선택)"
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300" />
                <input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="URL"
                  autoFocus className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300"
                  onKeyDown={e => e.key === 'Enter' && onAddLink()} />
              </div>
              <div className="flex gap-1.5">
                <button onClick={onAddLink} disabled={!newLinkUrl.trim()}
                  className="flex-1 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-200 transition-colors">추가</button>
                <button onClick={() => { setShowLinkForm(false); setNewLinkUrl(''); setNewLinkLabel(''); }}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">취소</button>
              </div>
            </div>
          )}
        </div>

        {/* Memo — takes remaining space, click-anywhere-to-focus */}
        <div
          className="bg-white rounded-2xl p-5 shadow-sm flex flex-col flex-1 cursor-text"
          onClick={() => memoRef.current?.focus()}
        >
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">메모</p>
          <textarea
            ref={memoRef}
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="자유롭게 메모하세요..."
            className="flex-1 w-full text-gray-700 placeholder-gray-300 resize-none focus:outline-none bg-transparent"
            style={{ minHeight: '250px', fontSize: '14px', lineHeight: '1.8' }}
          />
          {memo && <p className="text-[10px] text-gray-300 mt-2 text-right">자동 저장</p>}
        </div>

      </div>
    </div>
  );
}

/* ─────────────── EmptyDetail ─────────────── */
function EmptyDetail({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8" style={{ minHeight: '400px' }}>
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-gray-400 mb-1">task를 선택하거나 추가하세요</h3>
      <p className="text-xs text-gray-300 mb-6 leading-relaxed">왼쪽 목록에서 task를 클릭하면<br />상세 내용을 볼 수 있어요</p>
      <button onClick={onAdd}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#111] hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors">
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        + task 추가
      </button>
    </div>
  );
}
