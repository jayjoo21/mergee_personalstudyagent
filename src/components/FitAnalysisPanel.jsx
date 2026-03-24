import React, { useState } from 'react';
import { analyzeJobFitDetailed } from '../utils/claude';

const RATING_STYLE = {
  '준비완료': 'bg-green-100 text-green-700',
  '진행중': 'bg-blue-100 text-blue-700',
  '준비필요': 'bg-red-100 text-red-600',
  '소재있음': 'bg-purple-100 text-purple-700',
};

const TYPE_STYLE = {
  '자격증': 'text-indigo-500',
  '기술스택': 'text-gray-500',
  '우대사항': 'text-amber-500',
};

export default function FitAnalysisPanel({ job, stacks, resumeMaterials, apiKey, onAddToPlan }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addedStacks, setAddedStacks] = useState({});

  const load = async () => {
    if (!job.notes) return;
    setLoading(true);
    try {
      const result = await analyzeJobFitDetailed(apiKey, job.notes, stacks, resumeMaterials || []);
      setAnalysis(result);
    } catch {}
    setLoading(false);
  };

  const handleAddToPlan = (item) => {
    if (!item.stackId || !onAddToPlan) return;
    onAddToPlan({ [item.stackId]: 120 });
    setAddedStacks((prev) => ({ ...prev, [item.stackId]: true }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">fit analysis</p>
        {!analysis && !loading && (
          <button
            onClick={load}
            disabled={!job.notes}
            className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors disabled:opacity-40"
          >
            상세 분석 ✦
          </button>
        )}
        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-3 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            분석 중...
          </div>
        )}
      </div>

      {/* Basic fit score (before detailed analysis) */}
      {!analysis && job.fitScore != null && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">AI 적합도</span>
            <span className="text-sm font-black text-gray-800">{job.fitScore}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: job.fitScore + '%',
                background: job.fitScore >= 70 ? '#10b981' : job.fitScore >= 40 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
          {!job.notes && (
            <p className="text-[10px] text-gray-400 mt-1">공고 내용을 추가하면 키워드별 상세 분석을 받을 수 있어요</p>
          )}
        </div>
      )}

      {!analysis && !job.fitScore && !job.notes && (
        <p className="text-sm text-gray-400 text-center py-4">공고 내용을 추가하면 AI가 분석해드려요</p>
      )}

      {/* Detailed analysis */}
      {analysis && (
        <>
          {/* Score gauge */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600">종합 적합도</span>
              <span
                className="text-2xl font-black"
                style={{ color: analysis.fitScore >= 70 ? '#10b981' : analysis.fitScore >= 40 ? '#f59e0b' : '#ef4444' }}
              >
                {analysis.fitScore}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: analysis.fitScore + '%',
                  background: analysis.fitScore >= 70 ? '#10b981' : analysis.fitScore >= 40 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
          </div>

          {/* JD Keywords */}
          {analysis.keywords?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">JD 키워드 대조</p>
              <div className="space-y-1.5">
                {analysis.keywords.map((k, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-xl">
                    <span className={`text-[10px] font-bold w-14 flex-shrink-0 ${TYPE_STYLE[k.type] || 'text-gray-400'}`}>{k.type}</span>
                    <span className="text-xs font-semibold text-gray-800 flex-1 truncate">{k.name}</span>
                    {k.myProgress != null && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0">진도 {k.myProgress}%</span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${RATING_STYLE[k.rating] || 'bg-gray-100 text-gray-500'}`}>
                      {k.rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action items */}
          {analysis.actionItems?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">오늘의 액션</p>
              <div className="space-y-2">
                {analysis.actionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 bg-indigo-50 rounded-xl px-3 py-2.5 border border-indigo-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-indigo-800 leading-snug">{item.text}</p>
                      {item.gain > 0 && (
                        <span className="text-[10px] font-bold text-indigo-500">예상 적합도 +{item.gain}%</span>
                      )}
                    </div>
                    {item.stackId && onAddToPlan && (
                      <button
                        onClick={() => handleAddToPlan(item)}
                        disabled={addedStacks[item.stackId]}
                        className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                          addedStacks[item.stackId]
                            ? 'bg-green-100 text-green-600'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                        }`}
                      >
                        {addedStacks[item.stackId] ? '추가됨 ✓' : '플랜 추가'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setAnalysis(null)}
            className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            다시 분석
          </button>
        </>
      )}
    </div>
  );
}
