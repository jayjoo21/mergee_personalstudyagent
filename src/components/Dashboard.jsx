import React, { useState, useEffect, useRef } from 'react';
import { getDday, formatDday, getDdayCardStyle, calcPassProb } from '../utils/helpers';
import DailyPlan from './DailyPlan';
import EmploymentTemperature from './EmploymentTemperature';
import DailyLogCalendar from './DailyLogCalendar';

/* ─────────────────────────────────────────
   ROADMAP — flex spacer timeline
───────────────────────────────────────────*/
function Roadmap({ stacks, tasks = [] }) {
  const [tooltip, setTooltip] = useState(null);
  const sorted = [...stacks]
    .filter((s) => s.examDate && !s.passed)
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

  const activeTasks = (tasks || []).filter(t => !t.done && t.dueDate);

  const ABOVE_H = 84;
  const DOT_D   = 12;
  const BELOW_H = 56;
  const MARKER_W = 80;
  const MIN_SPACER = 80;
  const EDGE_PAD = 16;
  const LINE_Y = ABOVE_H + DOT_D / 2;
  const TOTAL_H = ABOVE_H + DOT_D + BELOW_H;

  const dotColor = (dday) => {
    if (dday <= 0)  return '#dc2626';
    if (dday <= 12) return '#ef4444';
    if (dday <= 30) return '#f97316';
    return null;
  };

  const allItems = [
    ...sorted.map(s => ({ type: 'stack', data: s, dday: Math.max(0, getDday(s.examDate) || 0), color: dotColor(getDday(s.examDate)) || s.color })),
    ...activeTasks.map(t => ({ type: 'task', data: t, dday: Math.max(0, getDday(t.dueDate) || 0), color: t.color })),
  ].sort((a, b) => a.dday - b.dday);

  if (!allItems.length) return null;

  const ddays = allItems.map((item) => item.dday);
  const gapDays = [ddays[0], ...ddays.slice(1).map((d, i) => Math.max(1, d - ddays[i]))];

  const innerMinW = allItems.length * (MARKER_W + MIN_SPACER) + 2 * EDGE_PAD;

  return (
    <div style={{ overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          minWidth: innerMinW + 'px',
          height: TOTAL_H + 'px',
          paddingLeft: EDGE_PAD + 'px',
          paddingRight: EDGE_PAD + 'px',
          boxSizing: 'border-box',
        }}
      >
        {/* Track line */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: LINE_Y + 'px', height: '1px', backgroundColor: '#e5e7eb' }} />
        {/* Today label */}
        <span style={{ position: 'absolute', left: EDGE_PAD + 'px', top: (LINE_Y + 8) + 'px', fontSize: '10px', color: '#9ca3af', fontWeight: 500 }}>today</span>

        {allItems.map((item, i) => {
          const dday = item.type === 'stack' ? getDday(item.data.examDate) : getDday(item.data.dueDate);
          const urgent = dday !== null && dday <= 12;
          const color = item.color;
          const prob = item.type === 'stack' ? calcPassProb({ ...item.data }) : null;
          const label = item.data.name;
          const dateStr = item.type === 'stack' ? item.data.examDate : item.data.dueDate;

          return (
            <React.Fragment key={item.type + '-' + item.data.id}>
              {/* Proportional spacer */}
              <div style={{ flexGrow: gapDays[i], minWidth: MIN_SPACER + 'px', flexShrink: 0 }} />

              {/* Marker column */}
              <div
                style={{
                  flexShrink: 0,
                  width: MARKER_W + 'px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  cursor: 'default',
                }}
                onMouseEnter={() => setTooltip({ id: item.data.id, prob, type: item.type })}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Above zone */}
                <div style={{ height: ABOVE_H + 'px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '8px', gap: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 900, color, lineHeight: 1.2, textAlign: 'center' }}>
                    {formatDday(dday)}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#374151', lineHeight: 1.3, textAlign: 'center', wordBreak: 'keep-all', maxWidth: '80px' }}>
                    {label}
                  </span>
                  {item.type === 'task' && (
                    <span style={{ fontSize: '9px', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>task</span>
                  )}
                  {item.type === 'stack' && urgent && (
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>urgent</span>
                  )}
                </div>

                {/* Dot — on the track line */}
                {item.type === 'task' ? (
                  <div style={{ width: DOT_D + 'px', height: DOT_D + 'px', backgroundColor: color, flexShrink: 0, position: 'relative', zIndex: 1, transform: 'rotate(45deg)' }} />
                ) : (
                  <div style={{ width: DOT_D + 'px', height: DOT_D + 'px', borderRadius: '50%', backgroundColor: color, flexShrink: 0, position: 'relative', zIndex: 1, boxShadow: urgent ? `0 0 0 3px ${color}30` : 'none' }} />
                )}

                {/* Below zone */}
                <div style={{ height: BELOW_H + 'px', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '6px', gap: '3px' }}>
                  <span style={{ fontSize: '10px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                    {new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                  {item.type === 'stack' && (
                    <>
                      <div style={{ width: '48px', height: '2px', backgroundColor: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: (item.data.progress || 0) + '%', height: '100%', backgroundColor: color, borderRadius: '9999px' }} />
                      </div>
                      <span style={{ fontSize: '9px', color: '#9ca3af' }}>{item.data.progress || 0}%</span>
                    </>
                  )}
                </div>

                {/* Tooltip */}
                {tooltip?.id === item.data.id && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', zIndex: 20, backgroundColor: '#111827', color: '#fff', borderRadius: '12px', padding: '8px 12px', fontSize: '10px', whiteSpace: 'nowrap', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', pointerEvents: 'none' }}>
                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>{label}</div>
                    {item.type === 'stack' && (
                      <>
                        <div style={{ color: '#d1d5db' }}>진도 {item.data.progress || 0}%</div>
                        <div style={{ color: '#d1d5db' }}>합격 확률 ~{prob}%</div>
                      </>
                    )}
                    {item.type === 'task' && (
                      <div style={{ color: '#d1d5db' }}>task · {formatDday(dday)}</div>
                    )}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   D-DAY CARD — with inline edit mini-modal
───────────────────────────────────────────*/
function DdayCard({ stack, streakData, onMarkPassed, onSaveStack }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ examDate: stack.examDate || '', progress: stack.progress || 0 });
  const [hover, setHover] = useState(false);
  const panelRef = useRef(null);

  const dday = getDday(stack.examDate);
  const style = getDdayCardStyle(dday);
  const prob = calcPassProb({ ...stack, streak: streakData?.count });

  useEffect(() => {
    if (!editing) return;
    const close = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setEditing(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [editing]);

  const handleSave = () => {
    onSaveStack?.({ ...stack, examDate: form.examDate, progress: form.progress });
    setEditing(false);
  };

  return (
    <div
      className="relative rounded-2xl p-4"
      style={{
        background: style.bg,
        border: '0.5px solid ' + style.border,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); setForm({ examDate: stack.examDate || '', progress: stack.progress || 0 }); setEditing(true); }}
        className={`absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-600 hover:bg-white/60 transition-all duration-150 ${hover || editing ? 'opacity-100' : 'opacity-0'}`}
      >
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stack.color }} />
        <span className="text-xs font-bold text-gray-700 truncate pr-6">{stack.name}</span>
      </div>
      <div className="text-2xl font-black mb-0.5" style={{ color: style.text }}>
        {dday !== null ? formatDday(dday) : '—'}
      </div>
      {stack.examDate && (
        <div className="text-[11px] text-gray-500 mb-2.5">
          {new Date(stack.examDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
        </div>
      )}
      <div className="mb-2">
        <div className="flex justify-between text-[11px] text-gray-400 mb-0.5">
          <span>progress</span><span>{stack.progress || 0}%</span>
        </div>
        <div className="w-full h-1 bg-black/5 rounded-full">
          <div className="h-1 rounded-full transition-all" style={{ width: (stack.progress || 0) + '%', backgroundColor: stack.color }} />
        </div>
      </div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] text-gray-400">pass prob.</span>
        <span className="text-[11px] font-bold text-gray-700">{prob}%</span>
      </div>
      <button
        onClick={() => onMarkPassed(stack.id)}
        className="w-full text-[11px] py-1.5 rounded-lg border border-black/8 text-gray-400 hover:border-gray-400 hover:text-gray-700 transition-colors duration-150 bg-white/50"
      >
        mark as merged ✓
      </button>

      {editing && (
        <div
          ref={panelRef}
          className="absolute top-10 right-2 z-30 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-56"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">빠른 편집</p>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 block mb-1">시험일</label>
              <input
                type="date"
                value={form.examDate}
                onChange={(e) => setForm((p) => ({ ...p, examDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                진도율 — <span className="text-gray-700 font-black">{form.progress}%</span>
              </label>
              <input
                type="range" min="0" max="100" value={form.progress}
                onChange={(e) => setForm((p) => ({ ...p, progress: Number(e.target.value) }))}
                className="w-full accent-gray-900"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              className="flex-1 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors"
            >
              저장
            </button>
            <button
              onClick={() => { onMarkPassed(stack.id); setEditing(false); }}
              className="px-2 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-50 rounded-xl transition-colors border border-green-100"
            >
              ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   TASK CARD
───────────────────────────────────────────*/
function TaskCard({ task, onToggle }) {
  const dday = getDday(task.dueDate);
  const style = getDdayCardStyle(dday);
  return (
    <div
      className="relative rounded-2xl p-4"
      style={{ background: style.bg, borderLeft: `3px solid ${task.color}`, border: '0.5px solid ' + style.border }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">task</span>
        <span className="text-xs font-bold text-gray-700 truncate">{task.name}</span>
      </div>
      <div className="text-2xl font-black mb-0.5" style={{ color: style.text }}>
        {dday !== null ? formatDday(dday) : '—'}
      </div>
      {task.dueDate && (
        <div className="text-[11px] text-gray-500 mb-3">
          {new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
        </div>
      )}
      <button
        onClick={() => onToggle(task.id)}
        className="w-full text-[11px] py-1.5 rounded-lg border border-black/8 text-gray-400 hover:border-gray-400 hover:text-gray-700 transition-colors bg-white/50"
      >
        완료 처리 ✓
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   STUDY HEATMAP
───────────────────────────────────────────*/
function StudyHeatmap({ studyActivity, habitLogs = {} }) {
  const WEEKS = 26;
  const CELL_W = 14;
  const GAP = 3;
  const COL_W = CELL_W + GAP;
  const scrollRef = useRef(null);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const total = WEEKS * 7;

  const allDays = Array.from({ length: total }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (total - 1 - i));
    const key = d.toISOString().split('T')[0];
    const habitDone = Object.values(habitLogs[key] || {}).some(Boolean);
    const studyCount = studyActivity[key] || 0;
    return { key, date: new Date(d), count: studyCount + (habitDone ? 3 : 0), hasHabit: habitDone };
  });

  const startDow = allDays[0].date.getDay();
  const padded = [...Array(startDow).fill(null), ...allDays];

  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const monthLabels = weeks.map((week, wi) => {
    const days = week.filter(Boolean);
    if (!days.length) return null;
    const hasFirst = days.some((d) => d.date.getDate() === 1);
    if (hasFirst || wi === 0) {
      const d = hasFirst ? days.find((d) => d.date.getDate() === 1) : days[0];
      return d ? d.date.toLocaleDateString('ko-KR', { month: 'short' }) : null;
    }
    return null;
  });

  const thisYear = today.getFullYear().toString();
  const yearActiveDays = allDays.filter(d => d.key.startsWith(thisYear) && d.count > 0).length;

  const cellColor = (n) => {
    if (!n) return 'rgba(0,0,0,0.05)';
    if (n < 3) return '#d1d5db';
    if (n < 7) return '#6b7280';
    if (n < 12) return '#374151';
    return '#111827';
  };

  const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const [tooltip, setTooltip] = useState(null);

  const todayWeekIdx = weeks.findIndex((week) => week.some((d) => d && d.key === todayStr));

  useEffect(() => {
    if (scrollRef.current && todayWeekIdx >= 0) {
      const containerW = scrollRef.current.offsetWidth;
      const scrollLeft = todayWeekIdx * COL_W - containerW / 2 + COL_W / 2;
      scrollRef.current.scrollLeft = Math.max(0, scrollLeft);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">study activity</p>
        <span className="text-[11px] text-gray-400">{yearActiveDays}일 활동 올해</span>
      </div>

      <div className="flex gap-1.5">
        <div className="flex flex-col flex-shrink-0" style={{ marginTop: '18px', gap: '3px' }}>
          {DOW_LABELS.map((l, i) => (
            <div key={i} style={{ height: '14px' }} className="flex items-center justify-end pr-1.5">
              {(i === 1 || i === 3 || i === 5) && (
                <span className="text-[9px] text-gray-300 font-medium">{l}</span>
              )}
            </div>
          ))}
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
        >
          <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
            <div className="flex mb-1" style={{ gap: GAP + 'px' }}>
              {weeks.map((_, wi) => (
                <div key={wi} style={{ width: CELL_W + 'px', flexShrink: 0 }} className="h-4 flex items-end">
                  {monthLabels[wi] && (
                    <span className="text-[9px] text-gray-400 font-medium leading-none">{monthLabels[wi]}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex" style={{ gap: GAP + 'px' }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ width: CELL_W + 'px', flexShrink: 0, gap: GAP + 'px' }}>
                  {week.map((d, di) => (
                    <div key={di} style={{ width: CELL_W + 'px', height: CELL_W + 'px' }}>
                      {d ? (
                        <div
                          className={`w-full h-full rounded-[3px] cursor-default transition-opacity duration-150 ${d.key === todayStr ? 'ring-1 ring-offset-0 ring-gray-600' : ''}`}
                          style={{ backgroundColor: cellColor(d.count) }}
                          title={d.date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + (d.count ? ' · ' + d.count + '건' : ' · 없음')}
                        />
                      ) : (
                        <div className="w-full h-full" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-2">
        <span className="text-[9px] text-gray-300">less</span>
        {[0, 2, 5, 9, 13].map((n) => (
          <div key={n} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: cellColor(n) }} />
        ))}
        <span className="text-[9px] text-gray-300">more</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────*/
export default function Dashboard({
  stacks,
  conversations,
  wrongNotes,
  studyActivity,
  streakData,
  apiKey,
  onMarkPassed,
  onAcceptPlan,
  onSaveStack,
  onSelectStack,
  resumeMaterials,
  counselingLogs,
  tasks = [],
  onToggleTask,
  habitLogs = {},
  habits = [],
  onNavigate,
}) {
  const activeStacks = stacks.filter((s) => !s.passed);
  const passedStacks = stacks.filter((s) => s.passed);

  const activeTasks = (tasks || []).filter(t => !t.done && t.dueDate);

  const allDdayItems = [
    ...activeStacks.map(s => ({ type: 'stack', data: s, dday: getDday(s.examDate) })),
    ...activeTasks.map(t => ({ type: 'task', data: t, dday: getDday(t.dueDate) })),
  ].sort((a, b) => {
    const da = a.dday ?? 9999;
    const db = b.dday ?? 9999;
    return da - db;
  });

  // Floating habit bar data
  const todayKey = new Date().toISOString().split('T')[0];
  const todayDow = new Date().getDay();
  const DOW_KO = ['일','월','화','수','목','금','토'];
  const todayHabits = habits.filter(h => {
    if (!h.days || h.days.length === 0) return true;
    return h.days.includes(DOW_KO[todayDow]);
  });
  const todayDoneCount = todayHabits.filter(h => habitLogs[todayKey]?.[h.id]).length;

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col">
    <div
      className="flex-1 overflow-y-auto flex flex-col gap-6 md:gap-8 px-4 py-6 md:px-9 md:py-8"
      style={{ background: '#f8f8f6' }}
    >
      {/* ── Greeting ── */}
      <div>
        <p className="text-xl font-black text-gray-900 tracking-tight">not merged yet. keep going.</p>
        <p className="text-sm text-gray-400 mt-1">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* ── TOP 2-COL: Daily Log (65%) + Right panel (35%) ── */}
      <div className="flex flex-col md:flex-row gap-5 md:items-stretch" style={{ minHeight: undefined }}>
        {/* Left 65%: Daily Log */}
        <div className="min-w-0 md:min-h-[520px]" style={{ flex: '65' }}>
          <DailyLogCalendar tasks={tasks} stacks={stacks} compact />
        </div>

        {/* Right 35%: Today's Plan (compact) + Merge Temperature */}
        <div className="min-w-0 flex flex-col gap-4" style={{ flex: '35' }}>
          <div className="flex-1 min-h-0 overflow-hidden">
            <DailyPlan
              stacks={stacks}
              apiKey={apiKey}
              onAcceptPlan={onAcceptPlan}
              onNavigateToStack={onSelectStack}
              tasks={tasks}
              compact
            />
          </div>
          <div className="flex-shrink-0">
            <EmploymentTemperature
              stacks={stacks}
              resumeMaterials={resumeMaterials}
              streakData={streakData}
              counselingLogs={counselingLogs}
            />
          </div>
        </div>
      </div>

      {/* ── D-DAY CARDS ── */}
      {allDdayItems.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">d-day</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {allDdayItems.map(item => (
              item.type === 'stack'
                ? <DdayCard key={'stack-' + item.data.id} stack={item.data} streakData={streakData} onMarkPassed={onMarkPassed} onSaveStack={onSaveStack} />
                : <TaskCard key={'task-' + item.data.id} task={item.data} onToggle={onToggleTask} />
            ))}
          </div>
        </div>
      )}

      {/* ── ROADMAP ── */}
      {(activeStacks.some((s) => s.examDate) || activeTasks.length > 0) && (
        <div
          className="rounded-2xl p-6"
          style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)' }}
        >
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">roadmap</p>
          <Roadmap stacks={activeStacks} tasks={tasks} />
        </div>
      )}

      {/* ── STUDY ACTIVITY ── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)' }}
      >
        <StudyHeatmap studyActivity={studyActivity} habitLogs={habitLogs} />
      </div>

      {/* ── PASSED ── */}
      {passedStacks.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)' }}
        >
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">merged ✓</p>
          <div className="flex flex-wrap gap-2">
            {passedStacks.map((s) => (
              <span
                key={s.id}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: s.color + '18', color: s.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>

      {/* ── Floating Habit Bar ── */}
      {todayHabits.length > 0 && (
        <div className="absolute bottom-5 right-5 z-20 pointer-events-auto">
          <button
            onClick={() => onNavigate?.('habit-tracker')}
            className="flex items-center gap-3 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 hover:shadow-xl transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-gray-400 font-medium">오늘의 습관</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-black text-gray-900">{todayDoneCount}/{todayHabits.length}</span>
                <span className="text-xs text-gray-400">완료</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {todayHabits.slice(0,4).map(h => (
                <div key={h.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: habitLogs[todayKey]?.[h.id] ? h.color : '#e5e7eb' }}
                  />
                  <span className="text-[10px] text-gray-500 max-w-[80px] truncate">{h.name}</span>
                </div>
              ))}
              {todayHabits.length > 4 && <span className="text-[9px] text-gray-300 ml-3.5">+{todayHabits.length-4}개 더</span>}
            </div>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-gray-300 group-hover:text-gray-600 transition-colors ml-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
