import React, { useState, useMemo } from 'react';

export default function MentalMeter({ stacks, studyActivity, streakData }) {
  const [dismissed, setDismissed] = useState([]);

  const alerts = useMemo(() => {
    const today = new Date();
    const result = [];

    const getDayKey = (offset) => {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      return d.toISOString().split('T')[0];
    };

    const last7Activity = Array.from({ length: 7 }, (_, i) => studyActivity[getDayKey(i)] || 0);
    const last30Activity = Array.from({ length: 30 }, (_, i) => studyActivity[getDayKey(i)] || 0);

    const avg30 = last30Activity.reduce((a, b) => a + b, 0) / 30;
    const avg7 = last7Activity.reduce((a, b) => a + b, 0) / 7;

    // 과부하 감지: 최근 7일 평균이 30일 평균보다 50% 이상 높음
    if (avg30 > 0 && avg7 > avg30 * 1.5) {
      result.push({
        id: 'overload',
        icon: '🌡️',
        color: 'amber',
        message: '이번 주 공부량이 평소보다 많아요. 오늘은 가볍게 복습만 해도 충분해요.',
      });
    }

    // 번아웃 감지: 최근 연속으로 기록 없는 날 3일 이상
    let inactiveDays = 0;
    for (let i = 0; i < 7; i++) {
      if ((studyActivity[getDayKey(i)] || 0) > 0) break;
      inactiveDays++;
    }
    if (inactiveDays >= 3) {
      result.push({
        id: 'burnout',
        icon: '🌿',
        color: 'blue',
        message: `잠깐 쉬어가도 괜찮아요. 오늘 30분만 해볼까요?`,
      });
    }

    // 위기 감지: D-7 이내 + 진도율 50% 이하
    stacks
      .filter((s) => !s.passed && s.examDate)
      .forEach((s) => {
        const dday = Math.ceil((new Date(s.examDate) - today) / 86400000);
        if (dday >= 0 && dday <= 7 && (s.progress || 0) < 50) {
          result.push({
            id: 'crisis_' + s.id,
            icon: '⚡',
            color: 'red',
            message: `${s.name} D-${dday}, 진도율 ${s.progress || 0}%. 지금부터 집중하면 충분히 가능해요.`,
          });
        }
      });

    return result;
  }, [stacks, studyActivity]);

  const visible = alerts.filter((a) => !dismissed.includes(a.id));
  if (!visible.length) return null;

  const colorMap = {
    amber: {
      wrap: 'bg-amber-50 border-amber-100',
      text: 'text-amber-800',
      btn: 'text-amber-400 hover:text-amber-600',
    },
    blue: {
      wrap: 'bg-blue-50 border-blue-100',
      text: 'text-blue-800',
      btn: 'text-blue-400 hover:text-blue-600',
    },
    red: {
      wrap: 'bg-red-50 border-red-100',
      text: 'text-red-800',
      btn: 'text-red-400 hover:text-red-600',
    },
  };

  return (
    <div className="space-y-2">
      {visible.map((alert) => {
        const c = colorMap[alert.color];
        return (
          <div key={alert.id} className={`flex items-start gap-3 px-4 py-3 rounded-2xl border ${c.wrap}`}>
            <span className="text-lg flex-shrink-0 mt-0.5">{alert.icon}</span>
            <p className={`flex-1 text-sm leading-snug ${c.text}`}>{alert.message}</p>
            <button
              onClick={() => setDismissed((prev) => [...prev, alert.id])}
              className={`flex-shrink-0 transition-colors ${c.btn} leading-none mt-0.5`}
              title="닫기"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
