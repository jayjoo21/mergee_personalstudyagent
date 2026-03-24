import React, { useState, useEffect } from 'react';
import { getTodayStr } from '../utils/helpers';
import { getTomorrowForecast } from '../utils/claude';

function getPastNDates(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getWeekDates() { return getPastNDates(7); }
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export default function MergeReport({ stacks, studyActivity, conversations, wrongNotes, streakData, apiKey }) {
  const [range, setRange] = useState(7);
  const [forecast, setForecast] = useState('');
  const [forecastLoading, setForecastLoading] = useState(false);

  const dates = getPastNDates(range);
  const weekDates = getWeekDates();
  const todayStr = getTodayStr();

  const activeDays = dates.filter((d) => (studyActivity[d] || 0) > 0).length;
  const totalActivity = dates.reduce((acc, d) => acc + (studyActivity[d] || 0), 0);
  const weekNotes = wrongNotes.filter((n) => dates.includes(n.timestamp?.split('T')[0])).length;
  const totalMessages = Object.values(conversations).reduce((acc, msgs) => acc + msgs.length, 0);
  const stackMsgCounts = stacks.map((s) => ({ ...s, msgs: (conversations[s.id] || []).length })).sort((a, b) => b.msgs - a.msgs);
  const avgPerDay = activeDays > 0 ? Math.round(totalActivity / activeDays) : 0;
  const streak = streakData?.count || 0;
  const activeStacks = stacks.filter((s) => !s.passed);
  const passedStacks = stacks.filter((s) => s.passed);

  const getGrade = () => {
    if (activeDays >= range * 0.85 && totalActivity >= range * 5) return { label: 'S', color: '#111', bg: '#f3f4f6' };
    if (activeDays >= range * 0.7 && totalActivity >= range * 3) return { label: 'A', color: '#059669', bg: '#ecfdf5' };
    if (activeDays >= range * 0.5) return { label: 'B', color: '#d97706', bg: '#fffbeb' };
    if (activeDays >= range * 0.3) return { label: 'C', color: '#dc2626', bg: '#fef2f2' };
    return { label: 'D', color: '#6b7280', bg: '#f9fafb' };
  };
  const grade = getGrade();

  const loadForecast = async () => {
    setForecastLoading(true);
    try {
      const text = await getTomorrowForecast(apiKey, stacks, studyActivity);
      setForecast(text);
    } catch { setForecast('예보를 불러올 수 없습니다.'); }
    setForecastLoading(false);
  };

  useEffect(() => { loadForecast(); }, []);

  const copyReport = () => {
    const text = [
      '[ MERGE REPORT ]',
      new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
      '기간: 최근 ' + range + '일 · 등급: ' + grade.label,
      '학습 일수: ' + activeDays + '/' + range + '일 · 스트릭: ' + streak + '일',
      '',
      '[ 스택 현황 ]',
      ...activeStacks.map((s) => s.name + ': ' + (s.progress || 0) + '%'),
      ...(passedStacks.length ? ['', '[ 합격 완료 ]', ...passedStacks.map((s) => s.name)] : []),
    ].join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#f8f9fa]">
      {/* ── Top: Grade bar (full width) ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-6">
          {/* Grade */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: grade.bg }}>
            <span className="text-4xl font-black" style={{ color: grade.color }}>{grade.label}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[22px] font-black text-gray-900 tracking-tight">merge report</h1>
              {/* Range tabs */}
              <div className="flex bg-gray-100 rounded-xl overflow-hidden text-xs font-semibold ml-2">
                {[7, 14, 30].map((r) => (
                  <button key={r} onClick={() => setRange(r)}
                    className={`px-3 py-1.5 transition-colors ${range === r ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>
                    {r}일
                  </button>
                ))}
              </div>
              <button onClick={copyReport} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-400 transition-colors" title="복사">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span><span className="font-bold text-gray-800">{activeDays}/{range}일</span> 학습</span>
              <span><span className="font-bold text-gray-800">{totalActivity}</span>건 활동</span>
              {streak > 0 && <span>🔥 <span className="font-bold text-gray-800">{streak}일</span> 스트릭</span>}
              <span><span className="font-bold text-gray-800">{weekNotes}</span>개 오답 저장</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: 2-col grid ── */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* LEFT column */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 border-r border-gray-100">
          {/* Weekly heatmap */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">주간 활동</p>
            <div className="flex gap-2">
              {weekDates.map((d) => {
                const count = studyActivity[d] || 0;
                const isToday = d === todayStr;
                const maxCount = Math.max(...weekDates.map((dd) => studyActivity[dd] || 0), 1);
                const opacity = count > 0 ? 0.3 + (count / maxCount) * 0.7 : 0;
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className={`w-full rounded-xl transition-all ${isToday ? 'ring-2 ring-gray-900 ring-offset-1' : ''}`}
                      style={{ height: '52px', background: count > 0 ? `rgba(17,17,17,${opacity})` : '#f3f4f6' }}
                      title={d + ': ' + count + '건'}
                    />
                    <span className="text-[11px] text-gray-400 font-medium">{DAY_KO[new Date(d).getDay()]}</span>
                    <span className="text-[11px] text-gray-500 font-bold tabular-nums">{count || '·'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stack activity */}
          {stackMsgCounts.filter((s) => s.msgs > 0).length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">스택별 활동</p>
              <div className="space-y-3">
                {stackMsgCounts.filter((s) => s.msgs > 0).map((s) => {
                  const max = stackMsgCounts[0].msgs;
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-32 flex-shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className={`text-[13px] font-medium truncate ${s.passed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{s.name}</span>
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full transition-all duration-500"
                          style={{ width: (s.msgs / max * 100) + '%', backgroundColor: s.passed ? '#d1d5db' : s.color }} />
                      </div>
                      <span className="text-xs text-gray-400 tabular-nums w-12 text-right">{s.msgs}건{s.passed && ' ✓'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progress */}
          {activeStacks.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">진도 현황</p>
              <div className="space-y-4">
                {activeStacks.map((s) => {
                  const dday = s.examDate ? Math.ceil((new Date(s.examDate) - new Date()) / 86400000) : null;
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-[13px] font-medium text-gray-700">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {dday !== null && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dday <= 7 ? 'bg-red-100 text-red-600' : dday <= 30 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                              D-{dday}
                            </span>
                          )}
                          <span className="text-xs font-bold text-gray-600">{s.progress || 0}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-500"
                          style={{ width: (s.progress || 0) + '%', backgroundColor: s.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT column */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Stats 2x2 grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '총 활동', value: totalActivity.toLocaleString(), unit: '건', icon: '💬' },
              { label: '일평균 활동', value: avgPerDay, unit: '건/일', icon: '📊' },
              { label: '오답 저장', value: weekNotes, unit: '개', icon: '📝' },
              { label: '전체 메시지', value: totalMessages.toLocaleString(), unit: '개', icon: '🗨️' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-base">{stat.icon}</span>
                  <span className="text-xs text-gray-400 font-medium">{stat.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-gray-900">{stat.value}</span>
                  <span className="text-xs text-gray-400">{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Tomorrow Forecast */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔮</span>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">tomorrow's forecast</p>
              </div>
              <button onClick={loadForecast} disabled={forecastLoading}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40">
                {forecastLoading ? '...' : '새로고침'}
              </button>
            </div>
            {forecastLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                내일 예보 생성 중...
              </div>
            ) : forecast ? (
              <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-line">{forecast}</p>
            ) : (
              <p className="text-sm text-gray-400">스택을 추가하면 내일 예보를 볼 수 있어요</p>
            )}
          </div>

          {/* Passed stacks */}
          {passedStacks.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">합격 완료 🎉</p>
              <div className="flex flex-wrap gap-2">
                {passedStacks.map((s) => (
                  <span key={s.id} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    {s.name} ✓
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
