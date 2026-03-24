import React, { useState } from 'react';

const CATEGORIES = ['학습 의지', '문제 해결', '성장 경험', '협업/소통', '기타'];

export default function ResumeMaterialModal({ content, onSave, onClose }) {
  const [category, setCategory] = useState('학습 의지');
  const [memo, setMemo] = useState('');

  const handleSave = () => {
    onSave({
      id: String(Date.now()),
      content: content.slice(0, 500),
      category,
      memo,
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-sm">자소서 소재 저장</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-lg leading-none">✕</button>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 max-h-24 overflow-y-auto">
          <p className="text-xs text-gray-500 leading-relaxed">{content.slice(0, 200)}{content.length > 200 ? '…' : ''}</p>
        </div>

        {/* Category */}
        <div className="mb-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">카테고리</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  category === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Memo */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">메모 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="이 소재를 저장하는 이유나 활용 계획..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all active:scale-95"
          >
            소재 저장
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
