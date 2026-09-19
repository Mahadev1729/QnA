import React, { useEffect, useRef } from 'react';

/**
 * VoiceOrbCanvas renders a fluid, morphing, audio-reactive 3D-style glowing orb.
 * Responsive for mobile and desktop screens.
 */
export default function VoiceOrbCanvas({ state = 'idle', audioLevel = 0 }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const smoothedAudioRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Adapt size dynamically for mobile screens
    const isMobile = window.innerWidth <= 480;
    const size = isMobile ? 240 : 300;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const baseScale = isMobile ? 0.8 : 1.0;

    const render = () => {
      timeRef.current += 0.035;
      const t = timeRef.current;

      smoothedAudioRef.current += (audioLevel - smoothedAudioRef.current) * 0.15;
      const amp = smoothedAudioRef.current;

      ctx.clearRect(0, 0, size, size);

      let color1, color2, color3, baseRadius;

      if (state === 'listening') {
        color1 = 'rgba(16, 163, 127, 0.85)';
        color2 = 'rgba(56, 189, 248, 0.75)';
        color3 = 'rgba(16, 185, 129, 0.2)';
        baseRadius = (55 + amp * 28) * baseScale;
      } else if (state === 'thinking') {
        const breath = Math.sin(t * 1.8) * 8;
        color1 = 'rgba(171, 104, 255, 0.85)';
        color2 = 'rgba(192, 132, 252, 0.7)';
        color3 = 'rgba(147, 51, 234, 0.2)';
        baseRadius = (55 + breath) * baseScale;
      } else if (state === 'speaking') {
        color1 = 'rgba(52, 211, 153, 0.9)';
        color2 = 'rgba(16, 163, 127, 0.8)';
        color3 = 'rgba(255, 255, 255, 0.35)';
        baseRadius = (58 + amp * 32) * baseScale;
      } else {
        color1 = 'rgba(100, 116, 139, 0.6)';
        color2 = 'rgba(71, 85, 105, 0.4)';
        color3 = 'rgba(148, 163, 184, 0.1)';
        baseRadius = 50 * baseScale;
      }

      // Outer ambient glow
      const outerGlow = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.2,
        centerX, centerY, baseRadius * 2.2
      );
      outerGlow.addColorStop(0, color3);
      outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Undulating organic fluid layers
      const layers = [
        { points: 6, rotSpeed: 0.02, phase: 0, scale: 1.0, color: color1 },
        { points: 7, rotSpeed: -0.025, phase: 1.2, scale: 0.85, color: color2 },
        { points: 5, rotSpeed: 0.035, phase: 2.5, scale: 0.7, color: '#ffffff' },
      ];

      layers.forEach((layer, idx) => {
        ctx.save();
        ctx.beginPath();

        const numPoints = layer.points;
        const angleStep = (Math.PI * 2) / numPoints;
        const currentRot = t * layer.rotSpeed;

        const polyPoints = [];
        for (let i = 0; i < numPoints; i++) {
          const angle = i * angleStep + currentRot;
          const noise = Math.sin(angle * 3 + t * 2 + layer.phase) * (8 + amp * 20);
          const r = (baseRadius * layer.scale) + noise;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          polyPoints.push({ x, y });
        }

        ctx.moveTo(
          (polyPoints[0].x + polyPoints[numPoints - 1].x) / 2,
          (polyPoints[0].y + polyPoints[numPoints - 1].y) / 2
        );

        for (let i = 0; i < numPoints; i++) {
          const next = polyPoints[(i + 1) % numPoints];
          const curr = polyPoints[i];
          const midX = (curr.x + next.x) / 2;
          const midY = (curr.y + next.y) / 2;
          ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
        }

        ctx.closePath();

        if (idx === 2) {
          const coreGrad = ctx.createRadialGradient(
            centerX - 10, centerY - 10, 4,
            centerX, centerY, baseRadius * 0.7
          );
          coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          coreGrad.addColorStop(0.5, color1);
          coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = coreGrad;
        } else {
          ctx.fillStyle = layer.color;
        }

        ctx.shadowColor = color1;
        ctx.shadowBlur = 20 + amp * 18;
        ctx.fill();
        ctx.restore();
      });

      // Floating particle ring
      if (state !== 'idle') {
        const numParticles = 10;
        ctx.save();
        for (let i = 0; i < numParticles; i++) {
          const pAngle = (i / numParticles) * Math.PI * 2 + t * 0.6;
          const pDist = baseRadius * 1.35 + Math.sin(t * 3 + i) * 6 + amp * 12;
          const px = centerX + Math.cos(pAngle) * pDist;
          const py = centerY + Math.sin(pAngle) * pDist;
          const pSize = 1.8 + Math.sin(t * 4 + i) * 1.2;

          ctx.beginPath();
          ctx.arc(px, py, Math.max(1, pSize), 0, Math.PI * 2);
          ctx.fillStyle = i % 2 === 0 ? color1 : color2;
          ctx.shadowColor = color1;
          ctx.shadowBlur = 8;
          ctx.fill();
        }
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, audioLevel]);

  return (
    <div className="voice-orb-canvas-container">
      <canvas
        ref={canvasRef}
        style={{
          width: window.innerWidth <= 480 ? 240 : 300,
          height: window.innerWidth <= 480 ? 240 : 300,
        }}
      />
    </div>
  );
}
