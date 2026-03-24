import React, { useEffect, useRef } from 'react';

export default function ConfettiEffect({ onComplete }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#fff'];
    const pieces = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 120,
      w: 6 + Math.random() * 10,
      h: 6 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: -2 + Math.random() * 4,
      vy: 3 + Math.random() * 5,
      vr: -4 + Math.random() * 8,
      r: Math.random() * 360,
    }));

    let frame = 0;
    let raf;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const alpha = Math.max(0, 1 - frame / 200);

      pieces.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate((p.r * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        p.vy += 0.08;
      });

      frame++;
      if (frame < 260) {
        raf = requestAnimationFrame(draw);
      } else {
        onComplete?.();
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="confetti" />;
}
