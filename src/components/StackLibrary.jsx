import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../utils/storage';
import { supabase, hasSupabase } from '../utils/supabase';
import { callClaude } from '../utils/claude';

const LIBRARY_KEY = 'mergee_stack_library';

function getLibraryItems(stackId) {
  const all = storage.get(LIBRARY_KEY, {});
  return all[stackId] || [];
}

function saveLibraryItems(stackId, items) {
  const all = storage.get(LIBRARY_KEY, {});
  all[stackId] = items;
  storage.set(LIBRARY_KEY, all);
}

const TYPE_INFO = {
  link: { icon: '🔗', label: '링크', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  note: { icon: '📄', label: '노트', color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  file: { icon: '📎', label: '파일', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  job:  { icon: '🗂', label: '공고', color: 'bg-green-50 text-green-600 border-green-100' },
};

/* ────── Library Card ────── */
function LibraryCard({ item, onDelete, onClick }) {
  const [hover, setHover] = useState(false);
  const info = TYPE_INFO[item.type] || TYPE_INFO.note;

  return (
    <div
      className="relative bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className={`text-base flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border ${info.color}`}>
          {info.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
          {item.type === 'link' && item.url && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.url}</p>
          )}
          {item.type === 'job' && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              {[item.company, item.role].filter(Boolean).join(' · ')}
            </p>
          )}
          {item.type === 'job' && item.deadline && (
            <p className="text-[11px] text-red-400 mt-0.5">마감 {item.deadline}</p>
          )}
          {item.type === 'note' && item.content && (
            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{item.content}</p>
          )}
        </div>
      </div>

      {(item.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {(item.tags || []).slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-300">
        {new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
      </p>

      {hover && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-gray-400 rounded-lg transition-all text-xs"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/* ────── Detail Modal ────── */
function DetailModal({ item, onClose }) {
  const info = TYPE_INFO[item.type] || TYPE_INFO.note;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`text-base w-8 h-8 flex items-center justify-center rounded-xl border ${info.color}`}>{info.icon}</span>
            <h3 className="font-bold text-gray-800">{item.title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
        </div>

        {item.type === 'note' && (
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {item.content}
          </div>
        )}

        {item.type === 'file' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">파일명: <span className="font-medium text-gray-800">{item.fileName}</span></p>
            {item.fileUrl && (
              <a
                href={item.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
              >
                파일 열기 ↗
              </a>
            )}
            {!item.fileUrl && (
              <p className="text-xs text-gray-400">파일 URL이 없습니다 (Supabase 미연결)</p>
            )}
          </div>
        )}

        {item.type === 'job' && (
          <div className="space-y-3">
            {item.company && (
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">회사</span>
                <p className="text-sm text-gray-800 mt-0.5 font-medium">{item.company}</p>
              </div>
            )}
            {item.role && (
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">직무</span>
                <p className="text-sm text-gray-800 mt-0.5">{item.role}</p>
              </div>
            )}
            {item.deadline && (
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">마감일</span>
                <p className="text-sm text-red-500 mt-0.5 font-medium">{item.deadline}</p>
              </div>
            )}
            {item.requiredSpecs && (
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">필요 스펙</span>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap leading-relaxed">{item.requiredSpecs}</p>
              </div>
            )}
            {item.content && (
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">원문</span>
                <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{item.content}</p>
              </div>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                원본 공고 보기 ↗
              </a>
            )}
          </div>
        )}

        {item.memo && (
          <div className="mt-3 p-3 bg-yellow-50 rounded-xl text-sm text-yellow-800 leading-relaxed">
            {item.memo}
          </div>
        )}

        {(item.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {(item.tags || []).map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────── Add Modal ────── */
function AddLibraryModal({ stack, apiKey, onAdd, onClose }) {
  const [selectedType, setSelectedType] = useState(null);
  const [form, setForm] = useState({ title: '', url: '', content: '', memo: '', tags: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [addToJobBoard, setAddToJobBoard] = useState(false);
  const fileInputRef = useRef(null);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleAnalyzeJob = async () => {
    const text = form.content.trim();
    const url = form.url.trim();
    if (!text && !url) return;
    setAnalyzing(true);
    try {
      const input = text || `URL: ${url}`;
      const result = await callClaude(
        apiKey,
        [{ role: 'user', content: `다음 공고에서 정보를 추출해주세요:\n\n${input}\n\n반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):\n{"company":"회사명","role":"직무","deadline":"마감일 YYYY-MM-DD 형식 없으면 null","requiredSpecs":"필요 스펙 3줄 이내 요약"}` }],
        'You are a job posting information extractor. Respond only with valid JSON.',
        'claude-haiku-4-5-20251001',
      );
      const jsonMatch = result.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setJobData(parsed);
        if (!form.title.trim()) {
          setField('title', [parsed.company, parsed.role].filter(Boolean).join(' - '));
        }
      }
    } catch (e) {
      console.error('Job analysis failed:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;

    let fileUrl = null;
    let fileName = null;

    if (selectedType === 'file' && file) {
      setUploading(true);
      try {
        if (hasSupabase && supabase) {
          const userId = storage.getUserId();
          const path = `${userId}/${stack.id}/${Date.now()}_${file.name}`;
          const { data, error } = await supabase.storage.from('stack-library').upload(path, file);
          if (!error && data) {
            const { data: urlData } = supabase.storage.from('stack-library').getPublicUrl(path);
            fileUrl = urlData?.publicUrl || null;
          }
        }
        fileName = file.name;
      } catch (e) {
        console.error('File upload failed:', e);
      } finally {
        setUploading(false);
      }
    }

    const tagsArr = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

    const item = {
      id: String(Date.now()),
      stackId: stack.id,
      type: selectedType,
      title: form.title.trim(),
      ...(selectedType === 'link' || selectedType === 'job' ? { url: form.url.trim() || undefined } : {}),
      ...(selectedType === 'note' || selectedType === 'job' ? { content: form.content.trim() || undefined } : {}),
      ...(selectedType === 'link' && form.memo.trim() ? { memo: form.memo.trim() } : {}),
      ...(selectedType === 'file' ? { fileName, fileUrl } : {}),
      tags: tagsArr,
      createdAt: new Date().toISOString(),
      ...(selectedType === 'job' && jobData
        ? {
            company: jobData.company || undefined,
            role: jobData.role || undefined,
            deadline: jobData.deadline || undefined,
            requiredSpecs: jobData.requiredSpecs || undefined,
            addedToJobBoard,
          }
        : {}),
    };

    onAdd(item);
    onClose();
  };

  const types = [
    { type: 'link', icon: '🔗', label: '링크', desc: 'URL + 제목 + 메모' },
    { type: 'note', icon: '📄', label: '텍스트 노트', desc: '제목 + 내용' },
    { type: 'file', icon: '📎', label: '파일 업로드', desc: 'PDF, 이미지' },
    { type: 'job',  icon: '🗂', label: '공고 스크랩', desc: 'URL 또는 텍스트' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-800">자료 추가</h2>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
          </div>

          {!selectedType ? (
            <div className="grid grid-cols-2 gap-3">
              {types.map(({ type, icon, label, desc }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="flex flex-col items-start p-4 border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-2xl transition-all text-left"
                >
                  <span className="text-2xl mb-2">{icon}</span>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => { setSelectedType(null); setJobData(null); }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                유형 다시 선택
              </button>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">제목 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="자료 제목"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

              {/* Link */}
              {selectedType === 'link' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">URL</label>
                    <input
                      type="url"
                      value={form.url}
                      onChange={(e) => setField('url', e.target.value)}
                      placeholder="https://..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">메모 (선택)</label>
                    <input
                      type="text"
                      value={form.memo}
                      onChange={(e) => setField('memo', e.target.value)}
                      placeholder="간단한 메모..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                </>
              )}

              {/* Note */}
              {selectedType === 'note' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">내용</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setField('content', e.target.value)}
                    placeholder="텍스트를 입력하세요..."
                    rows={6}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                  />
                </div>
              )}

              {/* File */}
              {selectedType === 'file' && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">파일</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl p-6 text-center cursor-pointer transition-colors"
                  >
                    {file ? (
                      <div>
                        <p className="text-sm font-medium text-gray-700">{file.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl mb-2">📎</p>
                        <p className="text-sm text-gray-400">클릭하여 파일 선택</p>
                        <p className="text-xs text-gray-300 mt-1">PDF, 이미지 지원</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setFile(f);
                        if (!form.title) setField('title', f.name.replace(/\.[^.]+$/, ''));
                      }
                    }}
                    className="hidden"
                  />
                </div>
              )}

              {/* Job scraping */}
              {selectedType === 'job' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">공고 URL (선택)</label>
                    <input
                      type="url"
                      value={form.url}
                      onChange={(e) => setField('url', e.target.value)}
                      placeholder="https://..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">공고 텍스트 붙여넣기</label>
                    <textarea
                      value={form.content}
                      onChange={(e) => setField('content', e.target.value)}
                      placeholder="공고 내용을 여기에 붙여넣으세요..."
                      rows={5}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                    />
                  </div>
                  <button
                    onClick={handleAnalyzeJob}
                    disabled={analyzing || (!form.content.trim() && !form.url.trim())}
                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {analyzing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        분석 중...
                      </>
                    ) : '🤖 AI로 자동 분석'}
                  </button>

                  {jobData && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">분석 결과</p>
                      {jobData.company && <p className="text-sm"><span className="font-medium text-gray-500">회사:</span> <span className="text-gray-800">{jobData.company}</span></p>}
                      {jobData.role && <p className="text-sm"><span className="font-medium text-gray-500">직무:</span> <span className="text-gray-800">{jobData.role}</span></p>}
                      {jobData.deadline && <p className="text-sm"><span className="font-medium text-gray-500">마감:</span> <span className="text-red-500">{jobData.deadline}</span></p>}
                      {jobData.requiredSpecs && <p className="text-sm"><span className="font-medium text-gray-500">필요 스펙:</span> <span className="text-gray-700 whitespace-pre-wrap">{jobData.requiredSpecs}</span></p>}
                      <label className="flex items-center gap-2 pt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addToJobBoard}
                          onChange={(e) => setAddToJobBoard(e.target.checked)}
                          className="w-4 h-4 rounded accent-indigo-600"
                        />
                        <span className="text-xs text-gray-600">Job Board에도 자동 추가</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">태그 (쉼표로 구분)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setField('tags', e.target.value)}
                  placeholder="기출문제, 요약정리, 참고자료"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!form.title.trim() || uploading}
                className="w-full py-3 bg-[#111] hover:bg-gray-800 disabled:bg-gray-200 text-white text-sm font-bold rounded-xl transition-colors"
              >
                {uploading ? '업로드 중...' : '저장'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────── Main StackLibrary ────── */
export default function StackLibrary({ stack, apiKey }) {
  const [items, setItems] = useState(() => getLibraryItems(stack.id));
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    setItems(getLibraryItems(stack.id));
    setFilterType('all');
    setSearchQuery('');
  }, [stack.id]);

  const handleAdd = (item) => {
    const newItems = [item, ...items];
    setItems(newItems);
    saveLibraryItems(stack.id, newItems);
  };

  const handleDelete = (id) => {
    const newItems = items.filter((i) => i.id !== id);
    setItems(newItems);
    saveLibraryItems(stack.id, newItems);
  };

  const filtered = items.filter((item) => {
    const typeMatch = filterType === 'all' || item.type === filterType;
    const q = searchQuery.toLowerCase();
    const textMatch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      (item.company || '').toLowerCase().includes(q);
    return typeMatch && textMatch;
  });

  const filterTabs = [
    { key: 'all', label: '전체' },
    { key: 'link', label: '🔗 링크' },
    { key: 'note', label: '📄 노트' },
    { key: 'file', label: '📎 파일' },
    { key: 'job',  label: '🗂 공고' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] min-h-0">
      {/* Toolbar */}
      <div className="px-6 py-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-0.5 bg-white border border-gray-100 rounded-xl p-1 flex-shrink-0">
          {filterTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                filterType === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 relative min-w-[120px]">
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-9 flex items-center gap-1.5 px-4 bg-[#111] hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          자료 추가
        </button>
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-300">
            <div className="text-5xl mb-3">📂</div>
            <p className="text-sm font-medium">
              {items.length === 0 ? '자료가 없어요. 추가해보세요!' : '검색 결과가 없어요.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onClick={() => {
                  if (item.type === 'link' && item.url) window.open(item.url, '_blank');
                  else setDetailItem(item);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddLibraryModal
          stack={stack}
          apiKey={apiKey}
          onAdd={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {detailItem && (
        <DetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  );
}
