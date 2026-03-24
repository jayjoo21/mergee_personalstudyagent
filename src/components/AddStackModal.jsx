import React, { useState, useEffect, useRef } from 'react';
import { analyzeExamRegistration } from '../utils/claude';

const COLORS = [
  { hex: '#6366f1', label: 'indigo' },
  { hex: '#8b5cf6', label: 'violet' },
  { hex: '#10b981', label: 'emerald' },
  { hex: '#f59e0b', label: 'amber' },
  { hex: '#f43f5e', label: 'rose' },
  { hex: '#0ea5e9', label: 'sky' },
  { hex: '#38bdf8', label: '하늘색' },
  { hex: '#2dd4bf', label: '민트' },
  { hex: '#84cc16', label: '라임' },
  { hex: '#ec4899', label: '핫핑크' },
  { hex: '#1e3a8a', label: '딥네이비' },
  { hex: '#fb923c', label: '코랄' },
];

export default function AddStackModal({ editingStack, onSave, onDelete, onClose, apiKey }) {
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [progress, setProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (editingStack) {
      setName(editingStack.name || '');
      setExamDate(editingStack.examDate || '');
      setSystemPrompt(editingStack.systemPrompt || '');
      setColor(editingStack.color || '#6366f1');
      setProgress(editingStack.progress || 0);
    }
  }, [editingStack]);

  const save = () => {
    if (!name.trim()) return;
    onSave({
      id: editingStack?.id || String(Date.now()),
      name: name.trim(),
      examDate,
      systemPrompt,
      color,
      progress,
      passed: editingStack?.passed || false,
    });
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mimeType = file.type || 'image/jpeg';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1];
      setOcrLoading(true);
      setOcrPreview(null);
      try {
        const result = await analyzeExamRegistration(apiKey || 'demo', base64, mimeType);
        setOcrPreview(result);
      } catch (err) {
        setOcrPreview({ error: err.message || 'OCR 분석에 실패했습니다' });
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applyOcr = () => {
    if (!ocrPreview || ocrPreview.error) return;
    if (ocrPreview.examName && !name.trim()) setName(ocrPreview.examName);
    if (ocrPreview.examDate) setExamDate(ocrPreview.examDate);
    if (ocrPreview.subjects && !systemPrompt.trim()) {
      setSystemPrompt(`당신은 ${ocrPreview.examName || name || '시험'} 전문 튜터입니다. 시험 과목(${ocrPreview.subjects})을 중심으로 개념 설명과 예상 문제를 통해 합격을 도와주세요.`);
    }
    setOcrPreview(null);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800">
            {editingStack ? 'edit stack' : 'add stack'}
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
        </div>

        <div className="space-y-4">
          {/* OCR Upload */}
          <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-6 bg-gradient-to-b from-indigo-50/60 to-white">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
                {ocrLoading ? (
                  <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                ) : (
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#6366f1" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">접수증 OCR</p>
                <p className="text-xs text-gray-400 mt-0.5">시험 접수증 이미지를 업로드하면<br/>시험명·날짜·과목을 자동으로 추출합니다</p>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={ocrLoading}
                className="h-9 px-5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {ocrLoading ? '분석 중...' : '이미지 업로드'}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* OCR Preview */}
            {ocrPreview && !ocrPreview.error && (
              <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">추출 결과</p>
                {ocrPreview.examName && (
                  <div className="flex gap-2">
                    <span className="text-[10px] font-semibold text-indigo-400 w-14 flex-shrink-0">시험명</span>
                    <span className="text-xs text-indigo-800">{ocrPreview.examName}</span>
                  </div>
                )}
                {ocrPreview.examDate && (
                  <div className="flex gap-2">
                    <span className="text-[10px] font-semibold text-indigo-400 w-14 flex-shrink-0">시험일</span>
                    <span className="text-xs text-indigo-800">{ocrPreview.examDate}</span>
                  </div>
                )}
                {ocrPreview.location && (
                  <div className="flex gap-2">
                    <span className="text-[10px] font-semibold text-indigo-400 w-14 flex-shrink-0">시험장</span>
                    <span className="text-xs text-indigo-800">{ocrPreview.location}</span>
                  </div>
                )}
                {ocrPreview.subjects && (
                  <div className="flex gap-2">
                    <span className="text-[10px] font-semibold text-indigo-400 w-14 flex-shrink-0">과목</span>
                    <span className="text-xs text-indigo-800">{ocrPreview.subjects}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={applyOcr}
                  className="mt-2 w-full py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  ✓ 적용
                </button>
              </div>
            )}
            {ocrPreview?.error && (
              <p className="mt-2 text-xs text-red-500">{ocrPreview.error}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TOEIC, 정보처리기사..."
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Exam Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">exam date</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Progress */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              progress —{' '}
              <span className="text-indigo-500 font-bold">{progress}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-gray-900"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">color</label>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(6, 2rem)' }}>
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  title={c.label}
                  className="w-8 h-8 rounded-full transition-all hover:scale-110"
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: color === c.hex ? `0 0 0 3px white, 0 0 0 5px ${c.hex}` : 'none',
                    transform: color === c.hex ? 'scale(1.15)' : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">system prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="AI 튜터의 역할을 설명하세요..."
              rows={4}
              className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100">
          {editingStack && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
            >
              delete
            </button>
          )}
          {confirmDelete && (
            <button
              onClick={() => { onDelete(editingStack.id); onClose(); }}
              className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-colors"
            >
              confirm delete
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2 rounded-xl"
          >
            cancel
          </button>
          <button
            onClick={save}
            disabled={!name.trim()}
            className="text-sm bg-[#111] hover:bg-gray-800 disabled:bg-gray-200 text-white font-medium px-5 py-2 rounded-xl transition-colors"
          >
            {editingStack ? 'save' : 'add stack'}
          </button>
        </div>
      </div>
    </div>
  );
}
