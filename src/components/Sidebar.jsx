import React, { useState } from 'react';
import { getDday, formatDday, getDdayBadgeClass } from '../utils/helpers';
import AddTaskModal from './AddTaskModal';

export default function Sidebar({
  stacks,
  currentView,
  selectedStackId,
  onNavigate,
  onSelectStack,
  onAddStack,
  onEditStack,
  onOpenSettings,
  onUnmerge,
  onGoLanding,
  tasks = [],
  allTags = [],
  onAddTask,
  onCreateTag,
  onToggleTask,
  onDeleteTask,
  onNavigateToTask,
  onConvertStackToTask,
  onConvertTaskToStack,
}) {
  const [unmergeTarget, setUnmergeTarget] = useState(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddChoice, setShowAddChoice] = useState(false);

  // Drag & drop
  const [draggingStackId, setDraggingStackId] = useState(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [taskDropActive, setTaskDropActive] = useState(false);
  const [stackDropActive, setStackDropActive] = useState(false);
  const [convertConfirm, setConvertConfirm] = useState(null);
  const [convertPrompt, setConvertPrompt] = useState('');

  const handleUnmergeClick = (e, stack) => {
    e.stopPropagation();
    setUnmergeTarget(stack);
  };

  const confirmUnmerge = () => {
    if (unmergeTarget) {
      onUnmerge?.(unmergeTarget.id);
      setUnmergeTarget(null);
    }
  };

  const activeTasks = tasks
    .filter((t) => !t.done)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

  return (
    <>
      <aside className="w-[260px] h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0 select-none overflow-hidden">
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 flex-shrink-0">
          <span
            className="shimmer-text text-xl font-black tracking-tight cursor-pointer"
            onClick={onGoLanding}
            title="랜딩 페이지로"
          >mergee</span>
          <p className="text-[11px] text-gray-400 mt-0.5">study stack manager</p>
        </div>

        {/* Main nav */}
        <div className="px-3 mb-1 space-y-0.5 flex-shrink-0">
          <NavBtn active={currentView === 'dashboard'} onClick={() => onNavigate('dashboard')}
            icon={<GridIcon />} label="dashboard" />
          <NavBtn active={currentView === 'job-board'} onClick={() => onNavigate('job-board')}
            icon={<KanbanIcon />} label="job board" />
          <NavBtn active={currentView === 'career'} onClick={() => onNavigate('career')}
            icon={<BriefcaseIcon />} label="career" />
          <NavBtn active={currentView === 'counseling-log'} onClick={() => onNavigate('counseling-log')}
            icon={<ChatBubbleIcon />} label="상담 로그" />
        </div>

        {/* Scrollable middle */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">

          {/* ── MY TASKS (first) ── */}
          <div
            className={`transition-colors rounded-xl mx-1 ${taskDropActive ? 'bg-emerald-50' : ''}`}
            onDragOver={(e) => { if (draggingStackId) { e.preventDefault(); setTaskDropActive(true); } }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setTaskDropActive(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setTaskDropActive(false);
              if (draggingStackId) {
                const stack = stacks.find((s) => s.id === draggingStackId);
                if (stack && !stack.passed) setConvertConfirm({ type: 'stackToTask', item: stack });
                setDraggingStackId(null);
              }
            }}
          >
            <div className="px-4 mt-4 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${taskDropActive ? 'text-emerald-500' : 'text-gray-300'}`}>
                {taskDropActive ? 'drop to convert →' : 'My Tasks'}
              </span>
            </div>

            <div className="px-3 pb-2">
              {activeTasks.length === 0 && (
                <p className="text-xs text-gray-300 px-3 py-2">할 일이 없어요</p>
              )}
              {(() => {
                // Group by first tag
                const groups = {};
                activeTasks.forEach(t => {
                  const key = (t.tags || [])[0] || 'none';
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(t);
                });
                const tagKeys = Object.keys(groups).filter(k => k !== 'none');
                tagKeys.sort((a, b) => {
                  const ta = allTags.find(t => t.id === a)?.name || '';
                  const tb = allTags.find(t => t.id === b)?.name || '';
                  return ta.localeCompare(tb);
                });
                if (groups['none']) tagKeys.push('none');
                const showGroupLabels = tagKeys.length > 1 || (tagKeys.length === 1 && tagKeys[0] !== 'none');
                return tagKeys.map(key => {
                  const tag = key !== 'none' ? allTags.find(t => t.id === key) : null;
                  return (
                    <React.Fragment key={key}>
                      {showGroupLabels && (
                        <div className="px-3 pt-2 pb-0.5 flex items-center gap-1.5">
                          {tag && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />}
                          <span className="text-[10px] text-gray-300 font-semibold">{tag?.name || '기타'}</span>
                        </div>
                      )}
                      {groups[key].map((task) => {
                        const dday = getDday(task.dueDate);
                        return (
                          <div
                            key={task.id}
                            className="group flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingTaskId(task.id); }}
                            onDragEnd={() => setDraggingTaskId(null)}
                            style={{ opacity: draggingTaskId === task.id ? 0.4 : 1 }}
                            onClick={() => onNavigateToTask?.(task.id)}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); onToggleTask?.(task.id); }}
                              className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors"
                              style={{ borderColor: task.color }}
                            >
                              <span className="w-2 h-2 rounded-sm opacity-0 group-hover:opacity-40 transition-opacity" style={{ backgroundColor: task.color }} />
                            </button>
                            <span className="flex-1 text-[13px] text-gray-600 truncate font-medium">{task.name}</span>
                            {dday !== null && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${getDdayBadgeClass(dday)}`}>
                                {formatDday(dday)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          </div>

          {/* ── MY STACK (second) ── */}
          <div
            className={`transition-colors rounded-xl mx-1 ${stackDropActive ? 'bg-indigo-50' : ''}`}
            onDragOver={(e) => { if (draggingTaskId) { e.preventDefault(); setStackDropActive(true); } }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setStackDropActive(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setStackDropActive(false);
              if (draggingTaskId) {
                const task = tasks.find((t) => t.id === draggingTaskId);
                if (task) setConvertConfirm({ type: 'taskToStack', item: task });
                setDraggingTaskId(null);
              }
            }}
          >
            <div className="px-4 mt-3 mb-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${stackDropActive ? 'text-indigo-500' : 'text-gray-300'}`}>
                {stackDropActive ? 'drop to convert →' : 'My Stack'}
              </span>
            </div>

            <nav className="px-3 space-y-0.5 pb-2">
              {stacks.map((stack) => {
                const dday = getDday(stack.examDate);
                const active = selectedStackId === stack.id && currentView === 'chat';
                return (
                  <div
                    key={stack.id}
                    className="group relative"
                    draggable={!stack.passed}
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggingStackId(stack.id); }}
                    onDragEnd={() => setDraggingStackId(null)}
                    style={{ opacity: draggingStackId === stack.id ? 0.4 : 1 }}
                  >
                    <button
                      onClick={() => onSelectStack(stack.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm transition-colors ${
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stack.color || '#111', opacity: stack.passed ? 0.4 : 1 }}
                      />
                      <span className={`flex-1 text-left truncate text-[14px] font-medium ${stack.passed ? 'text-gray-400' : ''}`}>
                        {stack.name}
                      </span>
                      {dday !== null && !stack.passed && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${getDdayBadgeClass(dday)}`}>
                          {formatDday(dday)}
                        </span>
                      )}
                      {stack.passed && (
                        <button
                          onClick={(e) => handleUnmergeClick(e, stack)}
                          className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 bg-gray-100 text-gray-400 hover:bg-yellow-100 hover:text-yellow-700 transition-colors"
                          title="클릭해서 unmerge"
                        >
                          merged
                        </button>
                      )}
                    </button>
                    {!stack.passed && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditStack(stack); }}
                        title="스택 수정"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-300 hover:text-gray-700 hover:bg-gray-100 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Wrong Notes */}
          <div className="px-3 pb-1 mt-2">
            <NavBtn active={currentView === 'wrong-notes'} onClick={() => onNavigate('wrong-notes')}
              icon={<NotesIcon />} label="wrong notes" />
          </div>

          <div className="flex-1" />
        </div>

        {/* Bottom bar */}
        <div className="px-3 pt-2 pb-4 border-t border-gray-100 flex items-center gap-2 flex-shrink-0 bg-white">
          <button
            onClick={() => setShowAddChoice(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#111] hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            add stack &amp; tasks
          </button>
          <button
            onClick={onOpenSettings}
            title="settings / API key"
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Modals ── */}

      {showAddTaskModal && (
        <AddTaskModal
          allTags={allTags}
          onCreateTag={onCreateTag}
          onSave={(task) => { onAddTask?.(task); }}
          onClose={() => setShowAddTaskModal(false)}
        />
      )}

      {showAddChoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-800">무엇을 추가할까요?</h2>
              <button onClick={() => setShowAddChoice(false)} className="text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { setShowAddChoice(false); onAddStack(); }}
                className="w-full flex items-start gap-4 p-4 border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-2xl transition-all text-left"
              >
                <span className="text-2xl mt-0.5">📚</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Stack 추가</p>
                  <p className="text-xs text-gray-400 mt-0.5">자격증/시험 — AI 튜터 포함</p>
                </div>
              </button>
              <button
                onClick={() => { setShowAddChoice(false); setShowAddTaskModal(true); }}
                className="w-full flex items-start gap-4 p-4 border-2 border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 rounded-2xl transition-all text-left"
              >
                <span className="text-2xl mt-0.5">✅</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Task 추가</p>
                  <p className="text-xs text-gray-400 mt-0.5">과제/프로젝트 — 체크박스만</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {unmergeTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 text-base mb-2">Unmerge 하시겠어요?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-semibold text-gray-700">{unmergeTarget.name}</span>을 다시 준비 중 상태로 되돌립니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmUnmerge}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95"
              >
                확인
              </button>
              <button
                onClick={() => setUnmergeTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {convertConfirm?.type === 'stackToTask' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 text-base mb-2">Stack을 Task로 변환하시겠어요?</h3>
            <p className="text-sm text-gray-500 mb-2">
              <span className="font-semibold text-gray-700">{convertConfirm.item.name}</span>이 Task로 변환됩니다.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-5">
              ⚠️ AI 채팅, 오답노트 등 Stack 전용 기능은 사용할 수 없게 됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { onConvertStackToTask?.(convertConfirm.item); setConvertConfirm(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all"
              >
                변환
              </button>
              <button
                onClick={() => setConvertConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {convertConfirm?.type === 'taskToStack' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 text-base mb-2">Task를 Stack으로 변환</h3>
            <p className="text-sm text-gray-500 mb-3">
              <span className="font-semibold text-gray-700">{convertConfirm.item.name}</span>이 Stack으로 변환됩니다.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">시스템 프롬프트</label>
              <textarea
                value={convertPrompt}
                onChange={(e) => setConvertPrompt(e.target.value)}
                placeholder="AI 튜터 역할을 설명하세요..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { onConvertTaskToStack?.(convertConfirm.item, convertPrompt); setConvertConfirm(null); setConvertPrompt(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all"
              >
                변환
              </button>
              <button
                onClick={() => { setConvertConfirm(null); setConvertPrompt(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
        active ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
      }`}
    >
      <span className="flex-shrink-0" style={{ width: '18px', height: '18px' }}>{icon}</span>
      {label}
    </button>
  );
}

/* ── Icons ── */
const SvgIcon = ({ children, strokeWidth = 2 }) => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>{children}</svg>
);
const GridIcon = () => (<SvgIcon><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></SvgIcon>);
const KanbanIcon = () => (<SvgIcon><rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="6" width="5" height="15" rx="1" /><rect x="17" y="9" width="5" height="12" rx="1" /></SvgIcon>);
const BriefcaseIcon = () => (<SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></SvgIcon>);
const NotesIcon = () => (<SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></SvgIcon>);
const ChatBubbleIcon = () => (<SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></SvgIcon>);
