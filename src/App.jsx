import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ChatArea from './components/ChatArea';
import WrongNotes from './components/WrongNotes';
import JobBoard from './components/JobBoard';
import Career from './components/Career';
import StackClash from './components/StackClash';
import WeakPointSniper from './components/WeakPointSniper';
import MergeReport from './components/MergeReport';
import AddStackModal from './components/AddStackModal';
import ApiKeyModal from './components/ApiKeyModal';
import ConfettiEffect from './components/ConfettiEffect';
import TopNav from './components/TopNav';
import CounselingPage from './components/CounselingPage';
import TasksPage from './components/TasksPage';
import DailyLogCalendar from './components/DailyLogCalendar';
import MyPage from './components/MyPage';
import HabitTracker from './components/HabitTracker';
import CampusLife from './components/CampusLife';
import { storage, KEYS, pullFromSupabase, setAuthUserId, enableDemoMode, disableDemoMode } from './utils/storage';
import { buildDemoStore } from './utils/demoData';
import { supabase, hasSupabase } from './utils/supabase';
import { extractWrongNote } from './utils/claude';
import { getTodayStr } from './utils/helpers';
import AuthModal from './components/AuthModal';

/* ─── Initial stacks ─── */
const INITIAL_STACKS = [
  {
    id: '1',
    name: 'OPIc',
    color: '#6366f1',
    examDate: '2026-04-26',
    systemPrompt:
      '당신은 OPIc 시험 전문 튜터입니다. 영어 말하기 실력 향상을 위한 스크립트 작성, 표현 교정, 주제별 답변 전략을 도와주세요. 한국어로 설명하되 영어 예시를 풍부하게 제공하세요.',
    progress: 0,
    passed: false,
  },
  {
    id: '2',
    name: '투자자산운용사',
    color: '#8b5cf6',
    examDate: '2026-06-14',
    systemPrompt:
      '당신은 투자자산운용사 시험 전문 튜터입니다. 금융투자, 펀드운용, 리스크관리 개념을 쉽게 설명하고 예상 문제를 출제해주세요.',
    progress: 0,
    passed: false,
  },
  {
    id: '3',
    name: 'AICE Basic',
    color: '#10b981',
    examDate: '2026-05-17',
    systemPrompt:
      '당신은 AICE Basic 시험 전문 튜터입니다. AI 기초 개념, 머신러닝, 데이터 분석 기초를 친절하게 설명해주세요.',
    progress: 0,
    passed: false,
  },
  {
    id: '4',
    name: 'PCSL',
    color: '#f59e0b',
    examDate: '2026-05-30',
    systemPrompt:
      '당신은 PCSL 시험 전문 튜터입니다. 파이썬 프로그래밍 문법과 실습 문제를 통해 코딩 실력 향상을 도와주세요.',
    progress: 0,
    passed: false,
  },
  {
    id: '5',
    name: 'ADsP',
    color: '#0ea5e9',
    examDate: '2026-04-05',
    systemPrompt:
      '당신은 ADsP 시험 전문 튜터입니다. 데이터 분석 준전문가 시험 대비를 위한 통계, 데이터 분석 기획, R/Python 기초를 설명해주세요.',
    progress: 0,
    passed: false,
  },
];

export default function App() {
  /* ─── Auth state ─── */
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(hasSupabase);
  const [showAuth, setShowAuth] = useState(false);

  /* ─── Persisted state ─── */
  const [apiKey, setApiKey] = useState(() => storage.get(KEYS.API_KEY, ''));
  const [stacks, setStacks] = useState(() => storage.get(KEYS.STACKS, INITIAL_STACKS));
  const [conversations, setConversations] = useState(() => storage.get(KEYS.CONVERSATIONS, {}));
  const [wrongNotes, setWrongNotes] = useState(() => storage.get(KEYS.WRONG_NOTES, []));
  const [studyActivity, setStudyActivity] = useState(() => storage.get(KEYS.STUDY_ACTIVITY, {}));
  const [streakData, setStreakData] = useState(() => storage.get(KEYS.STREAK, { count: 0, lastDate: null }));
  const [timerGoals, setTimerGoals] = useState(() => storage.get(KEYS.TIMER_GOALS, {}));
  const [resumeMaterials, setResumeMaterials] = useState(() => storage.get(KEYS.RESUME_MATERIALS, []));
  const [counselingLogs, setCounselingLogs] = useState(() => storage.get(KEYS.COUNSELING_LOGS, []));
  const [tasks, setTasks] = useState(() => storage.get(KEYS.TASKS, []));
  const [tags, setTags] = useState(() => storage.get(KEYS.TAGS, []));
  const [habits, setHabits] = useState(() => storage.get(KEYS.HABITS, []));
  const [timetable, setTimetable] = useState(() => storage.get(KEYS.TIMETABLE, []));
  const [habitLogs, setHabitLogs] = useState(() => storage.get(KEYS.HABIT_LOGS, {}));

  /* ─── Supabase Auth init ─── */
  useEffect(() => {
    if (!hasSupabase) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      if (u) setAuthUserId(u.id);
      setUser(u);
      setAuthLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setAuthUserId(u ? u.id : null);
      setUser(u);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Load / clear data when auth user changes ─── */
  useEffect(() => {
    if (!hasSupabase || authLoading) return;

    if (!user) {
      // Logged out — reset to defaults
      setStacks(INITIAL_STACKS);
      setConversations({});
      setWrongNotes([]);
      setStudyActivity({});
      setStreakData({ count: 0, lastDate: null });
      setTimerGoals({});
      setResumeMaterials([]);
      setCounselingLogs([]);
      setTasks([]);
      setTags([]);
      setStarted(false);
      setCurrentView('dashboard');
      return;
    }

    // Logged in — pull from Supabase then hydrate state
    pullFromSupabase().then(() => {
      setStacks(storage.get(KEYS.STACKS, INITIAL_STACKS));
      setConversations(storage.get(KEYS.CONVERSATIONS, {}));
      setWrongNotes(storage.get(KEYS.WRONG_NOTES, []));
      setStudyActivity(storage.get(KEYS.STUDY_ACTIVITY, {}));
      setStreakData(storage.get(KEYS.STREAK, { count: 0, lastDate: null }));
      setTimerGoals(storage.get(KEYS.TIMER_GOALS, {}));
      setResumeMaterials(storage.get(KEYS.RESUME_MATERIALS, []));
      setCounselingLogs(storage.get(KEYS.COUNSELING_LOGS, []));
      setTasks(storage.get(KEYS.TASKS, []));
      setTags(storage.get(KEYS.TAGS, []));
      setStarted(true);
      setShowAuth(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  /* ─── Demo mode ─── */
  const [isDemo, setIsDemo] = useState(false);

  /* ─── Landing / UI state ─── */
  // When Supabase is active, auth controls access — start as false
  const [started, setStarted] = useState(() => hasSupabase ? false : !!storage.get(KEYS.API_KEY, ''));
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedStackId, setSelectedStackId] = useState(null);
  const [showAddStack, setShowAddStack] = useState(false);
  const [editingStack, setEditingStack] = useState(null);
  const [showApiKey, setShowApiKey] = useState(() => !storage.get(KEYS.API_KEY, ''));
  const [mergedStack, setMergedStack] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  /* ─── Persist to localStorage ─── */
  useEffect(() => { storage.set(KEYS.STACKS, stacks); }, [stacks]);
  useEffect(() => { storage.set(KEYS.CONVERSATIONS, conversations); }, [conversations]);
  useEffect(() => { storage.set(KEYS.WRONG_NOTES, wrongNotes); }, [wrongNotes]);
  useEffect(() => { storage.set(KEYS.STUDY_ACTIVITY, studyActivity); }, [studyActivity]);
  useEffect(() => { storage.set(KEYS.STREAK, streakData); }, [streakData]);
  useEffect(() => { storage.set(KEYS.TIMER_GOALS, timerGoals); }, [timerGoals]);
  useEffect(() => { storage.set(KEYS.RESUME_MATERIALS, resumeMaterials); }, [resumeMaterials]);
  useEffect(() => { storage.set(KEYS.COUNSELING_LOGS, counselingLogs); }, [counselingLogs]);
  useEffect(() => { storage.set(KEYS.TASKS, tasks); }, [tasks]);
  useEffect(() => { storage.set(KEYS.TAGS, tags); }, [tags]);
  useEffect(() => { storage.set(KEYS.HABITS, habits); }, [habits]);
  useEffect(() => { storage.set(KEYS.TIMETABLE, timetable); }, [timetable]);
  useEffect(() => { storage.set(KEYS.HABIT_LOGS, habitLogs); }, [habitLogs]);

  /* ─── Study activity tracker ─── */
  const recordActivity = useCallback(() => {
    const today = getTodayStr();
    const yesterday = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    })();

    setStudyActivity((prev) => ({ ...prev, [today]: (prev[today] || 0) + 1 }));

    setStreakData((prev) => {
      if (prev.lastDate === today) return prev;
      if (!prev.lastDate || prev.lastDate === yesterday) {
        return { count: (prev.count || 0) + 1, lastDate: today };
      }
      return { count: 1, lastDate: today };
    });
  }, []);

  /* ─── API Key ─── */
  const handleSaveApiKey = (key) => {
    setApiKey(key);
    storage.set(KEYS.API_KEY, key);
    setShowApiKey(false);
    setStarted(true);
  };

  /* ─── Landing page ─── */
  const handleGetStarted = () => {
    if (hasSupabase) { setShowAuth(true); return; }
    setStarted(true);
    if (!apiKey) setShowApiKey(true);
  };

  const handleGoLanding = () => setStarted(false);

  /* ─── Demo mode ─── */
  const handleEnterDemo = () => {
    const store = buildDemoStore();
    enableDemoMode(store);
    setStacks(store[KEYS.STACKS] || INITIAL_STACKS);
    setTasks(store[KEYS.TASKS] || []);
    setTags(store[KEYS.TAGS] || []);
    setWrongNotes(store[KEYS.WRONG_NOTES] || []);
    setCounselingLogs(store[KEYS.COUNSELING_LOGS] || []);
    setStudyActivity(store[KEYS.STUDY_ACTIVITY] || {});
    setStreakData(store[KEYS.STREAK] || { count: 0, lastDate: null });
    setConversations(store[KEYS.CONVERSATIONS] || {});
    setResumeMaterials(store[KEYS.RESUME_MATERIALS] || []);
    setTimerGoals({});
    setIsDemo(true);
    setStarted(true);
    setCurrentView('dashboard');
  };

  const handleExitDemo = () => {
    disableDemoMode();
    setIsDemo(false);
    setStarted(false);
    setCurrentView('dashboard');
    setSelectedStackId(null);
  };

  // Auto-enter demo mode when URL is /demo
  useEffect(() => {
    if (window.location.pathname === '/demo') {
      handleEnterDemo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Auth logout ─── */
  const handleLogout = async () => {
    if (isDemo) { handleExitDemo(); return; }
    if (hasSupabase) await supabase.auth.signOut();
    else handleGoLanding();
  };

  /* ─── Stack CRUD ─── */
  const handleSaveStack = (data) => {
    setStacks((prev) => {
      const exists = prev.find((s) => s.id === data.id);
      return exists ? prev.map((s) => (s.id === data.id ? data : s)) : [...prev, data];
    });
  };

  const handleDeleteStack = (id) => {
    setStacks((prev) => prev.filter((s) => s.id !== id));
    setConversations((prev) => { const n = { ...prev }; delete n[id]; return n; });
    if (selectedStackId === id) { setCurrentView('dashboard'); setSelectedStackId(null); }
  };

  const handleMarkPassed = (id) => {
    const stack = stacks.find((s) => s.id === id);
    if (!stack) return;
    setStacks((prev) => prev.map((s) => (s.id === id ? { ...s, passed: true } : s)));
    setMergedStack(stack);
    setShowConfetti(true);
  };

  const handleUnmerge = (id) => {
    setStacks((prev) => prev.map((s) => (s.id === id ? { ...s, passed: false } : s)));
  };

  /* ─── Chat ─── */
  const handleSendMessage = useCallback(
    (userMsg, aiMsg) => {
      setConversations((prev) => {
        const existing = prev[selectedStackId] || [];
        const msgs = [...existing];
        if (userMsg) msgs.push(userMsg);
        if (aiMsg) msgs.push(aiMsg);
        return { ...prev, [selectedStackId]: msgs };
      });
      recordActivity();
    },
    [selectedStackId, recordActivity]
  );

  /* ─── Timer session save ─── */
  const handleSaveSession = useCallback(
    (minutes) => {
      if (!selectedStackId || minutes <= 0) return;
      recordActivity();
    },
    [selectedStackId, recordActivity]
  );

  /* ─── Daily Plan accepted ─── */
  const handleAcceptPlan = useCallback((goals) => {
    setTimerGoals((prev) => ({ ...prev, ...goals }));
  }, []);

  /* ─── Wrong Notes ─── */
  const handleSaveWrongNote = useCallback(
    async (message, stack) => {
      let extracted;
      try {
        extracted = await extractWrongNote(apiKey, message.content, stack.name);
      } catch {
        extracted = {
          concept: message.content.slice(0, 60) + (message.content.length > 60 ? '…' : ''),
          reason: '',
          summary: message.content,
        };
      }
      setWrongNotes((prev) => [
        {
          id: String(Date.now()),
          stackId: stack.id,
          content: message.content,
          ...extracted,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    [apiKey]
  );

  const handleDeleteWrongNote = (id) => setWrongNotes((prev) => prev.filter((n) => n.id !== id));

  /* ─── Resume Materials ─── */
  const handleSaveResumeMaterial = (item) => setResumeMaterials((prev) => [item, ...prev]);
  const handleDeleteResumeMaterial = (id) => setResumeMaterials((prev) => prev.filter((m) => m.id !== id));

  /* ─── Counseling Logs ─── */
  const handleSaveCounselingLog = (log) => setCounselingLogs((prev) => [log, ...prev]);
  const handleUpdateCounselingLog = (updated) => setCounselingLogs((prev) => prev.map((l) => l.id === updated.id ? updated : l));
  const handleDeleteCounselingLog = (id) => setCounselingLogs((prev) => prev.filter((l) => l.id !== id));

  /* ─── Tasks ─── */
  const handleAddTask = (task) => setTasks((prev) => [task, ...prev]);
  const handleUpdateTask = (updated) => setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  const handleNavigateToTask = (taskId) => { setSelectedTaskId(taskId); setCurrentView('tasks'); };
  const handleToggleTask = (id) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const handleDeleteTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));

  /* ─── Tags ─── */
  const TAG_PALETTE = ['#6366f1','#10b981','#f59e0b','#f43f5e','#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16','#64748b','#a78bfa'];
  const handleCreateTag = (name) => {
    const newTag = { id: String(Date.now()), name, color: TAG_PALETTE[tags.length % TAG_PALETTE.length] };
    setTags((prev) => [...prev, newTag]);
    return newTag;
  };
  const handleUpdateTag = (updated) => setTags((prev) => prev.map((t) => t.id === updated.id ? updated : t));
  const handleDeleteTag = (tagId) => {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    setTasks((prev) => prev.map((t) => ({ ...t, tags: (t.tags || []).filter((id) => id !== tagId) })));
  };

  /* ─── Conversions ─── */
  const handleConvertStackToTask = (stack) => {
    handleDeleteStack(stack.id);
    handleAddTask({
      id: String(Date.now()),
      name: stack.name,
      dueDate: stack.examDate || '',
      color: stack.color || '#6366f1',
      done: false,
      createdAt: new Date().toISOString(),
    });
  };

  const handleConvertTaskToStack = (task, systemPrompt) => {
    handleDeleteTask(task.id);
    handleSaveStack({
      id: String(Date.now()),
      name: task.name,
      examDate: task.dueDate || '',
      color: task.color || '#6366f1',
      systemPrompt: systemPrompt || '',
      progress: 0,
      passed: false,
    });
  };

  /* ─── Navigation ─── */
  const handleSelectStack = (id) => { setSelectedStackId(id); setCurrentView('chat'); };

  const selectedStack = stacks.find((s) => s.id === selectedStackId) || null;
  const currentMessages = conversations[selectedStackId] || [];

  /* ─── Auth loading screen ─── */
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f5f3]">
        <div className="text-center">
          <p className="shimmer-text font-black text-2xl tracking-tight mb-4">mergee</p>
          <svg className="animate-spin w-5 h-5 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      </div>
    );
  }

  /* ─── Landing page ─── */
  if (!started) {
    return (
      <>
        <LandingPage
          onGetStarted={handleGetStarted}
          onOpenAuth={() => setShowAuth(true)}
          onDemo={handleEnterDemo}
        />
        {showAuth && (
          <AuthModal
            onSuccess={() => { /* onAuthStateChange handles state */ }}
            onClose={() => setShowAuth(false)}
          />
        )}
      </>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden bg-[#f8f9fa]"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif", paddingTop: isDemo ? '28px' : '0' }}
    >
      {/* ── Modals ── */}
      {showApiKey && <ApiKeyModal onSave={handleSaveApiKey} existingKey={apiKey} />}

      {(showAddStack || editingStack) && (
        <AddStackModal
          editingStack={editingStack}
          onSave={handleSaveStack}
          onDelete={handleDeleteStack}
          onClose={() => { setShowAddStack(false); setEditingStack(null); }}
          apiKey={apiKey}
        />
      )}

      {/* ── Merged celebration ── */}
      {mergedStack && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black text-gray-900 mb-1">Merged!</h2>
            <p className="text-lg font-semibold text-gray-700 mb-1">{mergedStack.name}</p>
            <p className="text-gray-400 text-sm mb-7">합격을 진심으로 축하합니다 🎊</p>
            <button
              onClick={() => { setMergedStack(null); setShowConfetti(false); }}
              className="px-8 py-3 bg-[#111] hover:bg-gray-800 text-white font-semibold rounded-2xl transition-colors"
            >
              continue
            </button>
          </div>
        </div>
      )}
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}

      {/* ── Demo banner ── */}
      {isDemo && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-amber-900 text-xs font-semibold text-center py-1 px-4 flex items-center justify-center gap-2">
          <span>🎯 demo mode — sample data only</span>
          <button
            onClick={handleExitDemo}
            className="ml-3 text-amber-800 hover:text-amber-900 underline underline-offset-2 font-bold"
          >
            exit
          </button>
        </div>
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        stacks={stacks}
        currentView={currentView}
        selectedStackId={selectedStackId}
        onNavigate={setCurrentView}
        onSelectStack={handleSelectStack}
        onAddStack={() => { setEditingStack(null); setShowAddStack(true); }}
        onEditStack={(stack) => { setEditingStack(stack); setShowAddStack(false); }}
        onOpenSettings={() => setShowApiKey(true)}
        onUnmerge={handleUnmerge}
        onGoLanding={handleGoLanding}
        tasks={tasks}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onNavigateToTask={handleNavigateToTask}
        onConvertStackToTask={handleConvertStackToTask}
        onConvertTaskToStack={handleConvertTaskToStack}
        allTags={tags}
        onCreateTag={handleCreateTag}
      />

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <TopNav
          currentView={currentView}
          onNavigate={setCurrentView}
          onOpenSettings={() => setShowApiKey(true)}
          user={user}
          onLogout={handleLogout}
          isDemo={isDemo}
          onNavigateMyPage={() => setCurrentView('my-page')}
        />
        {currentView === 'dashboard' && (
          <Dashboard
            stacks={stacks}
            conversations={conversations}
            wrongNotes={wrongNotes}
            studyActivity={studyActivity}
            streakData={streakData}
            apiKey={apiKey}
            onMarkPassed={handleMarkPassed}
            onAcceptPlan={handleAcceptPlan}
            onSaveStack={handleSaveStack}
            onSelectStack={handleSelectStack}
            resumeMaterials={resumeMaterials}
            counselingLogs={counselingLogs}
            tasks={tasks}
            onToggleTask={handleToggleTask}
            habitLogs={habitLogs}
            habits={habits}
            onNavigate={setCurrentView}
          />
        )}
        {currentView === 'chat' && (
          <ChatArea
            stack={selectedStack}
            messages={currentMessages}
            apiKey={apiKey}
            onSendMessage={handleSendMessage}
            onSaveWrongNote={handleSaveWrongNote}
            onSaveResumeMaterial={handleSaveResumeMaterial}
            goalMinutes={selectedStackId ? (timerGoals[selectedStackId] || 0) : 0}
            onSaveSession={handleSaveSession}
          />
        )}
        {currentView === 'daily-log' && (
          <DailyLogCalendar tasks={tasks} stacks={stacks} timetable={timetable} onRecordActivity={recordActivity} />
        )}
        {currentView === 'wrong-notes' && (
          <WrongNotes
            wrongNotes={wrongNotes}
            stacks={stacks}
            apiKey={apiKey}
            onDelete={handleDeleteWrongNote}
          />
        )}
        {currentView === 'job-board' && (
          <JobBoard
            apiKey={apiKey}
            stacks={stacks}
            resumeMaterials={resumeMaterials}
            onAddToPlan={handleAcceptPlan}
          />
        )}
        {currentView === 'career' && (
          <Career
            apiKey={apiKey}
            resumeMaterials={resumeMaterials}
            onSaveResumeMaterial={handleSaveResumeMaterial}
          />
        )}
        {currentView === 'tasks' && (
          <TasksPage
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            allTags={tags}
            onCreateTag={handleCreateTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
          />
        )}
        {currentView === 'my-page' && (
          <MyPage
            user={user}
            apiKey={apiKey}
            onSaveApiKey={handleSaveApiKey}
            stacks={stacks}
            conversations={conversations}
            studyActivity={studyActivity}
            tasks={tasks}
            onLogout={handleLogout}
          />
        )}
        {currentView === 'counseling-log' && (
          <CounselingPage
            counselingLogs={counselingLogs}
            resumeMaterials={resumeMaterials}
            apiKey={apiKey}
            onSave={handleSaveCounselingLog}
            onUpdate={handleUpdateCounselingLog}
            onDelete={handleDeleteCounselingLog}
          />
        )}
        {currentView === 'stack-clash' && (
          <StackClash stacks={stacks} apiKey={apiKey} onAcceptPlan={handleAcceptPlan} />
        )}
        {currentView === 'weak-sniper' && (
          <WeakPointSniper wrongNotes={wrongNotes} stacks={stacks} apiKey={apiKey} />
        )}
        {currentView === 'habit-tracker' && (
          <HabitTracker
            habits={habits}
            habitLogs={habitLogs}
            onHabitsChange={setHabits}
            onHabitLogsChange={setHabitLogs}
            onRecordActivity={recordActivity}
            onNavigateCampusLife={() => setCurrentView('campus-life')}
          />
        )}
        {currentView === 'campus-life' && (
          <CampusLife
            apiKey={apiKey}
            timetable={timetable}
            habits={habits}
            onTimetableChange={setTimetable}
            onHabitsChange={setHabits}
          />
        )}
        {currentView === 'merge-report' && (
          <MergeReport
            stacks={stacks}
            studyActivity={studyActivity}
            conversations={conversations}
            wrongNotes={wrongNotes}
            streakData={streakData}
            apiKey={apiKey}
          />
        )}
      </div>
    </div>
  );
}
