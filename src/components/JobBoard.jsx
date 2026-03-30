import React, { useState, useRef, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { analyzeJobPostingFull, getJobFitActions, getCareerAdvice } from '../utils/claude';
import FitAnalysisPanel from './FitAnalysisPanel';

function coverKey(jobId) { return `mergee_coverletter_${jobId}`; }

const STATUSES = ['지원예정', '지원완료', '서류합격', '면접', '최종합격', '불합격'];

const STATUS_STYLE = {
  '지원예정': 'bg-gray-100 text-gray-600',
  '지원완료': 'bg-blue-100 text-blue-700',
  '서류합격': 'bg-green-100 text-green-700',
  '면접':    'bg-purple-100 text-purple-700',
  '최종합격': 'bg-emerald-100 text-emerald-700',
  '불합격':  'bg-red-100 text-red-600',
};

const JOB_KEY = 'mergee_jobs';

function getDays(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

/* ── Status Badge with inline dropdown ── */
function StatusBadge({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-all hover:opacity-80 ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-600'}`}
      >
        {status}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 min-w-[120px]">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 transition-colors ${s === status ? 'opacity-50' : ''}`}
            >
              <span className={`inline-block px-2 py-0.5 rounded-full ${STATUS_STYLE[s]}`}>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Add/Edit Modal ── */
function JobFormModal({ job, onSave, onClose, apiKey }) {
  const [form, setForm] = useState({
    company: job?.company || '',
    position: job?.position || '',
    deadline: job?.deadline || '',
    url: job?.url || '',
    notes: job?.notes || '',
    status: job?.status || '지원예정',
  });
  const [analyzing, setAnalyzing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company.trim()) return;
    let extra = {};
    if (form.notes && form.notes !== job?.notes) {
      setAnalyzing(true);
      try {
        const result = await analyzeJobPostingFull(apiKey, form.notes);
        extra = { analysis: result.analysis, fitScore: result.fitScore };
      } catch {}
      setAnalyzing(false);
    } else if (job?.analysis) {
      extra = { analysis: job.analysis, fitScore: job.fitScore };
    }
    onSave({ id: job?.id || String(Date.now()), ...form, ...extra });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-bold text-gray-800 mb-5 text-base">{job ? '공고 편집' : '공고 추가'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">회사명 *</label>
            <input type="text" value={form.company}
              onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="예: 카카오" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">직무</label>
            <input type="text" value={form.position}
              onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="예: 데이터 분석가" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">마감일</label>
            <input type="date" value={form.deadline}
              onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">공고 URL</label>
            <input type="url" value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">
              채용공고 내용
              <span className="ml-1.5 text-indigo-500 font-normal">(붙여넣으면 AI가 자동 분석)</span>
            </label>
            <textarea value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              rows={4} placeholder="채용 공고 URL이나 JD 텍스트를 붙여넣으세요" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">상태</label>
            <select value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={analyzing}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
              {analyzing ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI 분석 중...</>
              ) : '저장'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors border border-gray-200">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Job Fit Actions ── */
function JobFitActions({ job, stacks, apiKey }) {
  const [actions, setActions] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { const text = await getJobFitActions(apiKey, job, stacks); setActions(text); } catch {}
    setLoading(false);
  };
  if (!job.notes && !job.fitScore) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">합격 전략</p>
      {!actions ? (
        <button onClick={load} disabled={loading}
          className="w-full py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
          {loading ? <><div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />분석 중...</> : '✦ 오늘 할 일 액션 아이템 생성'}
        </button>
      ) : (
        <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
          <p className="text-xs text-indigo-800 leading-relaxed whitespace-pre-line">{actions}</p>
          <button onClick={() => setActions(null)} className="text-[10px] text-indigo-400 hover:text-indigo-600 mt-2 transition-colors">다시 생성</button>
        </div>
      )}
    </div>
  );
}

/* ── Cover Letter Tab ── */
function CoverLetterTab({ job, apiKey }) {
  const [questions, setQuestions] = useState(() => storage.get(coverKey(job.id), []));
  const [coverFeedback, setCoverFeedback] = useState('');
  const [coverLoading, setCoverLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const saveTimerRef = useRef(null);

  const persist = useCallback((qs) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => storage.set(coverKey(job.id), qs), 400);
  }, [job.id]);

  const addQuestion = () => {
    const newQ = { id: String(Date.now()), title: '', limit: '', text: '' };
    const updated = [...questions, newQ];
    setQuestions(updated);
    persist(updated);
  };

  const updateQuestion = useCallback((id, field, value) => {
    setQuestions(prev => {
      const updated = prev.map(q => q.id === id ? { ...q, [field]: value } : q);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const deleteQuestion = (id) => {
    const updated = questions.filter(q => q.id !== id);
    setQuestions(updated);
    persist(updated);
  };

  const requestFeedback = async () => {
    const combined = questions.map((q, i) => `[문항 ${i + 1}] ${q.title}\n${q.text}`).join('\n\n');
    if (!combined.trim()) return;
    setCoverLoading(true);
    try {
      const result = await getCareerAdvice(apiKey, 'cover', { company: job.company, position: job.position, background: combined });
      setCoverFeedback(result);
    } catch (e) { setCoverFeedback('오류: ' + e.message); }
    finally { setCoverLoading(false); }
  };

  const handleCopyAll = async () => {
    const text = questions
      .map((q, i) => `[문항 ${i + 1}] ${q.title}${q.limit ? ` (${q.text.length}/${q.limit}자)` : ''}\n\n${q.text}`)
      .join('\n\n' + '─'.repeat(30) + '\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `
      <!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>${job.company} 자기소개서</title>
      <style>
        body{font-family:'Apple SD Gothic Neo',sans-serif;max-width:740px;margin:48px auto;color:#1a1a1a;line-height:1.9}
        h1{font-size:20px;margin:0 0 4px}
        h2{font-size:13px;color:#888;font-weight:normal;margin:0 0 40px}
        .q{margin-bottom:40px;page-break-inside:avoid}
        .q-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #eee;padding-bottom:8px;margin-bottom:14px}
        .q-title{font-weight:700;font-size:14px}
        .q-meta{font-size:11px;color:#aaa}
        .q-body{font-size:13.5px;white-space:pre-wrap;color:#333;line-height:1.9}
        @media print{body{margin:32px}h2{margin-bottom:24px}}
      </style></head><body>
      <h1>${job.company}</h1>
      <h2>${job.position || ''}</h2>
      ${questions.map((q, i) => `
        <div class="q">
          <div class="q-head">
            <span class="q-title">문항 ${i + 1}${q.title ? ': ' + q.title : ''}</span>
            <span class="q-meta">${q.text.length}${q.limit ? ' / ' + q.limit : ''}자</span>
          </div>
          <div class="q-body">${q.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
      `).join('')}
      </body></html>`;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  // Summary stats
  const totalChars = questions.reduce((s, q) => s + q.text.length, 0);
  const completedCount = questions.filter(q => q.text.trim().length > 0).length;

  return (
    <div className="space-y-5">
      {/* Sticky top bar: summary + action buttons */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {/* Stats row */}
        <div className="flex items-stretch divide-x divide-gray-100">
          <div className="flex-1 px-6 py-4 text-center">
            <p className="text-3xl font-black text-gray-900 tabular-nums">
              {completedCount}
              <span className="text-lg font-normal text-gray-300">/{questions.length || 0}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1 font-medium">완성된 문항</p>
          </div>
          <div className="flex-1 px-6 py-4 text-center">
            <p className="text-3xl font-black text-gray-900 tabular-nums">
              {totalChars.toLocaleString()}
              <span className="text-lg font-normal text-gray-300">자</span>
            </p>
            <p className="text-xs text-gray-400 mt-1 font-medium">전체 글자수</p>
          </div>
        </div>
        {/* Action buttons row */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-50 bg-gray-50/60">
          <span className="text-[10px] text-gray-400 font-medium mr-auto">자동저장</span>
          <button
            onClick={handleCopyAll}
            disabled={questions.every(q => !q.text.trim())}
            className="h-8 px-4 text-xs font-semibold border border-gray-200 bg-white rounded-xl text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? '✓ 복사됨' : '전체 복사'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={questions.every(q => !q.text.trim())}
            className="h-8 px-4 text-xs font-semibold border border-gray-200 bg-white rounded-xl text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF 내보내기
          </button>
        </div>
      </div>

      {questions.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          아래 버튼으로 문항을 추가하세요.
        </div>
      )}

      {/* Question cards */}
      {questions.map((q, idx) => {
        const charCount = q.text.length;
        const limit = parseInt(q.limit, 10);
        const hasLimit = q.limit && !isNaN(limit) && limit > 0;
        const ratio = hasLimit ? charCount / limit : 0;
        const overLimit = hasLimit && charCount > limit;
        const barColor = !hasLimit ? '#6366f1' : overLimit ? '#ef4444' : ratio >= 0.8 ? '#f59e0b' : '#10b981';
        const barWidth = hasLimit ? Math.min(ratio * 100, 100) : 0;

        return (
          <div key={q.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-50">
              <span className="w-6 h-6 rounded-lg bg-gray-900 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <input
                value={q.title}
                onChange={(e) => updateQuestion(q.id, 'title', e.target.value)}
                placeholder="문항 제목 (예: 지원 동기)"
                className="flex-1 text-sm font-semibold text-gray-700 bg-transparent border-none outline-none placeholder-gray-300"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  value={q.limit}
                  onChange={(e) => updateQuestion(q.id, 'limit', e.target.value)}
                  placeholder="글자수"
                  className="w-16 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-center outline-none focus:ring-1 focus:ring-gray-300"
                />
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="px-4 pt-3 pb-0">
              <textarea
                value={q.text}
                onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                placeholder="내용을 작성하세요..."
                rows={7}
                className="w-full text-sm text-gray-700 bg-transparent border-none outline-none resize-y leading-relaxed placeholder-gray-300"
                style={{ minHeight: '120px' }}
              />
            </div>

            {/* Progress bar + char count */}
            <div className="px-4 pb-4">
              {hasLimit && (
                <div className="h-2.5 bg-gray-100 rounded-full mb-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                  />
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400">
                  {overLimit
                    ? <span className="text-red-500 font-semibold">{charCount - limit}자 초과</span>
                    : hasLimit
                    ? <span style={{ color: barColor }} className="font-medium">{Math.round(ratio * 100)}% 작성</span>
                    : null}
                </span>
                <span className={`text-sm font-bold tabular-nums ${overLimit ? 'text-red-500' : ratio >= 0.8 && hasLimit ? 'text-amber-500' : 'text-gray-500'}`}>
                  {charCount.toLocaleString()}{hasLimit ? ` / ${limit.toLocaleString()}` : ''}자
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add question button */}
      <button
        onClick={addQuestion}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        문항 추가
      </button>

      {/* AI feedback */}
      {questions.length > 0 && (
        <button
          onClick={requestFeedback}
          disabled={coverLoading || questions.every(q => !q.text.trim())}
          className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          {coverLoading ? (
            <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />첨삭 중...</>
          ) : 'AI 첨삭'}
        </button>
      )}

      {coverFeedback && (
        <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
          <p className="text-xs font-semibold text-indigo-600 mb-2">AI 첨삭 결과</p>
          <pre className="text-xs text-indigo-800 leading-relaxed whitespace-pre-wrap font-sans">{coverFeedback}</pre>
          <button onClick={() => setCoverFeedback('')} className="text-[10px] text-indigo-400 hover:text-indigo-600 mt-2 transition-colors">닫기</button>
        </div>
      )}
    </div>
  );
}

/* ── Slide Panel ── */
function SlidePanel({ job, onClose, onEdit, onDelete, stacks, resumeMaterials, apiKey, onAddToPlan, onStatusChange }) {
  const days = getDays(job.deadline);
  const urgent = days !== null && days <= 3;
  const [spTab, setSpTab] = useState('info');
  const [editingMemo, setEditingMemo] = useState(false);
  const [memo, setMemo] = useState(job.notes || '');

  // Sync memo if job changes
  useEffect(() => { setMemo(job.notes || ''); setEditingMemo(false); setSpTab('info'); }, [job.id]);

  const saveMemo = () => {
    onEdit({ ...job, notes: memo });
    setEditingMemo(false);
  };

  return (
    // NO backdrop div — panel only closes via close button
    <div className="absolute right-0 top-0 bottom-0 bg-white border-l border-gray-100 shadow-2xl z-30 flex flex-col overflow-hidden" style={{ width: '55%' }}>
      {/* Panel header */}
      <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-900 text-2xl leading-tight truncate">{job.company}</h3>
            {job.position && <p className="text-base text-gray-500 mt-1 truncate">{job.position}</p>}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 mt-0.5">
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_STYLE[job.status]}`}>{job.status}</span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-6 border-b border-gray-100 flex gap-0 flex-shrink-0">
        {[{ id: 'info', label: '공고 정보' }, { id: 'cover', label: '자소서' }, { id: 'fit', label: 'Fit 분석' }].map(t => (
          <button
            key={t.id}
            onClick={() => setSpTab(t.id)}
            className={`py-3.5 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              spTab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

        {/* ─ 공고 정보 탭 ─ */}
        {spTab === 'info' && (
          <>
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2">
              {days !== null && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${urgent ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                  {days < 0 ? '마감' : days === 0 ? 'D-day' : 'D-' + days}
                  {job.deadline && ' · ' + new Date(job.deadline).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {job.fitScore != null && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">
                  적합도 {job.fitScore}%
                </span>
              )}
            </div>

            {/* URL */}
            {job.url && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">공고 링크</p>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-500 hover:text-indigo-700 truncate block transition-colors"
                >
                  {job.url} ↗
                </a>
              </div>
            )}

            {/* Status change */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">상태 변경</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(job.id, s)}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${
                      job.status === s
                        ? STATUS_STYLE[s] + ' ring-2 ring-offset-1 ring-gray-400'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Memo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">메모</p>
                {!editingMemo && (
                  <button onClick={() => setEditingMemo(true)} className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">편집</button>
                )}
              </div>
              {editingMemo ? (
                <>
                  <textarea
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                    rows={5}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                    placeholder="공고 내용, JD 요약 등..."
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={saveMemo} className="px-3 py-1 bg-gray-900 text-white text-xs font-semibold rounded-lg">저장</button>
                    <button onClick={() => { setEditingMemo(false); setMemo(job.notes || ''); }} className="px-3 py-1 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-100">취소</button>
                  </div>
                </>
              ) : (
                <div className={`rounded-xl p-3 border border-gray-100 ${job.notes ? 'bg-gray-50' : 'bg-white'}`}>
                  {job.notes ? (
                    <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">{job.notes}</p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">메모 없음. 편집을 눌러 추가하세요.</p>
                  )}
                </div>
              )}
            </div>

            {/* Fit Actions */}
            <JobFitActions job={job} stacks={stacks} apiKey={apiKey} />
          </>
        )}

        {/* ─ 자소서 탭 ─ */}
        {spTab === 'cover' && <CoverLetterTab job={job} apiKey={apiKey} />}

        {/* ─ Fit 분석 탭 ─ */}
        {spTab === 'fit' && (
          <>
            {job.fitScore != null && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 inline-block">
                적합도 {job.fitScore}%
              </span>
            )}
            <FitAnalysisPanel
              job={job}
              stacks={stacks}
              resumeMaterials={resumeMaterials}
              apiKey={apiKey}
              onAddToPlan={onAddToPlan}
            />
          </>
        )}
      </div>

      {/* Panel footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
        <button
          onClick={() => onEdit(job)}
          className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95"
        >
          편집
        </button>
        <button
          onClick={() => { onDelete(job.id); onClose(); }}
          className="px-5 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition-colors"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

/* ── Main JobBoard ── */
export default function JobBoard({ apiKey, stacks = [], resumeMaterials = [], onAddToPlan }) {
  const [jobs, setJobs] = useState(() => storage.get(JOB_KEY, []));
  const [filter, setFilter] = useState('지원예정');
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  const saveJobs = (updated) => { setJobs(updated); storage.set(JOB_KEY, updated); };
  const handleSave = (job) => {
    const next = jobs.find((j) => j.id === job.id)
      ? jobs.map((j) => j.id === job.id ? job : j)
      : [...jobs, job];
    saveJobs(next);
    if (selectedJob?.id === job.id) setSelectedJob(job);
  };
  const handleDelete = (id) => { saveJobs(jobs.filter((j) => j.id !== id)); if (selectedJob?.id === id) setSelectedJob(null); };
  const handleStatusChange = (id, status) => {
    const updated = jobs.map((j) => j.id === id ? { ...j, status } : j);
    saveJobs(updated);
    if (selectedJob?.id === id) setSelectedJob((p) => ({ ...p, status }));
  };

  const filtered = filter === '전체' ? jobs : jobs.filter((j) => j.status === filter);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, jobs.filter((j) => j.status === s).length]));

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa] relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-800 text-sm">job board</h2>
          <span className="text-xs text-gray-400">{jobs.length}개</span>
        </div>
        <button
          onClick={() => { setEditingJob(null); setShowModal(true); }}
          className="h-9 flex items-center gap-1.5 text-xs font-semibold px-3.5 bg-[#111] text-white rounded-xl hover:bg-gray-800 transition-all active:scale-95"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          공고 추가
        </button>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border-b border-gray-100 px-6 flex gap-1 overflow-x-auto flex-shrink-0">
        {['전체', ...STATUSES].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              filter === tab ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab !== '전체' && counts[tab] > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-semibold">{counts[tab]}</span>
            )}
            {tab === '전체' && jobs.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-semibold">{jobs.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table — shrinks to 45% when panel is open */}
      <div
        className="flex-1 overflow-auto transition-all duration-200"
        style={{ marginRight: selectedJob ? '55%' : '0' }}
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-60">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 font-medium text-sm">공고가 없어요</p>
            <p className="text-gray-400 text-xs mt-1">위의 "공고 추가" 버튼으로 시작해보세요</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">회사명</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">직무</th>
                <th className={`text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${selectedJob ? 'hidden' : ''}`}>마감일</th>
                <th className={`text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${selectedJob ? 'hidden' : ''}`}>상태</th>
                <th className={`text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${selectedJob ? 'hidden' : ''}`}>적합도</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((job) => {
                const days = getDays(job.deadline);
                const urgent = days !== null && days <= 3;
                const isSelected = selectedJob?.id === job.id;
                return (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedJob(isSelected ? null : job)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/60' : 'bg-white hover:bg-gray-50/60'}`}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-gray-800 text-[14px]">{job.company}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-gray-500 text-[13px]">{job.position || '—'}</span>
                    </td>
                    <td className={`px-4 py-3.5 ${selectedJob ? 'hidden' : ''}`}>
                      {job.deadline ? (
                        <div>
                          <span className={`text-[13px] font-medium ${urgent ? 'text-red-600' : 'text-gray-600'}`}>
                            {new Date(job.deadline).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </span>
                          {days !== null && (
                            <span className={`ml-2 text-xs font-semibold ${urgent ? 'text-red-500' : 'text-gray-400'}`}>
                              {days < 0 ? '마감' : days === 0 ? 'D-day' : 'D-' + days}
                            </span>
                          )}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`px-4 py-3.5 ${selectedJob ? 'hidden' : ''}`} onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={job.status} onChange={(s) => handleStatusChange(job.id, s)} />
                    </td>
                    <td className={`px-4 py-3.5 ${selectedJob ? 'hidden' : ''}`}>
                      {job.fitScore != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-gray-100 rounded-full">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: job.fitScore + '%',
                                background: job.fitScore >= 70 ? '#10b981' : job.fitScore >= 40 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600">{job.fitScore}%</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {(() => {
                          const qs = storage.get(coverKey(job.id), []);
                          const hasContent = qs.some(q => q.text?.trim());
                          return hasContent ? (
                            <span title="자소서 작성됨" className="w-6 h-6 flex items-center justify-center text-indigo-400">
                              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </span>
                          ) : null;
                        })()}
                        <button
                          onClick={() => { setEditingJob(job); setShowModal(true); }}
                          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide panel — absolute, closes ONLY via close button */}
      {selectedJob && (
        <SlidePanel
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onEdit={(j) => { handleSave(j); setSelectedJob(j); }}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          stacks={stacks}
          resumeMaterials={resumeMaterials}
          apiKey={apiKey}
          onAddToPlan={onAddToPlan}
        />
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <JobFormModal
          job={editingJob}
          apiKey={apiKey}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingJob(null); }}
        />
      )}
    </div>
  );
}
