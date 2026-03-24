export const getDday = (examDate) => {
  if (!examDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  exam.setHours(0, 0, 0, 0);
  return Math.floor((exam - today) / (1000 * 60 * 60 * 24));
};

export const formatDday = (dday) => {
  if (dday === null) return '';
  if (dday === 0) return 'D-day';
  if (dday < 0) return `D+${Math.abs(dday)}`;
  return `D-${dday}`;
};

export const getDdayBadgeClass = (dday) => {
  if (dday === null) return 'bg-gray-100 text-gray-400';
  if (dday <= 0) return 'bg-red-100 text-red-600';
  if (dday <= 7) return 'bg-red-50 text-red-500';
  if (dday <= 14) return 'bg-orange-100 text-orange-600';
  if (dday <= 30) return 'bg-yellow-100 text-yellow-600';
  return 'bg-green-100 text-green-600';
};

export const getDdayCardStyle = (dday) => {
  if (dday === null) return { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' };
  if (dday <= 0) return { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' };
  if (dday <= 7) return { bg: '#fff1f2', border: '#fda4af', text: '#e11d48' };
  if (dday <= 14) return { bg: '#fff7ed', border: '#fdba74', text: '#ea580c' };
  if (dday <= 30) return { bg: '#fefce8', border: '#fde047', text: '#ca8a04' };
  return { bg: '#f0fdf4', border: '#86efac', text: '#16a34a' };
};

export const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
};

export const getTodayStr = () => new Date().toISOString().split('T')[0];

export const getDateStr = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

/** Delulu-boosted pass probability: always hopeful */
export const calcPassProb = ({ progress = 0, examDate, streak = 0 }) => {
  const dday = getDday(examDate);
  let score = progress * 0.5;
  score += Math.min((streak || 0) * 1.5, 18);
  if (dday !== null) {
    if (dday > 60) score += 18;
    else if (dday > 30) score += 12;
    else if (dday > 14) score += 8;
    else if (dday > 7) score += 4;
  }
  // delulu boost: always be optimistic
  score += 8 + Math.random() * 10;
  return Math.min(99, Math.max(20, Math.round(score)));
};

export const getUserLevel = (points) => {
  if (points < 100) return { label: 'Junior Dev', color: '#6b7280', next: 100 };
  if (points < 300) return { label: 'Mid', color: '#3b82f6', next: 300 };
  if (points < 600) return { label: 'Senior', color: '#8b5cf6', next: 600 };
  return { label: 'Merged ✓', color: '#6366f1', next: null };
};

export const calcStudyPoints = (stacks, conversations, wrongNotes, streakData) => {
  let pts = 0;
  Object.values(conversations).forEach((msgs) => {
    pts += msgs.filter((m) => m.role === 'user').length * 2;
  });
  pts += (wrongNotes?.length || 0) * 5;
  pts += (streakData?.count || 0) * 3;
  stacks.forEach((s) => { pts += (s.progress || 0) * 0.3; });
  return Math.round(pts);
};
