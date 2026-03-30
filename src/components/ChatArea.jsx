import React, { useState, useRef, useEffect } from 'react';
import { callClaude, IS_DEMO } from '../utils/claude';
import { formatTime, getDday, formatDday, getDdayBadgeClass } from '../utils/helpers';
import Timer from './Timer';
import QuizMode from './QuizMode';
import ContextBriefing from './ContextBriefing';
import ResourceHub from './ResourceHub';
import ResumeMaterialModal from './ResumeMaterialModal';
import StackLibrary from './StackLibrary';

/* ────────────── Typing Indicator ────────────── */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">AI</div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot" />)}
        </div>
      </div>
    </div>
  );
}

/* ────────────── Message Bubble ────────────── */
function MessageBubble({ message, onSave, saving, onSaveMaterial, savingMaterial }) {
  const [hover, setHover] = useState(false);
  const isAI = message.role === 'assistant';

  return (
    <div
      className={`flex items-end gap-2 mb-4 ${isAI ? '' : 'flex-row-reverse'}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {isAI && (
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0 mb-5">AI</div>
      )}
      <div className="max-w-[72%] relative">
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
          isAI ? 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm' : 'bg-[#111] text-white rounded-br-sm'
        }`}>
          {message.content}
        </div>
        <div className={`text-[10px] text-gray-400 mt-1 ${isAI ? 'text-left pl-1' : 'text-right pr-1'}`}>
          {formatTime(message.timestamp)}
        </div>

        {isAI && hover && (
          <div className="absolute -bottom-0.5 right-0 flex gap-1">
            <button
              onClick={() => onSaveMaterial(message)}
              disabled={savingMaterial}
              className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 hover:border-purple-300 text-gray-400 hover:text-purple-600 rounded-full shadow-sm transition-all"
            >
              {savingMaterial ? '저장 중…' : '소재'}
            </button>
            <button
              onClick={() => onSave(message)}
              disabled={saving}
              className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 hover:border-gray-400 text-gray-400 hover:text-gray-700 rounded-full shadow-sm transition-all"
            >
              {saving ? '저장 중…' : 'save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────── ChatArea ────────────── */
export default function ChatArea({
  stack,
  messages,
  apiKey,
  onSendMessage,
  onSaveWrongNote,
  onSaveResumeMaterial,
  goalMinutes,
  onSaveSession,
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [savingMaterialId, setSavingMaterialId] = useState(null);
  const [listening, setListening] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'library'
  const [showBriefing, setShowBriefing] = useState(false);
  const [materialMsg, setMaterialMsg] = useState(null); // message to save as material
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const prevStackIdRef = useRef(null);

  const dday = getDday(stack?.examDate);

  // Show briefing card when switching to a stack with existing messages
  useEffect(() => {
    if (!stack) return;
    if (prevStackIdRef.current && prevStackIdRef.current !== stack.id && messages.length > 0) {
      setShowBriefing(true);
    }
    prevStackIdRef.current = stack.id;
    setActiveTab('chat');
  }, [stack?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const noKey = !apiKey;

  const send = async () => {
    const text = input.trim();
    if (!text || loading || noKey) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    const userMsg = { id: String(Date.now()), role: 'user', content: text, timestamp: new Date().toISOString() };
    onSendMessage(userMsg, null);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const reply = await callClaude(apiKey, history, stack?.systemPrompt || '당신은 친절하고 유능한 학습 튜터입니다.');
      onSendMessage(null, { id: String(Date.now() + 1), role: 'assistant', content: reply, timestamp: new Date().toISOString() });
    } catch (e) {
      onSendMessage(null, { id: String(Date.now() + 1), role: 'assistant', content: '⚠️ error: ' + e.message, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async (msg) => {
    setSavingId(msg.id);
    try { await onSaveWrongNote(msg, stack); } finally { setSavingId(null); }
  };

  const handleSaveMaterial = (msg) => setMaterialMsg(msg);

  const handleContinue = async (question) => {
    if (!question || loading || noKey) return;
    setLoading(true);
    const userMsg = { id: String(Date.now()), role: 'user', content: question, timestamp: new Date().toISOString() };
    onSendMessage(userMsg, null);
    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const reply = await callClaude(apiKey, history, stack?.systemPrompt || '당신은 친절하고 유능한 학습 튜터입니다.');
      onSendMessage(null, { id: String(Date.now() + 1), role: 'assistant', content: reply, timestamp: new Date().toISOString() });
    } catch (e) {
      onSendMessage(null, { id: String(Date.now() + 1), role: 'assistant', content: '⚠️ error: ' + e.message, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  const confirmSaveMaterial = (material) => {
    onSaveResumeMaterial({ ...material, stackId: stack?.id, stackName: stack?.name });
    setMaterialMsg(null);
  };

  const toggleSpeech = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported (try Chrome)'); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.lang = 'en-US'; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => setInput(Array.from(e.results).map((x) => x[0].transcript).join(''));
    r.onend = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
  };

  if (!stack) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
        <div className="text-center opacity-50">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-gray-400 text-sm">select a stack from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-3 flex-shrink-0">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stack.color }} />
        <h2 className="font-semibold text-gray-800 text-sm">{stack.name}</h2>

        {dday !== null && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getDdayBadgeClass(dday)}`}>{formatDday(dday)}</span>
        )}
        {stack.examDate && (
          <span className="text-[11px] text-gray-400">
            {new Date(stack.examDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Progress mini bar */}
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${stack.progress || 0}%`, backgroundColor: stack.color }} />
            </div>
            <span className="text-[11px] text-gray-400">{stack.progress || 0}%</span>
          </div>

          {/* Tabs: chat | quiz | library */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              chat
            </button>
            <button
              onClick={() => setShowQuiz(true)}
              className="h-7 px-3 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
            >
              quiz
            </button>
            <button
              onClick={() => setActiveTab(activeTab === 'library' ? 'chat' : 'library')}
              className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'library' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              library
            </button>
          </div>

          {/* Voice button */}
          <button onClick={toggleSpeech} title="voice input"
            className={`h-9 w-9 flex items-center justify-center rounded-xl text-xs font-semibold transition-colors ${
              listening ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Library tab */}
      {activeTab === 'library' ? (
        <StackLibrary stack={stack} apiKey={apiKey} />
      ) : (
        <>
          {/* Timer bar */}
          <Timer stackId={stack.id} goalMinutes={goalMinutes} onSaveSession={onSaveSession} />

          {/* Context briefing */}
          {showBriefing && messages.length > 0 && (
            <ContextBriefing
              stack={stack}
              messages={messages}
              apiKey={apiKey}
              onDismiss={() => setShowBriefing(false)}
              onContinue={handleContinue}
            />
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full pb-12 opacity-60">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl mb-3 font-bold" style={{ backgroundColor: stack.color }}>
                  {stack.name.charAt(0)}
                </div>
                <p className="text-gray-600 font-semibold">{stack.name} tutor</p>
                <p className="text-gray-400 text-xs mt-1">ask anything to start the session</p>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSave={saveNote}
                saving={savingId === msg.id}
                onSaveMaterial={handleSaveMaterial}
                savingMaterial={savingMaterialId === msg.id}
              />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="bg-white border-t border-gray-100 px-4 py-3 flex-shrink-0">
            {listening && (
              <div className="flex items-center gap-1.5 text-[11px] text-red-500 mb-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                listening... speak now (en-US)
              </div>
            )}
            {noKey && <p className="text-[11px] text-amber-500 mb-2 text-center">⚠ API key not set — click ⚙ in the sidebar to add it</p>}
            {IS_DEMO(apiKey) && !noKey && <p className="text-[11px] text-gray-400 mb-2 text-center">🧪 demo mode — mock responses only</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="ask anything..."
                rows={1}
                className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none overflow-hidden"
                style={{ minHeight: '42px', maxHeight: '120px' }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading || noKey}
                className="p-2.5 bg-[#111] hover:bg-gray-800 disabled:bg-gray-200 text-white rounded-2xl transition-colors flex-shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Quiz Modal */}
      {showQuiz && <QuizMode stack={stack} apiKey={apiKey} onClose={() => setShowQuiz(false)} onSaveWrongNote={onSaveWrongNote} />}

      {/* Resume Material Modal */}
      {materialMsg && (
        <ResumeMaterialModal
          content={materialMsg.content}
          onSave={confirmSaveMaterial}
          onClose={() => setMaterialMsg(null)}
        />
      )}
    </div>
  );
}
