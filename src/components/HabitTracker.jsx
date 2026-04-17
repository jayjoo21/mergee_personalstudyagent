import React, { useState, useEffect, useCallback } from 'react';
import { storage, KEYS } from '../utils/storage';

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
const PALETTE = ['#6366f1','#10b981','#f59e0b','#f43f5e','#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'];

function toDateStr(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function todayStr() { return new Date().toISOString().split('T')[0]; }

function isScheduled(habit, dow) {
  if (!habit.days || habit.days.length === 0) return true;
  return habit.days.includes(DOW_KO[dow]);
}

function getStats(habit, dayDates, habitLogs) {
  const today = todayStr();
  const countable = dayDates.filter(({ dow, dateStr }) => isScheduled(habit, dow) && dateStr <= today);
  const done = countable.filter(({ dateStr }) => habitLogs[dateStr]?.[habit.id]).length;
  const total = countable.length;
  return { done, total, pct: total > 0 ? Math.round(done / total * 100) : 0 };
}

export default function HabitTracker({ habits: propHabits, habitLogs: propHabitLogs, onHabitsChange, onHabitLogsChange, onRecordActivity, onNavigateCampusLife }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [habits, setHabitsLocal] = useState(() => propHabits ?? storage.get(KEYS.HABITS, []));
  const [habitLogs, setHabitLogsLocal] = useState(() => propHabitLogs ?? storage.get(KEYS.HABIT_LOGS, {}));

  /* Sync when props change (CampusLife registers timetable) */
  useEffect(() => { if (propHabits !== undefined) setHabitsLocal(propHabits); }, [propHabits]);
  useEffect(() => { if (propHabitLogs !== undefined) setHabitLogsLocal(propHabitLogs); }, [propHabitLogs]);

  /* Wrapped setters: persist + notify parent */
  const setHabits = useCallback((updater) => {
    setHabitsLocal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      storage.set(KEYS.HABITS, next);
      onHabitsChange?.(next);
      return next;
    });
  }, [onHabitsChange]);

  const setHabitLogs = useCallback((updater) => {
    setHabitLogsLocal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      storage.set(KEYS.HABIT_LOGS, next);
      onHabitLogsChange?.(next);
      return next;
    });
  }, [onHabitLogsChange]);

  /* Manual habit form */
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDays, setNewDays] = useState([]);
  const [newColor, setNewColor] = useState(PALETTE[0]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dayDates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(viewYear, viewMonth, i + 1);
    return { day: i + 1, dow: d.getDay(), dateStr: toDateStr(viewYear, viewMonth, i + 1) };
  });

  const toggleHabit = useCallback((habitId, dateStr) => {
    setHabitLogs(prev => {
      const dayLog = prev[dateStr] || {};
      const newVal = !dayLog[habitId];
      if (newVal) onRecordActivity?.();
      return { ...prev, [dateStr]: { ...dayLog, [habitId]: newVal } };
    });
  }, [setHabitLogs, onRecordActivity]);

  const addManualHabit = () => {
    if (!newName.trim()) return;
    const h = { id: String(Date.now()), name: newName.trim(), days: newDays, color: newColor, fromTimetable: false };
    setHabits(prev => [...prev, h]);
    setNewName(''); setNewDays([]); setNewColor(PALETTE[0]);
    setShowAddForm(false);
  };

  const deleteHabit = (id) => setHabits(prev => prev.filter(h => h.id !== id));

  const today = todayStr();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const todayScheduled = habits.filter(h => isScheduled(h, now.getDay()));
  const todayDone = todayScheduled.filter(h => habitLogs[today]?.[h.id]).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#f8f8f6' }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-gray-900 tracking-tight">habit tracker</span>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span className="text-xs font-semibold text-gray-600 min-w-[80px] text-center">{viewYear}년 {viewMonth + 1}월</span>
            <button onClick={nextMonth} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        <div className="flex-1" />

        {todayScheduled.length > 0 && isCurrentMonth && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
            <span className="text-[10px] text-gray-400 font-medium">오늘</span>
            <span className="text-xs font-bold text-gray-700">{todayDone}/{todayScheduled.length}</span>
            <div className="flex gap-0.5">
              {todayScheduled.map(h => (
                <span key={h.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: habitLogs[today]?.[h.id] ? h.color : '#e5e7eb' }} />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-1.5 h-7 px-3 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
        >
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          습관 추가
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 flex flex-col gap-6">

          {/* ── Manual habit form ── */}
          {showAddForm && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">새 습관 추가</p>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addManualHabit()}
                  placeholder="습관 이름..."
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200 min-w-[160px]"
                />
                <div className="flex gap-1">
                  {DOW_KO.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => setNewDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                        newDays.includes(d) ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      } ${i === 0 ? '!text-red-400' : i === 6 ? '!text-blue-400' : ''}`}
                    >{d}</button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {PALETTE.slice(0, 6).map(c => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                      style={{ backgroundColor: c, outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                    />
                  ))}
                </div>
                <button onClick={addManualHabit} disabled={!newName.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors">
                  추가
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-3 py-2 text-xs text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">취소</button>
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {habits.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-2xl">🌱</span>
              </div>
              <h3 className="text-sm font-bold text-gray-400 mb-1">아직 등록된 습관이 없어요</h3>
              <p className="text-xs text-gray-300 mb-5 leading-relaxed">
                습관을 직접 추가하거나<br/>Campus Life에서 시간표를 등록하면 출석 습관이 자동 생성돼요
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors">
                  + 습관 추가
                </button>
                {onNavigateCampusLife && (
                  <button onClick={onNavigateCampusLife}
                    className="px-4 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    🎓 Campus Life
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Monthly Matrix ── */}
          {habits.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">월간 매트릭스</p>
                <p className="text-[10px] text-gray-300">● 클릭하여 달성 체크</p>
              </div>
              <div className="overflow-x-auto pb-3">
                <table className="border-collapse w-full" style={{ minWidth: `${190 + daysInMonth * 32}px` }}>
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-white z-10 w-44 min-w-44 px-4 py-2" />
                      {dayDates.map(({ day, dow, dateStr }) => (
                        <th key={day} className="w-8 min-w-8 py-2 text-center">
                          <div className={`text-[10px] font-semibold leading-none ${
                            dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-300'
                          } ${dateStr === today ? 'text-gray-800' : ''}`}>
                            {day}
                          </div>
                          {dateStr === today && <div className="w-1 h-1 rounded-full bg-gray-800 mx-auto mt-0.5" />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map((habit, hi) => {
                      const stats = getStats(habit, dayDates, habitLogs);
                      return (
                        <tr key={habit.id} className={hi % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                          <td className="sticky left-0 z-10 px-4 py-1.5" style={{ background: hi % 2 === 0 ? '#fff' : 'rgba(249,250,251,0.4)' }}>
                            <div className="flex items-center gap-2 group">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                              <span className="text-xs text-gray-700 truncate max-w-[110px]" title={habit.name}>{habit.name}</span>
                              <button
                                onClick={() => deleteHabit(habit.id)}
                                className="opacity-0 group-hover:opacity-100 ml-auto w-4 h-4 text-gray-300 hover:text-red-400 transition-all flex-shrink-0 text-sm"
                              >×</button>
                            </div>
                            {habit.days?.length > 0 && (
                              <div className="flex gap-0.5 mt-0.5 ml-4">
                                {habit.days.map(d => (
                                  <span key={d} className="text-[9px] text-gray-300 font-medium">{d}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          {dayDates.map(({ dow, dateStr }) => {
                            const scheduled = isScheduled(habit, dow);
                            const done = !!habitLogs[dateStr]?.[habit.id];
                            const isFuture = dateStr > today;
                            if (!scheduled) {
                              return <td key={dateStr} className="w-8 p-0.5"><div className="w-6 h-6 rounded-md mx-auto" style={{ backgroundColor: 'rgba(0,0,0,0.02)' }} /></td>;
                            }
                            return (
                              <td key={dateStr} className="w-8 p-0.5">
                                <button
                                  disabled={isFuture}
                                  onClick={() => toggleHabit(habit.id, dateStr)}
                                  title={dateStr}
                                  className={`w-6 h-6 rounded-md mx-auto flex items-center justify-center transition-all ${
                                    isFuture ? 'opacity-20 cursor-not-allowed'
                                    : done ? 'shadow-sm hover:opacity-80'
                                    : 'bg-gray-100 hover:bg-gray-200'
                                  }`}
                                  style={done ? { backgroundColor: habit.color } : {}}
                                >
                                  {done && (
                                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                                    </svg>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Achievement Summary ── */}
          {habits.length > 0 && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">달성률</p>
              <div className="flex flex-col gap-3">
                {habits.map(habit => {
                  const { done, total, pct } = getStats(habit, dayDates, habitLogs);
                  return (
                    <div key={habit.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-44 flex-shrink-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                        <span className="text-xs text-gray-600 truncate">{habit.name}</span>
                      </div>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: habit.color }}
                        />
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 w-24 text-right">
                        <span className="text-xs font-bold tabular-nums" style={{ color: habit.color }}>{pct}%</span>
                        <span className="text-[10px] text-gray-300">{done}/{total}일</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weekly sparklines */}
              <div className="mt-5 pt-4 border-t border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">주간 달성 추이</p>
                <div className="flex flex-col gap-3">
                  {habits.map(habit => {
                    const weeks = [];
                    let weekDays = [];
                    dayDates.forEach(({ dow, dateStr }, i) => {
                      if (isScheduled(habit, dow)) weekDays.push(dateStr);
                      if (dow === 6 || i === dayDates.length - 1) {
                        if (weekDays.length > 0) {
                          const countable = weekDays.filter(d => d <= today);
                          const done = countable.filter(d => habitLogs[d]?.[habit.id]).length;
                          weeks.push(countable.length > 0 ? Math.round(done / countable.length * 100) : null);
                          weekDays = [];
                        }
                      }
                    });
                    const maxW = 160;
                    const barH = 28;
                    const gap = 4;
                    const barW = weeks.length > 0 ? Math.min(24, (maxW - gap * (weeks.length - 1)) / weeks.length) : 20;
                    return (
                      <div key={habit.id} className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-400 w-44 truncate flex-shrink-0">{habit.name}</span>
                        <svg width={maxW} height={barH} className="flex-shrink-0">
                          {weeks.map((pct, wi) => {
                            const h = pct !== null ? Math.max(2, Math.round(pct / 100 * barH)) : 2;
                            const x = wi * (barW + gap);
                            return (
                              <g key={wi}>
                                <rect
                                  x={x} y={barH - h} width={barW} height={h}
                                  rx={3} fill={pct === null ? '#f3f4f6' : habit.color}
                                  opacity={pct === null ? 0.5 : 0.85}
                                />
                                {pct !== null && (
                                  <text x={x + barW / 2} y={barH + 10} textAnchor="middle" fontSize={8} fill="#9ca3af">
                                    {wi + 1}주
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                        <div className="flex gap-1 text-[10px] text-gray-400">
                          {weeks.map((p, wi) => (
                            <span key={wi} className="w-7 text-center font-medium" style={{ color: p !== null ? habit.color : '#d1d5db' }}>
                              {p !== null ? p + '%' : '-'}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
