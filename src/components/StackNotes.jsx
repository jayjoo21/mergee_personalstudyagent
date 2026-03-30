import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';

function notesKey(stackId) { return `mergee_stack_notes_${stackId}`; }
function loadNotes(stackId) { return storage.get(notesKey(stackId), { current: '', history: [] }); }

/* ── Inline markdown renderer ── */
function parseInline(text) {
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  const parts = [];
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index}><em>{m[2]}</em></strong>);
    else if (m[3]) parts.push(<strong key={m.index}>{m[3]}</strong>);
    else if (m[4]) parts.push(<em key={m.index}>{m[4]}</em>);
    else if (m[5]) parts.push(<code key={m.index} className="bg-gray-100 px-1 py-0.5 rounded text-[12px] font-mono text-gray-700">{m[5]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-bold text-gray-900 mt-5 mb-2">{parseInline(line.slice(2))}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-base font-bold text-gray-800 mt-4 mb-1.5">{parseInline(line.slice(3))}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-sm font-semibold text-gray-800 mt-3 mb-1">{parseInline(line.slice(4))}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed py-0.5">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
          <span>{parseInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\. /.test(line)) {
      const numMatch = line.match(/^(\d+)\. (.+)/);
      elements.push(
        <div key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed py-0.5">
          <span className="font-semibold text-gray-400 min-w-[18px] text-right flex-shrink-0">{numMatch[1]}.</span>
          <span>{parseInline(numMatch[2])}</span>
        </div>
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <div key={i} className="border-l-2 border-gray-300 pl-3 my-1">
          <p className="text-sm text-gray-500 italic leading-relaxed">{parseInline(line.slice(2))}</p>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm text-gray-700 leading-relaxed">{parseInline(line)}</p>);
    }
    i++;
  }
  return elements;
}

export default function StackNotes({ stack }) {
  const [data, setData] = useState(() => loadNotes(stack.id));
  const [preview, setPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const saveTimer = useRef(null);
  const lastSaved = useRef(data.current);

  useEffect(() => {
    const d = loadNotes(stack.id);
    setData(d);
    lastSaved.current = d.current;
    setPreview(false);
    setShowHistory(false);
    return () => clearTimeout(saveTimer.current);
  }, [stack.id]);

  const autoSave = (content) => {
    if (content === lastSaved.current) return;
    lastSaved.current = content;
    setData(prev => {
      const existing = loadNotes(stack.id);
      const entry = { id: String(Date.now()), content, savedAt: new Date().toISOString() };
      const history = [entry, ...existing.history].slice(0, 20);
      const newData = { current: content, history };
      storage.set(notesKey(stack.id), newData);
      return newData;
    });
  };

  const handleChange = (value) => {
    setData(prev => ({ ...prev, current: value }));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(value), 1500);
  };

  const restoreEntry = (entry) => {
    handleChange(entry.content);
    setShowHistory(false);
    setPreview(false);
  };

  const charCount = data.current.length;
  const lineCount = data.current.split('\n').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 px-6 py-2.5 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setPreview(false)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              !preview ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            편집
          </button>
          <button
            onClick={() => setPreview(true)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              preview ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            미리보기
          </button>
        </div>

        <span className="text-[11px] text-gray-300">{charCount.toLocaleString()}자 · {lineCount}줄</span>

        <div className="text-[10px] text-gray-300 bg-gray-50 px-2 py-1 rounded-lg hidden sm:block">
          **굵게** *기울임* `코드` # 제목 - 목록
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors ${
            showHistory ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          }`}
        >
          기록 {data.history.length > 0 && `(${data.history.length})`}
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Main editor / preview */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            {!preview ? (
              <textarea
                value={data.current}
                onChange={e => handleChange(e.target.value)}
                placeholder={`# 오늘의 학습 메모\n\n내용을 자유롭게 작성하세요...\n\n**굵게**, *기울임*, \`코드\`\n- 리스트 항목\n1. 순서 있는 목록\n> 인용구`}
                className="w-full min-h-[400px] bg-transparent text-sm text-gray-800 leading-7 resize-none focus:outline-none placeholder-gray-300 font-mono"
                style={{ caretColor: stack.color }}
              />
            ) : (
              <div className="min-h-[400px] prose max-w-none">
                {data.current ? (
                  <div className="space-y-0.5">{renderMarkdown(data.current)}</div>
                ) : (
                  <p className="text-gray-300 text-sm italic">작성된 내용이 없어요.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* History sidebar */}
        {showHistory && (
          <div className="w-72 border-l border-gray-100 bg-white overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">저장 기록</p>
              {data.history.length === 0 ? (
                <p className="text-xs text-gray-400">아직 저장 기록이 없어요.</p>
              ) : (
                data.history.map((entry, idx) => (
                  <div key={entry.id} className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] text-gray-400">
                        {new Date(entry.savedAt).toLocaleString('ko-KR', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {idx === 0 && (
                        <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold">최신</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{entry.content || <span className="italic text-gray-300">내용 없음</span>}</p>
                    <button
                      onClick={() => restoreEntry(entry)}
                      className="mt-2 text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                    >
                      이 버전으로 복원 →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
