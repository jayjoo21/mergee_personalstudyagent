import React, { useState, useRef, useEffect } from 'react';
import { storage } from '../utils/storage';

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

const TOOLS = [
  { key: 'habit-tracker', label: 'habit tracker', emoji: '🌱' },
  { key: 'campus-life', label: 'campus life', emoji: '🎓' },
  { key: 'stack-clash', label: 'stack clash', emoji: '⚡' },
  { key: 'weak-sniper', label: 'weak sniper', emoji: '🎯' },
  { key: 'merge-report', label: 'merge report', emoji: '📊' },
];

function LinkBadge({ url }) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    const letter = domain[0].toUpperCase();
    const bg = LINK_COLORS[domain] || '#6b7280';
    return (
      <span
        className="w-6 h-6 rounded-md text-white text-[10px] font-black flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: bg }}
      >
        {letter}
      </span>
    );
  } catch {
    return (
      <span className="w-6 h-6 rounded-md bg-gray-200 text-gray-500 text-[10px] font-black flex items-center justify-center flex-shrink-0">?</span>
    );
  }
}

export default function TopNav({ currentView, onNavigate, onOpenSettings, user, onLogout, isDemo, onNavigateMyPage }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [links, setLinks] = useState(() => storage.get(QUICK_LINKS_KEY, DEFAULT_LINKS));
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const toolsDropRef = useRef(null);
  const toolsBtnRef = useRef(null);
  const settingsDropRef = useRef(null);
  const settingsBtnRef = useRef(null);

  useEffect(() => {
    storage.set(QUICK_LINKS_KEY, links);
  }, [links]);

  useEffect(() => {
    if (!panelOpen && !toolsOpen && !settingsOpen) return;
    const handler = (e) => {
      if (
        panelOpen &&
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setPanelOpen(false);
      }
      if (
        toolsOpen &&
        toolsDropRef.current && !toolsDropRef.current.contains(e.target) &&
        toolsBtnRef.current && !toolsBtnRef.current.contains(e.target)
      ) {
        setToolsOpen(false);
      }
      if (
        settingsOpen &&
        settingsDropRef.current && !settingsDropRef.current.contains(e.target) &&
        settingsBtnRef.current && !settingsBtnRef.current.contains(e.target)
      ) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen, toolsOpen, settingsOpen]);

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
  };

  const isToolView = ['stack-clash', 'weak-sniper', 'merge-report', 'habit-tracker', 'campus-life'].includes(currentView);

  return (
    <div className="h-10 bg-white border-b border-gray-100 flex items-center justify-end px-5 flex-shrink-0 relative z-10">
      {/* Right: tools | links | settings */}
      <div className="flex items-center gap-1">
        {/* Tools dropdown */}
        <div className="relative">
          <button
            ref={toolsBtnRef}
            onClick={() => { setToolsOpen((v) => !v); setPanelOpen(false); }}
            className={`flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium transition-colors ${
              toolsOpen || isToolView
                ? 'bg-gray-100 text-gray-700'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            tools
            <svg
              width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
              className={`transition-transform duration-150 ${toolsOpen ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {toolsOpen && (
            <div
              ref={toolsDropRef}
              className="absolute right-0 top-8 w-44 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-20"
            >
              {TOOLS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { onNavigate?.(t.key); setToolsOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                    currentView === t.key ? 'bg-gray-50 font-semibold text-gray-900' : 'text-gray-600'
                  }`}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-gray-200 mx-0.5" />

        {/* My Page button */}
        <button
          onClick={() => onNavigateMyPage?.()}
          title="My Page"
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            currentView === 'my-page' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>

        {/* Links button */}
        <button
          ref={btnRef}
          onClick={() => { setPanelOpen((v) => !v); setToolsOpen(false); }}
          title="Quick Links"
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            panelOpen ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        {/* Settings button + dropdown */}
        <div className="relative">
          <button
            ref={settingsBtnRef}
            onClick={() => { setSettingsOpen((v) => !v); setPanelOpen(false); setToolsOpen(false); }}
            title="settings"
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
              settingsOpen ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {settingsOpen && (
            <div
              ref={settingsDropRef}
              className="absolute right-0 top-8 w-52 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-20"
            >
              {user && (
                <>
                  <div className="px-3 py-2.5 border-b border-gray-50">
                    <p className="text-[11px] text-gray-400 font-medium truncate">{user.email}</p>
                  </div>
                </>
              )}
              <button
                onClick={() => { onOpenSettings?.(); setSettingsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                API 키 설정
              </button>
              {(user || isDemo) && (
                <button
                  onClick={() => { onLogout?.(); setSettingsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left text-red-500 hover:bg-red-50 transition-colors border-t border-gray-50"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {isDemo ? '데모 종료' : '로그아웃'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Links slide panel */}
      {panelOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-10 w-72 bg-white border-l border-b border-gray-100 shadow-xl flex flex-col"
          style={{ bottom: 'calc(-100vh + 40px)', maxHeight: 'calc(100vh - 40px)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Quick Links</span>
            <button
              onClick={() => setPanelOpen(false)}
              className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 rounded transition-colors"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Links list */}
          <div className="flex-1 overflow-y-auto py-2">
            {links.map((link) => (
              <div key={link.id} className="group flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 transition-colors">
                <LinkBadge url={link.url} />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0"
                >
                  <span className="text-sm text-gray-700 font-medium truncate block">{link.label}</span>
                  <span className="text-[11px] text-gray-400 truncate block">{link.url.replace(/^https?:\/\//, '')}</span>
                </a>
                <button
                  onClick={() => deleteLink(link.id)}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
                >
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add form */}
          <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0">
            {showAdd ? (
              <div className="space-y-2">
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
                className="w-full flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 py-1.5 transition-colors"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                + 링크 추가
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
