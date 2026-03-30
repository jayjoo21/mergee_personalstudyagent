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

/* ── Status Badge with dropdown ── */
function StatusBadge({ status, onChange, large = false }) {
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
        className={`font-semibold rounded-full whitespace-nowrap transition-all hover:opacity-80 flex items-center gap-1 ${
          large ? 'text-sm px-3.5 py-1.5' : 'text-xs px-2.5 py-1'
        } ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-600'}`}
      >
        {status}
        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-1.5 min-w-[130px]">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 transition-colors ${s === status ? 'opacity-40' : ''}`}
            >
              <span className={`inline-block px-2.5 py-0.5 rounded-full ${STATUS_STYLE[s]}`}>{s}</span>
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
              {analyzing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI 분석 중...</> : '저장'}
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

/* ── Cover Letter Panel (right column of detail page) ── */
function CoverLetterPanel({ job, apiKey }) {
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
    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>${job.company} 자기소개서</title>
      <style>
        body{font-family:'Apple SD Gothic Neo',sans-serif;max-width:740px;margin:48px auto;color:#1a1a1a;line-height:1.9}
        h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;color:#888;font-weight:normal;margin:0 0 40px}
        .q{margin-bottom:44px;page-break-inside:avoid}
        .q-head{display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #eee;padding-bottom:10px;margin-bottom:16px}
        .q-num{width:28px;height:28px;background:#111;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900}
        .q-title{font-weight:700;font-size:15px;flex:1;margin-left:10px}
        .q-meta{font-size:11px;color:#aaa}
        .q-body{font-size:14px;white-space:pre-wrap;color:#333;line-height:2}
        @media print{body{margin:32px}}
      </style></head><body>
      <h1>${job.company}</h1><h2>${job.position || ''}</h2>
      ${questions.map((q, i) => `
        <div class="q">
          <div class="q-head">
            <div class="q-num">${i + 1}</div>
            <span class="q-title">${q.title || '문항 ' + (i + 1)}</span>
            <span class="q-meta">${q.text.length}${q.limit ? ' / ' + q.limit : ''}자</span>
          </div>
          <div class="q-body">${q.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>`).join('')}
      </body></html>`;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const totalChars = questions.reduce((s, q) => s + q.text.length, 0);
  const completedCount = questions.filter(q => q.text.trim().length > 0).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sticky top bar */}
      <div className="flex-shrink-0 bg-white border border-gray-100 rounded-2xl shadow-sm mb-4 overflow-hidden">
        {/* Stats */}
        <div className="flex divide-x divide-gray-100">
          <div className="flex-1 px-6 py-4 text-center">
            <p className="text-3xl font-black text-gray-900 tabular-nums leading-none">
              {completedCount}
              <span className="text-xl font-normal text-gray-300">/{questions.length || 0}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">완성된 문항</p>
          </div>
          <div className="flex-1 px-6 py-4 text-center">
            <p className="text-3xl font-black text-gray-900 tabular-nums leading-none">
              {totalChars.toLocaleString()}
              <span className="text-xl font-normal text-gray-300">자</span>
            </p>
            <p className="text-xs text-gray-400 mt-1.5 font-medium">전체 글자수</p>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-50 bg-gray-50/50">
          <span className="text-[10px] text-gray-400 font-medium">자동저장</span>
          <div className="flex-1" />
          <button
            onClick={handleCopyAll}
            disabled={questions.every(q => !q.text.trim())}
            className="h-8 px-3.5 text-xs font-semibold border border-gray-200 bg-white rounded-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? '✓ 복사됨' : '전체 복사'}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={questions.every(q => !q.text.trim())}
            className="h-8 px-3.5 text-xs font-semibold border border-gray-200 bg-white rounded-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </button>
          {questions.length > 0 && (
            <button
              onClick={requestFeedback}
              disabled={coverLoading || questions.every(q => !q.text.trim())}
              className="h-8 px-3.5 text-xs font-semibold bg-[#111] text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {coverLoading
                ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />첨삭 중</>
                : '✦ AI 첨삭'}
            </button>
          )}
        </div>
      </div>

      {/* Scrollable question list */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-4">
        {questions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">아래 버튼으로 문항을 추가하세요</p>
          </div>
        )}

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
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-50">
                <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <input
                  value={q.title}
                  onChange={(e) => updateQuestion(q.id, 'title', e.target.value)}
                  placeholder="문항 제목을 입력하세요..."
                  className="flex-1 text-sm font-semibold text-gray-800 bg-transparent border-none outline-none placeholder-gray-300"
                />
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <input
                      value={q.limit}
                      onChange={(e) => updateQuestion(q.id, 'limit', e.target.value)}
                      placeholder="글자수"
                      className="w-14 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-center outline-none focus:ring-1 focus:ring-gray-300"
                    />
                    <span className="text-gray-300">자 제한</span>
                  </div>
                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="w-7 h-7 flex items-center justify-center text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <div className="px-5 pt-4 pb-0">
                <textarea
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                  placeholder="내용을 작성하세요..."
                  className="w-full text-sm text-gray-700 bg-transparent border-none outline-none resize-y leading-relaxed placeholder-gray-300"
                  style={{ minHeight: '150px' }}
                />
              </div>

              {/* Progress bar + char count */}
              <div className="px-5 pb-5 pt-2">
                {hasLimit && (
                  <div className="h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs">
                    {overLimit
                      ? <span className="text-red-500 font-semibold">{(charCount - limit).toLocaleString()}자 초과</span>
                      : hasLimit
                      ? <span style={{ color: barColor }} className="font-medium">{Math.round(ratio * 100)}% 작성</span>
                      : <span className="text-gray-300"> </span>}
                  </span>
                  <span className={`text-base font-black tabular-nums ${overLimit ? 'text-red-500' : ratio >= 0.8 && hasLimit ? 'text-amber-500' : 'text-gray-600'}`}>
                    {charCount.toLocaleString()}
                    {hasLimit && <span className="text-sm font-normal text-gray-400"> / {limit.toLocaleString()}</span>}
                    <span className="text-sm font-normal text-gray-400">자</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add question */}
        <button
          onClick={addQuestion}
          className="w-full py-4 rounded-2xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          문항 추가
        </button>

        {/* AI feedback result */}
        {coverFeedback && (
          <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-indigo-700">AI 첨삭 결과</p>
              <button onClick={() => setCoverFeedback('')} className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors">닫기</button>
            </div>
            <pre className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap font-sans">{coverFeedback}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Job Info Panel (left column of detail page) ── */
function JobInfoPanel({ job, onEdit, stacks, resumeMaterials, apiKey, onAddToPlan }) {
  const [editingMemo, setEditingMemo] = useState(false);
  const [memo, setMemo] = useState(job.notes || '');
  const [fitActions, setFitActions] = useState(null);
  const [fitLoading, setFitLoading] = useState(false);

  useEffect(() => { setMemo(job.notes || ''); setEditingMemo(false); }, [job.id]);

  const saveMemo = () => { onEdit({ ...job, notes: memo }); setEditingMemo(false); };

  const loadFitActions = async () => {
    setFitLoading(true);
    try { const t = await getJobFitActions(apiKey, job, stacks); setFitActions(t); } catch {}
    setFitLoading(false);
  };

  const days = getDays(job.deadline);
  const urgent = days !== null && days <= 3;

  return (
    <div className="space-y-5">
      {/* D-day + URL */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">공고 정보</p>
        <div className="flex flex-wrap gap-2">
          {days !== null && (
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${urgent ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
              {days < 0 ? '마감됨' : days === 0 ? 'D-day' : `D-${days}`}
              {job.deadline && ` · ${new Date(job.deadline).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`}
            </span>
          )}
          {job.fitScore != null && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600">
              적합도 {job.fitScore}%
            </span>
          )}
        </div>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-700 transition-colors group">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="truncate group-hover:underline">공고 원문 보기 ↗</span>
          </a>
        )}
      </div>

      {/* Memo */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">메모 / 공고 내용</p>
          {!editingMemo && (
            <button onClick={() => setEditingMemo(true)} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors">편집</button>
          )}
        </div>
        {editingMemo ? (
          <>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              rows={8}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
              placeholder="채용 공고, JD 요약, 회사 리서치 메모..."
            />
            <div className="flex gap-2 mt-2">
              <button onClick={saveMemo} className="px-4 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-xl transition-colors hover:bg-gray-700">저장</button>
              <button onClick={() => { setEditingMemo(false); setMemo(job.notes || ''); }} className="px-4 py-1.5 text-gray-500 text-xs font-semibold rounded-xl hover:bg-gray-100 transition-colors">취소</button>
            </div>
          </>
        ) : (
          <div className={`rounded-xl p-3 text-sm leading-relaxed ${job.notes ? 'bg-gray-50 text-gray-600 whitespace-pre-wrap' : 'text-gray-300 italic'}`}>
            {job.notes || '메모가 없어요. 편집을 눌러 추가하세요.'}
          </div>
        )}
      </div>

      {/* Fit Analysis */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <FitAnalysisPanel
          job={job}
          stacks={stacks}
          resumeMaterials={resumeMaterials}
          apiKey={apiKey}
          onAddToPlan={onAddToPlan}
        />
      </div>

      {/* Fit Actions */}
      {(job.notes || job.fitScore) && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">합격 전략</p>
          </div>
          {!fitActions ? (
            <button onClick={loadFitActions} disabled={fitLoading}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
              {fitLoading
                ? <><div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />분석 중...</>
                : '✦ 오늘 할 일 액션 아이템 생성'}
            </button>
          ) : (
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-line">{fitActions}</p>
              <button onClick={() => setFitActions(null)} className="text-xs text-indigo-400 hover:text-indigo-600 mt-2 transition-colors">다시 생성</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Job Detail Page ── */
function JobDetailPage({ job, onBack, onEdit, onDelete, onStatusChange, stacks, resumeMaterials, apiKey, onAddToPlan }) {
  const days = getDays(job.deadline);
  const urgent = days !== null && days <= 3;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
        <div className="flex items-start gap-4">
          {/* Back */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 font-medium transition-colors mt-1 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            job board
          </button>

          {/* Company + Position */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{job.company}</h1>
            {job.position && <p className="text-base text-gray-500 mt-0.5">{job.position}</p>}
          </div>

          {/* Right: status + D-day + edit */}
          <div className="flex items-center gap-3 flex-shrink-0 mt-0.5">
            {days !== null && (
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${urgent ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                {days < 0 ? '마감' : days === 0 ? 'D-day' : `D-${days}`}
                {job.deadline && ` · ${new Date(job.deadline).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`}
              </span>
            )}
            <StatusBadge status={job.status} onChange={(s) => onStatusChange(job.id, s)} large />
            <button
              onClick={() => onEdit(job)}
              className="h-9 px-3 flex items-center gap-1.5 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              편집
            </button>
            <button
              onClick={() => { onDelete(job.id); onBack(); }}
              className="h-9 px-3 flex items-center gap-1.5 text-sm font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-gray-200"
            >
              삭제
            </button>
          </div>
        </div>
      </div>

      {/* 2-column body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: 35% — Job info + Fit */}
        <div className="overflow-y-auto p-6" style={{ width: '35%', flexShrink: 0 }}>
          <JobInfoPanel
            job={job}
            onEdit={onEdit}
            stacks={stacks}
            resumeMaterials={resumeMaterials}
            apiKey={apiKey}
            onAddToPlan={onAddToPlan}
          />
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-100 flex-shrink-0" />

        {/* Right: 65% — Cover letter */}
        <div className="flex-1 overflow-hidden flex flex-col p-6" style={{ minWidth: 0 }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex-shrink-0">자기소개서</p>
          <CoverLetterPanel job={job} apiKey={apiKey} />
        </div>
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
  const [detailJob, setDetailJob] = useState(null); // null = list, job = detail page

  const saveJobs = (updated) => { setJobs(updated); storage.set(JOB_KEY, updated); };

  const handleSave = (job) => {
    const next = jobs.find((j) => j.id === job.id)
      ? jobs.map((j) => j.id === job.id ? job : j)
      : [...jobs, job];
    saveJobs(next);
    // Update detail view if open
    if (detailJob?.id === job.id) setDetailJob(job);
  };

  const handleDelete = (id) => {
    saveJobs(jobs.filter((j) => j.id !== id));
    if (detailJob?.id === id) setDetailJob(null);
  };

  const handleStatusChange = (id, status) => {
    const updated = jobs.map((j) => j.id === id ? { ...j, status } : j);
    saveJobs(updated);
    if (detailJob?.id === id) setDetailJob((p) => ({ ...p, status }));
  };

  /* ── Detail page ── */
  if (detailJob) {
    return (
      <>
        <JobDetailPage
          job={detailJob}
          onBack={() => setDetailJob(null)}
          onEdit={(j) => { setEditingJob(j); setShowModal(true); }}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          stacks={stacks}
          resumeMaterials={resumeMaterials}
          apiKey={apiKey}
          onAddToPlan={onAddToPlan}
        />
        {showModal && (
          <JobFormModal
            job={editingJob}
            apiKey={apiKey}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditingJob(null); }}
          />
        )}
      </>
    );
  }

  /* ── List page ── */
  const filtered = filter === '전체' ? jobs : jobs.filter((j) => j.status === filter);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, jobs.filter((j) => j.status === s).length]));

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
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
          <button key={tab} onClick={() => setFilter(tab)}
            className={`px-3.5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              filter === tab ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}>
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

      {/* Full-width table */}
      <div className="flex-1 overflow-auto">
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
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">회사명</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">직무</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">마감일</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">D-day</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">상태</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">적합도</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">자소서</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((job) => {
                const days = getDays(job.deadline);
                const urgent = days !== null && days <= 3;
                const qs = storage.get(coverKey(job.id), []);
                const hasLetter = qs.some(q => q.text?.trim());
                const completedLetter = qs.filter(q => q.text?.trim()).length;
                return (
                  <tr
                    key={job.id}
                    onClick={() => setDetailJob(job)}
                    className="cursor-pointer bg-white hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900 text-[14px]">{job.company}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-500 text-[13px]">{job.position || <span className="text-gray-300">—</span>}</span>
                    </td>
                    <td className="px-4 py-4">
                      {job.deadline
                        ? <span className={`text-[13px] font-medium ${urgent ? 'text-red-600' : 'text-gray-600'}`}>
                            {new Date(job.deadline).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      {days !== null
                        ? <span className={`text-xs font-bold px-2 py-1 rounded-full ${urgent ? 'bg-red-100 text-red-600' : days <= 14 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                            {days < 0 ? '마감' : days === 0 ? 'D-day' : `D-${days}`}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={job.status} onChange={(s) => handleStatusChange(job.id, s)} />
                    </td>
                    <td className="px-4 py-4">
                      {job.fitScore != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full">
                            <div className="h-1.5 rounded-full" style={{
                              width: job.fitScore + '%',
                              background: job.fitScore >= 70 ? '#10b981' : job.fitScore >= 40 ? '#f59e0b' : '#ef4444',
                            }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 tabular-nums">{job.fitScore}%</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      {hasLetter
                        ? <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">{completedLetter}문항</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingJob(job); setShowModal(true); }}
                        className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

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
