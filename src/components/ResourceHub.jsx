import React, { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { suggestResources } from '../utils/claude';

function getKey(stackId) { return 'mergee_resources_' + stackId; }

export default function ResourceHub({ stack, apiKey }) {
  const [links, setLinks] = useState(() => storage.get(getKey(stack.id), []));
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    setLinks(storage.get(getKey(stack.id), []));
  }, [stack.id]);

  const save = (updated) => { setLinks(updated); storage.set(getKey(stack.id), updated); };

  const addLink = () => {
    if (!title.trim() || !url.trim()) return;
    const href = url.startsWith('http') ? url : 'https://' + url;
    save([{ id: String(Date.now()), title: title.trim(), url: href }, ...links]);
    setTitle(''); setUrl('');
  };

  const deleteLink = (id) => save(links.filter((l) => l.id !== id));

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const suggested = await suggestResources(apiKey, stack.name);
      const existing = new Set(links.map((l) => l.url));
      const newLinks = suggested.filter((s) => !existing.has(s.url)).map((s) => ({ id: String(Date.now() + Math.random()), ...s }));
      if (newLinks.length) save([...newLinks, ...links]);
    } catch {}
    setSuggesting(false);
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 bg-[#f8f9fa]">
      {/* Add link form */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">링크 추가</p>
        <div className="flex gap-2 mb-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL"
            onKeyDown={(e) => e.key === 'Enter' && addLink()}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <button
            onClick={addLink}
            disabled={!title.trim() || !url.trim()}
            className="px-4 py-2 bg-[#111] text-white text-sm font-semibold rounded-xl disabled:opacity-30 hover:bg-gray-800 transition-colors"
          >
            추가
          </button>
        </div>
        <button
          onClick={handleSuggest}
          disabled={suggesting}
          className="w-full py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
        >
          {suggesting ? (
            <><div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />AI 리소스 추천 중...</>
          ) : (
            <><span>✦</span> {stack.name} AI 추천 리소스 불러오기</>
          )}
        </button>
      </div>

      {/* Link list */}
      {links.length === 0 ? (
        <div className="text-center py-12 opacity-50">
          <div className="text-3xl mb-2">🔗</div>
          <p className="text-sm text-gray-400">아직 링크가 없어요</p>
          <p className="text-xs text-gray-300 mt-1">위에서 링크를 추가하거나 AI 추천을 받아보세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 text-sm">
                🔗
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-800 hover:text-indigo-600 transition-colors truncate block"
                >
                  {link.title}
                </a>
                <p className="text-xs text-gray-400 truncate">{link.url}</p>
              </div>
              <button
                onClick={() => deleteLink(link.id)}
                className="w-7 h-7 flex items-center justify-center text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
