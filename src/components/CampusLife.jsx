import React, { useState, useEffect, useRef, useCallback } from 'react';
import { storage, KEYS } from '../utils/storage';
import { parseTimetableFromImage } from '../utils/claude';

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAYS = ['월', '화', '수', '목', '금', '토'];
const PALETTE = ['#6366f1','#10b981','#f59e0b','#f43f5e','#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'];

/* ── Time grid constants ── */
const GRID_START  = 9;    // 09:00
const GRID_END    = 22;   // 22:00
const SLOT_MIN    = 30;   // 30-min increments
const SLOT_COUNT  = ((GRID_END - GRID_START) * 60) / SLOT_MIN; // 26
const SLOT_PX     = 24;   // px per slot

function slotToTime(slot) {
  const total = GRID_START * 60 + slot * SLOT_MIN;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToSlot(t) {
  if (!t) return null;
  const [h, m = '0'] = String(t).trim().split(':').map(Number);
  if (isNaN(h)) return null;
  return Math.round(((h - GRID_START) * 60 + (m || 0)) / SLOT_MIN);
}

function parseTimeRange(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split('-');
  if (parts.length < 2) return null;
  const startSlot = timeToSlot(parts[0]?.trim());
  const endSlot   = timeToSlot(parts[1]?.trim());
  if (startSlot === null || endSlot === null || endSlot <= startSlot) return null;
  return { startSlot, endSlot };
}

/* ── Quick-add modal (appears after drag) ── */
function QuickAddModal({ day, startSlot, endSlot, onSave, onClose }) {
  const [subject, setSubject] = useState('');
  const [room,    setRoom]    = useState('');
  const [memo,    setMemo]    = useState('');
  const [color,   setColor]   = useState(PALETTE[0]);
  const [sTime,   setSTime]   = useState(slotToTime(startSlot));
  const [eTime,   setETime]   = useState(slotToTime(endSlot));

  const handleSave = () => {
    if (!subject.trim()) return;
    onSave({
      id: String(Date.now()),
      subject: subject.trim(),
      day,
      time: `${sTime}-${eTime}`,
      room: room.trim(),
      memo: memo.trim(),
      color,
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">강의 추가</p>
              <p className="text-sm font-bold text-indigo-600">
                {day}요일 · {sTime} ~ {eTime}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-lg"
            >×</button>
          </div>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">과목명 *</label>
            <input
              autoFocus
              value={subject}
              onChange={e => setSubject(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="예: 운영체제"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">시작</label>
              <input
                value={sTime}
                onChange={e => setSTime(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">종료</label>
              <input
                value={eTime}
                onChange={e => setETime(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">강의실</label>
            <input
              value={room}
              onChange={e => setRoom(e.target.value)}
              placeholder="예: 공학관 401"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">메모</label>
            <input
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="기타 메모"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
            />
          </div>

          <div>
            <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">색상</label>
            <div className="flex gap-1.5 flex-wrap">
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2.5px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handleSave}
            disabled={!subject.trim()}
            className="flex-1 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            추가하기
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Drag-enabled timetable grid ── */
function DragTimetableGrid({ timetable, onAddClass, onDeleteClass }) {
  const [dragState, setDragState] = useState(null); // { day, startSlot, currentSlot }
  const [modal,     setModal]     = useState(null); // { day, startSlot, endSlot }
  const dragRef = useRef(null);

  /* Build classes-by-day map */
  const classesByDay = {};
  WEEKDAYS.forEach(d => { classesByDay[d] = []; });
  timetable.forEach(cls => {
    if (!cls.day) return;
    cls.day.split(',').map(d => d.trim()).filter(d => WEEKDAYS.includes(d)).forEach(d => {
      classesByDay[d].push(cls);
    });
  });
  const hasSat = classesByDay['토']?.length > 0;
  const days   = hasSat ? WEEKDAYS : WEEKDAYS.slice(0, 5);

  /* Check if a slot is occupied by an existing class */
  const isOccupied = (day, slot) =>
    classesByDay[day]?.some(cls => {
      const r = parseTimeRange(cls.time);
      if (!r) return false;
      return slot >= r.startSlot && slot < r.endSlot;
    }) ?? false;

  /* Check if a slot is in the active drag selection */
  const isHighlighted = (day, slot) => {
    if (!dragState || dragState.day !== day) return false;
    const lo = Math.min(dragState.startSlot, dragState.currentSlot);
    const hi = Math.max(dragState.startSlot, dragState.currentSlot);
    return slot >= lo && slot <= hi;
  };

  /* Mouse events */
  const handleMouseDown = (e, day, slot) => {
    if (isOccupied(day, slot)) return;
    e.preventDefault();
    const next = { day, startSlot: slot, currentSlot: slot };
    dragRef.current = next;
    setDragState(next);
  };

  const handleMouseEnter = (day, slot) => {
    if (!dragRef.current || dragRef.current.day !== day) return;
    const next = { ...dragRef.current, currentSlot: slot };
    dragRef.current = next;
    setDragState(next);
  };

  /* Global mouseup: open modal */
  useEffect(() => {
    const handleUp = () => {
      if (!dragRef.current) return;
      const { day, startSlot, currentSlot } = dragRef.current;
      const minSlot = Math.min(startSlot, currentSlot);
      const maxSlot = Math.max(startSlot, currentSlot);
      dragRef.current = null;
      setDragState(null);
      setModal({ day, startSlot: minSlot, endSlot: maxSlot + 1 });
    };
    document.addEventListener('mouseup', handleUp);
    return () => document.removeEventListener('mouseup', handleUp);
  }, []);

  const totalH = SLOT_COUNT * SLOT_PX;

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
        {/* Panel header */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-2 border-b border-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">주간 시간표</p>
          <span className="text-[10px] text-gray-300">— 빈 슬롯을 드래그하여 강의 추가</span>
          <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={2} className="ml-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/>
          </svg>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
          <div className="flex" style={{ minWidth: `${14 * 4 + 80 * days.length}px` }}>

            {/* Time label column */}
            <div className="w-14 flex-shrink-0 border-r border-gray-100 relative" style={{ height: totalH + 34 }}>
              {/* spacer for day header row */}
              <div style={{ height: 34 }} />
              <div className="relative" style={{ height: totalH }}>
                {Array.from({ length: SLOT_COUNT }, (_, i) => (
                  i % 2 === 0 ? (
                    <div
                      key={i}
                      className="absolute right-2 flex items-center"
                      style={{ top: i * SLOT_PX, height: SLOT_PX * 2 }}
                    >
                      <span className="text-[9px] text-gray-300 font-mono leading-none">{slotToTime(i)}</span>
                    </div>
                  ) : null
                ))}
              </div>
            </div>

            {/* Day columns */}
            {days.map(day => (
              <div key={day} className="flex-1 min-w-[80px] border-r border-gray-100 last:border-r-0 flex flex-col">
                {/* Day header */}
                <div className={`flex-shrink-0 flex items-center justify-center border-b border-gray-100 text-[11px] font-bold ${
                  day === '토' ? 'text-blue-500' : 'text-gray-500'
                }`} style={{ height: 34 }}>
                  {day}
                </div>

                {/* Slot area */}
                <div className="relative" style={{ height: totalH }}>
                  {/* Hour divider lines */}
                  {Array.from({ length: SLOT_COUNT }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 pointer-events-none"
                      style={{
                        top: i * SLOT_PX,
                        height: SLOT_PX,
                        borderTop: i % 2 === 0
                          ? '1px solid rgba(0,0,0,0.05)'
                          : '1px solid rgba(0,0,0,0.02)',
                      }}
                    />
                  ))}

                  {/* Slot hit areas (empty slots only) */}
                  {Array.from({ length: SLOT_COUNT }, (_, slot) => {
                    const occupied   = isOccupied(day, slot);
                    const highlighted = isHighlighted(day, slot);
                    if (occupied) return null;
                    return (
                      <div
                        key={slot}
                        className={`absolute left-0 right-0 transition-colors duration-75 ${
                          highlighted
                            ? 'bg-indigo-100'
                            : 'hover:bg-indigo-50/70'
                        }`}
                        style={{
                          top: slot * SLOT_PX,
                          height: SLOT_PX,
                          cursor: dragRef.current ? 'crosshair' : 'crosshair',
                          zIndex: 1,
                        }}
                        onMouseDown={(e) => handleMouseDown(e, day, slot)}
                        onMouseEnter={() => handleMouseEnter(day, slot)}
                      />
                    );
                  })}

                  {/* Drag preview block */}
                  {dragState && dragState.day === day && (() => {
                    const lo = Math.min(dragState.startSlot, dragState.currentSlot);
                    const hi = Math.max(dragState.startSlot, dragState.currentSlot);
                    return (
                      <div
                        className="absolute left-1 right-1 rounded-lg pointer-events-none z-20"
                        style={{
                          top: lo * SLOT_PX + 1,
                          height: (hi - lo + 1) * SLOT_PX - 2,
                          background: 'rgba(99,102,241,0.18)',
                          border: '2px solid rgba(99,102,241,0.5)',
                        }}
                      >
                        <p className="text-[9px] font-bold text-indigo-500 px-1.5 pt-0.5">
                          {slotToTime(lo)} ~ {slotToTime(hi + 1)}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Existing class blocks */}
                  {classesByDay[day].map(cls => {
                    const range = parseTimeRange(cls.time);
                    if (!range) return null;
                    const top    = Math.max(0, range.startSlot) * SLOT_PX;
                    const height = (range.endSlot - range.startSlot) * SLOT_PX;
                    if (height <= 0) return null;
                    return (
                      <div
                        key={cls.id}
                        className="absolute left-1 right-1 rounded-lg overflow-hidden group z-10"
                        style={{
                          top: top + 1,
                          height: height - 2,
                          backgroundColor: cls.color + '20',
                          borderLeft: `3px solid ${cls.color}`,
                        }}
                      >
                        <div className="px-1.5 pt-1 min-h-0">
                          <p
                            className="text-[10px] font-bold truncate leading-tight"
                            style={{ color: cls.color }}
                          >{cls.subject}</p>
                          {height > SLOT_PX * 1.5 && cls.room && (
                            <p className="text-[9px] text-gray-400 truncate mt-0.5">📍{cls.room}</p>
                          )}
                        </div>
                        <button
                          onClick={() => onDeleteClass(cls.id)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-sm leading-none rounded"
                          style={{ zIndex: 11 }}
                        >×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick-add modal */}
      {modal && (
        <QuickAddModal
          day={modal.day}
          startSlot={modal.startSlot}
          endSlot={modal.endSlot}
          onSave={(cls) => { onAddClass(cls); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

/* ── Class card for AI parse review ── */
function ClassCard({ cls, idx, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 group">
      <button
        className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-white shadow-sm transition-transform hover:scale-110"
        style={{ backgroundColor: cls.color }}
        title="클릭으로 색상 변경"
        onClick={() => onChange(idx, 'color', PALETTE[(PALETTE.indexOf(cls.color) + 1) % PALETTE.length])}
      />
      <div className="flex-1 min-w-0 grid grid-cols-4 gap-2">
        <input
          value={cls.subject}
          onChange={e => onChange(idx, 'subject', e.target.value)}
          className="col-span-2 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300 truncate"
          placeholder="과목명"
        />
        <input
          value={cls.day}
          onChange={e => onChange(idx, 'day', e.target.value)}
          className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
          placeholder="월,수"
        />
        <input
          value={cls.time}
          onChange={e => onChange(idx, 'time', e.target.value)}
          className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
          placeholder="10:00-11:30"
        />
      </div>
      <input
        value={cls.room}
        onChange={e => onChange(idx, 'room', e.target.value)}
        className="w-24 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-300"
        placeholder="강의실"
      />
      <button
        onClick={() => onRemove(idx)}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400 transition-all flex-shrink-0 text-base"
      >×</button>
    </div>
  );
}

/* ── Main component ── */
export default function CampusLife({ apiKey, timetable: propTimetable, habits: propHabits, onTimetableChange, onHabitsChange }) {
  const [timetable, setTimetableLocal] = useState(() => propTimetable ?? storage.get(KEYS.TIMETABLE, []));
  const [habits,    setHabitsLocal]    = useState(() => propHabits    ?? storage.get(KEYS.HABITS,    []));

  useEffect(() => { if (propTimetable !== undefined) setTimetableLocal(propTimetable); }, [propTimetable]);
  useEffect(() => { if (propHabits    !== undefined) setHabitsLocal(propHabits);       }, [propHabits]);

  const setTimetable = useCallback((next) => {
    setTimetableLocal(next);
    storage.set(KEYS.TIMETABLE, next);
    onTimetableChange?.(next);
  }, [onTimetableChange]);

  const setHabits = useCallback((next) => {
    setHabitsLocal(next);
    storage.set(KEYS.HABITS, next);
    onHabitsChange?.(next);
  }, [onHabitsChange]);

  /* Upload state */
  const [showUpload,    setShowUpload]    = useState(false);
  const [uploadImg,     setUploadImg]     = useState(null);
  const [parsing,       setParsing]       = useState(false);
  const [parsedClasses, setParsedClasses] = useState(null);
  const [parseError,    setParseError]    = useState('');
  const fileRef = useRef(null);

  /* Manual add form */
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCls, setNewCls] = useState({ subject: '', day: '', time: '', room: '', color: PALETTE[0] });

  /* ── File upload ── */
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      setUploadImg({ base64: dataUrl.split(',')[1], mediaType: file.type || 'image/png', previewUrl: dataUrl });
      setParsedClasses(null);
      setParseError('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleParse = async () => {
    if (!uploadImg) return;
    setParsing(true);
    setParseError('');
    try {
      const result = await parseTimetableFromImage(apiKey, uploadImg.base64, uploadImg.mediaType);
      setParsedClasses(result);
    } catch (e) {
      setParseError('분석 실패: ' + e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleParsedChange = (idx, field, val) => {
    setParsedClasses(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  };

  const handleRegister = () => {
    if (!parsedClasses?.length) return;
    const withIds = parsedClasses.map((c, i) => ({ ...c, id: String(Date.now() + i) }));
    setTimetable(withIds);
    const ttHabits = withIds.map(c => ({
      id: 'tt_' + c.id,
      name: `${c.subject} 출석하기`,
      days: c.day.split(',').map(d => d.trim()).filter(Boolean),
      color: c.color || PALETTE[0],
      fromTimetable: true,
      timetableSubject: c.subject,
      time: c.time,
      room: c.room,
    }));
    const currentHabits = storage.get(KEYS.HABITS, []);
    const manual = currentHabits.filter(h => !h.fromTimetable);
    setHabits([...ttHabits, ...manual]);
    setShowUpload(false);
    setUploadImg(null);
    setParsedClasses(null);
  };

  /* ── Drag-add handler (append single class) ── */
  const handleDragAddClass = useCallback((cls) => {
    const next = [...timetable, cls];
    setTimetable(next);
  }, [timetable, setTimetable]);

  /* ── Manual class add ── */
  const addManualClass = () => {
    if (!newCls.subject.trim()) return;
    const cls = { ...newCls, id: String(Date.now()) };
    setTimetable([...timetable, cls]);
    setNewCls({ subject: '', day: '', time: '', room: '', color: PALETTE[0] });
    setShowAddForm(false);
  };

  const deleteClass = (id) => {
    setTimetable(timetable.filter(c => c.id !== id));
  };

  const clearTimetable = () => {
    if (!window.confirm('시간표를 초기화할까요? 출석 습관도 함께 삭제됩니다.')) return;
    setTimetable([]);
    const currentHabits = storage.get(KEYS.HABITS, []);
    setHabits(currentHabits.filter(h => !h.fromTimetable));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#f8f8f6' }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14V20M5.5 11.5V17"/>
          </svg>
          <span className="text-sm font-black text-gray-900 tracking-tight">campus life</span>
        </div>

        <div className="flex-1" />

        {timetable.length > 0 && (
          <button
            onClick={clearTimetable}
            className="h-7 px-3 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
          >
            초기화
          </button>
        )}

        <button
          onClick={() => { setShowAddForm(v => !v); setShowUpload(false); }}
          className={`flex items-center gap-1.5 h-7 px-3 text-xs font-semibold rounded-lg transition-colors border ${
            showAddForm ? 'bg-gray-100 text-gray-700 border-gray-300' : 'text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200'
          }`}
        >
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          강의 추가
        </button>

        <button
          onClick={() => { setShowUpload(v => !v); setShowAddForm(false); setParsedClasses(null); setUploadImg(null); setParseError(''); }}
          className={`flex items-center gap-1.5 h-7 px-3 text-xs font-semibold rounded-lg transition-colors border ${
            showUpload ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-200'
          }`}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          AI 시간표 분석
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 flex flex-col gap-6 max-w-5xl mx-auto w-full">

          {/* ── Manual add form ── */}
          {showAddForm && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">강의 직접 추가</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">과목명</label>
                  <input
                    autoFocus
                    value={newCls.subject}
                    onChange={e => setNewCls(p => ({ ...p, subject: e.target.value }))}
                    placeholder="예: 운영체제"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">요일</label>
                  <div className="flex gap-1 mt-1">
                    {['월','화','수','목','금','토'].map(d => (
                      <button
                        key={d}
                        onClick={() => {
                          const days = newCls.day.split(',').map(x => x.trim()).filter(Boolean);
                          const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d];
                          setNewCls(p => ({ ...p, day: next.join(',') }));
                        }}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                          newCls.day.split(',').map(x => x.trim()).includes(d)
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        } ${d === '토' ? '!text-blue-400' : ''}`}
                      >{d}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">시간</label>
                  <input
                    value={newCls.time}
                    onChange={e => setNewCls(p => ({ ...p, time: e.target.value }))}
                    placeholder="예: 10:30-12:00"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">강의실</label>
                  <input
                    value={newCls.room}
                    onChange={e => setNewCls(p => ({ ...p, room: e.target.value }))}
                    placeholder="예: 공학관 401"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {PALETTE.map(c => (
                    <button key={c} onClick={() => setNewCls(p => ({ ...p, color: c }))}
                      className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                      style={{ backgroundColor: c, outline: newCls.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                    />
                  ))}
                </div>
                <div className="flex-1" />
                <button
                  onClick={addManualClass}
                  disabled={!newCls.subject.trim()}
                  className="px-5 py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  추가
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-xs text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">취소</button>
              </div>
            </div>
          )}

          {/* ── AI Upload Panel ── */}
          {showUpload && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">AI 시간표 이미지 분석</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

              {!uploadImg ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-gray-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer"
                >
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">에브리타임 시간표 캡처를 올려주세요</p>
                    <p className="text-xs text-gray-300 mt-0.5 text-center">클릭하여 이미지 선택</p>
                  </div>
                </button>
              ) : (
                <div className="flex gap-6">
                  <div className="flex-shrink-0 relative">
                    <img src={uploadImg.previewUrl} alt="시간표 미리보기" className="w-52 h-auto rounded-xl border border-gray-100 object-contain" />
                    <button
                      onClick={() => { setUploadImg(null); setParsedClasses(null); setParseError(''); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 shadow-sm"
                    >×</button>
                  </div>
                  <div className="flex-1 min-w-0">
                    {!parsedClasses ? (
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={handleParse}
                          disabled={parsing}
                          className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors w-full"
                        >
                          {parsing
                            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>AI 분석 중...</>
                            : '✦ AI 시간표 분석 시작'}
                        </button>
                        {parseError && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{parseError}</p>}
                        <p className="text-xs text-gray-400 leading-relaxed">Claude Vision이 과목명, 요일, 시간, 강의실을 자동으로 추출합니다</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-600">{parsedClasses.length}개 강의 추출됨 — 수정 후 등록하세요</p>
                          <button onClick={() => setParsedClasses(null)} className="text-[10px] text-gray-400 hover:text-gray-600">다시 분석</button>
                        </div>
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                          {parsedClasses.map((cls, idx) => (
                            <ClassCard
                              key={idx} cls={cls} idx={idx}
                              onChange={handleParsedChange}
                              onRemove={(i) => setParsedClasses(prev => prev.filter((_, j) => j !== i))}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleRegister}
                            className="flex-1 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                          >
                            이 시간표로 등록 + 출석 습관 자동 생성
                          </button>
                          <button
                            onClick={() => { setShowUpload(false); setUploadImg(null); setParsedClasses(null); }}
                            className="px-4 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Empty hint (first visit) ── */}
          {timetable.length === 0 && !showUpload && !showAddForm && (
            <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6366f1" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="text-xs text-indigo-700 font-medium">
                아래 시간표에서 <strong>원하는 시간대를 드래그</strong>하면 바로 강의를 추가할 수 있어요.
                AI 이미지 분석도 지원합니다.
              </p>
            </div>
          )}

          {/* ── Drag timetable grid (always visible) ── */}
          <DragTimetableGrid
            timetable={timetable}
            onAddClass={handleDragAddClass}
            onDeleteClass={deleteClass}
          />

          {/* ── Class list ── */}
          {timetable.length > 0 && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">전체 강의 목록 ({timetable.length}개)</p>
              </div>
              <div className="flex flex-col gap-2">
                {timetable.map(cls => (
                  <div key={cls.id} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{cls.subject}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {cls.day  && <span className="text-[11px] text-gray-500">{cls.day.split(',').map(d => d.trim()).join(' · ')}</span>}
                        {cls.time && <span className="text-[11px] text-gray-400">{cls.time}</span>}
                        {cls.room && <span className="text-[11px] text-gray-400">📍{cls.room}</span>}
                        {cls.memo && <span className="text-[11px] text-gray-300 truncate">{cls.memo}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteClass(cls.id)}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-all flex-shrink-0 rounded-lg"
                    >
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
