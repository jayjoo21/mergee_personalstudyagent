// Demo mode sample data
// All dates are computed dynamically from today

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function subDays(n) { return addDays(-n); }

const TODAY = new Date().toISOString().split('T')[0];

/* ── Stacks ── */
const DEMO_STACKS = [
  {
    id: 'demo-s1',
    name: '정보처리기사',
    color: '#3b82f6',
    examDate: addDays(45),
    systemPrompt: '당신은 정보처리기사 시험 전문 튜터입니다. 소프트웨어 설계, 데이터베이스, 네트워크, 보안, 프로그래밍 개념을 쉽게 설명하고 예상 문제를 출제해주세요.',
    progress: 65,
    passed: false,
  },
  {
    id: 'demo-s2',
    name: 'SQLD',
    color: '#10b981',
    examDate: addDays(23),
    systemPrompt: '당신은 SQLD 시험 전문 튜터입니다. SQL 기초, 데이터 모델링, 최적화 개념을 명확하게 설명하고 기출 문제 스타일로 연습을 도와주세요.',
    progress: 80,
    passed: false,
  },
  {
    id: 'demo-s3',
    name: 'ADsP',
    color: '#f97316',
    examDate: addDays(12),
    systemPrompt: '당신은 ADsP 시험 전문 튜터입니다. 데이터 분석 준전문가 시험 대비를 위한 통계, 데이터 분석 기획, R/Python 기초를 설명해주세요.',
    progress: 45,
    passed: false,
  },
  {
    id: 'demo-s4',
    name: 'OPIc',
    color: '#8b5cf6',
    examDate: addDays(30),
    systemPrompt: '당신은 OPIc 시험 전문 튜터입니다. 영어 말하기 실력 향상을 위한 스크립트 작성, 표현 교정, 주제별 답변 전략을 도와주세요.',
    progress: 30,
    passed: false,
  },
  {
    id: 'demo-s5',
    name: '투자자산운용사',
    color: '#ef4444',
    examDate: addDays(67),
    systemPrompt: '당신은 투자자산운용사 시험 전문 튜터입니다. 금융투자, 펀드운용, 리스크관리 개념을 쉽게 설명하고 예상 문제를 출제해주세요.',
    progress: 20,
    passed: false,
  },
];

/* ── Tags ── */
const DEMO_TAGS = [
  { id: 'demo-tag-1', name: '공모전', color: '#f59e0b' },
  { id: 'demo-tag-2', name: '과제',   color: '#6366f1' },
  { id: 'demo-tag-3', name: '아이디어', color: '#10b981' },
];

/* ── Tasks ── */
const DEMO_TASKS = [
  {
    id: 'demo-t1', name: '하나은행 공모전 기획서',
    dueDate: addDays(8), done: false, tags: ['demo-tag-1'],
    color: '#f59e0b', createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-t2', name: '팀 미팅 준비',
    dueDate: addDays(3), done: false, tags: ['demo-tag-1'],
    color: '#f59e0b', createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-t3', name: '데이터분석 발표 자료',
    dueDate: addDays(5), done: false, tags: ['demo-tag-2'],
    color: '#6366f1', createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-t4', name: 'UI/UX 과제 제출',
    dueDate: subDays(1), done: true, tags: ['demo-tag-2'],
    color: '#6366f1', createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-t5', name: '포트폴리오 사이트 제작',
    dueDate: '', done: false, tags: ['demo-tag-3'],
    color: '#10b981', createdAt: new Date().toISOString(),
  },
];

/* ── Wrong Notes ── */
const DEMO_WRONG_NOTES = [
  {
    id: 'demo-wn1', stackId: 'demo-s3',
    content: '데이터 마트와 데이터 웨어하우스의 차이를 혼동했다.',
    concept: '데이터 마트 vs 데이터 웨어하우스',
    reason: '범위와 목적의 차이를 구분하지 못해 자주 틀리는 개념',
    summary: '데이터 웨어하우스는 전사 통합 저장소, 데이터 마트는 특정 부서/주제 특화 소규모 저장소. 마트는 WH의 서브셋.',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'demo-wn2', stackId: 'demo-s2',
    content: 'GROUP BY와 HAVING 실행 순서를 헷갈렸다.',
    concept: 'GROUP BY와 HAVING 순서',
    reason: 'WHERE vs HAVING 차이를 명확히 이해 못 한 상태',
    summary: 'SQL 실행 순서: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. HAVING은 그룹화 이후 조건 필터링.',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'demo-wn3', stackId: 'demo-s1',
    content: 'OSI 7계층 순서를 외우지 못했다.',
    concept: 'OSI 7계층 순서',
    reason: '암기 항목이라 순서를 자주 틀림',
    summary: '물리-데이터링크-네트워크-전송-세션-표현-응용 (물데네전세표응). 각 계층의 대표 프로토콜과 함께 암기 필요.',
    timestamp: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
];

/* ── Counseling Logs ── */
const DEMO_COUNSELING_LOGS = [
  {
    id: 'demo-cl1',
    date: '2026-03-20',
    counselor: '취업지원센터',
    summary: '직무 관련 프로젝트 경험 보완 필요',
    detail: '데이터 분석 직무 지원을 위해 실제 프로젝트 경험이 부족하다는 피드백을 받음. 캐글 대회 참여 또는 공공데이터 분석 프로젝트를 추천받음.',
    tags: [],
    createdAt: '2026-03-20T10:30:00.000Z',
  },
  {
    id: 'demo-cl2',
    date: '2026-03-10',
    counselor: '교수님 면담',
    summary: '데이터 분석 포트폴리오 강화 추천',
    detail: 'ADsP 취득 후 실무 연결이 중요하다는 조언. R/Python 포트폴리오를 GitHub에 정리하고 캐글 프로필을 만들어두는 것을 추천받음.',
    tags: [],
    createdAt: '2026-03-10T14:00:00.000Z',
  },
];

/* ── Study Activity (last 2 weeks) ── */
const DEMO_STUDY_ACTIVITY = {
  [subDays(14)]: 1,
  [subDays(13)]: 2,
  [subDays(11)]: 1,
  [subDays(9)]:  3,
  [subDays(7)]:  2,
  [subDays(6)]:  1,
  [subDays(5)]:  4,
  [subDays(4)]:  2,
  [subDays(3)]:  1,
  [subDays(1)]:  3,
  [TODAY]:       2,
};

/* ── Streak ── */
const DEMO_STREAK = { count: 7, lastDate: TODAY };

/* ── Conversations (ADsP) ── */
const DEMO_CONVERSATIONS = {
  'demo-s3': [
    {
      id: 'demo-msg-1',
      role: 'assistant',
      content: '안녕하세요! ADsP D-' + 12 + ' 남았어요. 오늘은 데이터 분석 기획 파트 집중할까요?\n\n[오늘의 추천 학습]\n- 1과목: 데이터 이해 (20분)\n- 2과목: 데이터 분석 기획 (40분)\n- 3과목: 데이터 분석 (30분)\n\n어디서부터 시작할까요?',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'demo-msg-2',
      role: 'user',
      content: '3과목 요약해줘',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'demo-msg-3',
      role: 'assistant',
      content: 'ADsP 3과목 **데이터 분석** 핵심 정리예요! 📊\n\n**[통계 분석]**\n- 기술통계: 평균, 중앙값, 분산, 표준편차\n- 추론통계: 가설검정, 신뢰구간, p-value\n- 회귀분석: 단순/다중 선형회귀\n\n**[데이터 마이닝]**\n- 분류: 의사결정나무, SVM, 랜덤포레스트\n- 군집: K-means, 계층적 군집\n- 연관: 아프리오리 알고리즘\n\n**[텍스트 마이닝]**\n- 형태소 분석, TF-IDF, 감성분석\n\n**[R 기초]**\n- 벡터, 데이터프레임, dplyr/ggplot2\n\n특히 **CRISP-DM 6단계**와 **통계 기법 분류**가 자주 출제돼요!\n\n예상 문제 드릴까요?',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
  ],
};

/* ── Jobs ── */
const DEMO_JOBS = [
  {
    id: 'demo-job-1',
    company: '한국산업은행',
    role: '청년인턴 IT',
    deadline: addDays(4),
    status: '지원예정',
    fitScore: 72,
    url: '',
    notes: '금융 IT 직무. Java/Spring 우대, SQL 필수. 학점 3.5 이상 우대.',
    analysis: 'SQL 역량과 데이터 분석 경험이 강점으로 작용할 것. Java 경험 보완 필요.',
  },
  {
    id: 'demo-job-2',
    company: '카카오',
    role: '데이터분석 인턴',
    deadline: addDays(15),
    status: '지원완료',
    fitScore: 85,
    url: '',
    notes: 'SQL, Python 필수. A/B 테스트 경험 우대. 통계 기초 지식 필요.',
    analysis: 'ADsP 준비 경험과 파이썬 프로젝트 이력이 직무에 잘 맞음. 포트폴리오 강화 추천.',
  },
  {
    id: 'demo-job-3',
    company: '네이버',
    role: '개발인턴',
    deadline: addDays(30),
    status: '서류합격',
    fitScore: 68,
    url: '',
    notes: 'Java/Kotlin 우대. 자료구조/알고리즘 기본 필수. Git 협업 경험.',
    analysis: '알고리즘 문제풀이 경험 추가 필요. CS 기초(정보처리기사) 준비가 도움 될 것.',
  },
  {
    id: 'demo-job-4',
    company: '토스',
    role: '프론트엔드 인턴',
    deadline: addDays(45),
    status: '면접',
    fitScore: 91,
    url: '',
    notes: 'React, TypeScript 필수. 성능 최적화 경험 우대. 사용자 중심 UI 설계 역량.',
    analysis: 'React 프로젝트 경험과 UI/UX 과제 이력이 직무에 매우 부합. 면접 준비에 집중 권장.',
  },
];

/* ── Cover Letter Questions (산업은행) ── */
const DEMO_COVER_LETTER_JOB1 = [
  {
    id: 'demo-q1',
    title: '지원동기 및 입행 후 포부',
    text: '저는 금융과 IT의 교차점에서 가치를 창출하는 산업은행 IT 부문에 깊은 관심을 갖게 되었습니다. 대학에서 데이터 분석을 공부하며 금융 데이터의 가능성을 실감했고, ADsP와 SQLD 자격증 취득을 통해 실무 역량을 키워왔습니다. 입행 후에는 디지털 금융 인프라 구축에 기여하고 싶습니다.',
    maxLen: 1000,
  },
  {
    id: 'demo-q2',
    title: '직무 관련 경험 및 역량',
    text: '데이터 분석 프로젝트를 통해 SQL 쿼리 최적화와 Python을 활용한 시각화 경험을 쌓았습니다. 팀 프로젝트에서는 금융 공공데이터를 활용하여 대출 리스크 예측 모델을 구현했으며, 이 과정에서 데이터 품질 관리의 중요성을 배웠습니다.',
    maxLen: 800,
  },
];

/* ── Daily Log ── */
const DEMO_DAILY_LOG_TODAY = {
  todos: [
    { id: 'demo-dl-1', text: 'ADsP 3과목 기출문제 20문제 풀기', done: true },
    { id: 'demo-dl-2', text: 'SQLD GROUP BY/HAVING 개념 정리', done: true },
    { id: 'demo-dl-3', text: '정보처리기사 OSI 계층 암기', done: false },
    { id: 'demo-dl-4', text: '산업은행 자소서 1문항 완성', done: false },
  ],
  memo: '오늘 ADsP 마무리 집중! D-12라 조급하지만 차근차근 하자.',
};

const DEMO_DAILY_LOG_YESTERDAY = {
  todos: [
    { id: 'demo-dl-y1', text: 'SQLD 모의고사 1회분 풀기', done: true },
    { id: 'demo-dl-y2', text: 'OPIc 자기소개 스크립트 작성', done: true },
    { id: 'demo-dl-y3', text: '하나은행 공모전 팀 회의 참석', done: true },
  ],
  memo: '',
};

const DEMO_DAILY_LOG_3DAYS = {
  todos: [
    { id: 'demo-dl-3d1', text: 'ADsP 2과목 데이터 분석 기획 정리', done: true },
    { id: 'demo-dl-3d2', text: '데이터분석 발표 초안 작성', done: false },
  ],
  memo: '발표 준비 시작. 방향 잡는 중.',
};

/* ── Build the full demo store ── */
export function buildDemoStore() {
  return {
    'mergee_stacks':          DEMO_STACKS,
    'mergee_tasks':           DEMO_TASKS,
    'mergee_tags':            DEMO_TAGS,
    'mergee_wrong_notes':     DEMO_WRONG_NOTES,
    'mergee_counseling_logs': DEMO_COUNSELING_LOGS,
    'mergee_study_activity':  DEMO_STUDY_ACTIVITY,
    'mergee_streak':          DEMO_STREAK,
    'mergee_conversations':   DEMO_CONVERSATIONS,
    'mergee_resume_materials': [],
    'mergee_timer_goals':     {},
    'mergee_jobs':            DEMO_JOBS,
    'mergee_coverletter_demo-job-1': DEMO_COVER_LETTER_JOB1,
    [`daily_log_${TODAY}`]:         DEMO_DAILY_LOG_TODAY,
    [`daily_log_${subDays(1)}`]:    DEMO_DAILY_LOG_YESTERDAY,
    [`daily_log_${subDays(3)}`]:    DEMO_DAILY_LOG_3DAYS,
  };
}
