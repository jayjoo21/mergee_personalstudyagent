import React, { useState } from 'react';

export default function ApiKeyModal({ onSave, existingKey }) {
  const [key, setKey] = useState(existingKey || '');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);

  const validate = async () => {
    const trimmed = key.trim();
    if (!trimmed) { setError('API key is required'); return; }
    if (!trimmed.startsWith('sk-ant-')) { setError('invalid key format (expected sk-ant-...)'); return; }

    setTesting(true);
    setError('');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': trimmed,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      if (!res.ok) throw new Error('invalid');
      onSave(trimmed);
    } catch {
      setError('key validation failed — please check and try again');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-indigo-500 tracking-tight">mergee</h1>
          <p className="text-sm text-gray-400 mt-1">자격증 · 취업 통합 스터디 매니저</p>
        </div>

        <h2 className="text-base font-semibold text-gray-800 mb-1">Claude API key</h2>
        <p className="text-sm text-gray-400 mb-4 leading-relaxed">
          Anthropic console에서 발급한 API 키를 입력하세요.
          키는 브라우저 로컬에만 저장됩니다.
        </p>

        <input
          type="password"
          value={key}
          onChange={(e) => { setKey(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && validate()}
          placeholder="sk-ant-api03-..."
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
        />
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        <button
          onClick={validate}
          disabled={testing}
          className="w-full mt-4 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-medium rounded-2xl transition-colors text-sm"
        >
          {testing ? 'validating...' : 'get started →'}
        </button>

        {/* Demo mode */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => onSave('demo')}
            className="w-full py-2.5 border border-dashed border-indigo-300 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 text-sm font-medium rounded-2xl transition-colors"
          >
            🧪 try demo mode (no API key needed)
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-2">
            mock 응답으로 UI/기능 전체 테스트 가능 · 실제 AI 응답 없음
          </p>
        </div>

        <p className="text-xs text-center text-gray-400 mt-3">
          키가 없으신가요?{' '}
          <a
            href="https://console.anthropic.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 underline hover:text-indigo-600"
          >
            console.anthropic.com
          </a>
          에서 발급하세요
        </p>
      </div>
    </div>
  );
}
