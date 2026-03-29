import React, { useState, useRef } from 'react';

export default function LandingPage({ onGetStarted, onOpenAuth }) {
  const handleCTA = onOpenAuth ?? onGetStarted;
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  const handleMouseMove = (e) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = ((e.clientY - cy) / rect.height) * 4;
    const ry = ((e.clientX - cx) / rect.width) * -4;
    setTilt({ x: rx, y: ry });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div style={{ background: '#f5f5f3', minHeight: '100vh' }}>
      {/* Fixed Nav */}
      <nav
        style={{ background: 'rgba(245,245,243,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
      >
        {/* Logo */}
        <span
          className="shimmer-text font-black text-xl tracking-tight cursor-pointer select-none"
          onClick={handleCTA}
        >
          mergee
        </span>

        {/* Center links */}
        <div className="flex items-center gap-8">
          <a
            href="#features"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200 font-medium"
          >
            features
          </a>
          <a
            href="#roadmap"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200 font-medium"
          >
            roadmap
          </a>
        </div>

        {/* Right CTAs */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCTA}
            className="text-sm font-semibold text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200"
          >
            log in
          </button>
          <button
            onClick={handleCTA}
            className="bg-[#111] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-gray-800 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            get started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background Orbs */}
        <div
          className="orb-float absolute rounded-full pointer-events-none"
          style={{
            width: 640,
            height: 640,
            top: '-120px',
            left: '-160px',
            background: 'radial-gradient(circle, rgba(210,210,210,0.25) 0%, transparent 70%)',
            filter: 'blur(60px)',
            zIndex: 0,
          }}
        />
        <div
          className="orb-float absolute rounded-full pointer-events-none"
          style={{
            width: 580,
            height: 580,
            bottom: '-100px',
            right: '-140px',
            background: 'radial-gradient(circle, rgba(200,200,200,0.22) 0%, transparent 70%)',
            filter: 'blur(60px)',
            zIndex: 0,
            animationDelay: '1.5s',
          }}
        />

        {/* Title Block with 3D tilt */}
        <div
          className="relative z-10 text-center"
          style={{
            transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {/* Holographic reflection */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '10%',
              right: '10%',
              bottom: '-18px',
              height: '60px',
              background: 'linear-gradient(90deg, #f9a8d4, #fde68a, #bbf7d0, #93c5fd, #c4b5fd)',
              filter: 'blur(28px)',
              opacity: 0.22,
              transform: 'skewX(-6deg) translateY(10px)',
              borderRadius: '50%',
              zIndex: -1,
            }}
          />

          {/* Main heading */}
          <h1
            style={{
              fontSize: 'clamp(52px, 7vw, 80px)',
              fontWeight: 900,
              color: '#111',
              letterSpacing: '-2px',
              lineHeight: 1,
              margin: 0,
            }}
          >
            not merged yet.
          </h1>
          <h1
            className="shimmer-text"
            style={{
              fontSize: 'clamp(52px, 7vw, 80px)',
              fontWeight: 900,
              letterSpacing: '-2px',
              lineHeight: 1,
              margin: 0,
              marginTop: '6px',
            }}
          >
            keep going.
          </h1>

          {/* Rainbow line */}
          <div
            className="rainbow-line mx-auto mt-8"
            style={{ height: '2px', width: '180px', borderRadius: '99px', opacity: 0.7 }}
          />

          {/* Subtext */}
          <p
            className="mt-5 text-gray-400 font-medium tracking-wide"
            style={{ fontSize: '15px', letterSpacing: '0.04em' }}
          >
            study hard. get merged.
          </p>

          {/* CTA */}
          <button
            onClick={handleCTA}
            className="mt-10 inline-flex items-center gap-2 bg-[#111] text-white font-semibold rounded-2xl transition-all duration-200 hover:scale-105 hover:bg-gray-800 active:scale-95"
            style={{ fontSize: '16px', padding: '16px 32px' }}
          >
            start grinding →
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-8" style={{ background: '#f5f5f3' }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            features
          </p>
          <h2
            className="text-center font-black text-gray-900 mb-16"
            style={{ fontSize: 'clamp(32px, 4vw, 48px)', letterSpacing: '-1px' }}
          >
            everything you need to merge.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🤖',
                title: 'AI tutor',
                desc: 'Claude-powered study sessions tailored to your exam stack. Ask anything, get precise answers.',
              },
              {
                icon: '📋',
                title: 'daily plans',
                desc: 'Auto-generated study missions based on your D-day and progress. No more guessing what to do.',
              },
              {
                icon: '⏱',
                title: 'focus timer',
                desc: 'Track every study session. Hit your daily goal and watch the progress bar fill up.',
              },
              {
                icon: '📌',
                title: 'wrong notes',
                desc: 'Save AI answers you got wrong. Build a personal mistake library to review before exams.',
              },
              {
                icon: '📈',
                title: 'pass probability',
                desc: 'Real-time pass probability engine. Stay motivated with honest (and slightly optimistic) projections.',
              },
              {
                icon: '🔥',
                title: 'study streaks',
                desc: 'Build momentum with daily streaks. Miss a day and feel it. Stay consistent and level up.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2" style={{ fontSize: '16px' }}>
                  {f.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section id="roadmap" className="py-32 px-8" style={{ background: '#efefed' }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
            roadmap
          </p>
          <h2
            className="text-center font-black text-gray-900 mb-14"
            style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', letterSpacing: '-1px' }}
          >
            what's coming next.
          </h2>

          <div className="flex flex-col gap-4">
            {[
              { status: 'live', label: 'AI chat tutor per stack' },
              { status: 'live', label: 'daily plan generation' },
              { status: 'live', label: 'wrong note library' },
              { status: 'live', label: 'study timer + sessions' },
              { status: 'soon', label: 'spaced repetition reviews' },
              { status: 'soon', label: 'mock exam simulator' },
              { status: 'later', label: 'study group rooms' },
              { status: 'later', label: 'mobile app' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between bg-white rounded-xl px-5 py-4 shadow-sm"
              >
                <span className="text-gray-800 font-medium text-sm">{item.label}</span>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    item.status === 'live'
                      ? 'bg-green-100 text-green-700'
                      : item.status === 'soon'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {item.status === 'live' ? '✓ live' : item.status === 'soon' ? 'soon' : 'later'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 px-8 text-center" style={{ background: '#f5f5f3' }}>
        <h2
          className="font-black text-gray-900 mb-4"
          style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-1.5px' }}
        >
          ready to get{' '}
          <span className="shimmer-text">merged?</span>
        </h2>
        <p className="text-gray-400 mb-10 text-base">
          join the grind. your PR is waiting.
        </p>
        <button
          onClick={handleCTA}
          className="inline-flex items-center gap-2 bg-[#111] text-white font-semibold rounded-2xl transition-all duration-200 hover:scale-105 hover:bg-gray-800 active:scale-95"
          style={{ fontSize: '16px', padding: '16px 36px' }}
        >
          start grinding →
        </button>
      </section>

      {/* Footer */}
      <footer
        className="text-center py-8 text-xs text-gray-400"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
      >
        <span className="shimmer-text font-bold">mergee</span>
        {'  '}·{'  '}study hard, get merged.
      </footer>
    </div>
  );
}
