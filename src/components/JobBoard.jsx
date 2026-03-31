import React, { useState, useRef, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { analyzeJobPostingFull, getJobFitActions, getCareerAdvice } from '../utils/claude';
import FitAnalysisPanel from './FitAnalysisPanel';

function coverKey(jobId) { return `mergee_coverletter_${jobId}`; }
function coverMetaKey(jobId) { return `mergee_coverletter_${jobId}_meta`; }

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

function getTimeAgo(ts) {
  if (!ts) return '방금 전';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return '방금 전';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
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

/* ── Cover Letter Panel ── */
function CoverLetterPanel({ job, apiKey }) {
  const [questions, setQuestions] = useState(() => storage.get(coverKey(job.id), []));
  const [activeIdx, setActiveIdx] = useState(0);
  const [coverFeedback, setCoverFeedback] = useState('');
  const [coverLoading, setCoverLoading] = useState(false);

  // Save status
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSaved, setLastSaved] = useState(null);
  const [timeAgoText, setTimeAgoText] = useState('방금 전');

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Delete protection
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteInput, setDeleteInput] = useState('');

  // Spell check
  const [spellChecking, setSpellChecking] = useState(false);
  const [spellErrors, setSpellErrors] = useState([]);
  const [showSpellPanel, setShowSpellPanel] = useState(false);

  const saveTimerRef = useRef(null);
  const textareaRef = useRef(null);

  const safeIdx = Math.min(activeIdx, Math.max(0, questions.length - 1));
  const activeQ = questions[safeIdx] || null;

  // Keep activeIdx in bounds
  useEffect(() => {
    if (activeIdx >= questions.length && questions.length > 0) {
      setActiveIdx(questions.length - 1);
    }
  }, [questions.length, activeIdx]);

  // Keyboard navigation Ctrl+← / Ctrl+→
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIdx(prev => Math.max(0, prev - 1));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveIdx(prev => Math.min(questions.length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [questions.length]);

  // Time ago interval
  useEffect(() => {
    if (!lastSaved) return;
    const interval = setInterval(() => setTimeAgoText(getTimeAgo(lastSaved)), 60000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  // Persist
  const persist = useCallback((qs) => {
    setSaveStatus('saving');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      storage.set(coverKey(job.id), qs);
      storage.set(coverMetaKey(job.id), { lastModified: Date.now() });
      const now = Date.now();
      setLastSaved(now);
      setTimeAgoText('방금 전');
      setSaveStatus('saved');
    }, 400);
  }, [job.id]);

  // Toast helper
  const showToast = useCallback((msg, undoFn = null) => {
    clearTimeout(toastTimerRef.current);
    setToast({ msg, undoFn });
    toastTimerRef.current = setTimeout(() => setToast(null), undoFn ? 30000 : 2000);
  }, []);

  // Question ops
  const addQuestion = () => {
    const newQ = { id: String(Date.now()), title: '', limit: '', text: '' };
    const updated = [...questions, newQ];
    setQuestions(updated);
    persist(updated);
    setActiveIdx(updated.length - 1);
  };

  const updateQuestion = useCallback((id, field, value) => {
    setQuestions(prev => {
      const updated = prev.map(q => q.id === id ? { ...q, [field]: value } : q);
      persist(updated);
      return updated;
    });
  }, [persist]);

  // Copy single question
  const copyQuestion = async (q) => {
    const text = `${q.title || '(제목 없음)'}\n\n${q.text}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('복사됨!');
    } catch {
      showToast('복사 실패');
    }
  };

  // Copy all
  const handleCopyAll = async () => {
    const text = questions
      .map((q, i) => `[문항 ${i + 1}] ${q.title}${q.limit ? ` (${q.text.length}/${q.limit}자)` : ''}\n\n${q.text}`)
      .join('\n\n' + '─'.repeat(30) + '\n\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast('전체 복사됨!');
    } catch {
      showToast('복사 실패');
    }
  };

  // Export PDF
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

  // Delete with protection
  const handleDeleteClick = (q) => {
    setDeleteInput('');
    setDeleteModal({ id: q.id, charCount: q.text.length });
  };

  const confirmDelete = () => {
    if (!deleteModal) return;
    const idx = questions.findIndex(q => q.id === deleteModal.id);
    const question = questions[idx];
    const updated = questions.filter(q => q.id !== deleteModal.id);
    setQuestions(updated);
    persist(updated);
    setDeleteModal(null);
    if (updated.length > 0) setActiveIdx(Math.min(idx, updated.length - 1));
    showToast('문항이 삭제되었습니다.', () => {
      setQuestions(prev => {
        const restored = [...prev.slice(0, idx), question, ...prev.slice(idx)];
        persist(restored);
        return restored;
      });
      setToast(null);
    });
  };

  // Spell check
  const handleSpellCheck = async () => {
    if (!activeQ?.text.trim()) return;
    setSpellChecking(true);
    setSpellErrors([]);
    setShowSpellPanel(true);
    try {
      const params = new URLSearchParams({ text: activeQ.text });
      const res = await fetch('https://speller.cs.pusan.ac.kr/services/spelling/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const errors = [];
      if (Array.isArray(data)) {
        data.forEach(item => {
          (item.errInfo || []).forEach(e => errors.push(e));
        });
      }
      setSpellErrors(errors);
      if (errors.length === 0) {
        showToast('맞춤법 오류가 없습니다 ✓');
        setShowSpellPanel(false);
      }
    } catch {
      showToast('맞춤법 검사 실패 (네트워크 오류)');
      setShowSpellPanel(false);
    } finally {
      setSpellChecking(false);
    }
  };

  const applyCorrection = (err, candidate) => {
    if (!activeQ) return;
    const newText = activeQ.text.slice(0, err.start) + candidate + activeQ.text.slice(err.end);
    updateQuestion(activeQ.id, 'text', newText);
    setSpellErrors(prev => prev.filter(e => e !== err));
  };

  const applyAllCorrections = () => {
    if (!activeQ) return;
    let text = activeQ.text;
    const sorted = [...spellErrors].sort((a, b) => b.start - a.start);
    sorted.forEach(err => {
      const first = (err.candWord || '').split('|')[0].trim();
      if (first) text = text.slice(0, err.start) + first + text.slice(err.end);
    });
    updateQuestion(activeQ.id, 'text', text);
    setSpellErrors([]);
    setShowSpellPanel(false);
  };

  // AI feedback
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

  // Stats
  const completedCount = questions.filter(q => q.text.trim().length > 0).length;
  const overallProgress = questions.length > 0 ? completedCount / questions.length : 0;

  // Active question stats
  const activeCharCount = activeQ?.text.length || 0;
  const activeLimit = activeQ ? parseInt(activeQ.limit, 10) : NaN;
  const activeHasLimit = !!(activeQ?.limit && !isNaN(activeLimit) && activeLimit > 0);
  const activeRatio = activeHasLimit ? activeCharCount / activeLimit : 0;
  const activeOverLimit = activeHasLimit && activeCharCount > activeLimit;
  const activeBarColor = !activeHasLimit ? '#6366f1' : activeOverLimit ? '#ef4444' : activeRatio >= 0.8 ? '#f59e0b' : '#10b981';
  const activeBarWidth = activeHasLimit ? Math.min(activeRatio * 100, 100) : 0;

  const saveStatusText = saveStatus === 'saving' ? '저장 중...' : saveStatus === 'saved' ? `자동저장 · ${timeAgoText}` : '자동저장';

  return (
    <div className="flex h-full min-h-0 relative">

      {/* ── Left Sidebar (160px) ── */}
      <div className="flex flex-col border-r border-gray-100 flex-shrink-0 bg-white" style={{ width: '160px' }}>
        {/* Overall progress */}
        <div className="px-3 pt-3 pb-2 border-b border-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">자기소개서</span>
            <span className="text-[9px] font-bold text-gray-500">{completedCount}/{questions.length}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${overallProgress * 100}%`, backgroundColor: overallProgress >= 1 ? '#10b981' : '#6366f1' }}
            />
          </div>
        </div>

        {/* Question list */}
        <div className="flex-1 overflow-y-auto py-1">
          {questions.map((q, idx) => {
            const lim = parseInt(q.limit, 10);
            const hasLim = !!(q.limit && !isNaN(lim) && lim > 0);
            const ratio = hasLim ? Math.min(q.text.length / lim, 1) : q.text.length > 0 ? 1 : 0;
            const isActive = idx === safeIdx;
            return (
              <button
                key={q.id}
                onClick={() => setActiveIdx(idx)}
                className={`w-full text-left px-3 py-2 transition-colors flex flex-col gap-0.5 ${
                  isActive ? 'bg-indigo-50 border-r-2 border-indigo-500' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className={`text-[10px] font-medium truncate flex-1 ${isActive ? 'text-indigo-700' : 'text-gray-600'}`}>
                    {q.title || `문항 ${idx + 1}`}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-5">
                  <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${ratio * 100}%`,
                        backgroundColor: ratio >= 1 ? '#10b981' : ratio >= 0.5 ? '#6366f1' : ratio > 0 ? '#f59e0b' : '#e5e7eb',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-400 flex-shrink-0">{Math.round(ratio * 100)}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer: global actions + add button */}
        <div className="p-3 border-t border-gray-50 space-y-2 flex-shrink-0">
          <div className="flex gap-1.5">
            <button
              onClick={handleCopyAll}
              disabled={questions.every(q => !q.text.trim())}
              className="flex-1 h-7 text-[11px] font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-40"
            >
              전체 복사
            </button>
            <button
              onClick={handleExportPDF}
              disabled={questions.every(q => !q.text.trim())}
              className="flex-1 h-7 text-[11px] font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-40"
            >
              PDF
            </button>
          </div>
          {questions.length > 0 && (
            <button
              onClick={requestFeedback}
              disabled={coverLoading || questions.every(q => !q.text.trim())}
              className="w-full h-7 text-[11px] font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
            >
              {coverLoading
                ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />첨삭 중</>
                : '✦ AI 첨삭'}
            </button>
          )}
          <button
            onClick={addQuestion}
            className="w-full py-2 text-[11px] font-semibold text-gray-500 hover:text-gray-700 border border-dashed border-gray-200 hover:border-gray-400 rounded-xl transition-all flex items-center justify-center gap-1"
          >
            + 문항 추가
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {!activeQ ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-8">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">왼쪽에서 문항을 추가하세요</p>
            <p className="text-xs mt-1">Ctrl+← / Ctrl+→ 으로 이동</p>
          </div>
        ) : (
          <>
            {/* Top toolbar */}
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100 flex-shrink-0 bg-white">
              <button
                onClick={() => copyQuestion(activeQ)}
                className="h-7 px-3 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                복사
              </button>
              <button
                onClick={handleSpellCheck}
                disabled={spellChecking || !activeQ.text.trim()}
                className="h-7 px-3 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
              >
                {spellChecking
                  ? <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                }
                맞춤법 검사
              </button>
              <div className="flex-1" />
              <button
                onClick={() => handleDeleteClick(activeQ)}
                className="h-7 px-3 text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                삭제
              </button>
            </div>

            {/* Question header: badge + title (inline edit) + char limit */}
            <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0 border-b border-gray-50 bg-white">
              <span className="w-8 h-8 rounded-full bg-gray-900 text-white text-sm font-black flex items-center justify-center flex-shrink-0">
                {safeIdx + 1}
              </span>
              <input
                value={activeQ.title}
                onChange={(e) => updateQuestion(activeQ.id, 'title', e.target.value)}
                placeholder="문항 제목을 입력하세요..."
                className="flex-1 text-base font-bold text-gray-800 bg-transparent border-none outline-none placeholder-gray-300"
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  value={activeQ.limit}
                  onChange={(e) => updateQuestion(activeQ.id, 'limit', e.target.value)}
                  placeholder="제한"
                  className="w-16 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-center outline-none focus:ring-1 focus:ring-gray-300"
                />
                <span className="text-xs text-gray-300">자</span>
              </div>
            </div>

            {/* Textarea — fills remaining space */}
            <textarea
              ref={textareaRef}
              value={activeQ.text}
              onChange={(e) => updateQuestion(activeQ.id, 'text', e.target.value)}
              placeholder="내용을 작성하세요..."
              className="flex-1 w-full text-sm text-gray-700 bg-white border-none outline-none resize-none leading-relaxed placeholder-gray-300 px-5 py-4"
              style={{ minHeight: '400px' }}
            />

            {/* Bottom bar: autosave · progress · char count */}
            <div className="flex items-center gap-4 px-5 py-2.5 border-t border-gray-100 bg-white flex-shrink-0">
              <span className="text-xs text-gray-400 flex-shrink-0 min-w-[120px]">
                {saveStatusText}
              </span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                {activeHasLimit && (
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${activeBarWidth}%`, backgroundColor: activeBarColor }}
                  />
                )}
              </div>
              <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${activeOverLimit ? 'text-red-500' : activeRatio >= 0.8 && activeHasLimit ? 'text-amber-500' : 'text-gray-600'}`}>
                {activeCharCount.toLocaleString()}
                {activeHasLimit && <span className="text-sm font-normal text-gray-400"> / {activeLimit.toLocaleString()}</span>}
                <span className="text-sm font-normal text-gray-400">자</span>
              </span>
            </div>

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between px-5 py-2 border-t border-gray-50 bg-white flex-shrink-0">
              <button
                onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
                disabled={safeIdx === 0}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                이전 문항
              </button>
              <span className="text-xs text-gray-300">{safeIdx + 1} / {questions.length}</span>
              <button
                onClick={() => setActiveIdx(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={safeIdx >= questions.length - 1}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
              >
                다음 문항
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Spell Check Panel ── */}
      {showSpellPanel && (
        <div className="flex flex-col border-l border-gray-100 bg-white flex-shrink-0" style={{ width: '280px' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-xs font-bold text-gray-700">맞춤법 검사</p>
            <span className="text-[10px] text-gray-400 font-medium">{spellErrors.length > 0 ? `${spellErrors.length}건` : ''}</span>
            <button onClick={() => setShowSpellPanel(false)} className="text-gray-300 hover:text-gray-600 text-xl leading-none ml-2">×</button>
          </div>
          {spellChecking ? (
            <div className="flex items-center justify-center flex-1 gap-2 text-gray-400 text-xs">
              <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
              검사 중...
            </div>
          ) : spellErrors.length === 0 ? (
            <div className="flex items-center justify-center flex-1 text-gray-300 text-sm">오류 없음</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                {spellErrors.map((err, i) => {
                  const candidates = (err.candWord || '').split('|').map(s => s.trim()).filter(Boolean);
                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-start gap-1.5 mb-1.5 flex-wrap">
                        <span className="text-xs font-bold text-red-500 line-through">{err.orgStr}</span>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-gray-300 mt-0.5 flex-shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="flex flex-wrap gap-1">
                          {candidates.slice(0, 3).map((c, ci) => (
                            <button
                              key={ci}
                              onClick={() => applyCorrection(err, c)}
                              className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition-colors"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      {err.help && <p className="text-[10px] text-gray-400 leading-relaxed">{err.help}</p>}
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={applyAllCorrections}
                  className="w-full py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors"
                >
                  전체 교정 적용
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── AI Feedback Overlay ── */}
      {coverFeedback && (
        <div className="absolute inset-0 bg-white flex flex-col z-30">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <p className="text-sm font-bold text-indigo-700">AI 첨삭 결과</p>
            <button onClick={() => setCoverFeedback('')} className="text-xs text-gray-400 hover:text-gray-700 font-semibold transition-colors">닫기</button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">{coverFeedback}</pre>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl z-50 whitespace-nowrap">
          <span>{toast.msg}</span>
          {toast.undoFn && (
            <button onClick={toast.undoFn} className="text-indigo-300 hover:text-indigo-100 font-bold underline">
              실행 취소
            </button>
          )}
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteModal && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
            <h3 className="text-sm font-bold text-gray-800 mb-3">문항 삭제</h3>
            {deleteModal.charCount > 0 ? (
              <>
                <p className="text-xs text-gray-500 mb-1">
                  이 문항에는 <span className="font-bold text-gray-700">{deleteModal.charCount.toLocaleString()}자</span>가 작성되어 있습니다.
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  삭제하려면 아래에 <span className="font-bold text-gray-700">"삭제"</span>를 입력하세요.
                </p>
                <input
                  autoFocus
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && deleteInput === '삭제' && confirmDelete()}
                  placeholder="삭제"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </>
            ) : (
              <p className="text-xs text-gray-500 mb-4">정말 삭제하시겠어요?</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                disabled={deleteModal.charCount > 0 && deleteInput !== '삭제'}
                className="flex-1 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                삭제
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
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
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={8}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
              placeholder="채용 공고, JD 요약, 회사 리서치 메모..." />
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
        <FitAnalysisPanel job={job} stacks={stacks} resumeMaterials={resumeMaterials} apiKey={apiKey} onAddToPlan={onAddToPlan} />
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
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 font-medium transition-colors mt-1 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            job board
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{job.company}</h1>
            {job.position && <p className="text-base text-gray-500 mt-0.5">{job.position}</p>}
          </div>
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
        {/* Left: 35% */}
        <div className="overflow-y-auto p-6" style={{ width: '35%', flexShrink: 0 }}>
          <JobInfoPanel job={job} onEdit={onEdit} stacks={stacks} resumeMaterials={resumeMaterials} apiKey={apiKey} onAddToPlan={onAddToPlan} />
        </div>
        <div className="w-px bg-gray-100 flex-shrink-0" />
        {/* Right: 65% — Cover letter (no extra padding, CoverLetterPanel manages its own layout) */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col" style={{ minWidth: 0 }}>
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
  const [detailJob, setDetailJob] = useState(null);

  const saveJobs = (updated) => { setJobs(updated); storage.set(JOB_KEY, updated); };

  const handleSave = (job) => {
    const next = jobs.find((j) => j.id === job.id)
      ? jobs.map((j) => j.id === job.id ? job : j)
      : [...jobs, job];
    saveJobs(next);
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

      {/* Table */}
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
                const meta = storage.get(coverMetaKey(job.id), null);
                const lastModText = meta?.lastModified ? getTimeAgo(meta.lastModified) : null;
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
                      {hasLetter ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full w-fit">{completedLetter}문항</span>
                          {lastModText && <span className="text-[10px] text-gray-400">수정 {lastModText}</span>}
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
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
