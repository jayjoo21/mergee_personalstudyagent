import React, { useState, useEffect } from 'react';
import { getContextBriefing, getContextContinueQuestion } from '../utils/claude';

export default function ContextBriefing({ stack, messages, apiKey, onDismiss, onContinue }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (!stack || !messages.length) return;
    setLoading(true);
    setText('');
    getContextBriefing(apiKey, stack.name, messages)
      .then((t) => setText(t))
      .catch(() => setText(''))
      .finally(() => setLoading(false));
  }, [stack?.id]);

  const lastMsg = messages.length ? messages[messages.length - 1] : null;
  const lastDate = lastMsg
    ? new Date(lastMsg.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : null;
  const msgCount = messages.length;

  const handleContinue = async () => {
    if (!onContinue) return;
    setContinuing(true);
    try {
      const question = await getContextContinueQuestion(apiKey, stack.name, messages);
      onContinue(question);
      onDismiss();
    } catch {}
    setContinuing(false);
  };

  return (
    <div
      className="mx-4 mt-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm"
      style={{ borderLeft: '3px solid ' + (stack?.color || '#6366f1') }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">context switch</span>
            {lastDate && <span className="text-[10px] text-gray-300">{lastDate}</span>}
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] text-gray-400">{msgCount}개 메시지</span>
          </div>

          {/* Briefing text */}
          {loading ? (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-3 h-3 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-400">브리핑 생성 중...</span>
            </div>
          ) : (
            <p className="text-sm text-gray-700 leading-snug mb-2">{text}</p>
          )}

          {/* Continue button */}
          {!loading && onContinue && (
            <button
              onClick={handleContinue}
              disabled={continuing}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              {continuing ? (
                <>
                  <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                  준비 중...
                </>
              ) : (
                <>
                  ↩ 이어서 하기
                </>
              )}
            </button>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
