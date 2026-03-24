import React, { useState } from 'react';
import { getCareerAdvice, convertMaterialToResume } from '../utils/claude';
import { storage } from '../utils/storage';
import CounselingLog from './CounselingLog';

const MATERIALS_KEY = 'mergee_career_materials';

const TABS = [
  { id: 'cover', label: '자기소개서' },
  { id: 'interview', label: '면접 코치' },
  { id: 'materials', label: '자료 보관함' },
  { id: 'counseling', label: '상담 로그' },
];

/* ── Cover Letter ── */
function CoverLetter({ apiKey, onSave, resumeMaterials }) {
  const [form, setForm] = useState({ company: '', position: '', background: '' });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(null);
  const [converted, setConverted] = useState({});

  const handleGenerate = async () => {
    if (!form.company.trim()) return;
    setLoading(true); setResult('');
    try { const text = await getCareerAdvice(apiKey, 'cover', form); setResult(text); }
    catch (e) { setResult('오류: ' + e.message); }
    finally { setLoading(false); }
  };

  const handleSave = () => {
    if (!result) return;
    onSave({ id: String(Date.now()), type: 'cover', title: form.company + ' · ' + form.position, content: result, createdAt: new Date().toISOString() });
  };

  const handleConvertMaterial = async (m) => {
    setConverting(m.id);
    try {
      const text = await convertMaterialToResume(apiKey, m);
      setConverted((prev) => ({ ...prev, [m.id]: text }));
    } catch {}
    setConverting(null);
  };

  const CAT_COLOR = { '학습 의지': 'bg-blue-100 text-blue-700', '문제 해결': 'bg-green-100 text-green-700', '성장 경험': 'bg-purple-100 text-purple-700', '협업/소통': 'bg-orange-100 text-orange-700', '기타': 'bg-gray-100 text-gray-600' };

  return (
    <div className="space-y-4">
      {/* Input form */}
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">지원 정보</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">회사명 *</label>
            <input type="text" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="예: 네이버" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">포지션 *</label>
            <input type="text" value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="예: 데이터 분석가" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">나의 배경 (선택)</label>
          <textarea value={form.background} onChange={(e) => setForm((p) => ({ ...p, background: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" rows={2}
            placeholder="보유 자격증, 경험, 강점 등" />
        </div>
        <button onClick={handleGenerate} disabled={!form.company.trim() || loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-40">
          {loading ? '생성 중...' : '✦ AI 자기소개서 생성'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">생성 결과</p>
            <button onClick={handleSave} className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-lg transition-colors">보관함에 저장</button>
          </div>
          <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">{result}</pre>
        </div>
      )}

      {/* Resume materials */}
      {resumeMaterials.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">저장된 소재 ({resumeMaterials.length})</p>
          </div>
          <div className="space-y-3">
            {resumeMaterials.map((m) => (
              <div key={m.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLOR[m.category] || 'bg-gray-100 text-gray-600'}`}>{m.category}</span>
                  <span className="text-[10px] text-gray-300">{new Date(m.timestamp).toLocaleDateString('ko-KR')}</span>
                  {m.stackName && <span className="text-[10px] text-gray-400">{m.stackName}</span>}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{m.content.slice(0, 100)}{m.content.length > 100 ? '…' : ''}</p>
                {converted[m.id] ? (
                  <div className="bg-purple-50 rounded-lg p-2.5 border border-purple-100">
                    <p className="text-xs font-semibold text-purple-600 mb-1">자소서 변환 결과</p>
                    <p className="text-xs text-purple-800 leading-relaxed">{converted[m.id]}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConvertMaterial(m)}
                    disabled={converting === m.id}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors disabled:opacity-40"
                  >
                    {converting === m.id ? '변환 중...' : '✦ 자소서 문장으로 변환'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Interview Coach ── */
function InterviewCoach({ apiKey, onSave }) {
  const [form, setForm] = useState({ company: '', position: '' });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!form.company.trim()) return;
    setLoading(true); setResult('');
    try { const text = await getCareerAdvice(apiKey, 'interview', form); setResult(text); }
    catch (e) { setResult('오류: ' + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">면접 준비</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">회사명 *</label>
            <input type="text" value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="예: 카카오" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">포지션</label>
            <input type="text" value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="예: 백엔드 개발" />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={!form.company.trim() || loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-40">
          {loading ? '준비 중...' : '✦ 면접 Q&A 생성'}
        </button>
      </div>
      {result && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">예상 Q&A</p>
            <button onClick={() => onSave({ id: String(Date.now()), type: 'interview', title: form.company + ' 면접', content: result, createdAt: new Date().toISOString() })}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-lg transition-colors">보관함에 저장</button>
          </div>
          <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">{result}</pre>
        </div>
      )}
    </div>
  );
}

/* ── Materials Bank ── */
function MaterialsBank({ materials, onDelete }) {
  const TYPE_LABEL = { cover: '자소서', interview: '면접' };
  const TYPE_CLASS = { cover: 'bg-purple-100 text-purple-700', interview: 'bg-blue-100 text-blue-700' };
  if (!materials.length) {
    return <div className="bg-white rounded-2xl p-8 shadow-sm text-center text-gray-400 text-sm">아직 저장된 자료가 없어요.</div>;
  }
  return (
    <div className="space-y-3">
      {materials.map((m) => (
        <div key={m.id} className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_CLASS[m.type] || 'bg-gray-100 text-gray-500'}`}>{TYPE_LABEL[m.type] || m.type}</span>
                <span className="text-[10px] text-gray-400">{new Date(m.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800">{m.title}</p>
            </div>
            <button onClick={() => onDelete(m.id)} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          <pre className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap font-sans line-clamp-6">{m.content}</pre>
        </div>
      ))}
    </div>
  );
}

/* ── Career ── */
export default function Career({ apiKey, resumeMaterials = [], onSaveResumeMaterial, counselingLogs = [], onSaveCounselingLog, onDeleteCounselingLog }) {
  const [tab, setTab] = useState('cover');
  const [materials, setMaterials] = useState(() => storage.get(MATERIALS_KEY, []));

  const saveMaterial = (item) => {
    const updated = [item, ...materials];
    setMaterials(updated);
    storage.set(MATERIALS_KEY, updated);
  };
  const deleteMaterial = (id) => {
    const updated = materials.filter((m) => m.id !== id);
    setMaterials(updated);
    storage.set(MATERIALS_KEY, updated);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3.5 flex-shrink-0">
        <h2 className="font-semibold text-gray-800 text-sm">career</h2>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-6 flex gap-1 flex-shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            {t.label}
            {t.id === 'materials' && materials.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{materials.length}</span>
            )}
            {t.id === 'counseling' && counselingLogs.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{counselingLogs.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'cover' && <CoverLetter apiKey={apiKey} onSave={saveMaterial} resumeMaterials={resumeMaterials} />}
        {tab === 'interview' && <InterviewCoach apiKey={apiKey} onSave={saveMaterial} />}
        {tab === 'materials' && <MaterialsBank materials={materials} onDelete={deleteMaterial} />}
        {tab === 'counseling' && (
          <CounselingLog
            logs={counselingLogs}
            resumeMaterials={resumeMaterials}
            apiKey={apiKey}
            onSave={onSaveCounselingLog}
            onDelete={onDeleteCounselingLog}
          />
        )}
      </div>
    </div>
  );
}
