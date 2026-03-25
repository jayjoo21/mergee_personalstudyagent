import React from 'react';
import CounselingLog from './CounselingLog';

export default function CounselingPage({ counselingLogs, resumeMaterials, apiKey, onSave, onDelete }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">상담 로그</h2>
        <p className="text-sm text-gray-400 mt-0.5">취업 상담 기록 및 AI 분석</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <CounselingLog logs={counselingLogs} resumeMaterials={resumeMaterials} apiKey={apiKey} onSave={onSave} onDelete={onDelete} />
      </div>
    </div>
  );
}
