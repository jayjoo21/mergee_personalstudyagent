import React, { useState, useMemo } from 'react';
import { storage, isDemoMode } from '../utils/storage';
import { structurePortfolio } from '../utils/claude';

const KEY = 'mergee_portfolio';
const PROMPT_KEY = 'mergee_portfolio_prompt';

const DEFAULT_PROMPT = '아래는 나의 경험·자격·활동 데이터다. 이 데이터에 적힌 사실만 근거로 자기소개서를 작성해라. '
  + '없는 내용은 지어내지 말고, 수치와 고유명사는 그대로 써라. '
  + '지원 공고가 함께 있으면 공고의 요구 역량과 가장 잘 맞는 경험을 골라 근거로 삼아라.';

/* range: 시작~종료, single: 한 시점, none: 날짜 없음 */
const TYPES = [
  { id: 'project',  label: '프로젝트',   emoji: '🛠️', date: 'range',  orgLabel: '소속·팀',  star: true,  tags: true },
  { id: 'cert',     label: '자격·어학',  emoji: '📜', date: 'single', orgLabel: '발급처',   star: false, tags: false, score: true, dateLabel: '취득월' },
  { id: 'activity', label: '활동·경력',  emoji: '🤝', date: 'range',  orgLabel: '기관·단체', star: true,  tags: true },
  { id: 'award',    label: '수상',       emoji: '🏆', date: 'single', orgLabel: '주최',     star: false, tags: false, dateLabel: '수상월' },
  { id: 'link',     label: '링크',       emoji: '🔗', date: 'none',   orgLabel: '',         star: false, tags: false },
];
const TYPE_BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));

const EMPTY = {
  type: 'project', title: '', org: '', role: '', start: '', end: '', score: '',
  summary: '', situation: '', action: '', result: '', tags: [], url: '',
};

const MERGEE_SEED = {
  type: 'project',
  title: 'mergee — 시험·취업 통합 스터디 매니저',
  org: '개인 프로젝트',
  role: '기획·설계·개발 전체',
  start: '2026-03',
  end: '',
  summary: '자격증 학습, 공고 관리, 자소서 작성을 한 곳에서 관리하는 모바일 대응 웹앱(PWA)',
  situation: '시험 일정, 채용 공고, 자소서 소재가 여러 앱과 노트에 흩어져 있어 관리가 어려웠다',
  action: 'React·Vite·Tailwind로 프론트엔드를 만들고 Supabase 로그인·데이터 동기화, Claude API 기반 튜터·자소서 도우미, PWA 설치와 모바일 반응형을 구현했다',
  result: '',
  tags: ['React', 'Vite', 'Tailwind CSS', 'Supabase', 'Claude API', 'PWA'],
  url: '',
  score: '',
};

const uid = () => String(Date.now()) + Math.random().toString(36).slice(2, 6);

function fmtPeriod(item) {
  const t = TYPE_BY_ID[item.type];
  if (!t || t.date === 'none' || !item.start) return '';
  if (t.date === 'single') return item.start;
  return `${item.start} ~ ${item.end || '진행 중'}`;
}

function sortItems(list) {
  return [...list].sort((a, b) => {
    const sa = a.start || '', sb = b.start || '';
    if (sa !== sb) return sa < sb ? 1 : -1;
    return (b.createdAt || '') < (a.createdAt || '') ? -1 : 1;
  });
}

/* ───────────── Export ───────────── */
function line(label, value) {
  const v = String(value || '').trim();
  return v ? `- ${label}: ${v.replace(/\n/g, '\n  ')}` : null;
}

function buildMarkdown({ items, job, instruction }) {
  const out = [];
  if (instruction.trim()) out.push(instruction.trim(), '');
  if (job) {
    out.push('## 지원 공고');
    out.push(...[line('회사', job.company), line('직무', job.position || job.role), line('마감', job.deadline), line('공고 URL', job.url)].filter(Boolean));
    if (job.notes) out.push('', '### 공고 내용', job.notes.trim());
    out.push('');
  }
  out.push('## 경험 데이터', '');
  let n = 0;
  for (const t of TYPES) {
    const group = items.filter((i) => i.type === t.id);
    if (!group.length) continue;
    out.push(`### ${t.label}`, '');
    for (const it of group) {
      n += 1;
      out.push(`#### ${n}. ${it.title}`);
      out.push(...[
        line(t.orgLabel || '소속', it.org),
        line('역할', it.role),
        line(t.date === 'single' ? (t.dateLabel || '날짜') : '기간', fmtPeriod(it)),
        line('점수·등급', it.score),
        line('기술·키워드', (it.tags || []).join(', ')),
        line('한 줄 요약', it.summary),
        line('상황', it.situation),
        line('한 일', it.action),
        line('결과', it.result),
        line('링크', it.url),
      ].filter(Boolean), '');
    }
  }
  return out.join('\n').trim() + '\n';
}

function buildJson({ items, job, instruction }) {
  const clean = items.map(({ id, createdAt, ...rest }) => ({ ...rest, period: fmtPeriod(rest) }));
  return JSON.stringify({
    instruction: instruction.trim(),
    job: job ? { company: job.company, position: job.position || job.role, deadline: job.deadline, url: job.url, description: job.notes } : null,
    items: clean,
  }, null, 2);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

function ExportModal({ items, selectedCount, allCount, selectedItems, onClose }) {
  const jobs = useMemo(() => storage.get('mergee_jobs', []), []);
  const [scope, setScope] = useState(selectedCount > 0 ? 'selected' : 'all');
  const [jobId, setJobId] = useState('');
  const [format, setFormat] = useState('md');
  const [instruction, setInstruction] = useState(() => storage.get(PROMPT_KEY, DEFAULT_PROMPT));
  const [copied, setCopied] = useState(false);

  const target = scope === 'selected' ? selectedItems : items;
  const job = jobs.find((j) => j.id === jobId) || null;
  const text = format === 'md'
    ? buildMarkdown({ items: target, job, instruction })
    : buildJson({ items: target, job, instruction });

  const saveInstruction = (v) => { setInstruction(v); storage.set(PROMPT_KEY, v); };

  const handleCopy = async () => {
    const ok = await copyText(text);
    setCopied(ok);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: format === 'md' ? 'text/markdown' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-800 text-base">LLM용으로 내보내기</h3>
            <p className="text-xs text-gray-400 mt-0.5">복사해서 ChatGPT·Claude 등에 그대로 붙여넣으세요</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none p-1">✕</button>
        </div>

        <div className="px-5 pb-3 overflow-y-auto space-y-4 flex-1 min-h-0">
          {/* Scope */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">내보낼 항목</p>
            <div className="flex gap-2 flex-wrap">
              {selectedCount > 0 && (
                <button onClick={() => setScope('selected')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full ${scope === 'selected' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  선택한 항목 ({selectedCount})
                </button>
              )}
              <button onClick={() => setScope('all')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${scope === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                전체 ({allCount})
              </button>
            </div>
          </div>

          {/* Job */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">지원 공고 함께 넣기 <span className="font-normal text-gray-400">(선택)</span></p>
            <select value={jobId} onChange={(e) => setJobId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="">공고 없이 내보내기</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.company}{(j.position || j.role) ? ` · ${j.position || j.role}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Instruction */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">맨 위 지시문 <span className="font-normal text-gray-400">(수정하면 저장돼요)</span></p>
            <textarea value={instruction} onChange={(e) => saveInstruction(e.target.value)} rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
            {instruction !== DEFAULT_PROMPT && (
              <button onClick={() => saveInstruction(DEFAULT_PROMPT)} className="text-[11px] text-gray-400 hover:text-gray-600 mt-1">기본 지시문으로 되돌리기</button>
            )}
          </div>

          {/* Format */}
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-500 mr-1">형식</p>
            {[['md', '마크다운'], ['json', 'JSON']].map(([id, label]) => (
              <button key={id} onClick={() => setFormat(id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${format === id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</button>
            ))}
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-500">미리보기</p>
              <p className="text-[11px] text-gray-400">{text.length.toLocaleString()}자 · {target.length}개 항목</p>
            </div>
            <textarea readOnly value={text} rows={9}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-gray-50 text-gray-600 focus:outline-none resize-none" />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={handleDownload} disabled={!target.length}
            className="flex-1 h-11 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">파일로 저장</button>
          <button onClick={handleCopy} disabled={!target.length}
            className="flex-[2] h-11 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 disabled:opacity-40">
            {copied ? '복사됐어요 ✓' : '클립보드에 복사'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Item form ───────────── */
function Field({ label, hint, dot, children, className = '' }) {
  return (
    <div className={className}>
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 mb-1.5">
        {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
        {label}
        {hint && <span className="font-normal text-gray-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-300 '
  + 'focus:outline-none focus:bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition';

const TYPE_HINT = {
  project: '만든 것, 해결한 문제를 정리해요',
  cert: '자격증·어학 성적을 기록해요',
  activity: '인턴·동아리·대외활동·교육 경험이에요',
  award: '수상·표창 내역이에요',
  link: '대표 링크를 모아두세요',
};

function ItemModal({ item, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(() => ({ ...EMPTY, ...(item || {}) }));
  const [tagsText, setTagsText] = useState((item?.tags || []).join(', '));
  const [confirmDel, setConfirmDel] = useState(false);
  const t = TYPE_BY_ID[form.type];
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const tags = tagsText.split(',').map((s) => s.trim()).filter(Boolean);
    onSave({ ...form, title: form.title.trim(), tags, id: item?.id || uid(), createdAt: item?.createdAt || new Date().toISOString() });
    onClose();
  };

  const isStar = t.star;
  const top = [];
  if (t.orgLabel) top.push(<Field key="org" label={t.orgLabel}><input className={inputCls} value={form.org} onChange={set('org')} /></Field>);
  if (isStar) top.push(<Field key="role" label="역할"><input className={inputCls} value={form.role} onChange={set('role')} placeholder="예: 팀장, 백엔드 개발" /></Field>);
  if (t.score) top.push(<Field key="score" label="점수·등급"><input className={inputCls} value={form.score} onChange={set('score')} placeholder="예: 합격, IM2, 850점" /></Field>);
  if (t.date === 'single') top.push(<Field key="date" label={t.dateLabel || '날짜'}><input className={inputCls} type="month" value={form.start} onChange={set('start')} /></Field>);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-6">
      <form onSubmit={submit} className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 sm:px-7 pt-5 sm:pt-6 pb-4 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-lg tracking-tight">{item ? '항목 편집' : '새 항목 추가'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{TYPE_HINT[form.type]}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기"
            className="w-8 h-8 -mr-1.5 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">✕</button>
        </div>

        {/* Type selector — one row */}
        <div className="px-5 sm:px-7 pb-4 flex-shrink-0">
          <div className="grid grid-cols-5 gap-1 bg-gray-100 rounded-2xl p-1">
            {TYPES.map((x) => (
              <button type="button" key={x.id} onClick={() => setForm((p) => ({ ...p, type: x.id }))}
                className={'flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all '
                  + (form.type === x.id ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600')}>
                <span className="text-base sm:text-sm leading-none">{x.emoji}</span>
                <span>{x.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-7 pb-5 overflow-y-auto space-y-4 flex-1 min-h-0">
          <Field label={form.type === 'link' ? '이름 *' : '제목 *'}>
            <input className={inputCls + ' !py-3 font-medium'} value={form.title} onChange={set('title')} required autoFocus
              placeholder={form.type === 'cert' ? '예: ADsP' : form.type === 'link' ? '예: GitHub' : form.type === 'award' ? '예: 교내 해커톤 장려상' : '예: 스터디 매니저 앱'} />
          </Field>

          {form.type === 'link' && (
            <Field label="URL *">
              <input className={inputCls} type="url" value={form.url} onChange={set('url')} required placeholder="https://..." />
            </Field>
          )}

          {top.length > 0 && (
            <div className={'grid grid-cols-1 gap-3 ' + (top.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>{top}</div>
          )}

          {t.date === 'range' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="시작"><input className={inputCls} type="month" value={form.start} onChange={set('start')} /></Field>
              <Field label="종료" hint="비우면 진행 중"><input className={inputCls} type="month" value={form.end} onChange={set('end')} /></Field>
            </div>
          )}

          <Field label={form.type === 'link' ? '메모' : '한 줄 요약'}>
            <input className={inputCls} value={form.summary} onChange={set('summary')}
              placeholder={form.type === 'link' ? '' : '이 경험을 한 문장으로'} />
          </Field>

          {isStar && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-3.5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">상세 · 자소서의 근거가 돼요</p>
              <Field label="상황" hint="어떤 문제·배경이었나" dot="#f59e0b">
                <textarea className={inputCls + ' resize-none'} rows={2} value={form.situation} onChange={set('situation')} />
              </Field>
              <Field label="한 일" hint="내가 무엇을 했나" dot="#6366f1">
                <textarea className={inputCls + ' resize-none'} rows={3} value={form.action} onChange={set('action')} />
              </Field>
              <Field label="결과" hint="숫자로 적을수록 좋아요" dot="#10b981">
                <textarea className={inputCls + ' resize-none'} rows={2} value={form.result} onChange={set('result')} placeholder="예: 처리 시간 40% 단축, 사용자 120명" />
              </Field>
            </div>
          )}

          {(t.tags || form.type !== 'link') && (
            <div className={'grid grid-cols-1 gap-3 ' + (t.tags && form.type !== 'link' ? 'sm:grid-cols-2' : '')}>
              {t.tags && (
                <Field label="기술·키워드" hint="쉼표로 구분">
                  <input className={inputCls} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="React, SQL, 협업" />
                </Field>
              )}
              {form.type !== 'link' && (
                <Field label="링크">
                  <input className={inputCls} type="url" value={form.url} onChange={set('url')} placeholder="GitHub, 배포, 노션 주소" />
                </Field>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 sm:px-7 py-4 border-t border-gray-100 bg-white flex-shrink-0">
          {item && (
            confirmDel ? (
              <button type="button" onClick={() => { onDelete(item.id); onClose(); }}
                className="h-11 px-4 rounded-xl text-sm font-semibold bg-red-500 text-white">정말 삭제</button>
            ) : (
              <button type="button" onClick={() => setConfirmDel(true)}
                className="h-11 px-4 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">삭제</button>
            )
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose}
            className="h-11 px-5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors hidden sm:block">취소</button>
          <button type="submit" className="h-11 flex-1 sm:flex-none sm:px-10 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 active:scale-[0.98] transition-all">저장</button>
        </div>
      </form>
    </div>
  );
}

/* ───────────── Import (external LLM result or in-app AI) ───────────── */
const SCHEMA_PROMPT = '아래 [내 자료]는 내가 지금까지 한 프로젝트·자격·활동·수상·링크에 대한 메모다. 이를 항목별로 분리해서 JSON 배열로만 출력해라. 설명이나 코드블록 표시(백틱) 없이 JSON만 출력해라.\n\n'
  + '항목 형식:\n{"type":"project|activity|cert|award|link","title":"","org":"","role":"","start":"YYYY-MM","end":"YYYY-MM","summary":"한 줄 요약","situation":"","action":"","result":"","tags":[],"url":"","score":""}\n\n'
  + '규칙:\n'
  + '1. 자료에 없는 사실·수치는 절대 만들지 말고, 모르면 빈 문자열로 둔다.\n'
  + '2. 숫자와 고유명사는 원문 그대로 유지한다.\n'
  + '3. project·activity는 가능하면 situation(상황)·action(내가 한 일)·result(결과, 숫자 포함)로 나눈다.\n'
  + '4. cert(자격·어학)는 start에 취득월, score에 점수·등급을 넣고, award(수상)는 start에 수상월을 넣는다.\n'
  + '5. 진행 중이면 end는 빈 문자열로 둔다. 날짜는 YYYY-MM 형식으로 쓴다.\n'
  + '6. tags에는 기술·키워드를 넣는다.\n\n'
  + '[내 자료]\n(여기에 자료를 붙여넣기)\n';

function parseItemsFromText(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const tryParse = (str) => { try { return JSON.parse(str); } catch { return null; } };
  const arr = cleaned.match(/\[[\s\S]*\]/);
  let parsed = arr ? tryParse(arr[0]) : null;
  if (!Array.isArray(parsed)) {
    const obj = cleaned.match(/\{[\s\S]*\}/);
    const o = obj ? tryParse(obj[0]) : null;
    parsed = Array.isArray(o?.items) ? o.items : null;
  }
  if (!Array.isArray(parsed)) throw new Error('JSON을 읽지 못했어요. 외부 LLM이 출력한 내용 전체를 그대로 붙여넣어 주세요.');
  return parsed;
}

function normalizeItems(list) {
  return list
    .filter((x) => x && typeof x === 'object' && x.title)
    .map((x) => ({
      ...EMPTY, ...x,
      type: TYPE_BY_ID[x.type] ? x.type : 'activity',
      tags: Array.isArray(x.tags) ? x.tags.map(String) : [],
      id: uid(), createdAt: new Date().toISOString(),
    }));
}

function ImportModal({ apiKey, existing, onAdd, onClose }) {
  const [mode, setMode] = useState('paste'); // 'paste' = external LLM result, 'ai' = in-app
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState(null);
  const [checked, setChecked] = useState({});
  const [copied, setCopied] = useState(false);

  const isDup = (x) => existing.some((e) => e.type === x.type && e.title.trim().toLowerCase() === x.title.trim().toLowerCase());

  const showFound = (list) => {
    if (!list.length) { setError('항목을 찾지 못했어요. 내용을 확인해 주세요.'); return; }
    setFound(list);
    setChecked(Object.fromEntries(list.map((x) => [x.id, !isDup(x)])));
  };

  const loadPasted = () => {
    setError('');
    try { showFound(normalizeItems(parseItemsFromText(text))); }
    catch (e) { setError(e.message); }
  };

  const runAi = async () => {
    if (!text.trim()) return;
    if (!apiKey && !isDemoMode()) { setError('Claude API 키가 필요해요. 설정에서 키를 입력해주세요.'); return; }
    setError(''); setLoading(true);
    try { showFound(normalizeItems(await structurePortfolio(apiKey, text))); }
    catch (e) { setError(e.message || '정리에 실패했어요.'); }
    setLoading(false);
  };

  const copyPrompt = async () => {
    const ok = await copyText(SCHEMA_PROMPT);
    setCopied(ok);
    setTimeout(() => setCopied(false), 1800);
  };

  const switchMode = (m) => { setMode(m); setText(''); setError(''); setFound(null); };
  const save = () => { onAdd(found.filter((x) => checked[x.id])); onClose(); };
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-800 text-base">자료 한꺼번에 가져오기</h3>
            <p className="text-xs text-gray-400 mt-0.5">직접 입력하지 않고 정리된 결과를 불러와요</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none p-1">✕</button>
        </div>

        {!found && (
          <div className="px-5 pb-3 flex gap-1.5 flex-shrink-0">
            {[['paste', '외부 LLM 결과 붙여넣기'], ['ai', '앱에서 AI로 정리']].map(([id, label]) => (
              <button key={id} onClick={() => switchMode(id)}
                className={'text-xs font-semibold px-3 py-1.5 rounded-full ' + (mode === id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500')}>{label}</button>
            ))}
          </div>
        )}

        <div className="px-5 pb-4 overflow-y-auto space-y-3 flex-1 min-h-0">
          {!found && mode === 'paste' && (
            <>
              <div className="bg-gray-50 rounded-xl p-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-gray-700 break-keep">① 프롬프트를 복사해서 ChatGPT·Claude 등에 붙여넣고, 맨 아래에 내 자료를 넣어요</p>
                <button onClick={copyPrompt} className="h-9 px-3.5 text-xs font-semibold bg-[#111] text-white rounded-xl">
                  {copied ? '복사됐어요 ✓' : '프롬프트 복사'}
                </button>
                <p className="text-[11px] text-gray-400 break-keep">이력서, 노션 글, 활동 메모 등을 통째로 넣어도 돼요. 결과로 JSON이 나와요.</p>
              </div>
              <p className="text-xs font-semibold text-gray-700 pt-1">② LLM이 출력한 결과를 그대로 붙여넣어요</p>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8}
                placeholder='[{"type":"project","title":"..."}, ...]'
                className={inputCls + ' resize-none font-mono text-xs'} />
              <p className="text-[11px] text-gray-400 break-keep">저장하기 전에 항목을 확인할 수 있고, 이미 있는 항목은 자동으로 체크가 꺼져요.</p>
            </>
          )}

          {!found && mode === 'ai' && (
            <>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10}
                placeholder="예) 2025.03~06 교내 데이터분석 공모전 팀장, SQL로 학생 이탈 원인 분석해서 대상 수상..."
                className={inputCls + ' resize-none'} />
              <p className="text-[11px] text-gray-400 break-keep">{text.length.toLocaleString()}자 · Claude API 키가 필요해요. 입력에 없는 내용은 채우지 않도록 했어요.</p>
            </>
          )}

          {found && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">{found.length}개 항목을 찾았어요. 저장할 것만 선택하세요. (저장 후 편집할 수 있어요)</p>
              {found.map((x) => (
                <label key={x.id} className="flex gap-3 items-start bg-gray-50 rounded-xl p-3 cursor-pointer">
                  <input type="checkbox" checked={!!checked[x.id]} onChange={() => setChecked((p) => ({ ...p, [x.id]: !p[x.id] }))} className="mt-1 accent-gray-900" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-400">
                      {TYPE_BY_ID[x.type].emoji} {TYPE_BY_ID[x.type].label}{fmtPeriod(x) ? ' · ' + fmtPeriod(x) : ''}
                      {isDup(x) && <span className="ml-1.5 text-amber-600">이미 있음</span>}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 break-keep">{x.title}</p>
                    {(x.org || x.role) && <p className="text-xs text-gray-500">{[x.org, x.role].filter(Boolean).join(' · ')}</p>}
                    {x.summary && <p className="text-xs text-gray-500 mt-0.5">{x.summary}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-500 break-keep">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          {!found ? (
            <button onClick={mode === 'paste' ? loadPasted : runAi}
              disabled={loading || !text.trim()}
              className="flex-1 h-11 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 disabled:opacity-40">
              {mode === 'paste' ? '불러오기' : loading ? '정리하는 중...' : '✦ AI로 정리'}
            </button>
          ) : (
            <>
              <button onClick={() => { setFound(null); setError(''); }} className="h-11 px-4 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600">다시</button>
              <button onClick={save} disabled={!checkedCount}
                className="flex-1 h-11 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 disabled:opacity-40">
                {checkedCount}개 저장
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Card ───────────── */
function Card({ item, selected, onToggle, onOpen }) {
  const t = TYPE_BY_ID[item.type];
  const period = fmtPeriod(item);
  return (
    <div className={`bg-white border rounded-2xl p-4 transition-colors ${selected ? 'border-gray-900' : 'border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label="내보내기 선택"
          className="mt-1 w-4 h-4 flex-shrink-0 accent-gray-900" />
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onOpen}>
          <p className="text-[11px] font-semibold text-gray-400">
            {t.emoji} {t.label}{period ? ` · ${period}` : ''}{item.score ? ` · ${item.score}` : ''}
          </p>
          <p className="font-semibold text-gray-900 text-[15px] mt-0.5 break-keep">{item.title}</p>
          {(item.org || item.role) && (
            <p className="text-[13px] text-gray-500 mt-0.5 break-keep">{[item.org, item.role].filter(Boolean).join(' · ')}</p>
          )}
          {item.summary && <p className="text-[13px] text-gray-600 mt-2 break-keep">{item.summary}</p>}
          {item.result && <p className="text-[12px] text-indigo-600 mt-1.5 break-keep">→ {item.result}</p>}
          {(item.tags?.length > 0 || item.url) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {(item.tags || []).map((tg) => (
                <span key={tg} className="text-[11px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tg}</span>
              ))}
              {item.url && (
                <a href={item.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                  className="text-[11px] font-semibold text-indigo-500 hover:underline">링크 ↗</a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Page ───────────── */
export default function Portfolio({ apiKey, stacks = [] }) {
  const [items, setItems] = useState(() => storage.get(KEY, []));
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null);   // item | 'new' | null
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const persist = (next) => { setItems(next); storage.set(KEY, next); };
  const upsert = (it) => persist(items.some((x) => x.id === it.id) ? items.map((x) => (x.id === it.id ? it : x)) : [it, ...items]);
  const remove = (id) => { persist(items.filter((x) => x.id !== id)); setSelected((p) => { const n = new Set(p); n.delete(id); return n; }); };
  const toggle = (id) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const counts = useMemo(() => Object.fromEntries(TYPES.map((t) => [t.id, items.filter((i) => i.type === t.id).length])), [items]);
  const visibleTypes = filter === 'all' ? TYPES : TYPES.filter((t) => t.id === filter);
  const selectedItems = items.filter((i) => selected.has(i.id));

  // Passed stacks that are not in the portfolio yet
  const passedCandidates = stacks.filter((s) => s.passed
    && !items.some((i) => i.type === 'cert' && i.title.trim().toLowerCase() === s.name.trim().toLowerCase()));

  const addPassedStacks = () => {
    const added = passedCandidates.map((s) => ({
      ...EMPTY, id: uid(), createdAt: new Date().toISOString(),
      type: 'cert', title: s.name, start: s.examDate ? s.examDate.slice(0, 7) : '', score: '합격',
    }));
    persist([...added, ...items]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3.5 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="font-semibold text-gray-800 text-sm">portfolio</h2>
          <span className="text-xs text-gray-400 whitespace-nowrap">{items.length}개</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => setShowImport(true)}
            className="h-9 px-3 text-xs font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 whitespace-nowrap">가져오기</button>
          <button onClick={() => setShowExport(true)} disabled={!items.length}
            className="h-9 px-3 text-xs font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 whitespace-nowrap disabled:opacity-40">내보내기</button>
          <button onClick={() => setEditing('new')}
            className="h-9 px-3.5 text-xs font-semibold bg-[#111] text-white rounded-xl hover:bg-gray-800 whitespace-nowrap">+ 추가</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border-b border-gray-100 px-2 md:px-6 flex gap-1 overflow-x-auto flex-shrink-0">
        {[{ id: 'all', label: '전체' }, ...TYPES].map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`px-3.5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              filter === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}>
            {t.label}
            <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-semibold">
              {t.id === 'all' ? items.length : counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="bg-gray-900 text-white px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
          <span className="text-xs font-semibold">{selected.size}개 선택됨</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-300 hover:text-white">선택 해제</button>
            <button onClick={() => setShowExport(true)} className="text-xs font-bold bg-white text-gray-900 px-3 py-1.5 rounded-lg">선택 항목 내보내기</button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-6">
          {passedCandidates.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between gap-3">
              <p className="text-[13px] text-indigo-700 break-keep">
                합격 처리한 스택 <b>{passedCandidates.map((s) => s.name).join(', ')}</b>을(를) 자격·어학에 추가할까요?
              </p>
              <button onClick={addPassedStacks} className="text-xs font-semibold bg-indigo-600 text-white px-3 py-2 rounded-xl whitespace-nowrap">추가</button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🗂️</div>
              <p className="text-gray-600 font-semibold text-sm">아직 정리된 항목이 없어요</p>
              <p className="text-gray-400 text-xs mt-1 break-keep">했던 일을 여기에 쌓아두면, 자소서 쓸 때 한 번에 내보낼 수 있어요</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center mt-5">
                <button onClick={() => setShowImport(true)} className="h-10 px-4 rounded-xl text-sm font-semibold bg-[#111] text-white">가져오기 (LLM 결과 붙여넣기)</button>
                <button onClick={() => upsert({ ...EMPTY, ...MERGEE_SEED, id: uid(), createdAt: new Date().toISOString() })}
                  className="h-10 px-4 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 bg-white">이 앱(mergee)을 첫 프로젝트로 추가</button>
              </div>
            </div>
          ) : (
            visibleTypes.map((t) => {
              const group = sortItems(items.filter((i) => i.type === t.id));
              if (!group.length) return null;
              return (
                <section key={t.id}>
                  {filter === 'all' && (
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5 px-1">{t.emoji} {t.label} · {group.length}</h3>
                  )}
                  <div className="grid gap-2.5 md:grid-cols-2">
                    {group.map((it) => (
                      <Card key={it.id} item={it} selected={selected.has(it.id)}
                        onToggle={() => toggle(it.id)} onOpen={() => setEditing(it)} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>

      {editing && (
        <ItemModal item={editing === 'new' ? null : editing} onSave={upsert} onDelete={remove} onClose={() => setEditing(null)} />
      )}
      {showImport && (
        <ImportModal apiKey={apiKey} existing={items} onAdd={(list) => persist([...list, ...items])} onClose={() => setShowImport(false)} />
      )}
      {showExport && (
        <ExportModal items={items} allCount={items.length} selectedCount={selected.size}
          selectedItems={selectedItems} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
