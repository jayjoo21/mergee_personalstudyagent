const BASE = 'https://api.anthropic.com/v1/messages';

const headers = (apiKey) => ({
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
});

/* ─── Demo mode ─── */
export const IS_DEMO = (key) => !key || key === 'demo';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/* ─── Mock responses per stack ─── */
const MOCK = {
  OPIc: [
    '안녕하세요! OPIc 튜터입니다 🎤\n\n오늘은 자기소개 스크립트를 연습해볼게요.\n\n[추천 스크립트]\n"Hi, my name is [이름], and I am currently a college student majoring in [전공]. I enjoy [취미1] and [취미2] in my free time. I am preparing for my OPIc exam to improve my English communication skills for future job opportunities."\n\n[핵심 표현]\n- "I am currently..." (현재 상태)\n- "I enjoy ...ing" (취미)\n- "I am preparing for..." (목표)\n\n직접 한번 말해보시겠어요?',
    '좋은 질문이에요! Intermediate Mid~High 목표라면 이 표현들을 익혀두세요.\n\n[일상 묘사 패턴]\n- "Typically, I start my day by..."\n- "One thing I really like about... is that..."\n- "Compared to before, I think..."\n\n[시제 혼합 연습]\n현재형 + 과거형을 자연스럽게 섞으면 점수가 올라가요.\n\n예시: "I usually take the subway to school. Last week, there was a delay, so I ended up being late."\n\n어떤 주제가 가장 어렵게 느껴지세요?',
    '[롤플레이 대비 전략]\n\nOPIc 롤플레이는 보통 3단계예요.\n1. 상황 설명 듣기\n2. 3가지 질문하기\n3. 문제 상황 해결하기\n\n[자주 나오는 상황]\n- 호텔 예약 / 문제 해결\n- 친구에게 조언 구하기\n- 물건 구매 / 반품\n\n[꿀팁] 질문을 3개 이상 자연스럽게 이어가세요.\n"Also, could you tell me...?"\n"One more thing, is it possible to...?"\n\n연습해볼 상황을 말해주시면 스크립트 짜드릴게요!',
  ],
  '투자자산운용사': [
    '투자자산운용사 핵심 개념부터 잡아볼게요! 📊\n\n[펀드의 종류]\n\n1. 공모펀드 vs 사모펀드\n   - 공모: 불특정 다수, 50인 이상\n   - 사모: 49인 이하, 규제 완화\n\n2. 투자 대상별 분류\n   - 주식형: 주식 60% 이상\n   - 채권형: 채권 60% 이상\n   - 혼합형: 주식 50% 미만\n   - MMF: 단기금융상품\n\n[자주 출제 포인트] 공모펀드의 투자자 보호 의무와 공시 요건!\n\n예상 문제를 풀어보실래요?',
    '[예상 문제] ✏️\n\n문제: 다음 중 집합투자기구에 해당하지 않는 것은?\n① 투자신탁\n② 투자회사\n③ 투자조합\n④ 일반 은행 예금\n\n잠깐 생각해보세요...\n\n정답: ④\n\n해설: 집합투자기구는 2인 이상의 투자자로부터 자금을 모아 운용하는 구조입니다. 은행 예금은 예금자와 은행 간의 개별 계약이므로 해당하지 않아요.\n\n[핵심 암기] 투자신탁 / 투자회사 / 투자조합 / 투자유한회사 / 투자합자회사',
    '[리스크 관리 파트] ⚠️\n\n시장위험 측정 지표\n- VaR: 일정 신뢰수준에서 최대 손실 예상액\n- 베타(B): 시장 대비 민감도, B>1이면 고위험\n- 샤프지수: (수익률 - 무위험수익률) / 표준편차\n\n[자주 헷갈리는 것]\n- 체계적 위험: 분산 불가 (시장 전체)\n- 비체계적 위험: 분산 가능 (개별 종목)\n\n시험에 베타 계산 문제가 꼭 나와요! 연습해볼까요?',
  ],
  'AICE Basic': [
    'AICE Basic AI 기초 개념 정리예요! 🤖\n\n[머신러닝 3대 학습 방식]\n\n1. 지도학습 (Supervised)\n   - 정답 레이블이 있는 데이터로 학습\n   - 예: 이메일 스팸 분류, 집값 예측\n\n2. 비지도학습 (Unsupervised)\n   - 레이블 없이 패턴 발견\n   - 예: 고객 군집 분석(K-means)\n\n3. 강화학습 (Reinforcement)\n   - 보상/벌칙으로 최적 행동 학습\n   - 예: 게임 AI, 자율주행\n\n[시험 포인트] 각 학습 방식의 대표 알고리즘을 매칭할 수 있어야 해요!\n\n어떤 부분이 가장 헷갈리세요?',
    '[딥러닝 vs 머신러닝] 🧠\n\n머신러닝\n- 사람이 특징(feature)을 직접 추출\n- 데이터 양이 적어도 작동\n- 해석 가능성 높음\n\n딥러닝\n- 신경망이 특징을 자동 추출\n- 대량의 데이터 + 고성능 GPU 필요\n- 이미지/음성/언어 처리에 강점\n\n[신경망 구조]\n  Input -> Hidden Layer(s) -> Output\n\n활성화 함수: ReLU, Sigmoid, Softmax\n과적합 방지: Dropout, 정규화\n\n예상 문제 풀어볼까요?',
    '[데이터 전처리] 📊\n\n결측값(Missing Value) 처리\n- 삭제: 결측 비율이 낮을 때\n- 평균/중앙값 대체: 수치형 변수\n- 최빈값 대체: 범주형 변수\n\n이상값(Outlier) 처리\n- IQR 방법: Q1 - 1.5*IQR ~ Q3 + 1.5*IQR\n- Z-score: |z| > 3이면 이상값\n\n정규화 vs 표준화\n- Min-Max 정규화: 0~1 범위\n- Z-score 표준화: 평균 0, 표준편차 1\n\n시험에 자주 나오는 부분이에요! 암기해두세요 ✅',
  ],
  PCSL: [
    'PCSL 파이썬 기초부터 시작해요! 🐍\n\n[리스트 vs 튜플 vs 딕셔너리]\n\n  리스트 (수정 가능)\n  fruits = ["apple", "banana"]\n  fruits.append("cherry")  # 추가\n\n  튜플 (수정 불가)\n  coords = (37.5665, 126.9780)\n\n  딕셔너리 (key-value)\n  student = {"name": "김철수", "score": 95}\n\n[자주 나오는 문제] 리스트 슬라이싱\n  nums = [0, 1, 2, 3, 4, 5]\n  nums[1:4]   # [1, 2, 3]\n  nums[::-1]  # [5, 4, 3, 2, 1]\n\n직접 코드 문제 드릴까요?',
    '[함수와 람다] ⚡\n\n  일반 함수\n  def greet(name, greeting="Hello"):\n      return f"{greeting}, {name}!"\n\n  greet("Alice")       # Hello, Alice!\n  greet("Bob", "Hi")   # Hi, Bob!\n\n  람다 함수 (한 줄)\n  square = lambda x: x ** 2\n  square(5)  # 25\n\n  sorted와 함께\n  nums = [3, 1, 4, 1, 5, 9]\n  sorted(nums, key=lambda x: -x)\n  # [9, 5, 4, 3, 1, 1]\n\n[시험 단골] *args, **kwargs 사용법\n  def total(*args):\n      return sum(args)\n  total(1, 2, 3, 4)  # 10',
    '[파일 입출력 & 예외처리] 📁\n\n  파일 읽기/쓰기\n  with open("data.txt", "w", encoding="utf-8") as f:\n      f.write("Hello, Python!")\n\n  with open("data.txt", "r", encoding="utf-8") as f:\n      content = f.read()\n\n  예외 처리\n  try:\n      result = 10 / 0\n  except ZeroDivisionError as e:\n      print(f"오류: {e}")\n  finally:\n      print("항상 실행")\n\n[중요] with 문은 파일을 자동으로 닫아줘요!\nfinally는 예외 발생 여부와 관계없이 항상 실행됩니다.\n\n연습 문제 드릴까요?',
  ],
  ADsP: [
    'ADsP 데이터 분석 핵심 개념이에요! 📈\n\n[데이터 분석 기획 프로세스]\n\n1. 분석 과제 발굴\n   - 하향식(Top-down): 비즈니스 목표 -> 분석 과제\n   - 상향식(Bottom-up): 데이터 탐색 -> 인사이트\n\n2. 분석 방법론 선택\n   CRISP-DM 6단계:\n   비즈니스 이해 -> 데이터 이해 -> 준비 -> 모델링 -> 평가 -> 배포\n\n3. 데이터 거버넌스\n   - 데이터 표준화 / 품질 관리\n\n[자주 출제] CRISP-DM 6단계 순서!\n암기법: 비데준모평배\n\n문제 풀어볼까요?',
    '[통계 기초] 📊\n\n기술통계 vs 추론통계\n- 기술통계: 수집된 데이터 자체를 요약/설명\n- 추론통계: 표본으로 모집단을 추정/검정\n\n중심 경향값\n- 평균(Mean): 이상값에 민감\n- 중앙값(Median): 이상값에 강건\n- 최빈값(Mode): 범주형 데이터에 적합\n\n분산도\n- 분산 = sum((xi - mean)^2) / n\n- 표준편차 = sqrt(분산)\n- 변동계수(CV) = 표준편차 / 평균 * 100\n\n[시험 포인트] 왜도(Skewness)와 첨도(Kurtosis)!\n- 왜도 > 0: 오른쪽 꼬리 (양의 왜도)\n- 왜도 < 0: 왼쪽 꼬리 (음의 왜도)',
    '[R 기초 문법] 💻\n\n  벡터 생성\n  x <- c(1, 2, 3, 4, 5)\n  mean(x)   # 평균: 3\n  sd(x)     # 표준편차\n\n  데이터프레임\n  df <- data.frame(\n    name = c("Alice", "Bob"),\n    score = c(85, 92)\n  )\n  summary(df)\n\n  시각화\n  plot(df$score, type="l", col="blue")\n  barplot(df$score, names.arg=df$name)\n\n[자주 쓰는 패키지]\n- dplyr: 데이터 전처리 (filter, select, mutate)\n- ggplot2: 시각화\n- caret: 머신러닝\n\n예상 문제 드릴까요?',
  ],
};

const FALLBACK = [
  '안녕하세요! 데모 모드입니다 🎓\n\n실제 API 키를 설정하면 Claude AI가 맞춤형 답변을 드려요.\n지금은 UI와 기능 테스트를 위한 샘플 답변이 나옵니다.\n\n궁금한 점이 있으면 계속 질문해보세요!',
  '좋은 질문이에요! (데모 모드)\n\n핵심 개념 정리:\n- 개념 A: 자세한 설명\n- 개념 B: 관련 예시\n- 개념 C: 시험 포인트\n\n실제 API 키를 입력하시면 이 과목에 특화된 상세한 답변을 받을 수 있어요!',
  '이 개념은 시험에 자주 나오는 중요 포인트예요!\n\n핵심 요약:\n1. 첫 번째 핵심 내용\n2. 두 번째 핵심 내용\n3. 세 번째 핵심 내용\n\n더 자세히 알고 싶은 부분이 있으신가요?',
];

const getMockReply = (systemPrompt, msgCount) => {
  const stackKey = Object.keys(MOCK).find((k) => systemPrompt && systemPrompt.includes(k));
  const pool = stackKey ? MOCK[stackKey] : FALLBACK;
  return pool[msgCount % pool.length];
};

/* ─── Real API call ─── */
export const callClaude = async (apiKey, messages, systemPrompt, model = 'claude-sonnet-4-6') => {
  if (IS_DEMO(apiKey)) {
    await delay(900 + Math.random() * 500);
    const userCount = messages.filter((m) => m.role === 'user').length;
    return getMockReply(systemPrompt, userCount - 1);
  }

  const res = await fetch(BASE, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ model, max_tokens: 2048, system: systemPrompt, messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
};

export const extractWrongNote = async (apiKey, content, stackName) => {
  if (IS_DEMO(apiKey)) {
    await delay(600);
    return {
      concept: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
      reason: '시험에 자주 출제되는 핵심 개념입니다. 반복 학습이 필요해요.',
      summary: content.slice(0, 200),
    };
  }

  const system = '당신은 학습 도우미입니다. 주어진 텍스트에서 핵심을 JSON으로만 추출하세요.\n'
    + '형식:\n{"concept":"핵심 개념 한 문장","reason":"왜 중요한지/자주 틀리는 이유","summary":"핵심 요약 2-3문장"}';

  const text = await callClaude(
    apiKey,
    [{ role: 'user', content: '[' + stackName + '] 다음 내용의 핵심을 추출해주세요:\n\n' + content.slice(0, 1500) }],
    system,
    'claude-haiku-4-5-20251001'
  );

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return { concept: content.slice(0, 60) + '...', reason: '복습 필요', summary: content.slice(0, 300) };
};

export const getTodayMission = async (apiKey, stacks) => {
  if (IS_DEMO(apiKey)) {
    await delay(800);
    const active = stacks.filter((s) => !s.passed).slice(0, 3);
    const missions = ['핵심 개념 20개 암기 + 예상 문제 10문항 풀기', '오답 복습 및 취약 파트 집중 정리', '기출문제 1회분 타이머 설정 후 풀기'];
    const priorities = ['high', 'medium', 'low'];
    const durations = ['2시간', '1시간 30분', '1시간'];
    return active.map((s, i) => ({
      stack: s.name,
      mission: missions[i % 3],
      priority: priorities[i % 3],
      duration: durations[i % 3],
    }));
  }

  const info = stacks
    .filter((s) => !s.passed)
    .map((s) => {
      const dday = s.examDate ? Math.floor((new Date(s.examDate) - new Date()) / 86400000) : null;
      return s.name + ': 진도율 ' + (s.progress || 0) + '%, D-' + (dday ?? '?');
    })
    .join('\n');

  const system = '당신은 학습 코치입니다. 아래 현황을 보고 오늘 해야 할 일을 JSON 배열로만 응답하세요.\n'
    + '형식: [{"stack":"스택명","mission":"오늘 할 일 구체적으로","priority":"high|medium|low","duration":"예상 시간"}]\n'
    + '최대 3개만 추천, 반드시 JSON 배열만 반환하세요.';

  const text = await callClaude(
    apiKey,
    [{ role: 'user', content: '내 공부 현황:\n' + info + '\n\n오늘 무엇을 공부해야 할까요?' }],
    system,
    'claude-haiku-4-5-20251001'
  );

  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return [];
};

export const getQuizQuestion = async (apiKey, stackName) => {
  if (IS_DEMO(apiKey)) {
    await delay(700);
    const QUIZ = {
      'OPIc': {
        question: 'OPIc Intermediate Mid 등급을 받기 위해 가장 중요한 요소는?',
        choices: [
          { label: 'A', text: '단순한 문장만 사용하여 명확하게 전달' },
          { label: 'B', text: '다양한 시제와 복잡한 문장 구조 자연스럽게 사용' },
          { label: 'C', text: '원어민 수준의 발음' },
          { label: 'D', text: '5분 이상 말하기' },
          { label: 'E', text: '전문 용어 다수 사용' },
        ],
        answer: 'B',
        explanation: 'Intermediate Mid는 단순 연결구 이상의 복잡한 문장 구조와 다양한 시제를 자연스럽게 구사하는 능력을 요구합니다.',
      },
      '투자자산운용사': {
        question: '집합투자기구에 해당하지 않는 것은?',
        choices: [
          { label: 'A', text: '투자신탁' },
          { label: 'B', text: '투자회사' },
          { label: 'C', text: '투자조합' },
          { label: 'D', text: '일반 은행 예금' },
          { label: 'E', text: '투자유한회사' },
        ],
        answer: 'D',
        explanation: '집합투자기구는 2인 이상으로부터 자금을 모아 운용하는 구조입니다. 은행 예금은 개별 계약이므로 해당하지 않습니다.',
      },
      'AICE Basic': {
        question: '다음 중 지도학습(Supervised Learning)의 예시로 올바른 것은?',
        choices: [
          { label: 'A', text: '고객 군집 분석(K-means)' },
          { label: 'B', text: '이메일 스팸 분류' },
          { label: 'C', text: '게임 AI 강화학습' },
          { label: 'D', text: '이상 탐지(Anomaly Detection)' },
          { label: 'E', text: '차원 축소(PCA)' },
        ],
        answer: 'B',
        explanation: '지도학습은 정답 레이블이 있는 데이터로 학습합니다. 스팸/정상 레이블이 붙은 데이터로 분류 모델을 학습하는 것이 대표적 예시입니다.',
      },
      'PCSL': {
        question: 'Python에서 nums = [0,1,2,3,4,5] 일 때 nums[1:4]의 결과는?',
        choices: [
          { label: 'A', text: '[0, 1, 2, 3]' },
          { label: 'B', text: '[1, 2, 3, 4]' },
          { label: 'C', text: '[1, 2, 3]' },
          { label: 'D', text: '[2, 3, 4]' },
          { label: 'E', text: '[0, 1, 2]' },
        ],
        answer: 'C',
        explanation: 'Python 슬라이싱 [start:end]는 start 인덱스부터 end-1까지 반환합니다. nums[1:4]는 인덱스 1,2,3 즉 [1, 2, 3]입니다.',
      },
      'ADsP': {
        question: 'CRISP-DM 방법론의 6단계 순서로 올바른 것은?',
        choices: [
          { label: 'A', text: '데이터이해 → 비즈니스이해 → 준비 → 모델링 → 평가 → 배포' },
          { label: 'B', text: '비즈니스이해 → 데이터이해 → 준비 → 모델링 → 평가 → 배포' },
          { label: 'C', text: '비즈니스이해 → 준비 → 데이터이해 → 모델링 → 배포 → 평가' },
          { label: 'D', text: '모델링 → 비즈니스이해 → 데이터이해 → 준비 → 평가 → 배포' },
          { label: 'E', text: '비즈니스이해 → 데이터이해 → 모델링 → 준비 → 평가 → 배포' },
        ],
        answer: 'B',
        explanation: 'CRISP-DM: 비즈니스이해 → 데이터이해 → 데이터준비 → 모델링 → 평가 → 배포. 암기법: 비데준모평배',
      },
    };
    const key = Object.keys(QUIZ).find((k) => stackName && stackName.includes(k));
    return key ? QUIZ[key] : QUIZ['ADsP'];
  }

  const system = '당신은 시험 출제 전문가입니다. 주어진 과목의 예상 문제를 JSON으로만 응답하세요.\n'
    + '형식: {"question":"문제","choices":[{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."},{"label":"E","text":"..."}],"answer":"정답레이블","explanation":"해설"}\n'
    + '반드시 5지선다형이어야 하며 JSON만 반환하세요.';

  const text = await callClaude(
    apiKey,
    [{ role: 'user', content: stackName + ' 시험 예상 문제 1개를 출제해주세요.' }],
    system,
    'claude-haiku-4-5-20251001'
  );

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return null;
};

export const analyzeJobPostingFull = async (apiKey, jobText) => {
  if (IS_DEMO(apiKey)) {
    await delay(900);
    return {
      analysis: '[ 채용공고 분석 ]\n\n핵심 역량: 데이터 분석(SQL·Python), 커뮤니케이션, 문제 해결\n\n면접 예상 질문:\n1. 데이터로 문제를 해결한 경험\n2. 다양한 이해관계자와 협업 경험\n\n지원 전략: 수치화된 성과 중심으로 자소서 작성 추천',
      fitScore: 72,
    };
  }
  const system = '당신은 취업 컨설턴트입니다. 채용공고를 분석하고 반드시 JSON만 응답하세요: {"analysis":"핵심역량·예상질문·지원전략 요약(한국어, 200자 이내)","fitScore":75} fitScore는 0-100 정수로 일반 취준생 기준 적합도입니다.';
  const text = await callClaude(
    apiKey,
    [{ role: 'user', content: '채용공고:\n\n' + jobText.slice(0, 2000) }],
    system,
    'claude-haiku-4-5-20251001'
  );
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { const p = JSON.parse(m[0]); return { analysis: p.analysis || text, fitScore: Number(p.fitScore) || 65 }; }
  } catch {}
  return { analysis: text, fitScore: 65 };
};

export const analyzeJobPosting = async (apiKey, jobText) => {
  if (IS_DEMO(apiKey)) {
    await delay(800);
    return '[ 채용공고 분석 결과 ]\n\n'
      + '핵심 요구 역량:\n'
      + '- 커뮤니케이션 능력 (여러 팀과 협업)\n'
      + '- 데이터 분석 역량 (SQL, Python)\n'
      + '- 문제 해결 능력\n\n'
      + '주목할 키워드:\n'
      + '- 자기주도적, 오너십, 데이터 기반 의사결정\n\n'
      + '면접 예상 질문:\n'
      + '1. 데이터를 활용해 문제를 해결한 경험이 있나요?\n'
      + '2. 다양한 이해관계자와 협업한 경험을 말씀해주세요.\n\n'
      + '지원 전략: 지원 공고의 데이터 역량 강조 포인트에 맞춰 수치화된 성과를 준비하세요.';
  }

  const system = '당신은 취업 컨설턴트입니다. 채용공고를 분석하여 핵심 역량, 키워드, 예상 면접 질문, 지원 전략을 한국어로 정리해주세요.';
  return callClaude(
    apiKey,
    [{ role: 'user', content: '다음 채용공고를 분석해주세요:\n\n' + jobText.slice(0, 2000) }],
    system,
    'claude-haiku-4-5-20251001'
  );
};

export const getCareerAdvice = async (apiKey, type, context) => {
  if (IS_DEMO(apiKey)) {
    await delay(900);
    if (type === 'cover') {
      return '[ 자기소개서 초안 ]\n\n'
        + '1. 성장 과정 및 지원 동기\n'
        + context.company + '에 지원하게 된 것은 귀사의 ' + context.position + ' 포지션이 제 역량과 가장 잘 맞는다고 판단했기 때문입니다. '
        + '저는 데이터 분석과 문제 해결 역량을 지속적으로 키워왔으며, 특히 자격증 취득을 통해 전문성을 검증하고자 노력했습니다.\n\n'
        + '2. 직무 관련 경험\n'
        + '프로젝트 경험을 통해 실무 역량을 키웠습니다. 팀 협업, 데이터 분석, 결과물 발표 등 다양한 역량을 쌓았습니다.\n\n'
        + '3. 입사 후 포부\n'
        + '귀사에 입사한다면 초기 6개월 내 팀의 핵심 인재로 성장하고, 1년 내 실질적인 비즈니스 임팩트를 창출하겠습니다.';
    }
    return '[ 면접 예상 Q&A ]\n\n'
      + 'Q: 자기소개를 해주세요.\n'
      + 'A: 저는 데이터 분석과 자격증 취득에 집중하며 전문성을 키워온 [이름]입니다. '
      + 'OPIc, ADsP 등 다양한 자격증을 보유하고 있으며, 이를 통해 체계적인 학습 능력과 목표 달성력을 증명했습니다.\n\n'
      + 'Q: 지원 동기를 말씀해주세요.\n'
      + 'A: 귀사의 데이터 기반 의사결정 문화와 성장 가능성에 매력을 느껴 지원했습니다. '
      + '제 분석 역량으로 팀에 기여하고 싶습니다.\n\n'
      + 'Q: 본인의 강점은 무엇인가요?\n'
      + 'A: 꾸준한 자기계발 능력과 데이터 분석 역량입니다. 체계적인 학습으로 목표를 달성하는 능력을 자신합니다.';
  }

  let prompt = '';
  if (type === 'cover') {
    prompt = context.company + ' ' + context.position + ' 포지션 자기소개서를 작성해주세요. '
      + '지원자 배경: ' + (context.background || '자격증 준비 중인 취업 준비생') + '. '
      + '4개 항목(지원동기, 직무경험, 강점, 포부)으로 구성해주세요.';
  } else {
    prompt = context.company + ' ' + context.position + ' 포지션 면접 예상 질문 5개와 모범 답변을 작성해주세요.';
  }

  return callClaude(
    apiKey,
    [{ role: 'user', content: prompt }],
    '당신은 취업 컨설턴트입니다. 실용적이고 구체적인 취업 준비 자료를 한국어로 작성해주세요.',
    'claude-haiku-4-5-20251001'
  );
};

export const analyzeWeakPoints = async (apiKey, wrongNotes, stackName) => {
  if (!wrongNotes.length) return '아직 오답 데이터가 없어요. 학습 후 AI 답변을 저장해보세요!';

  if (IS_DEMO(apiKey)) {
    await delay(700);
    return '[' + stackName + '] 취약점 분석 결과 (데모)\n\n'
      + '저장된 ' + wrongNotes.length + '개 노트를 분석했어요.\n\n'
      + '📌 주요 취약 패턴: 개념 정의보다 적용 문제에서 실수가 많습니다.\n\n'
      + '💡 극복법: 개념을 암기한 후 반드시 예제 문제로 확인하는 습관을 들이세요. '
      + '특히 비슷한 개념끼리 비교 정리하면 효과적이에요!';
  }

  const concepts = wrongNotes
    .slice(-15)
    .map((n) => n.concept || n.summary || '')
    .filter(Boolean)
    .join('\n');

  return callClaude(
    apiKey,
    [{ role: 'user', content: '[' + stackName + '] 오답 패턴:\n' + concepts + '\n\n취약점 분석 및 핵심 조언을 200자 이내로 해주세요.' }],
    '당신은 학습 분석 전문가입니다. 오답 패턴을 분석하고 핵심 취약점과 극복법을 간결하게 한국어로 설명하세요.',
    'claude-haiku-4-5-20251001'
  );
};

export const getStackClashPlan = async (apiKey, stack1, stack2, dailyHours) => {
  if (IS_DEMO(apiKey)) {
    await delay(800);
    const d1 = stack1.examDate ? Math.floor((new Date(stack1.examDate) - new Date()) / 86400000) : 999;
    const d2 = stack2.examDate ? Math.floor((new Date(stack2.examDate) - new Date()) / 86400000) : 999;
    const total = dailyHours || 4;
    const w1 = d1 < d2 ? 0.65 : 0.35;
    const h1 = Math.round(total * w1 * 10) / 10;
    const h2 = Math.round((total - h1) * 10) / 10;
    return {
      stack1Hours: h1,
      stack2Hours: h2,
      advice: stack1.name + " D-" + d1 + " vs " + stack2.name + " D-" + d2 + "\n\n"
        + "추천 배분: " + stack1.name + " " + h1 + "시간 / " + stack2.name + " " + h2 + "시간\n\n"
        + "전략: 시험이 더 가까운 " + (d1 < d2 ? stack1.name : stack2.name) + "에 집중하되, "
        + "진도율이 낮은 " + (stack1.progress < stack2.progress ? stack1.name : stack2.name) + "도 소홀히 하지 마세요. "
        + "D-30 이내에는 70:30 비율로 긴박한 시험에 집중 투자하는 것을 권장합니다.",
    };
  }

  const d1 = stack1.examDate ? Math.floor((new Date(stack1.examDate) - new Date()) / 86400000) : null;
  const d2 = stack2.examDate ? Math.floor((new Date(stack2.examDate) - new Date()) / 86400000) : null;

  const system = "당신은 수험 전략가입니다. 두 시험의 현황을 보고 하루 공부 시간 배분을 JSON으로만 응답하세요.\n"
    + "형식: {\"stack1Hours\":숫자,\"stack2Hours\":숫자,\"advice\":\"전략 설명 2-3문장\"}\n"
    + "숫자의 합은 반드시 dailyHours와 같아야 합니다. JSON만 반환하세요.";

  const info = stack1.name + ": 진도율 " + (stack1.progress || 0) + "%, D-" + (d1 ?? "?") + "\n"
    + stack2.name + ": 진도율 " + (stack2.progress || 0) + "%, D-" + (d2 ?? "?") + "\n"
    + "하루 가용 시간: " + (dailyHours || 4) + "시간";

  const text = await callClaude(
    apiKey,
    [{ role: "user", content: info + "\n\n최적 시간 배분을 알려주세요." }],
    system,
    "claude-haiku-4-5-20251001"
  );

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return { stack1Hours: (dailyHours || 4) / 2, stack2Hours: (dailyHours || 4) / 2, advice: text };
};

export const getWeakPointQuestion = async (apiKey, stackName, weakConcepts) => {
  if (IS_DEMO(apiKey)) {
    await delay(700);
    return {
      question: "[" + stackName + "] 다음 중 " + (weakConcepts[0] || "핵심 개념") + "에 대한 설명으로 올바른 것은?",
      choices: [
        { label: "A", text: "개념 A에 대한 설명 — 가장 기본적인 정의" },
        { label: "B", text: "개념 B에 대한 설명 — 자주 혼동되는 오개념" },
        { label: "C", text: "개념 C에 대한 설명 — 정답: 핵심 개념의 올바른 정의" },
        { label: "D", text: "개념 D에 대한 설명 — 관련 있지만 틀린 설명" },
        { label: "E", text: "개념 E에 대한 설명 — 완전히 무관한 내용" },
      ],
      answer: "C",
      explanation: weakConcepts[0] + "는 시험에서 자주 출제되는 핵심 개념입니다. 오답 노트에서 반복적으로 틀린 개념이므로 특히 주의하세요.",
    };
  }

  const context = weakConcepts.slice(0, 5).join(", ");
  const system = "당신은 시험 출제 전문가입니다. 주어진 취약 개념을 바탕으로 예상 문제를 JSON으로만 응답하세요.\n"
    + "형식: {\"question\":\"문제\",\"choices\":[{\"label\":\"A\",\"text\":\"...\"},{\"label\":\"B\",\"text\":\"...\"},{\"label\":\"C\",\"text\":\"...\"},{\"label\":\"D\",\"text\":\"...\"},{\"label\":\"E\",\"text\":\"...\"}],\"answer\":\"정답레이블\",\"explanation\":\"해설\"}\n"
    + "반드시 취약 개념 중 하나를 다루는 5지선다형 문제를 출제하고 JSON만 반환하세요.";

  const text = await callClaude(
    apiKey,
    [{ role: "user", content: "[" + stackName + "] 취약 개념: " + context + "\n\n이 개념들에 관한 예상 문제 1개를 출제해주세요." }],
    system,
    "claude-haiku-4-5-20251001"
  );

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return null;
};

/* ─── Context Briefing ─── */
export const getContextBriefing = async (apiKey, stackName, lastMessages) => {
  if (IS_DEMO(apiKey)) {
    await delay(500);
    return stackName + ' 핵심 개념을 지난번에 공부했어요. 다음 할 일: 예상 문제 풀기 + 취약 개념 복습을 추천해요.';
  }
  const recent = lastMessages.slice(-6).map((m) => m.role + ': ' + m.content.slice(0, 80)).join('\n');
  return callClaude(apiKey, [{ role: 'user', content: '[' + stackName + '] 최근 대화:\n' + recent + '\n\n지난번에 무엇을 공부했고 다음에 무엇을 해야 하는지 40자 이내 한 문장으로 브리핑.' }], '학습 코치. 간결하고 동기부여 되는 브리핑을 한국어로.', 'claude-haiku-4-5-20251001');
};

/* ─── Resource Suggestions ─── */
export const suggestResources = async (apiKey, stackName) => {
  if (IS_DEMO(apiKey)) {
    await delay(600);
    return [
      { title: stackName + ' 공식 시험 안내', url: 'https://www.q-net.or.kr' },
      { title: stackName + ' 기출문제 모음', url: 'https://www.comcbt.com' },
      { title: 'YouTube 무료 강의', url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(stackName) },
    ];
  }
  const text = await callClaude(apiKey, [{ role: 'user', content: stackName + ' 시험 준비 리소스 3-5개 JSON 배열로만: [{"title":"제목","url":"https://..."}]' }], '시험 전문가. 실제 존재하는 학습 리소스만 JSON으로.', 'claude-haiku-4-5-20251001');
  try { const m = text.match(/\[[\s\S]*\]/); if (m) return JSON.parse(m[0]); } catch {}
  return [];
};

/* ─── Resume Material Converter ─── */
export const convertMaterialToResume = async (apiKey, material) => {
  if (IS_DEMO(apiKey)) {
    await delay(700);
    return '저는 ' + material.category + ' 역량을 쌓는 과정에서 목표를 향해 능동적으로 학습하며 구체적인 성과를 이루었습니다. 이 경험을 통해 문제를 체계적으로 해결하는 역량을 키웠습니다.';
  }
  return callClaude(apiKey, [{ role: 'user', content: '소재: ' + material.content + '\n카테고리: ' + material.category + '\n자소서 문장 2-3개로 변환해주세요.' }], '자기소개서 전문 코치. 설득력 있는 자소서 문장으로 변환.', 'claude-haiku-4-5-20251001');
};

/* ─── Tomorrow Forecast ─── */
export const getTomorrowForecast = async (apiKey, stacks, studyActivity) => {
  if (IS_DEMO(apiKey)) {
    await delay(700);
    const urgent = stacks.filter((s) => !s.passed && s.examDate).sort((a, b) => Math.ceil((new Date(a.examDate) - new Date()) / 86400000) - Math.ceil((new Date(b.examDate) - new Date()) / 86400000));
    if (!urgent.length) return '내일: 균형 잡힌 학습일로 추천\n· 각 스택 30분씩 복습\n· 오답 노트 정리';
    const top = urgent[0];
    const d = Math.ceil((new Date(top.examDate) - new Date()) / 86400000);
    return '⚠ ' + top.name + ' D-' + d + ' 임박\n· 오전 2시간 ' + top.name + ' 집중 권장' + (urgent[1] ? '\n· 오후 1시간 ' + urgent[1].name + ' 배정' : '') + '\n· 저녁 30분 오답 노트 복습';
  }
  const recentDays = [0,1,2].map((i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return d.toISOString().split('T')[0]; });
  const act = recentDays.map((d) => d + ':' + (studyActivity[d]||0)).join(', ');
  const info = stacks.filter((s) => !s.passed).map((s) => { const d = s.examDate ? Math.ceil((new Date(s.examDate)-new Date())/86400000) : null; return s.name+' '+(s.progress||0)+'% D-'+(d??'?'); }).join(', ');
  return callClaude(apiKey, [{ role: 'user', content: '스택: ' + info + '\n최근 활동: ' + act + '\n내일 공부 예보 3줄, 시간대별.' }], '학습 플래너. 현실적인 내일 공부 예보를 한국어로.', 'claude-haiku-4-5-20251001');
};

/* ─── Counseling Log Analyzer ─── */
export const analyzeCounselingLog = async (apiKey, content, materials) => {
  if (IS_DEMO(apiKey)) {
    await delay(800);
    return { summary: '1. 직무 역량 보완 필요 (SQL, Python 강화)\n2. 수치 기반 성과 경험 자소서 반영\n3. 지원 동기 구체화 필요', keywords: ['직무 역량', '수치 데이터', '자소서 강화'], gaps: '저장된 소재 중 "문제 해결" 카테고리가 부족합니다. 프로젝트 경험 소재 추가를 권장해요.' };
  }
  const matSummary = materials.slice(0, 5).map((m) => m.category + ': ' + m.content.slice(0, 50)).join('\n');
  const text = await callClaude(apiKey, [{ role: 'user', content: '상담:\n' + content + '\n소재:\n' + (matSummary||'없음') }], '취업 컨설턴트. JSON만 응답: {"summary":"피드백 3줄","keywords":["키워드1"],"gaps":"소재 갭 분석"}', 'claude-haiku-4-5-20251001');
  try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return { summary: text, keywords: [], gaps: '' };
};

/* ─── Job Fit Actions ─── */
export const getJobFitActions = async (apiKey, job, stacks) => {
  if (IS_DEMO(apiKey)) {
    await delay(700);
    const top = stacks.filter((s) => !s.passed)[0];
    return '· ' + (top?.name||'스택') + ' 진도 ' + (top?.progress||0) + '% → 오늘 2시간 투자 시 합격 확률 +8%\n· ' + (job.company||'이 회사') + ' JD 핵심 역량을 자소서에 반영하세요\n· 관련 자격증 취득 일정 확인 후 D-day 조정 권장';
  }
  const info = stacks.filter((s) => !s.passed).map((s) => s.name+' '+(s.progress||0)+'%').join(', ');
  return callClaude(apiKey, [{ role: 'user', content: '공고: ' + job.company + ' ' + job.position + '\n' + (job.notes||'').slice(0,500) + '\n내 현황: ' + info + '\n합격 확률 높이는 오늘 액션 3가지' }], '취업 전략가. 즉시 실행 가능한 액션 아이템을 한국어로.', 'claude-haiku-4-5-20251001');
};

/* ─── Job Fit Detailed Analysis ─── */
export const analyzeJobFitDetailed = async (apiKey, jobNotes, stacks, resumeMaterials) => {
  if (IS_DEMO(apiKey)) {
    await delay(900);
    const adsp = stacks.find(s => s.name === 'ADsP');
    const pcsl = stacks.find(s => s.name?.toLowerCase().includes('pcsl'));
    return {
      fitScore: 68,
      keywords: [
        { name: 'ADsP', type: '자격증', myProgress: adsp?.progress ?? null, rating: adsp ? '진행중' : '준비필요' },
        { name: 'SQL', type: '기술스택', myProgress: null, rating: '준비필요' },
        { name: 'Python', type: '기술스택', myProgress: pcsl?.progress ?? null, rating: pcsl ? '진행중' : '준비필요' },
        { name: '데이터 분석', type: '우대사항', myProgress: null, rating: (resumeMaterials||[]).length > 0 ? '소재있음' : '준비필요' },
      ],
      actionItems: [
        { text: 'ADsP 오늘 2시간 투자 시 적합도 +8%', gain: 8, stackId: adsp?.id || null },
        { text: 'SQL 기초 자료를 Resource Hub에 추가하세요', gain: 5, stackId: null },
        { text: '데이터 분석 소재를 자소서 문장으로 변환하세요', gain: 4, stackId: null },
      ],
    };
  }
  const stackInfo = stacks.filter(s => !s.passed).map(s => `${s.name}: 진도 ${s.progress||0}%`).join(', ');
  const matCategories = (resumeMaterials||[]).slice(0,10).map(m => m.category).join(', ') || '없음';
  const system = '당신은 취업 전략가입니다. 채용공고와 지원자 현황을 분석하여 JSON으로만 응답하세요.\n'
    + '형식: {"fitScore":숫자,"keywords":[{"name":"키워드","type":"자격증|기술스택|우대사항","myProgress":숫자|null,"rating":"준비완료|진행중|준비필요|소재있음"}],"actionItems":[{"text":"오늘 할 일 적합도 +N% 형식","gain":숫자,"stackId":null}]}\n'
    + 'keywords 최대 5개, actionItems 최대 3개. JSON만 반환.';
  const text = await callClaude(apiKey, [{ role: 'user', content: `채용공고:\n${jobNotes.slice(0,1500)}\n\n내 현황:\n스택: ${stackInfo}\n소재: ${matCategories}` }], system, 'claude-haiku-4-5-20251001');
  try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return { fitScore: 65, keywords: [], actionItems: [] };
};

/* ─── Exam Registration OCR ─── */
export const analyzeExamRegistration = async (apiKey, imageBase64, mimeType) => {
  if (IS_DEMO(apiKey)) {
    await delay(1000);
    return { examName: 'ADsP (데이터분석 준전문가)', examDate: '2026-04-05', location: '서울 강남구 코엑스', subjects: '데이터이해, 데이터분석기획, 데이터분석 처리기술' };
  }
  const res = await fetch(BASE, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
          { type: 'text', text: '이 시험 접수증에서 정보를 추출하여 JSON으로만 응답하세요: {"examName":"시험명","examDate":"YYYY-MM-DD 형식","location":"시험장 위치","subjects":"과목 구성"}. 해당 정보가 없으면 null로 설정.' }
        ]
      }]
    }),
  });
  if (!res.ok) throw new Error('OCR API error ' + res.status);
  const data = await res.json();
  const text = data.content[0].text;
  try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return { examName: null, examDate: null, location: null, subjects: null };
};

/* ─── Merge Engine Plan ─── */
export const getMergeEnginePlan = async (apiKey, stacks, totalHours) => {
  const active = stacks.filter(s => !s.passed && s.examDate);
  if (!active.length) return null;
  if (IS_DEMO(apiKey)) {
    await delay(1000);
    const today = new Date();
    const nearest = [...active].sort((a,b) => new Date(a.examDate)-new Date(b.examDate))[0];
    const range = Math.min(14, Math.max(1, Math.ceil((new Date(nearest.examDate)-today)/86400000)));
    const days = [];
    for (let i = 0; i < range; i++) {
      const d = new Date(today); d.setDate(today.getDate()+i);
      const dateStr = d.toISOString().split('T')[0];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const avail = isWeekend ? totalHours * 0.7 : totalHours;
      const items = active.map((s, idx) => {
        const dday = Math.ceil((new Date(s.examDate)-today)/86400000)-i;
        const w = dday <= 7 ? 0.7 : dday <= 30 ? 0.5 : 0.3;
        const weight = idx === 0 ? w : active.length > 1 ? (1-w)/(active.length-1) : w;
        return { stackId: s.id, stackName: s.name, hours: Math.round(avail*weight*2)/2, color: s.color };
      });
      const bottleneck = active.filter(s => { const d2 = Math.ceil((new Date(s.examDate)-today)/86400000)-i; return d2 >= 0 && d2 <= 7 && (s.progress||0) < 70; }).length > 1;
      days.push({ date: dateStr, items, bottleneck });
    }
    return { days, advice: '시험이 겹치는 구간(빨간색 병목)은 우선순위 높은 스택에 집중하세요. 각 날짜 배분은 D-day와 진도율을 종합한 결과입니다.' };
  }
  const info = active.map(s => { const d = Math.ceil((new Date(s.examDate)-new Date())/86400000); return `${s.name}(id:${s.id},color:${s.color}): 진도 ${s.progress||0}%, D-${d}`; }).join('\n');
  const system = '당신은 수험 플래너입니다. 전체 스택 최적 일정을 JSON으로만 응답하세요.\n'
    + '형식: {"days":[{"date":"YYYY-MM-DD","items":[{"stackId":"id","stackName":"이름","hours":숫자,"color":"색상코드"}],"bottleneck":bool}],"advice":"전략 요약"}\n'
    + '오늘부터 가장 가까운 시험일까지. hours는 0.5 단위. JSON만 반환.';
  const text = await callClaude(apiKey, [{ role: 'user', content: `스택:\n${info}\n하루 가용: ${totalHours}시간\n\n최적 일정을 계산해주세요.` }], system, 'claude-haiku-4-5-20251001');
  try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return null;
};

/* ─── Context Continue Question ─── */
export const getContextContinueQuestion = async (apiKey, stackName, lastMessages) => {
  if (IS_DEMO(apiKey)) {
    await delay(500);
    const last = [...lastMessages].reverse().find(m => m.role === 'user');
    const topic = last?.content?.slice(0,30) || '지난 개념';
    return `지난번 ${topic} 이어서 다음 파트 설명해줘.`;
  }
  const recent = lastMessages.slice(-4).map(m => m.role+': '+m.content.slice(0,100)).join('\n');
  return callClaude(apiKey, [{ role: 'user', content: `[${stackName}] 최근 대화:\n${recent}\n\n이어서 할 질문 1개 (30자 이내, 자연스럽게 연결)` }], '학습 튜터. 이전 내용과 자연스럽게 연결되는 질문을 한국어로.', 'claude-haiku-4-5-20251001');
};
