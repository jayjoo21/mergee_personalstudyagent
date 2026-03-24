import React, { useState, useCallback } from 'react';
import { getWeakPointQuestion } from '../utils/claude';

export default function WeakPointSniper({ wrongNotes, stacks, apiKey }) {
  const [selectedStackId, setSelectedStackId] = useState('all');
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const stacksWithNotes = stacks.filter((s) => wrongNotes.some((n) => n.stackId === s.id));

  const getWeakConcepts = () => {
    const notes = selectedStackId === 'all' ? wrongNotes : wrongNotes.filter((n) => n.stackId === selectedStackId);
    return notes.slice(0, 10).map((n) => n.concept || n.summary || '').filter(Boolean);
  };

  const targetStackName = () => {
    if (selectedStackId === 'all') return '전체';
    return stacks.find((s) => s.id === selectedStackId)?.name || '전체';
  };

  const snipe = useCallback(async () => {
    const concepts = getWeakConcepts();
    if (!concepts.length) { setError('오답 노트가 없습니다. 채팅에서 AI 답변을 저장해보세요.'); return; }
    setLoading(true); setError(''); setQuestion(null); setSelected(null); setSubmitted(false);
    try {
      const q = await getWeakPointQuestion(apiKey, targetStackName(), concepts);
      if (!q) throw new Error('문제 생성 실패');
      setQuestion(q);
    } catch (e) {
      setError(e.message || '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, selectedStackId, wrongNotes]);

  const handleSubmit = () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    setScore((prev) => ({ correct: prev.correct + (selected === question.answer ? 1 : 0), total: prev.total + 1 }));
  };

  const noteCounts = stacks.map((s) => ({
    ...s,
    count: wrongNotes.filter((n) => n.stackId === s.id).length,
  })).filter((s) => s.count > 0).sort((a, b) => b.count - a.count);

  const top5 = noteCounts.flatMap((s) =>
    wrongNotes.filter((n) => n.stackId === s.id).slice(0, 2).map((n) => ({ ...n, stackName: s.name, stackColor: s.color }))
  ).slice(0, 5);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* ── LEFT: Analysis panel (35%) ── */}
      <div className="w-[35%] flex flex-col border-r border-gray-100 overflow-y-auto bg-white">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-[28px] font-black text-gray-900 tracking-tight leading-none">weak sniper</h1>
          <p className="text-[14px] text-gray-400 mt-1.5">오답 패턴 분석 → 취약 개념 저격</p>
        </div>

        <div className="px-6 py-6 flex-1 space-y-6">
          {/* Per-stack stats */}
          {noteCounts.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">취약 스택</p>
              <div className="space-y-3">
                {noteCounts.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedStackId(s.id === selectedStackId ? 'all' : s.id)}
                      className={`flex items-center gap-2 flex-1 min-w-0 text-left py-2 px-3 rounded-xl transition-colors ${selectedStackId === s.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-[13px] font-medium text-gray-700 truncate flex-1">{s.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{s.count}개</span>
                    </button>
                    <div className="w-16 bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: (s.count / noteCounts[0].count * 100) + '%', backgroundColor: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top 5 weak concepts */}
          {top5.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">취약 개념 TOP {top5.length}</p>
              <div className="space-y-2">
                {top5.map((n, i) => (
                  <div key={n.id} className="flex items-start gap-2 py-2 px-3 bg-gray-50 rounded-xl">
                    <span className="text-xs font-black text-gray-300 w-4 flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{n.concept || n.summary?.slice(0, 40) || '개념'}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: n.stackColor }} />
                        <span className="text-[10px] text-gray-400">{n.stackName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target selector */}
          {wrongNotes.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">타겟</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedStackId('all')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${selectedStackId === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  전체 ({wrongNotes.length})
                </button>
                {noteCounts.map((s) => (
                  <button key={s.id} onClick={() => setSelectedStackId(s.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${selectedStackId === s.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    style={selectedStackId === s.id ? { backgroundColor: s.color } : {}}>
                    {s.name} ({s.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Score */}
          {score.total > 0 && (
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">세션 점수</p>
              <p className="text-2xl font-black text-gray-900">{score.correct}/{score.total}</p>
              <p className={`text-sm font-semibold mt-0.5 ${score.correct / score.total >= 0.7 ? 'text-green-600' : 'text-gray-400'}`}>
                {Math.round(score.correct / score.total * 100)}%
              </p>
            </div>
          )}

          {/* Snipe button */}
          <button
            onClick={snipe}
            disabled={loading || wrongNotes.length === 0}
            className="w-full py-4 rounded-2xl text-base font-bold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />문제 생성 중...</>
            ) : '🎯 약점 저격 문제 출제'}
          </button>

          {wrongNotes.length === 0 && (
            <p className="text-sm text-gray-400 text-center">오답 노트가 없습니다.<br />채팅에서 AI 답변을 저장해보세요.</p>
          )}
        </div>
      </div>

      {/* ── RIGHT: Quiz panel (65%) ── */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8f9fa] px-6 py-6">
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-500 mb-4">{error}</div>
        )}

        {!question && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-20">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-gray-500 font-semibold text-base">문제가 여기 표시됩니다</p>
            <p className="text-gray-400 text-sm mt-1">왼쪽에서 타겟을 선택하고 출제해보세요</p>
          </div>
        )}

        {question && (
          <div className="max-w-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">저격 문제</h2>
              <span className="text-xs bg-red-100 text-red-600 font-semibold px-2.5 py-1 rounded-full">취약 개념</span>
            </div>

            {/* Question */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <p className="text-[15px] font-semibold text-gray-800 leading-relaxed">{question.question}</p>
            </div>

            {/* Choices */}
            <div className="space-y-3">
              {question.choices.map((c) => {
                const isSelected = selected === c.label;
                const isCorrect = submitted && c.label === question.answer;
                const isWrong = submitted && isSelected && c.label !== question.answer;
                let cls = 'w-full flex items-center gap-4 px-5 py-4 rounded-2xl border text-[14px] text-left transition-all ';
                if (isCorrect) cls += 'bg-green-50 border-green-400 text-green-800 font-semibold';
                else if (isWrong) cls += 'bg-red-50 border-red-400 text-red-700';
                else if (isSelected && !submitted) cls += 'bg-gray-900 border-gray-900 text-white';
                else cls += 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50';
                return (
                  <button key={c.label} onClick={() => !submitted && setSelected(c.label)} disabled={submitted} className={cls}>
                    <span className="font-black w-6 text-center flex-shrink-0">{c.label}</span>
                    <span className="flex-1">{c.text}</span>
                    {isCorrect && <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    {isWrong && <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {submitted && question.explanation && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">해설</p>
                <p className="text-[14px] text-blue-800 leading-relaxed">{question.explanation}</p>
              </div>
            )}

            {/* Result + actions */}
            {submitted && (
              <div className={`text-center py-3 rounded-2xl text-sm font-bold ${selected === question.answer ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {selected === question.answer ? '정답! 취약점 극복 중! 🎯' : '오답 — 다시 한 번 확인해보세요'}
              </div>
            )}

            <div className="flex gap-3">
              {!submitted ? (
                <button onClick={handleSubmit} disabled={!selected}
                  className="flex-1 py-3.5 rounded-2xl text-base font-bold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-40">
                  제출
                </button>
              ) : (
                <button onClick={snipe}
                  className="flex-1 py-3.5 rounded-2xl text-base font-bold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95">
                  다음 저격 문제 →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
