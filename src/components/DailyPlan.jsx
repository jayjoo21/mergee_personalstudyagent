import React, { useState, useEffect, useCallback } from 'react';
import { getTodayMission } from '../utils/claude';
import { storage } from '../utils/storage';
import { getTodayStr } from '../utils/helpers';

const PLAN_STORAGE_KEY = 'mergee_daily_plan';

const PRIORITY_STYLES = {
  high: { badge: 'bg-red-50 text-red-600', dot: '#ef4444' },
  medium: { badge: 'bg-yellow-50 text-yellow-600', dot: '#f59e0b' },
  low: { badge: 'bg-gray-100 text-gray-500', dot: '#9ca3af' },
};

/**
 * Parse a duration string and return estimated minutes.
 * e.g. "2시간" → 120, "1시간 30분" → 90, "45분" → 45, "1.5 hours" → 90
 */
const parseDurationToMinutes = (duration) => {
  if (!duration) return 0;
  let total = 0;
  // Korean hours
  const hoursKo = duration.match(/(\d+(?:\.\d+)?)\s*시간/);
  if (hoursKo) total += Math.round(parseFloat(hoursKo[1]) * 60);
  // Korean minutes
  const minsKo = duration.match(/(\d+)\s*분/);
  if (minsKo) total += parseInt(minsKo[1], 10);
  // English "X hours"
  if (total === 0) {
    const hoursEn = duration.match(/(\d+(?:\.\d+)?)\s*hour/i);
    if (hoursEn) total += Math.round(parseFloat(hoursEn[1]) * 60);
    const minsEn = duration.match(/(\d+)\s*min/i);
    if (minsEn) total += parseInt(minsEn[1], 10);
  }
  // Fallback: grab first number, treat as minutes if < 10, else minutes
  if (total === 0) {
    const num = duration.match(/\d+/);
    if (num) total = parseInt(num[0], 10);
  }
  return total;
};

const SkeletonRow = () => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 animate-pulse">
    <div className="w-12 h-5 bg-gray-100 rounded-full mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <div className="h-4 bg-gray-100 rounded w-1/3" />
      <div className="h-3 bg-gray-100 rounded w-3/4" />
    </div>
    <div className="w-14 h-4 bg-gray-100 rounded flex-shrink-0" />
  </div>
);

export default function DailyPlan({ stacks, apiKey, onAcceptPlan, onNavigateToStack }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [done, setDone] = useState(new Set());

  const toggleDone = (i) => setDone((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  const activeStacks = (stacks || []).filter((s) => !s.passed);

  const loadOrGenerate = useCallback(
    async (force = false) => {
      const today = getTodayStr();

      // Check cache unless forced
      if (!force) {
        const cached = storage.get(PLAN_STORAGE_KEY);
        if (cached && cached.date === today && Array.isArray(cached.plan) && cached.plan.length > 0) {
          setPlan(cached.plan);
          return;
        }
      }

      if (!apiKey) return;
      if (activeStacks.length === 0) {
        setPlan([]);
        return;
      }

      setLoading(true);
      setError(null);
      setAccepted(false);

      try {
        const result = await getTodayMission(apiKey, activeStacks);

        // Enrich with stackId and goalMinutes
        const enriched = (result || []).map((item) => {
          const matched = activeStacks.find(
            (s) => s.name === item.stack || (item.stack && s.name.includes(item.stack))
          );
          return {
            ...item,
            stackId: matched?.id || null,
            goalMinutes: parseDurationToMinutes(item.duration),
          };
        });

        setPlan(enriched);
        storage.set(PLAN_STORAGE_KEY, { date: today, plan: enriched });
      } catch (e) {
        setError(e.message || 'Failed to generate plan');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiKey, JSON.stringify(activeStacks.map((s) => s.id))]
  );

  // On mount: load from cache or generate
  useEffect(() => {
    loadOrGenerate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = () => {
    if (!plan || plan.length === 0) return;
    const timerGoals = {};
    plan.forEach((item) => {
      if (item.stackId && item.goalMinutes > 0) {
        timerGoals[item.stackId] = item.goalMinutes;
      }
    });
    setAccepted(true);
    onAcceptPlan?.(timerGoals);
  };

  const handleRegenerate = () => {
    loadOrGenerate(true);
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            today's plan
          </span>
          {plan && plan.length > 0 && !loading && (
            <span className="text-xs text-gray-400">
              · {done.size}/{plan.length}
            </span>
          )}
        </div>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded-lg hover:bg-gray-50"
        >
          <svg
            className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h5M20 20v-5h-5M4.93 15A9 9 0 1 0 6.5 6.5L4 9"
            />
          </svg>
          regenerate
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : error ? (
        <div className="py-4 text-center">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button
            onClick={handleRegenerate}
            className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
          >
            try again
          </button>
        </div>
      ) : !plan || plan.length === 0 ? (
        <div className="py-6 text-center text-gray-400 text-sm">
          {activeStacks.length === 0
            ? 'Add a study stack to generate your daily plan.'
            : !apiKey
            ? 'Set your API key to auto-generate a daily plan.'
            : 'No plan generated yet.'}
        </div>
      ) : (
        <div>
          {plan.map((item, i) => {
            const pStyle = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.low;
            const isDone = done.has(i);
            return (
              <div
                key={i}
                className={`flex items-start gap-3 py-3.5 border-b border-gray-50 last:border-0 transition-opacity duration-150 ${isDone ? 'opacity-50' : ''}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleDone(i)}
                  className={`flex-shrink-0 w-4.5 h-4.5 mt-0.5 rounded border transition-all duration-150 flex items-center justify-center ${
                    isDone ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ width: '18px', height: '18px', borderRadius: '5px' }}
                >
                  {isDone && (
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Priority badge */}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${pStyle.badge}`}>
                  {item.priority || 'low'}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold text-gray-800 leading-tight ${isDone ? 'line-through' : ''}`}>
                    {item.stack}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                    {item.mission}
                  </p>
                  {item.duration && (
                    <span className="text-[11px] text-gray-400 mt-1 block">{item.duration}</span>
                  )}
                </div>

                {/* 시작하기 button */}
                {item.stackId && onNavigateToStack && (
                  <button
                    onClick={() => onNavigateToStack(item.stackId)}
                    className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-900 hover:text-white rounded-xl transition-all duration-150 whitespace-nowrap"
                  >
                    시작 →
                  </button>
                )}
              </div>
            );
          })}

          {/* Accept / Accepted button */}
          <div className="mt-4">
            {accepted ? (
              <button
                disabled
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-green-50 text-green-600 cursor-default flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                plan set
              </button>
            ) : (
              <button
                onClick={handleAccept}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#111] text-white hover:bg-gray-800 transition-all duration-150 active:scale-95 hover:scale-[1.01]"
              >
                accept plan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
