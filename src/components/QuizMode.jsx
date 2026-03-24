import React, { useState, useEffect, useCallback } from 'react';
import { getQuizQuestion } from '../utils/claude';

export default function QuizMode({ stack, apiKey, onClose, onSaveWrongNote }) {
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected(null);
    setSubmitted(false);
    try {
      const q = await getQuizQuestion(apiKey, stack.name);
      if (!q) throw new Error('질문 생성에 실패했습니다');
      setQuestion(q);
    } catch (e) {
      setError(e.message || '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [apiKey, stack.name]);

  useEffect(() => { fetchQuestion(); }, [fetchQuestion]);

  const handleSubmit = async () => {
    if (!selected || submitted) return;
    setSubmitted(true);
    const correct = selected === question.answer;
    setScore((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));
    if (!correct && onSaveWrongNote) {
      const content = '[퀴즈 오답]\n\n'
        + '문제: ' + question.question + '\n\n'
        + '내 답: ' + selected + '. ' + (question.choices.find((c) => c.label === selected)?.text || '') + '\n'
        + '정답: ' + question.answer + '. ' + (question.choices.find((c) => c.label === question.answer)?.text || '') + '\n\n'
        + '해설: ' + (question.explanation || '');
      await onSaveWrongNote(
        { id: String(Date.now()), role: 'assistant', content, timestamp: new Date().toISOString() },
        stack
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: stack.color }}
            />
            <span className="font-semibold text-gray-800 text-sm">{stack.name} 퀴즈</span>
          </div>
          <div className="flex items-center gap-3">
            {score.total > 0 && (
              <span className="text-xs text-gray-500 tabular-nums">
                {score.correct}/{score.total} 정답
              </span>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-400">문제 생성 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchQuestion}
                className="text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : question ? (
            <div>
              {/* Question */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <p className="text-sm font-semibold text-gray-800 leading-relaxed">{question.question}</p>
              </div>

              {/* Choices */}
              <div className="space-y-2.5 mb-5">
                {question.choices.map((c) => {
                  const isSelected = selected === c.label;
                  const isCorrect = submitted && c.label === question.answer;
                  const isWrong = submitted && isSelected && c.label !== question.answer;

                  let cls = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all duration-150 ';
                  if (isCorrect) {
                    cls += 'bg-green-50 border-green-400 text-green-800 font-semibold';
                  } else if (isWrong) {
                    cls += 'bg-red-50 border-red-400 text-red-700';
                  } else if (isSelected && !submitted) {
                    cls += 'bg-gray-900 border-gray-900 text-white';
                  } else {
                    cls += 'bg-white border-gray-200 text-gray-700 hover:border-gray-400';
                  }

                  return (
                    <button
                      key={c.label}
                      onClick={() => !submitted && setSelected(c.label)}
                      disabled={submitted}
                      className={cls}
                    >
                      <span className="font-bold flex-shrink-0 w-5 text-center">{c.label}</span>
                      <span className="flex-1 text-left">{c.text}</span>
                      {isCorrect && (
                        <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isWrong && (
                        <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {submitted && question.explanation && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
                  <p className="text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wide">해설</p>
                  <p className="text-sm text-blue-800 leading-relaxed">{question.explanation}</p>
                </div>
              )}

              {/* Result banner */}
              {submitted && (
                <div className={`text-center py-2 rounded-xl text-sm font-semibold mb-4 ${selected === question.answer ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {selected === question.answer ? '정답! 잘하셨어요 🎉' : '오답 — 오답노트에 저장됩니다 📝'}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!selected || loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              제출
            </button>
          ) : (
            <button
              onClick={fetchQuestion}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all duration-150 active:scale-95"
            >
              다음 문제 →
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
          >
            종료
          </button>
        </div>
      </div>
    </div>
  );
}
