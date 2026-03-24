import React, { useState } from 'react';
import { storage } from '../utils/storage';

const JOB_KEY = 'mergee_jobs';

export default function EmploymentTemperature({ stacks, resumeMaterials, streakData, counselingLogs }) {
  const [hoveredFactor, setHoveredFactor] = useState(null);

  const jobs = storage.get(JOB_KEY, []);
  const activeStacks = stacks.filter((s) => !s.passed);

  const avgProgress = activeStacks.length > 0
    ? activeStacks.reduce((sum, s) => sum + (s.progress || 0), 0) / activeStacks.length
    : 0;
  const f1 = Math.round(avgProgress);
  const matCount = (resumeMaterials || []).length;
  const f2 = Math.min(100, Math.round((matCount / 5) * 100));
  const streak = streakData?.count || 0;
  const f3 = Math.min(100, Math.round((streak / 7) * 100));
  const logCount = (counselingLogs || []).length;
  const f4 = Math.min(100, logCount === 0 ? 0 : 40 + Math.min(60, logCount * 15));
  const appliedCount = jobs.filter((j) => j.status !== '지원예정').length;
  const f5 = Math.min(100, Math.round((appliedCount / 3) * 100));

  const temp = Math.round(f1 * 0.3 + f2 * 0.2 + f3 * 0.2 + f4 * 0.15 + f5 * 0.15);

  const getMessage = () => {
    if (temp <= 30) return '아직 예열 중...';
    if (temp <= 50) return 'warming up.';
    if (temp <= 70) return 'getting hot.';
    if (temp <= 90) return 'almost there.';
    return 'ready to merge 🎉';
  };

  const getColor = () => {
    if (temp <= 30) return '#9ca3af';
    if (temp <= 50) return '#3b82f6';
    if (temp <= 70) return '#f59e0b';
    if (temp <= 90) return '#f97316';
    return '#ef4444';
  };

  const color = getColor();

  const factors = [
    { label: '자격증 진도율', weight: 30, score: f1, detail: `평균 ${f1}% · ${activeStacks.length}개 스택` },
    { label: '자소서 소재', weight: 20, score: f2, detail: `${matCount}개 저장 (5개 기준 100%)` },
    { label: '공부 streak', weight: 20, score: f3, detail: `연속 ${streak}일 (7일 기준)` },
    { label: '상담 피드백', weight: 15, score: f4, detail: `상담 로그 ${logCount}건` },
    { label: 'Job Board', weight: 15, score: f5, detail: `활성 공고 ${appliedCount}건 (3건 기준)` },
  ];

  return (
    <div
      className="rounded-2xl p-5 h-full flex flex-col"
      style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)' }}
    >
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">merge temperature</p>

      {/* Thermometer + number */}
      <div className="flex items-center gap-4 mb-4">
        {/* Vertical thermometer */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <span className="text-[9px] text-gray-300 font-medium">100°</span>
          <div className="relative w-5 flex-1" style={{ minHeight: '70px' }}>
            <div className="absolute inset-0 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000"
                style={{ height: temp + '%', backgroundColor: color }}
              />
            </div>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white transition-all duration-1000 flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {temp}°
          </div>
          <span className="text-[9px] text-gray-300 font-medium">0°</span>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p
            className="text-2xl font-black leading-none mb-1"
            style={{ color }}
          >
            {temp}°
          </p>
          <p className="text-xs font-semibold text-gray-600 leading-snug">{getMessage()}</p>
        </div>
      </div>

      {/* Factor bars */}
      <div className="flex-1 space-y-2.5">
        {factors.map((f, i) => (
          <div
            key={i}
            className="relative"
            onMouseEnter={() => setHoveredFactor(i)}
            onMouseLeave={() => setHoveredFactor(null)}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] text-gray-500 flex-1 truncate">{f.label}</span>
              <span className="text-[10px] font-semibold text-gray-400 flex-shrink-0">{f.weight}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-1.5 rounded-full transition-all duration-700"
                style={{ width: f.score + '%', backgroundColor: color }}
              />
            </div>
            {hoveredFactor === i && (
              <div className="absolute left-0 -top-8 bg-gray-900 text-white text-[10px] px-2.5 py-1 rounded-lg whitespace-nowrap z-20 pointer-events-none shadow-lg">
                {f.detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
