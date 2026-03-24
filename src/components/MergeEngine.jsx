import React, { useState } from 'react';
import { getMergeEnginePlan } from '../utils/claude';

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export default function MergeEngine({ stacks, apiKey, onAcceptPlan }) {
  const [hours, setHours] = useState(4);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const active = stacks.filter((s) => !s.passed && s.examDate);
  const todayStr = new Date().toISOString().split('T')[0];

  const handleRun = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const plan = await getMergeEnginePlan(apiKey, stacks, hours);
      if (!plan) throw new Error('플랜 생성 실패. 시험 날짜가 설정된 스택을 확인해주세요.');
      setResult(plan);
    } catch (e) {
      setError(e.message || '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToday = () => {
    if (!result || !onAcceptPlan) return;
    const todayPlan = result.days?.find((d) => d.date === todayStr);
    if (!todayPlan) return;
    const goals = {};
    todayPlan.items?.forEach((item) => {
      if (item.stackId) goals[item.stackId] = Math.round(item.hours * 60);
    });
    onAcceptPlan(goals);
  };

  if (active.length < 1) {
    return (
      <div className="flex-1 flex items-center justify-center opacity-40">
        <div className="text-center">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-gray-500 font-semibold text-sm">시험 날짜가 설정된 활성 스택이 필요합니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* LEFT: Settings (35%) */}
      <div className="w-[35%] flex flex-col border-r border-gray-100 overflow-y-auto bg-white px-6 py-6 space-y-6">
        <div>
          <h2 className="text-lg font-black text-gray-900">전체 스택 최적화</h2>
          <p className="text-sm text-gray-400 mt-1">모든 시험을 한 번에 최적 배분</p>
        </div>

        {/* Stack overview */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">분석 대상</p>
          <div className="space-y-2">
            {active.map((s) => {
              const dday = Math.ceil((new Date(s.examDate) - new Date()) / 86400000);
              return (
                <div key={s.id} className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-medium text-gray-700 flex-1 truncate">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.progress || 0}%</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${dday <= 7 ? 'bg-red-100 text-red-600' : dday <= 30 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                    D-{dday}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hours slider */}
        <div>
          <label className="text-sm text-gray-600 font-semibold block mb-2">
            하루 가용 시간 — <span className="text-gray-900 font-black">{hours}시간</span>
          </label>
          <input
            type="range" min="1" max="12" step="0.5" value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full accent-gray-900"
          />
          <div className="flex justify-between text-xs text-gray-300 mt-1"><span>1h</span><span>12h</span></div>
        </div>

        <button
          onClick={handleRun}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-base font-bold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              계산 중...
            </>
          ) : '📅 전체 일정 최적화'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-500">{error}</div>
        )}
      </div>

      {/* RIGHT: Timeline (65%) */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8f9fa] px-6 py-6">
        {!result ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-20">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-500 font-semibold text-base">최적화된 일정이 여기 표시됩니다</p>
            <p className="text-gray-400 text-sm mt-1">왼쪽에서 계산해보세요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">최적 학습 타임라인</h2>
              <button
                onClick={handleApplyToday}
                className="h-9 px-4 text-xs font-bold bg-[#111] text-white rounded-xl hover:bg-gray-800 transition-all active:scale-95"
              >
                오늘 플랜 적용 →
              </button>
            </div>

            {/* AI advice */}
            {result.advice && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">AI 전략</p>
                <p className="text-sm text-gray-700 leading-relaxed">{result.advice}</p>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold">
                <span className="w-3 h-3 rounded-sm bg-red-200" />
                병목 구간 (집중 필요)
              </div>
              {active.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              ))}
            </div>

            {/* Timeline rows */}
            <div className="space-y-2">
              {result.days?.map((day) => {
                const date = new Date(day.date);
                const isToday = day.date === todayStr;
                const dayName = DAY_KO[date.getDay()];
                return (
                  <div
                    key={day.date}
                    className={`rounded-xl p-3 shadow-sm border ${
                      day.bottleneck
                        ? 'bg-red-50 border-red-200'
                        : isToday
                        ? 'bg-white border-gray-900 border-2'
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Date label */}
                      <div className={`w-14 flex-shrink-0 ${isToday ? 'font-black text-gray-900' : 'text-gray-400'}`}>
                        <div className="text-[10px] font-bold">{isToday ? '오늘' : dayName}</div>
                        <div className="text-xs">
                          {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                      {day.bottleneck && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">
                          ⚠ 병목
                        </span>
                      )}

                      {/* Stack bars */}
                      <div className="flex-1 flex flex-wrap gap-1.5">
                        {day.items?.map((item, i) => {
                          const stack = stacks.find((s) => s.id === item.stackId);
                          const bg = item.color || stack?.color || '#6b7280';
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-xs font-semibold"
                              style={{ backgroundColor: bg }}
                            >
                              <span>{item.stackName || stack?.name || '스택'}</span>
                              <span className="opacity-80">{item.hours}h</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleRun}
              className="py-3 w-full rounded-2xl text-sm font-semibold text-gray-400 hover:bg-white border border-gray-200 transition-colors bg-white shadow-sm"
            >
              다시 계산
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
