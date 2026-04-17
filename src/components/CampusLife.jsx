import React, { useState, useEffect, useRef, useCallback } from 'react';
import { storage, KEYS } from '../utils/storage';
import { parseTimetableFromImage } from '../utils/claude';

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAYS = ['월', '화', '수', '목', '금', '토']; // display order (Mon-Sat)
const PALETTE = ['#6366f1','#10b981','#f59e0b','#f43f5e','#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'];

/* ── Class card for review after AI parse ── */
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

/* ── Weekly schedule grid ── */
function WeeklyGrid({ timetable, onDelete }) {
  if (timetable.length === 0) return null;

  const classesByDay = {};
  WEEKDAYS.forEach(d => { classesByDay[d] = []; });

  timetable.forEach(cls => {
    if (!cls.day) return;
    cls.day.split(',').map(d => d.trim()).filter(d => WEEKDAYS.includes(d)).forEach(d => {
      classesByDay[d].push(cls);
    });
  });

  // Sort each day's classes by time
  WEEKDAYS.forEach(d => {
    classesByDay[d].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  });

  const hasSat = classesByDay['토'].length > 0;
  const days = hasSat ? WEEKDAYS : WEEKDAYS.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '0.5px solid rgba(0,0,0,0.06)' }}>
      <div className="px-5 pt-4 pb-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">주간 시간표</p>
      </div>
      <div className={`grid gap-px bg-gray-100`} style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
        {/* Day headers */}
        {days.map((d, i) => (
          <div key={d} className={`bg-white px-3 py-2 text-center text-[11px] font-bold ${
            d === '토' ? 'text-blue-500' : 'text-gray-500'
          }`}>{d}</div>
        ))}
        {/* Class cells */}
        {days.map(d => (
          <div key={d} className="bg-white px-2 pb-3 min-h-[80px]">
            <div className="flex flex-col gap-1.5">
              {classesByDay[d].map(cls => (
                <div
                  key={cls.id + d}
                  className="group relative rounded-lg px-2.5 py-2"
                  style={{ backgroundColor: cls.color + '18', borderLeft: `3px solid ${cls.color}` }}
                >
                  <p className="text-xs font-semibold text-gray-800 truncate pr-4">{cls.subject}</p>
                  {cls.time && <p className="text-[10px] text-gray-500 mt-0.5">{cls.time}</p>}
                  {cls.room && <p className="text-[10px] text-gray-400">📍{cls.room}</p>}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(cls.id)}
                      className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >×</button>
                  )}
                </div>
              ))}
              {classesByDay[d].length === 0 && (
                <div className="h-12 flex items-center justify-center">
                  <span className="text-[10px] text-gray-200">—</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CampusLife({ apiKey, timetable: propTimetable, habits: propHabits, onTimetableChange, onHabitsChange }) {
  const [timetable, setTimetableLocal] = useState(() => propTimetable ?? storage.get(KEYS.TIMETABLE, []));
  const [habits, setHabitsLocal] = useState(() => propHabits ?? storage.get(KEYS.HABITS, []));

  /* Sync with parent */
  useEffect(() => { if (propTimetable !== undefined) setTimetableLocal(propTimetable); }, [propTimetable]);
  useEffect(() => { if (propHabits !== undefined) setHabitsLocal(propHabits); }, [propHabits]);

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
  const [showUpload, setShowUpload] = useState(false);
  const [uploadImg, setUploadImg] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedClasses, setParsedClasses] = useState(null);
  const [parseError, setParseError] = useState('');
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
    // Auto-create attendance habits
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

  /* ── Manual class add ── */
  const addManualClass = () => {
    if (!newCls.subject.trim()) return;
    const cls = { ...newCls, id: String(Date.now()) };
    setTimetable([...timetable, cls]);
    setNewCls({ subject: '', day: '', time: '', room: '', color: PALETTE[0] });
    setShowAddForm(false);
  };

  const deleteClass = (id) => {
    const next = timetable.filter(c => c.id !== id);
    setTimetable(next);
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
          {/* Graduation cap icon */}
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
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
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
                  <label className="block text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">요일 (쉼표 구분)</label>
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
                          newCls.day.split(',').map(x=>x.trim()).includes(d)
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
                  {/* Preview */}
                  <div className="flex-shrink-0 relative">
                    <img src={uploadImg.previewUrl} alt="시간표 미리보기" className="w-52 h-auto rounded-xl border border-gray-100 object-contain" />
                    <button
                      onClick={() => { setUploadImg(null); setParsedClasses(null); setParseError(''); }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 shadow-sm"
                    >×</button>
                  </div>
                  {/* Actions */}
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

          {/* ── Empty state ── */}
          {timetable.length === 0 && !showUpload && !showAddForm && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-400 mb-1">등록된 시간표가 없어요</h3>
              <p className="text-xs text-gray-300 mb-5 leading-relaxed">
                이미지를 업로드하면 AI가 자동으로 시간표를 인식하거나<br/>직접 강의를 추가할 수 있어요
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors"
                >
                  AI 시간표 분석
                </button>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  + 직접 추가
                </button>
              </div>
            </div>
          )}

          {/* ── Weekly grid ── */}
          {timetable.length > 0 && (
            <WeeklyGrid timetable={timetable} onDelete={deleteClass} />
          )}

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
                        {cls.day && <span className="text-[11px] text-gray-500">{cls.day.split(',').map(d => d.trim()).join(' · ')}</span>}
                        {cls.time && <span className="text-[11px] text-gray-400">{cls.time}</span>}
                        {cls.room && <span className="text-[11px] text-gray-400">📍{cls.room}</span>}
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
