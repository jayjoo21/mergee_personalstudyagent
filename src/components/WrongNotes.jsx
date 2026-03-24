import React, { useState } from 'react';
import { analyzeWeakPoints } from '../utils/claude';

export default function WrongNotes({ wrongNotes, stacks, apiKey, onDelete }) {
  const [filterStack, setFilterStack] = useState('all');
  const [search, setSearch] = useState('');
  const [randomNote, setRandomNote] = useState(null);
  const [weakAnalysis, setWeakAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const filtered = wrongNotes.filter((n) => {
    const matchStack = filterStack === 'all' || n.stackId === filterStack;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (n.concept || '').toLowerCase().includes(q) ||
      (n.summary || '').toLowerCase().includes(q) ||
      (n.reason || '').toLowerCase().includes(q);
    return matchStack && matchSearch;
  });

  const stackOf = (id) => stacks.find((s) => s.id === id);

  const pickRandom = () => {
    if (!filtered.length) return;
    setRandomNote(filtered[Math.floor(Math.random() * filtered.length)]);
  };

  const copyAll = () => {
    if (!filtered.length) return;
    const text = filtered
      .map((n) => {
        const s = stackOf(n.stackId);
        return '[' + (s?.name || '?') + ']\n개념: ' + n.concept + '\n이유: ' + (n.reason || '-') + '\n요약: ' + n.summary + '\n';
      })
      .join('\n---\n\n');
    navigator.clipboard.writeText(text);
  };

  const analyzeWeak = async () => {
    if (!apiKey) { setWeakAnalysis('API key required'); return; }
    const targetId = filterStack === 'all' ? null : filterStack;
    const notes = targetId ? wrongNotes.filter((n) => n.stackId === targetId) : wrongNotes;
    const stackName = targetId ? stackOf(targetId)?.name || '전체' : '전체';
    setAnalyzing(true);
    try {
      const result = await analyzeWeakPoints(apiKey, notes, stackName);
      setWeakAnalysis(result);
    } catch (e) {
      setWeakAnalysis('error: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
      {/* Sticky top area */}
      <div className="bg-[#f8f9fa] px-8 pt-8 pb-4 flex-shrink-0 border-b border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-gray-900">wrong notes</h1>
            <p className="text-sm text-gray-400 mt-0.5">{wrongNotes.length}개 저장됨</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={pickRandom}
              disabled={!filtered.length}
              className="h-9 px-3 flex items-center gap-1.5 text-xs font-semibold bg-white border border-gray-200 hover:border-gray-400 text-gray-600 rounded-xl transition-colors disabled:opacity-40"
            >
              🎲 <span>랜덤</span>
            </button>
            <button
              onClick={analyzeWeak}
              disabled={analyzing || !wrongNotes.length}
              className="h-9 px-3 flex items-center gap-1.5 text-xs font-semibold bg-white border border-gray-200 hover:border-gray-400 text-gray-600 rounded-xl transition-colors disabled:opacity-40"
            >
              🧠 <span>{analyzing ? '분석 중...' : '취약점 분석'}</span>
            </button>
            <button
              onClick={copyAll}
              disabled={!filtered.length}
              className="h-9 px-3 flex items-center gap-1.5 text-xs font-semibold bg-white border border-gray-200 hover:border-gray-400 text-gray-600 rounded-xl transition-colors disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>전체 복사</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="개념, 이유, 요약으로 검색..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>

        {/* Stack filter pills */}
        <div className="flex gap-2 flex-wrap">
          <FilterPill
            active={filterStack === 'all'}
            onClick={() => setFilterStack('all')}
            label={'all · ' + wrongNotes.length}
          />
          {stacks.filter((s) => wrongNotes.some((n) => n.stackId === s.id)).map((s) => {
            const count = wrongNotes.filter((n) => n.stackId === s.id).length;
            return (
              <FilterPill
                key={s.id}
                active={filterStack === s.id}
                onClick={() => setFilterStack(s.id)}
                label={s.name + ' · ' + count}
                color={s.color}
              />
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 py-5">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Weak analysis */}
          {weakAnalysis && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                  🧠 취약점 분석 결과
                </span>
                <button
                  onClick={() => setWeakAnalysis('')}
                  className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{weakAnalysis}</p>
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 opacity-60">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-400 text-sm">{search ? '검색 결과가 없습니다' : '저장된 오답 노트가 없어요'}</p>
              <p className="text-gray-300 text-xs mt-1">채팅에서 AI 답변에 마우스를 올리고 "save"를 클릭하세요</p>
            </div>
          ) : (
            filtered.map((note) => {
              const s = stackOf(note.stackId);
              return (
                <NoteCard key={note.id} note={note} stack={s} onDelete={onDelete} />
              );
            })
          )}
        </div>
      </div>

      {/* Random note modal */}
      {randomNote && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: stackOf(randomNote.stackId)?.color || '#111' }}
              >
                {stackOf(randomNote.stackId)?.name || '?'}
              </span>
              <button
                onClick={() => setRandomNote(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-3">{randomNote.concept}</h3>
            {randomNote.reason && (
              <div className="bg-orange-50 text-orange-700 text-sm px-4 py-2.5 rounded-xl mb-3 leading-relaxed border border-orange-100">
                <p className="text-[10px] font-bold uppercase tracking-wide text-orange-500 mb-1">틀린 이유</p>
                {randomNote.reason}
              </div>
            )}
            <p className="text-sm text-gray-600 leading-relaxed">{randomNote.summary}</p>
            <button
              onClick={pickRandom}
              className="w-full mt-5 py-2.5 bg-[#111] hover:bg-gray-800 text-white text-sm font-semibold rounded-2xl transition-colors active:scale-95"
            >
              다음 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, stack, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group">
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {stack && (
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: stack.color || '#111' }}
            >
              {stack.name}
            </span>
          )}
          <span className="text-[11px] text-gray-400">
            {new Date(note.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <button
          onClick={() => onDelete(note.id)}
          className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
          title="삭제"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Concept title */}
      <h3 className="font-bold text-gray-800 text-sm leading-snug mb-2.5">{note.concept}</h3>

      {/* Reason */}
      {note.reason && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 mb-2.5">
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wide mb-1">틀린 이유</p>
          <p className="text-xs text-orange-700 leading-relaxed">{note.reason}</p>
        </div>
      )}

      {/* Summary */}
      {note.summary && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">핵심 요약</p>
          <p className={`text-sm text-gray-600 leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
            {note.summary}
          </p>
          {note.summary.length > 200 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] text-gray-400 hover:text-gray-700 mt-1 transition-colors"
            >
              {expanded ? '접기 ↑' : '더 보기 ↓'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, label, color }) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-3 text-xs font-semibold rounded-full transition-all duration-150"
      style={
        active
          ? { backgroundColor: color || '#111', color: '#fff', border: '1px solid transparent' }
          : { backgroundColor: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }
      }
    >
      {label}
    </button>
  );
}
