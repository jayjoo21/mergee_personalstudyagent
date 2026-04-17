import React, { useState, useRef, useCallback } from 'react';
import { analyzeCounselingLog } from '../utils/claude';
import { supabase, hasSupabase } from '../utils/supabase';
import { storage } from '../utils/storage';

function PaperclipIcon() {
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="inline-block">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
}

function AttachmentThumb({ att, onRemove }) {
  const [hover, setHover] = useState(false);
  const isPdf = att.name?.toLowerCase().endsWith('.pdf');
  return (
    <div
      className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 group cursor-default"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {isPdf ? (
        <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center gap-0.5">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-red-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[9px] text-red-400 font-semibold">PDF</span>
        </div>
      ) : (
        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
      )}
      {hover && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(att); }}
          className="absolute inset-0 bg-black/50 flex items-center justify-center"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── Add form ── */
function AddForm({ resumeMaterials, apiKey, onSave, onClose }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], advisor: '', content: '' });
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const formIdRef = useRef(String(Date.now()));

  const handleFiles = useCallback(async (files) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const valid = Array.from(files).filter(f => allowed.includes(f.type));
    if (!valid.length) return;
    const previews = valid.map(f => ({
      file: f, name: f.name,
      url: f.type !== 'application/pdf' ? URL.createObjectURL(f) : null,
      localId: Math.random().toString(36).slice(2),
    }));
    setPendingAttachments(prev => [...prev, ...previews]);
  }, []);

  const removePending = (att) => {
    if (att.url) URL.revokeObjectURL(att.url);
    setPendingAttachments(prev => prev.filter(a => a.localId !== att.localId));
  };

  const uploadAttachments = async (counselingId) => {
    if (!hasSupabase || !pendingAttachments.length) return [];
    const userId = storage.getUserId();
    const results = [];
    for (const att of pendingAttachments) {
      const path = `${userId}/${counselingId}/${Date.now()}_${att.name}`;
      const { error } = await supabase.storage.from('counseling-attachments').upload(path, att.file, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from('counseling-attachments').getPublicUrl(path);
        results.push({ name: att.name, path, url: urlData.publicUrl });
      }
    }
    return results;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    setAnalyzing(true); setUploading(true);
    let analysis = { summary: '', keywords: [], gaps: '' };
    try { analysis = await analyzeCounselingLog(apiKey, form.content, resumeMaterials); } catch {}
    const counselingId = formIdRef.current;
    const attachments = await uploadAttachments(counselingId);
    setUploading(false); setAnalyzing(false);
    onSave({ id: counselingId, ...form, ...analysis, attachments, timestamp: new Date().toISOString() });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm space-y-3 flex-shrink-0">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 font-semibold block mb-1">상담 날짜</label>
          <input type="date" value={form.date}
            onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-semibold block mb-1">상담사 / 기관</label>
          <input type="text" value={form.advisor}
            onChange={(e) => setForm(p => ({ ...p, advisor: e.target.value }))}
            placeholder="예: 학교 취업센터"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 font-semibold block mb-1">상담 내용 *</label>
        <textarea value={form.content}
          onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
          placeholder="상담에서 받은 피드백, 조언, 느낀 점 등을 자유롭게 적어주세요. AI가 자동으로 핵심을 정리해드려요."
          rows={4}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
      </div>
      <div>
        <label className="text-xs text-gray-500 font-semibold block mb-1">첨부 파일 (JPG, PNG, PDF)</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-xl px-4 py-4 text-center cursor-pointer transition-colors ${dragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <p className="text-xs text-gray-400">클릭하거나 파일을 드래그하세요</p>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg,application/pdf"
            multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
        {pendingAttachments.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {pendingAttachments.map(att => <AttachmentThumb key={att.localId} att={att} onRemove={removePending} />)}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={!form.content.trim() || analyzing}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
          {analyzing
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{uploading ? '업로드 중...' : 'AI 분석 중...'}</>
            : '저장 및 AI 분석'}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-100 border border-gray-200 transition-colors">
          취소
        </button>
      </div>
    </form>
  );
}

/* ── AI Analysis panel ── */
function AnalysisPanel({ log, resumeMaterials, onDelete, onCopyPrep }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-base font-black text-gray-900">{log.date}</span>
        {log.advisor && (
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">{log.advisor}</span>
        )}
        {log.attachments?.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <PaperclipIcon />{log.attachments.length}개 첨부
          </span>
        )}
      </div>

      {/* Summary */}
      {log.summary ? (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">핵심 피드백</p>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-line">{log.summary}</p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-xs text-gray-300">AI 분석 결과 없음</p>
        </div>
      )}

      {/* Keywords */}
      {log.keywords?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {log.keywords.map((k, i) => (
              <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">{k}</span>
            ))}
          </div>
        </div>
      )}

      {/* Gap analysis */}
      {log.gaps && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">소재 갭 분석</p>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-sm text-amber-800 leading-relaxed">{log.gaps}</p>
          </div>
        </div>
      )}

      {/* Attachments */}
      {log.attachments?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">첨부 파일</p>
          <div className="flex gap-2 flex-wrap">
            {log.attachments.map((att, i) => (
              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                <AttachmentThumb att={att} onRemove={null} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCopyPrep}
          className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          📋 상담 전 준비표 복사
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-50 border border-gray-200 transition-colors"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function CounselingLog({ logs, resumeMaterials, apiKey, onSave, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [contentModified, setContentModified] = useState(false);

  const selectedLog = logs.find(l => l.id === selectedId) || null;

  const selectLog = (log) => {
    setSelectedId(log.id);
    setEditedContent(log.content);
    setContentModified(false);
    setShowForm(false);
  };

  const handleContentEdit = (val) => {
    setEditedContent(val);
    setContentModified(selectedLog ? val !== selectedLog.content : false);
  };

  const handleSaveEdit = () => {
    if (!selectedLog) return;
    const updated = { ...selectedLog, content: editedContent };
    onUpdate?.(updated);
    setContentModified(false);
  };

  const handleDelete = (id) => {
    onDelete(id);
    if (selectedId === id) setSelectedId(null);
  };

  const copyPrep = (log) => {
    const text = [
      '[ 상담 전 준비표 ]',
      '날짜: ' + log.date,
      '상담사: ' + (log.advisor || '—'),
      '',
      '[ 이전 상담 핵심 피드백 ]',
      log.summary || '—',
      '',
      '[ 주요 키워드 ]',
      (log.keywords || []).join(', '),
      '',
      '[ 자소서 소재 현황 ]',
      resumeMaterials.length + '개 소재 저장됨',
      ...resumeMaterials.slice(0, 3).map(m => '· ' + m.category + ': ' + m.content.slice(0, 50)),
    ].join('\n');
    navigator.clipboard.writeText(text);
  };

  /* ── Detail (split) view ── */
  if (selectedLog) {
    return (
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar: log list */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <button
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              목록
            </button>
            <button
              onClick={() => { setSelectedId(null); setShowForm(true); }}
              className="h-6 px-2.5 text-[10px] font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              + 추가
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {logs.map(log => (
              <button
                key={log.id}
                onClick={() => selectLog(log)}
                className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-50 last:border-0 ${
                  log.id === selectedId ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-gray-700">{log.date}</span>
                  {log.attachments?.length > 0 && <PaperclipIcon />}
                </div>
                {log.advisor && <p className="text-[10px] text-gray-400 mb-0.5">{log.advisor}</p>}
                <p className="text-[11px] text-gray-400 truncate leading-tight">{log.content.slice(0, 50)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail: Original Memo | AI Analysis */}
        <div className="flex-1 flex overflow-hidden min-w-0">

          {/* Left: Original Memo */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 border-r border-gray-100">
            <div className="px-5 py-3 bg-white border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Original Memo</span>
              {contentModified && (
                <button
                  onClick={handleSaveEdit}
                  className="h-6 px-3 text-[10px] font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  저장
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              <textarea
                value={editedContent}
                onChange={(e) => handleContentEdit(e.target.value)}
                className="w-full h-full min-h-full resize-none px-6 py-5 text-sm text-gray-700 leading-7 bg-transparent focus:outline-none placeholder-gray-300"
                style={{ fontFamily: 'inherit' }}
                placeholder="상담 메모를 입력하세요..."
              />
            </div>
          </div>

          {/* Right: AI Analysis */}
          <div className="flex-1 overflow-y-auto min-w-0" style={{ background: '#f8f8f6' }}>
            <div className="px-5 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Analysis</span>
            </div>
            <div className="p-5">
              <AnalysisPanel
                log={selectedLog}
                resumeMaterials={resumeMaterials}
                onDelete={() => handleDelete(selectedLog.id)}
                onCopyPrep={() => copyPrep(selectedLog)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── List view ── */
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">상담 로그</h2>
            <p className="text-sm text-gray-400 mt-0.5">취업 상담 기록 및 AI 분석</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="h-8 flex items-center gap-1.5 px-3 text-xs font-semibold bg-[#111] text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            {showForm ? '닫기' : '+ 상담 추가'}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <AddForm
            resumeMaterials={resumeMaterials}
            apiKey={apiKey}
            onSave={onSave}
            onClose={() => setShowForm(false)}
          />
        )}

        {/* Empty state */}
        {logs.length === 0 && !showForm ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400 text-sm">
            아직 상담 기록이 없어요.<br />상담 후 내용을 기록하면 AI가 핵심을 정리해드려요.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">상담 이력 ({logs.length})</p>
            {logs.map((log) => (
              <button
                key={log.id}
                onClick={() => selectLog(log)}
                className="w-full text-left bg-white rounded-2xl shadow-sm px-5 py-4 hover:bg-gray-50 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-800">{log.date}</span>
                      {log.advisor && <span className="text-xs text-gray-400">{log.advisor}</span>}
                      {log.attachments?.length > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <PaperclipIcon />{log.attachments.length}
                        </span>
                      )}
                      {log.summary && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">AI 분석 완료</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{log.content}</p>
                    {log.keywords?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {log.keywords.slice(0, 4).map((k, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-200 group-hover:text-gray-400 flex-shrink-0 ml-4 mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
