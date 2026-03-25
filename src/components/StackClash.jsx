import React, { useState } from 'react';
import { getStackClashPlan } from '../utils/claude';
import MergeEngine from './MergeEngine';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

export default function StackClash({ stacks, apiKey, onAcceptPlan }) {
  const [mode, setMode] = useState('clash'); // 'clash' | 'engine'

  if (mode === 'engine') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setMode('clash')} className="px-3 py-1.5 text-xs font-semibold rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            클래시
          </button>
          <button onClick={() => setMode('engine')} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-900 text-white transition-colors">
            전체 최적화
          </button>
        </div>
        <MergeEngine stacks={stacks} apiKey={apiKey} onAcceptPlan={onAcceptPlan} />
      </div>
    );
  }

  const active = stacks.filter((s) => !s.passed);
  const [selectedIds, setSelectedIds] = useState(
    active.slice(0, 2).map(s => s.id)
  );
  const [hours, setHours] = useState(4);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addStack = () => {
    if (selectedIds.length >= 5) return;
    const available = active.filter(s => !selectedIds.includes(s.id));
    if (available.length > 0) setSelectedIds(prev => [...prev, available[0].id]);
  };

  const removeStack = (idx) => {
    if (selectedIds.length <= 2) return;
    setSelectedIds(prev => prev.filter((_, i) => i !== idx));
  };

  const updateStack = (idx, id) => setSelectedIds(prev => prev.map((v, i) => i === idx ? id : v));

  const selectedStacks = selectedIds.map(id => stacks.find(s => s.id === id)).filter(Boolean);
  const canRun = selectedStacks.length >= 2 && new Set(selectedIds).size === selectedIds.length;

  const getDday = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  };

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const s1 = selectedStacks[0];
      const s2 = selectedStacks[1];
      const r = await getStackClashPlan(apiKey, s1, s2, hours);
      setResult(r);
    } catch (e) {
      setError(e.message || '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const s1 = selectedStacks[0];
  const s2 = selectedStacks[1];
  const pct1 = result ? Math.round((result.stack1Hours / hours) * 100) : 50;
  const pct2 = result ? 100 - pct1 : 50;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Mode toggle */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-1 flex-shrink-0">
        <button onClick={() => setMode('clash')} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-900 text-white transition-colors">
          클래시
        </button>
        <button onClick={() => setMode('engine')} className="px-3 py-1.5 text-xs font-semibold rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
          전체 최적화
        </button>
      </div>
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* ── LEFT: Settings (40%) ── */}
      <div className="w-[40%] flex flex-col border-r border-gray-100 overflow-y-auto bg-white">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-[28px] font-black text-gray-900 tracking-tight leading-none">stack clash</h1>
          <p className="text-[14px] text-gray-400 mt-1.5">시험들을 동시에 준비할 때 최적 시간 배분을 계산해요</p>
        </div>

        <div className="px-6 py-6 space-y-6 flex-1">
          {active.length < 2 ? (
            <div className="bg-gray-50 rounded-2xl p-6 text-center text-sm text-gray-400">
              활성 스택이 2개 이상 필요합니다
            </div>
          ) : (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">시험 선택 (2–5개)</p>

              {/* Dynamic stack selects */}
              <div className="space-y-3">
                {selectedIds.map((id, idx) => {
                  const s = stacks.find(st => st.id === id);
                  return (
                    <div key={idx}>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 font-semibold w-14 flex-shrink-0">시험 {idx + 1}</label>
                        <select
                          value={id}
                          onChange={(e) => updateStack(idx, e.target.value)}
                          className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                        >
                          {active.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                        </select>
                        {selectedIds.length > 2 && (
                          <button
                            onClick={() => removeStack(idx)}
                            className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                          >
                            −
                          </button>
                        )}
                      </div>
                      {s && (
                        <div className="mt-2 ml-16 flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-xs text-gray-400">진도 {s.progress || 0}%</span>
                          {getDday(s.examDate) !== null && (
                            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">D-{getDday(s.examDate)}</span>
                          )}
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: (s.progress||0)+'%', backgroundColor: s.color }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add stack button */}
              {selectedIds.length < 5 && active.length > selectedIds.length && (
                <button
                  onClick={addStack}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors flex items-center gap-1"
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  + 시험 추가
                </button>
              )}

              {new Set(selectedIds).size !== selectedIds.length && (
                <p className="text-sm text-red-400">서로 다른 시험을 선택하세요</p>
              )}

              {/* Hours slider */}
              <div>
                <label className="text-sm text-gray-600 font-semibold block mb-2">
                  하루 공부 가능 시간 — <span className="text-gray-900 font-black">{hours}시간</span>
                </label>
                <input type="range" min="1" max="12" step="0.5" value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full accent-gray-900" />
                <div className="flex justify-between text-xs text-gray-300 mt-1"><span>1h</span><span>12h</span></div>
              </div>

              <button
                onClick={handleRun}
                disabled={!canRun || loading}
                className="w-full py-4 rounded-2xl text-base font-bold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />계산 중...</>
                ) : '⚡ 최적 배분 계산'}
              </button>

              {error && <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-500">{error}</div>}
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT: Results (60%) ── */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8f9fa] px-6 py-6 space-y-5">
        {!result ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-20">
            <div className="text-6xl mb-4">⚡</div>
            <p className="text-gray-500 font-semibold text-base">계산 결과가 여기 표시됩니다</p>
            <p className="text-gray-400 text-sm mt-1">왼쪽에서 시험을 선택하고 계산해보세요</p>
          </div>
        ) : s1 && s2 && (
          <>
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-1">추천 배분</h2>
              <p className="text-sm text-gray-400">오늘부터 이 비율로 공부하세요</p>
            </div>

            {/* Visual split bar */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="rounded-2xl overflow-hidden h-14 flex mb-4">
                <div className="flex items-center justify-center text-white text-sm font-bold transition-all duration-700"
                  style={{ width: pct1 + '%', backgroundColor: s1.color }}>
                  {result.stack1Hours}h
                </div>
                <div className="flex items-center justify-center text-white text-sm font-bold transition-all duration-700"
                  style={{ width: pct2 + '%', backgroundColor: s2.color }}>
                  {result.stack2Hours}h
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[{ stack: s1, hrs: result.stack1Hours, pct: pct1 }, { stack: s2, hrs: result.stack2Hours, pct: pct2 }].map(({ stack, hrs, pct }) => (
                  <div key={stack.id} className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: stack.color }} />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{stack.name}</p>
                      <p className="text-xs text-gray-400">{hrs}시간 / day · {pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advice */}
            {result.advice && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">AI 전략 조언</p>
                <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">{result.advice}</p>
              </div>
            )}

            {/* Weekly schedule */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">주간 스케줄 제안</p>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day, i) => {
                  const isWeekend = i >= 5;
                  const h1 = isWeekend ? Math.round(result.stack1Hours * 0.6 * 10) / 10 : result.stack1Hours;
                  const h2 = isWeekend ? Math.round(result.stack2Hours * 0.6 * 10) / 10 : result.stack2Hours;
                  return (
                    <div key={day} className={`rounded-xl p-2 text-center ${isWeekend ? 'bg-gray-50' : 'bg-gray-50'}`}>
                      <p className="text-[10px] font-bold text-gray-400 mb-2">{day}</p>
                      <div className="space-y-1">
                        <div className="rounded-lg py-1.5 text-[10px] font-bold text-white" style={{ backgroundColor: s1.color }}>
                          {h1}h
                        </div>
                        <div className="rounded-lg py-1.5 text-[10px] font-bold text-white" style={{ backgroundColor: s2.color }}>
                          {h2}h
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s1.color }} />{s1.name}</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s2.color }} />{s2.name}</div>
                <span className="ml-auto">주말은 평일의 60%로 계산</span>
              </div>
            </div>

            <button onClick={handleRun}
              className="py-3 rounded-2xl text-sm font-semibold text-gray-400 hover:bg-white border border-gray-200 transition-colors bg-white shadow-sm">
              다시 계산
            </button>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
