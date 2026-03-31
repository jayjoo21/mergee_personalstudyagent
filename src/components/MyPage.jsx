import React, { useState, useRef } from 'react';
import { supabase, hasSupabase } from '../utils/supabase';

export default function MyPage({
  user,
  apiKey,
  onSaveApiKey,
  stacks = [],
  conversations = {},
  studyActivity = {},
  tasks = [],
  onLogout,
}) {
  const [nickname, setNickname] = useState(() => localStorage.getItem('mergee_nickname') || '');
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');

  const [newApiKey, setNewApiKey] = useState(apiKey || '');
  const [showApiKeyValue, setShowApiKeyValue] = useState(false);

  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('mergee_notif') === 'true');

  const [resetStep, setResetStep] = useState(0);
  const [resetInput, setResetInput] = useState('');

  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteInput, setDeleteInput] = useState('');

  const [importMsg, setImportMsg] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const fileRef = useRef(null);

  /* ── helpers ── */
  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  };

  /* ── stats ── */
  const completedCerts = stacks.filter(s => s.passed).length;
  const totalStudyDays = Object.keys(studyActivity).length;
  const totalMessages = Object.values(conversations).reduce((s, msgs) => s + msgs.length, 0);
  const completedTasksCount = tasks.filter(t => t.done).length;

  const score = completedCerts * 4 + totalStudyDays + Math.floor(completedTasksCount / 2);
  const getLevel = () => {
    if (score >= 100) return { label: 'Merged', color: '#10b981', bg: 'bg-emerald-100 text-emerald-700' };
    if (score >= 50) return { label: 'Senior Dev', color: '#6366f1', bg: 'bg-indigo-100 text-indigo-700' };
    if (score >= 20) return { label: 'Mid Dev', color: '#f59e0b', bg: 'bg-amber-100 text-amber-700' };
    return { label: 'Junior Dev', color: '#64748b', bg: 'bg-gray-100 text-gray-600' };
  };
  const level = getLevel();

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  /* ── handlers ── */
  const saveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    setNickname(trimmed);
    localStorage.setItem('mergee_nickname', trimmed);
    setEditingNickname(false);
    showToast('닉네임이 저장됐어요');
  };

  const handleSaveApiKey = () => {
    onSaveApiKey(newApiKey.trim());
    showToast('API 키가 저장됐어요');
  };

  const toggleNotif = async () => {
    if (!notifEnabled) {
      if (!('Notification' in window)) { showToast('이 브라우저는 알림을 지원하지 않아요'); return; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { showToast('알림 권한이 거부됐어요'); return; }
    }
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem('mergee_notif', String(next));
    showToast(next ? '알림이 활성화됐어요' : '알림이 비활성화됐어요');
  };

  const handleDataReset = () => {
    if (resetStep === 0) { setResetStep(1); return; }
    if (resetStep === 1) { setResetInput(''); setResetStep(2); return; }
    if (resetInput !== '초기화') return;
    const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('mergee_'));
    keysToRemove.forEach(k => localStorage.removeItem(k));
    showToast('데이터가 초기화됐어요. 새로고침합니다...');
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleExport = () => {
    const data = {};
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('mergee_')) {
        try { data[k] = JSON.parse(localStorage.getItem(k)); }
        catch { data[k] = localStorage.getItem(k); }
      }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mergee_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('백업 파일을 다운로드했어요');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        Object.entries(data).forEach(([k, v]) => {
          if (k.startsWith('mergee_')) localStorage.setItem(k, JSON.stringify(v));
        });
        setImportMsg('가져오기 완료! 새로고침합니다...');
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        setImportMsg('올바른 JSON 파일이 아닙니다.');
        setTimeout(() => setImportMsg(''), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteAccount = async () => {
    if (deleteStep === 0) { setDeleteStep(1); return; }
    if (deleteInput !== '탈퇴') return;
    const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('mergee_'));
    keysToRemove.forEach(k => localStorage.removeItem(k));
    await onLogout();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9fa]">
      <div className="max-w-xl mx-auto px-6 py-8 space-y-5">

        {/* ── Profile ── */}
        <Section title="프로필">
          <div className="space-y-4">
            {/* Email */}
            <Field label="이메일">
              <span className="text-sm text-gray-700">{user?.email || '로그인 전'}</span>
            </Field>

            {/* Nickname */}
            <Field label="닉네임">
              {editingNickname ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nicknameInput}
                    onChange={e => setNicknameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveNickname(); if (e.key === 'Escape') setEditingNickname(false); }}
                    placeholder="닉네임 입력..."
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                  <button onClick={saveNickname} className="text-xs font-semibold text-white bg-gray-900 px-3 py-1.5 rounded-xl hover:bg-gray-700 transition-colors">저장</button>
                  <button onClick={() => setEditingNickname(false)} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">취소</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">{nickname || '—'}</span>
                  <button
                    onClick={() => { setNicknameInput(nickname); setEditingNickname(true); }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                  >편집</button>
                </div>
              )}
            </Field>

            {/* Join date */}
            {joinDate && (
              <Field label="가입일">
                <span className="text-sm text-gray-700">{joinDate}</span>
              </Field>
            )}
          </div>
        </Section>

        {/* ── Merge 현황 ── */}
        <Section title="Merge 현황">
          <div className="mb-4">
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full ${level.bg}`}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: level.color }} />
              {level.label}
            </span>
            <p className="text-[11px] text-gray-400 mt-1.5">점수 {score}점 · 다음 레벨까지 {level.label === 'Merged' ? '최고 레벨!' : `${level.label === 'Junior Dev' ? 20 - score : level.label === 'Mid Dev' ? 50 - score : 100 - score}점`}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="공부 일수" value={totalStudyDays} unit="일" />
            <StatCard label="완료 자격증" value={completedCerts} unit="개" />
            <StatCard label="총 메시지" value={totalMessages} unit="개" />
            <StatCard label="완료 태스크" value={completedTasksCount} unit="개" />
          </div>
        </Section>

        {/* ── 설정 ── */}
        <Section title="설정">
          <div className="space-y-5">
            {/* API Key */}
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Claude API 키</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showApiKeyValue ? 'text' : 'password'}
                    value={newApiKey}
                    onChange={e => setNewApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 pr-10"
                  />
                  <button
                    onClick={() => setShowApiKeyValue(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
                  >
                    {showApiKeyValue
                      ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
                <button
                  onClick={handleSaveApiKey}
                  disabled={!newApiKey.trim() || newApiKey.trim() === apiKey}
                  className="px-3 py-2 text-xs font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  저장
                </button>
              </div>
            </div>

            {/* Browser notifications */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">브라우저 알림</p>
                <p className="text-xs text-gray-400 mt-0.5">D-day 알림 등 브라우저 푸시 알림</p>
              </div>
              <button
                onClick={toggleNotif}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${notifEnabled ? 'bg-indigo-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Data reset */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">데이터 초기화</p>
              <p className="text-xs text-gray-400 mb-2">모든 스택, 태스크, 대화 내역이 삭제됩니다.</p>
              {resetStep === 0 && (
                <button onClick={handleDataReset} className="text-xs font-semibold text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-xl transition-colors">
                  데이터 초기화
                </button>
              )}
              {resetStep === 1 && (
                <div className="flex gap-2">
                  <button onClick={handleDataReset} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-xl transition-colors">
                    정말 초기화할게요
                  </button>
                  <button onClick={() => setResetStep(0)} className="text-xs font-semibold text-gray-400 hover:text-gray-600 px-3 py-1.5 border border-gray-200 rounded-xl transition-colors">취소</button>
                </div>
              )}
              {resetStep === 2 && (
                <div className="space-y-2">
                  <p className="text-xs text-red-500 font-semibold">아래에 <span className="font-black">"초기화"</span>를 입력하세요.</p>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={resetInput}
                      onChange={e => setResetInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleDataReset()}
                      placeholder="초기화"
                      className="flex-1 text-sm border border-red-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-200"
                    />
                    <button
                      onClick={handleDataReset}
                      disabled={resetInput !== '초기화'}
                      className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-xl transition-colors disabled:opacity-40"
                    >
                      초기화
                    </button>
                    <button onClick={() => setResetStep(0)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 border border-gray-200 rounded-xl transition-colors">취소</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── 데이터 백업 ── */}
        <Section title="데이터 백업">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">전체 데이터 내보내기</p>
                <p className="text-xs text-gray-400 mt-0.5">JSON 파일로 백업합니다</p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-xl transition-colors"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                내보내기
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">데이터 가져오기</p>
                <p className="text-xs text-gray-400 mt-0.5">기존 백업 JSON으로 복구합니다</p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-xl transition-colors"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                </svg>
                가져오기
              </button>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>
            {importMsg && (
              <p className={`text-xs font-semibold ${importMsg.includes('완료') ? 'text-emerald-600' : 'text-red-500'}`}>{importMsg}</p>
            )}
          </div>
        </Section>

        {/* ── 계정 ── */}
        <Section title="계정">
          <div className="space-y-3">
            {/* Logout */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">로그아웃</p>
                <p className="text-xs text-gray-400 mt-0.5">{user?.email || '현재 세션'}</p>
              </div>
              <button
                onClick={onLogout}
                className="text-xs font-semibold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-xl transition-colors"
              >
                로그아웃
              </button>
            </div>

            {/* Delete account */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-red-500 mb-1">회원 탈퇴</p>
              <p className="text-xs text-gray-400 mb-2">모든 데이터가 삭제되고 계정이 비활성화됩니다.</p>
              {deleteStep === 0 && (
                <button onClick={handleDeleteAccount} className="text-xs font-semibold text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-xl transition-colors">
                  회원 탈퇴
                </button>
              )}
              {deleteStep === 1 && (
                <div className="space-y-2">
                  <p className="text-xs text-red-500">아래에 <span className="font-black">"탈퇴"</span>를 입력하면 탈퇴됩니다.</p>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={deleteInput}
                      onChange={e => setDeleteInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleDeleteAccount()}
                      placeholder="탈퇴"
                      className="flex-1 text-sm border border-red-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-200"
                    />
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteInput !== '탈퇴'}
                      className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-xl transition-colors disabled:opacity-40"
                    >
                      탈퇴
                    </button>
                    <button onClick={() => { setDeleteStep(0); setDeleteInput(''); }} className="text-xs text-gray-400 hover:text-gray-600 px-3 border border-gray-200 rounded-xl transition-colors">취소</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-xs font-semibold text-gray-400 w-16 flex-shrink-0 mt-0.5">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function StatCard({ label, value, unit }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-800 tabular-nums">
        {value.toLocaleString()}
        <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
      </p>
    </div>
  );
}
