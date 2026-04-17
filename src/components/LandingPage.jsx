import React, { useState, useRef } from 'react';

/* ── Inline SVG icons ── */
function IconCampus() {
  return (
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14V20M5.5 11.5V17"/>
    </svg>
  );
}
function IconHabit() {
  return (
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
  );
}
function IconCounseling() {
  return (
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
    </svg>
  );
}
function IconDailyLog() {
  return (
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
    </svg>
  );
}

const FEATURES = [
  {
    Icon: IconCampus,
    accent: '#6366f1',
    title: 'campus life',
    desc: 'AI timetable scanner. One screenshot of your Everytime schedule, and your campus life syncs automatically.',
  },
  {
    Icon: IconHabit,
    accent: '#10b981',
    title: 'habit tracker',
    desc: 'Sustainable routine management. Visualize your growth on a monthly matrix and grow your activity garden.',
  },
  {
    Icon: IconCounseling,
    accent: '#f59e0b',
    title: 'AI counseling log',
    desc: 'Deep session analysis. Your raw consultation notes become structured feedback reports and action items — powered by AI.',
  },
  {
    Icon: IconDailyLog,
    accent: '#0ea5e9',
    title: 'smart daily log',
    desc: 'Memo-first daily management. Todos, long-form notes, and task imports — all in one fluid, distraction-free canvas.',
  },
];

const ROADMAP = [
  { status: 'live',  label: 'AI chat tutor per stack' },
  { status: 'live',  label: 'AI timetable image recognition' },
  { status: 'live',  label: 'habit tracker + activity matrix' },
  { status: 'live',  label: 'AI counseling log analysis' },
  { status: 'live',  label: 'expanded daily log layout' },
  { status: 'live',  label: 'wrong note library' },
  { status: 'soon',  label: 'mobile app (PWA / Capacitor)' },
  { status: 'soon',  label: 'Everytime grade sync automation' },
  { status: 'later', label: 'team sharing & collaboration' },
  { status: 'later', label: 'personalized AI interview coaching' },
];

export default function LandingPage({ onGetStarted, onOpenAuth, onDemo }) {
  const handleCTA = onOpenAuth ?? onGetStarted;
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoPass, setDemoPass] = useState('');
  const [demoError, setDemoError] = useState(false);

  const handleDemoSubmit = (e) => {
    e?.preventDefault();
    if (demoPass === 'mergee-dev') {
      setShowDemoModal(false);
      setDemoPass('');
      setDemoError(false);
      onDemo?.();
    } else {
      setDemoError(true);
    }
  };

  const handleMouseMove = (e) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setTilt({
      x: ((e.clientY - cy) / rect.height) * 4,
      y: ((e.clientX - cx) / rect.width) * -4,
    });
  };

  return (
    <div style={{ background: '#f5f5f3', minHeight: '100vh' }}>

      {/* ── Fixed Nav ── */}
      <nav
        style={{ background: 'rgba(245,245,243,0.88)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        className="fixed top-0 left-0 right-0 z-50 px-8 py-4"
      >
        {/* 3-column grid ensures center links are always truly centered */}
        <div className="max-w-6xl mx-auto grid grid-cols-3 items-center">
          {/* Left: logo */}
          <div>
            <span
              className="shimmer-text font-black text-xl tracking-tight cursor-pointer select-none"
              onClick={handleCTA}
            >
              mergee
            </span>
          </div>

          {/* Center: nav links — perfectly centered */}
          <div className="flex items-center justify-center gap-8">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
              features
            </a>
            <a href="#roadmap" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
              roadmap
            </a>
          </div>

          {/* Right: CTAs */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleCTA}
              className="text-sm font-semibold text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all"
            >
              log in
            </button>
            <button
              onClick={handleCTA}
              className="bg-[#111] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
            >
              get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background orbs */}
        <div className="orb-float absolute rounded-full pointer-events-none" style={{
          width: 640, height: 640, top: '-120px', left: '-160px',
          background: 'radial-gradient(circle, rgba(210,210,210,0.25) 0%, transparent 70%)',
          filter: 'blur(60px)', zIndex: 0,
        }}/>
        <div className="orb-float absolute rounded-full pointer-events-none" style={{
          width: 580, height: 580, bottom: '-100px', right: '-140px',
          background: 'radial-gradient(circle, rgba(200,200,200,0.22) 0%, transparent 70%)',
          filter: 'blur(60px)', zIndex: 0, animationDelay: '1.5s',
        }}/>

        {/* Title block */}
        <div
          className="relative z-10 text-center px-6"
          style={{
            transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: 'transform 0.18s cubic-bezier(0.25,0.46,0.45,0.94)',
          }}
        >
          {/* Holographic glow */}
          <div aria-hidden="true" style={{
            position: 'absolute', left: '10%', right: '10%', bottom: '-18px', height: '60px',
            background: 'linear-gradient(90deg, #f9a8d4, #fde68a, #bbf7d0, #93c5fd, #c4b5fd)',
            filter: 'blur(28px)', opacity: 0.22,
            transform: 'skewX(-6deg) translateY(10px)', borderRadius: '50%', zIndex: -1,
          }}/>

          <h1 style={{ fontSize: 'clamp(52px,7vw,80px)', fontWeight: 900, color: '#111', letterSpacing: '-2px', lineHeight: 1, margin: 0 }}>
            not merged yet.
          </h1>
          <h1 className="shimmer-text" style={{ fontSize: 'clamp(52px,7vw,80px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1, margin: 0, marginTop: '6px' }}>
            keep going.
          </h1>

          <div className="rainbow-line mx-auto mt-8" style={{ height: '2px', width: '180px', borderRadius: '99px', opacity: 0.7 }}/>

          <p className="mt-5 text-gray-400 font-medium" style={{ fontSize: '15px', letterSpacing: '0.04em' }}>
            study hard. get merged.
          </p>

          <button
            onClick={handleCTA}
            className="mt-10 inline-flex items-center gap-2 bg-[#111] text-white font-semibold rounded-2xl transition-all hover:scale-105 hover:bg-gray-800 active:scale-95"
            style={{ fontSize: '16px', padding: '16px 32px' }}
          >
            start grinding →
          </button>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-6" style={{ background: '#f5f5f3' }}>
        <div className="max-w-5xl mx-auto">
          {/* Section label */}
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            features
          </p>
          <h2
            className="text-center font-black text-gray-900 mb-16"
            style={{ fontSize: 'clamp(30px,4vw,46px)', letterSpacing: '-1px' }}
          >
            everything you need to merge.
          </h2>

          {/* 2 × 2 feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map(({ Icon, accent, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-md transition-all duration-200 group"
                style={{ borderTop: `3px solid ${accent}` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
                  style={{ backgroundColor: accent + '18', color: accent }}
                >
                  <Icon />
                </div>
                <h3 className="font-black text-gray-900 mb-2" style={{ fontSize: '17px', letterSpacing: '-0.3px' }}>
                  {title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section id="roadmap" className="py-28 px-6" style={{ background: '#efefed' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            roadmap
          </p>
          <h2
            className="text-center font-black text-gray-900 mb-14"
            style={{ fontSize: 'clamp(26px,3.5vw,42px)', letterSpacing: '-1px' }}
          >
            what's coming next.
          </h2>

          <div className="flex flex-col gap-3">
            {ROADMAP.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between bg-white rounded-xl px-5 py-4 shadow-sm"
              >
                <span className="text-gray-800 font-medium text-sm">{item.label}</span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ml-4 ${
                  item.status === 'live'
                    ? 'bg-emerald-100 text-emerald-700'
                    : item.status === 'soon'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.status === 'live' ? '✓ live' : item.status === 'soon' ? 'soon' : 'later'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="py-28 px-6 text-center" style={{ background: '#f5f5f3' }}>
        <div className="max-w-2xl mx-auto">
          <h2
            className="font-black text-gray-900 mb-4"
            style={{ fontSize: 'clamp(32px,4vw,52px)', letterSpacing: '-1.5px' }}
          >
            ready to get <span className="shimmer-text">merged?</span>
          </h2>
          <p className="text-gray-400 mb-10 text-base">
            join the grind. your PR is waiting.
          </p>
          <button
            onClick={handleCTA}
            className="inline-flex items-center gap-2 bg-[#111] text-white font-semibold rounded-2xl transition-all hover:scale-105 hover:bg-gray-800 active:scale-95"
            style={{ fontSize: '16px', padding: '16px 36px' }}
          >
            start grinding →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="text-center py-8 text-xs text-gray-400" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <span className="shimmer-text font-bold">mergee</span>
        {'  '}·{'  '}study hard, get merged.
        <div className="mt-2">
          <button
            onClick={() => { setShowDemoModal(true); setDemoError(false); setDemoPass(''); }}
            className="text-[11px] text-gray-300 hover:text-gray-400 transition-colors hover:underline underline-offset-2"
          >
            developer demo
          </button>
        </div>
      </footer>

      {/* ── Demo modal ── */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">developer demo</p>
            <h3 className="text-lg font-black text-gray-900 mb-5">enter password</h3>
            <form onSubmit={handleDemoSubmit}>
              <input
                type="password"
                value={demoPass}
                onChange={(e) => { setDemoPass(e.target.value); setDemoError(false); }}
                placeholder="password"
                autoFocus
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none transition-colors ${
                  demoError ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-gray-400'
                }`}
              />
              {demoError && <p className="text-xs text-red-500 mt-1.5 font-medium">incorrect password.</p>}
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowDemoModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
                  cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#111] text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
                  confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
