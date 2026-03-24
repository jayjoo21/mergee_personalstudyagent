import React, { useState, useEffect, useRef } from 'react';
import { getDday, formatDday, getDdayBadgeClass } from '../utils/helpers';
import { storage } from '../utils/storage';

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
}) {
  const [unmergeTarget, setUnmergeTarget] = useState(null);

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

  return (
    <>
      <aside className="w-[260px] h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0 select-none overflow-hidden">
        {/* Logo — fixed top */}
        <div className="px-5 pt-6 pb-5 flex-shrink-0">
          <span
            className="shimmer-text text-xl font-black tracking-tight cursor-pointer"
            onClick={onGoLanding}
            title="랜딩 페이지로"
          >mergee</span>
          <p className="text-[11px] text-gray-400 mt-0.5">study stack manager</p>
        </div>

        {/* Top nav — fixed */}
        <div className="px-3 mb-1 space-y-0.5 flex-shrink-0">
          <NavBtn active={currentView === 'dashboard'} onClick={() => onNavigate('dashboard')}
            icon={<GridIcon />} label="dashboard" />
          <NavBtn active={currentView === 'job-board'} onClick={() => onNavigate('job-board')}
            icon={<KanbanIcon />} label="job board" />
          <NavBtn active={currentView === 'career'} onClick={() => onNavigate('career')}
            icon={<BriefcaseIcon />} label="career" />
        </div>

        {/* Tools section — fixed */}
        <div className="px-5 mt-4 mb-1.5 flex-shrink-0">
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tools</span>
        </div>
        <div className="px-3 space-y-0.5 mb-1 flex-shrink-0">
          <NavBtn active={currentView === 'stack-clash'} onClick={() => onNavigate('stack-clash')}
            icon={<ClashIcon />} label="stack clash" />
          <NavBtn active={currentView === 'weak-sniper'} onClick={() => onNavigate('weak-sniper')}
            icon={<SniperIcon />} label="weak sniper" />
          <NavBtn active={currentView === 'merge-report'} onClick={() => onNavigate('merge-report')}
            icon={<ReportIcon />} label="merge report" />
        </div>

        {/* My Stack label — fixed */}
        <div className="px-5 mt-4 mb-1.5 flex-shrink-0">
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">My Stack</span>
        </div>

        {/* Scrollable middle: stack list + wrong notes + quick links */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* Stack list */}
        <nav className="px-3 space-y-0.5 pb-2 flex-1">
          {stacks.map((stack) => {
            const dday = getDday(stack.examDate);
            const active = selectedStackId === stack.id && currentView === 'chat';
            return (
              <div key={stack.id} className="group relative">
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

                {/* Edit button */}
                {!stack.passed && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditStack(stack); }}
                    title="스택 수정"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-300 hover:text-gray-700 hover:bg-gray-100 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-4.5 h-4.5" style={{width:'18px',height:'18px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </nav>

          {/* Wrong Notes nav */}
          <div className="px-3 pb-1">
            <NavBtn active={currentView === 'wrong-notes'} onClick={() => onNavigate('wrong-notes')}
              icon={<NotesIcon />} label="wrong notes" />
          </div>

          {/* Quick Links */}
          <QuickLinks />
        </div>{/* end scrollable middle */}

        {/* Bottom bar — sticky at bottom, never pushed away */}
        <div className="px-3 pt-2 pb-4 border-t border-gray-100 flex items-center gap-2 flex-shrink-0 bg-white">
          <button
            onClick={onAddStack}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#111] hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            add stack
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

      {/* Unmerge confirmation */}
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
      <span className="flex-shrink-0" style={{width:'18px',height:'18px'}}>{icon}</span>
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
const ClashIcon = () => (<SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></SvgIcon>);
const SniperIcon = () => (<SvgIcon><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" /></SvgIcon>);
const ReportIcon = () => (<SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></SvgIcon>);
const NotesIcon = () => (<SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></SvgIcon>);

/* ── Quick Links ── */
const QUICK_LINKS_KEY = 'mergee_quick_links';
const DEFAULT_LINKS = [
  { id: 'gh', label: 'GitHub', url: 'https://github.com' },
  { id: 'pg', label: 'Programmers', url: 'https://programmers.co.kr' },
  { id: 'li', label: 'LinkedIn', url: 'https://linkedin.com' },
  { id: 'sr', label: '사람인', url: 'https://saramin.co.kr' },
  { id: 'lk', label: '링커리어', url: 'https://linkareer.com' },
  { id: 'no', label: 'Notion', url: 'https://notion.so' },
];

const LINK_COLORS = {
  'github.com': '#171515',
  'programmers.co.kr': '#1e293b',
  'linkedin.com': '#0a66c2',
  'saramin.co.kr': '#e84118',
  'linkareer.com': '#6366f1',
  'notion.so': '#374151',
};

function LinkBadge({ url }) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    const letter = domain[0].toUpperCase();
    const bg = LINK_COLORS[domain] || '#6b7280';
    return (
      <span
        className="w-5 h-5 rounded-md text-white text-[9px] font-black flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: bg }}
      >
        {letter}
      </span>
    );
  } catch {
    return (
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    );
  }
}

function QuickLinks() {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState(() => storage.get(QUICK_LINKS_KEY, DEFAULT_LINKS));
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
    storage.set(QUICK_LINKS_KEY, links);
  }, [links]);

  // Close delete popup on outside click
  useEffect(() => {
    if (!deleteTarget) return;
    const close = () => setDeleteTarget(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [deleteTarget]);

  const addLink = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    const url = /^https?:\/\//.test(newUrl.trim()) ? newUrl.trim() : 'https://' + newUrl.trim();
    setLinks((prev) => [...prev, { id: String(Date.now()), label: newLabel.trim(), url }]);
    setNewLabel('');
    setNewUrl('');
    setShowAdd(false);
  };

  const deleteLink = (id) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    setDeleteTarget(null);
  };

  const handleTouchStart = (id) => {
    longPressTimer.current = setTimeout(() => setDeleteTarget(id), 600);
  };
  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

  return (
    <div className="px-3 pb-1 border-b border-gray-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2 py-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest hover:text-gray-500 transition-colors"
      >
        <span>Quick Links</span>
        <svg
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="pb-1 space-y-0.5">
          {links.map((link) => (
            <div key={link.id} className="relative">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onContextMenu={(e) => { e.preventDefault(); setDeleteTarget(link.id); }}
                onTouchStart={() => handleTouchStart(link.id)}
                onTouchEnd={handleTouchEnd}
                onClick={(e) => { if (deleteTarget === link.id) e.preventDefault(); }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <LinkBadge url={link.url} />
                <span className="truncate">{link.label}</span>
                <svg className="w-3 h-3 text-gray-300 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              {deleteTarget === link.id && (
                <div
                  className="absolute right-1 top-1 flex items-center gap-1 bg-white shadow-lg rounded-xl px-2 py-1.5 z-20 border border-gray-100"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => deleteLink(link.id)}
                    className="text-[11px] text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="text-[11px] text-gray-400 px-1 py-0.5 rounded hover:bg-gray-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}

          {showAdd ? (
            <div className="px-1 pt-1 space-y-1.5">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="이름"
                className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="URL (예: github.com)"
                className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
              />
              <div className="flex gap-1.5">
                <button
                  onClick={addLink}
                  disabled={!newLabel.trim() || !newUrl.trim()}
                  className="flex-1 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700 disabled:bg-gray-200 transition-colors"
                >
                  추가
                </button>
                <button
                  onClick={() => { setShowAdd(false); setNewLabel(''); setNewUrl(''); }}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              링크 추가
            </button>
          )}
        </div>
      )}
    </div>
  );
}
