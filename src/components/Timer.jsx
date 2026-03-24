import React, { useState, useEffect, useRef } from 'react';

export default function Timer({ stackId, goalMinutes, onSaveSession }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const secondsRef = useRef(0);

  // Keep ref in sync with state for use in unmount cleanup
  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  // Start/stop interval
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Auto-save on unmount if running and enough time elapsed
  useEffect(() => {
    return () => {
      if (secondsRef.current > 60) {
        onSaveSession?.(Math.floor(secondsRef.current / 60));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartPause = () => {
    setRunning((r) => !r);
  };

  const handleStop = () => {
    setRunning(false);
    if (seconds > 60) {
      onSaveSession?.(Math.floor(seconds / 60));
    }
  };

  const handleReset = () => {
    setRunning(false);
    setSeconds(0);
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  };

  const goalSecs = (goalMinutes || 0) * 60;
  const progress = goalSecs > 0 ? Math.min(100, (seconds / goalSecs) * 100) : 0;
  const goalReached = goalSecs > 0 && seconds >= goalSecs;
  const minsLeft = goalSecs > 0 ? Math.max(0, Math.ceil((goalSecs - seconds) / 60)) : 0;

  return (
    <div className="bg-white border-b border-gray-100">
      {/* Timer Row */}
      <div className="flex items-center gap-3 px-6 py-2">
        {/* Clock icon */}
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 7v5l3 3" />
        </svg>

        {/* Time display */}
        <span
          className="font-mono font-semibold text-gray-800 tabular-nums select-none"
          style={{ fontSize: '17px', letterSpacing: '0.02em', minWidth: '52px' }}
        >
          {fmt(seconds)}
        </span>

        {/* Control buttons */}
        <div className="flex items-center gap-1">
          {/* Start / Pause */}
          <button
            onClick={handleStartPause}
            title={running ? 'Pause' : 'Start'}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-150 active:scale-95"
          >
            {running ? (
              // Pause icon
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="5" y="4" width="4" height="16" rx="1" />
                <rect x="15" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              // Play icon
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4l14 8-14 8V4z" />
              </svg>
            )}
          </button>

          {/* Stop (save) button — only shown when seconds > 0 */}
          {seconds > 0 && (
            <button
              onClick={handleStop}
              title="Stop & save"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all duration-150 active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            </button>
          )}

          {/* Reset button — only shown when seconds > 0 */}
          {seconds > 0 && (
            <button
              onClick={handleReset}
              title="Reset"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all duration-150 active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h5M20 20v-5h-5M4.93 15A9 9 0 1 0 6.5 6.5L4 9"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Goal info */}
        {goalMinutes > 0 && (
          <div className="flex items-center gap-1.5">
            {goalReached ? (
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                ✓ goal reached!
              </span>
            ) : (
              <span className="text-xs text-gray-400 tabular-nums">
                <span className="font-medium text-gray-600">{minsLeft}m</span> left of {goalMinutes}m
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress bar — only when goalMinutes is set */}
      {goalMinutes > 0 && (
        <div className="h-0.5 bg-gray-100 mx-6 mb-1 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: goalReached
                ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                : 'linear-gradient(90deg, #6366f1, #818cf8)',
            }}
          />
        </div>
      )}
    </div>
  );
}
