'use client';

import { useEffect, useRef, useCallback, memo } from 'react';
import type { RoundEventState } from './RoundEventOverlay';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

// ─── Particle Types ────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

interface MeteorParticle extends Particle {
  tailLength: number;
  hasImpacted: boolean;
  impactX: number;
  impactY: number;
  shockwaveRadius: number;
  shockwaveOpacity: number;
}

interface LightningBolt {
  segments: Array<{ x: number; y: number }>;
  opacity: number;
  life: number;
  maxLife: number;
  width: number;
  glowColor: string;
  branched: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────

const SNOW_COUNT = 120;
const METEOR_INTERVAL_MS = 350;
const LIGHTNING_INTERVAL_MS = 750;

// ─── Component ─────────────────────────────────────────────────────────

interface RoundEventCanvasProps {
  event: RoundEventState | null;
}

export const RoundEventCanvas = memo<RoundEventCanvasProps>(function RoundEventCanvas({ event }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const meteorsRef = useRef<MeteorParticle[]>([]);
  const boltsRef = useRef<LightningBolt[]>([]);
  const spawnTimerRef = useRef(0);
  const fadeOpacityRef = useRef(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  // ─── Snowflake spawner ───────────────────────────────────────────────

  const spawnSnowflakes = useCallback((w: number) => {
    const particles = particlesRef.current;
    if (particles.length >= SNOW_COUNT) return;

    const count = Math.min(6, SNOW_COUNT - particles.length);
    for (let i = 0; i < count; i++) {
      // Mix of small fast flakes and large slow floaters
      const isLarge = Math.random() > 0.7;
      particles.push({
        x: Math.random() * w,
        y: -10 - Math.random() * 60,
        vx: (Math.random() - 0.5) * (isLarge ? 0.8 : 1.5),
        vy: isLarge ? (0.6 + Math.random() * 1.2) : (1.5 + Math.random() * 2.5),
        size: isLarge ? (5 + Math.random() * 4) : (1.5 + Math.random() * 3),
        opacity: isLarge ? (0.3 + Math.random() * 0.4) : (0.5 + Math.random() * 0.5),
        life: 0,
        maxLife: 999,
        color: isLarge ? '#e0f0ff' : '#ffffff',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * (isLarge ? 0.02 : 0.05),
      });
    }
  }, []);

  // ─── Meteor spawner ──────────────────────────────────────────────────

  const spawnMeteor = useCallback((w: number, h: number) => {
    const startX = Math.random() * w * 0.8 + w * 0.1;
    const impactX = startX + (Math.random() - 0.5) * 100;
    const impactY = h * 0.3 + Math.random() * h * 0.5;

    meteorsRef.current.push({
      x: startX - 80,
      y: -40,
      vx: 3 + Math.random() * 2,
      vy: 8 + Math.random() * 4,
      size: 6 + Math.random() * 4,
      opacity: 1,
      life: 0,
      maxLife: 120,
      color: '#ff6b35',
      rotation: 0,
      rotationSpeed: 0.1,
      tailLength: 30 + Math.random() * 20,
      hasImpacted: false,
      impactX,
      impactY,
      shockwaveRadius: 0,
      shockwaveOpacity: 0,
    });
  }, []);

  // ─── Lightning bolt generator ────────────────────────────────────────

  const spawnLightning = useCallback((w: number, h: number) => {
    const startX = Math.random() * w * 0.6 + w * 0.2;
    const segments: Array<{ x: number; y: number }> = [{ x: startX, y: 0 }];
    let cx = startX;
    let cy = 0;
    const targetY = h * 0.4 + Math.random() * h * 0.4;
    const steps = 8 + Math.floor(Math.random() * 6);

    for (let i = 1; i <= steps; i++) {
      cx += (Math.random() - 0.5) * 60;
      cy += targetY / steps;
      segments.push({ x: cx, y: Math.min(cy, targetY) });
    }

    boltsRef.current.push({
      segments,
      opacity: 1,
      life: 0,
      maxLife: 15,
      width: 2 + Math.random() * 2,
      glowColor: `hsl(${200 + Math.random() * 60}, 100%, 75%)`,
      branched: Math.random() > 0.5,
    });
  }, []);

  // ─── Draw functions ──────────────────────────────────────────────────

  const drawSnowflake = useCallback((ctx: CanvasRenderingContext2D, p: Particle) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    const alpha = p.opacity * fadeOpacityRef.current;
    ctx.globalAlpha = alpha;

    // Glow for larger flakes
    if (p.size > 5) {
      ctx.shadowColor = 'rgba(150, 200, 255, 0.6)';
      ctx.shadowBlur = 8;
    }

    // Draw a 6-pointed snowflake with branch tips
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size > 5 ? 1.2 : 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const ax = Math.cos(angle) * p.size;
      const ay = Math.sin(angle) * p.size;
      ctx.moveTo(0, 0);
      ctx.lineTo(ax, ay);
      // Small branch tips for larger flakes
      if (p.size > 4) {
        const mid = 0.55;
        const mx = ax * mid;
        const my = ay * mid;
        const branchLen = p.size * 0.35;
        const perpAngle = angle + Math.PI / 4;
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(perpAngle) * branchLen, my + Math.sin(perpAngle) * branchLen);
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(perpAngle + Math.PI / 2) * branchLen, my + Math.sin(perpAngle + Math.PI / 2) * branchLen);
      }
    }
    ctx.stroke();

    // Center dot
    ctx.shadowBlur = 0;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.size > 5 ? 1.5 : 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  const drawMeteor = useCallback((ctx: CanvasRenderingContext2D, m: MeteorParticle) => {
    const fade = fadeOpacityRef.current;
    if (m.hasImpacted) {
      // Shockwave ring
      if (m.shockwaveOpacity > 0) {
        ctx.save();
        ctx.globalAlpha = m.shockwaveOpacity * fade;
        ctx.strokeStyle = '#ff9f43';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(m.impactX, m.impactY, m.shockwaveRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow
        const grad = ctx.createRadialGradient(
          m.impactX, m.impactY, 0,
          m.impactX, m.impactY, m.shockwaveRadius
        );
        grad.addColorStop(0, 'rgba(255, 107, 53, 0.3)');
        grad.addColorStop(0.7, 'rgba(255, 159, 67, 0.1)');
        grad.addColorStop(1, 'rgba(255, 159, 67, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(m.impactX, m.impactY, m.shockwaveRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Debris particles
      ctx.save();
      ctx.globalAlpha = m.opacity * 0.8 * fade;
      const debrisCount = 8;
      for (let i = 0; i < debrisCount; i++) {
        const angle = (i / debrisCount) * Math.PI * 2 + m.life * 0.1;
        const dist = m.shockwaveRadius * 0.6;
        const dx = m.impactX + Math.cos(angle) * dist;
        const dy = m.impactY + Math.sin(angle) * dist;
        ctx.fillStyle = i % 2 === 0 ? '#ff6b35' : '#ffd700';
        ctx.beginPath();
        ctx.arc(dx, dy, 2 + Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = m.opacity * fade;

    // Tail (gradient line)
    const tailGrad = ctx.createLinearGradient(
      m.x - m.vx * m.tailLength * 0.3,
      m.y - m.vy * m.tailLength * 0.3,
      m.x, m.y
    );
    tailGrad.addColorStop(0, 'rgba(255, 107, 53, 0)');
    tailGrad.addColorStop(0.5, 'rgba(255, 159, 67, 0.5)');
    tailGrad.addColorStop(1, '#ff6b35');
    ctx.strokeStyle = tailGrad;
    ctx.lineWidth = m.size * 0.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(m.x - m.vx * m.tailLength * 0.3, m.y - m.vy * m.tailLength * 0.3);
    ctx.lineTo(m.x, m.y);
    ctx.stroke();

    // Head glow
    const headGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 2);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.3, '#ffd700');
    headGrad.addColorStop(1, 'rgba(255, 107, 53, 0)');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size * 2, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  const drawLightningBolt = useCallback((ctx: CanvasRenderingContext2D, bolt: LightningBolt) => {
    const fade = fadeOpacityRef.current;
    ctx.save();
    ctx.globalAlpha = bolt.opacity * fade;

    // Outer glow — shadowBlur is GPU-uploaded per call; keep low.
    ctx.shadowColor = bolt.glowColor;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = bolt.glowColor;
    ctx.lineWidth = bolt.width + 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
    for (let i = 1; i < bolt.segments.length; i++) {
      ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
    }
    ctx.stroke();

    // Core white
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = bolt.width;
    ctx.beginPath();
    ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
    for (let i = 1; i < bolt.segments.length; i++) {
      ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
    }
    ctx.stroke();

    // Branch (if applicable)
    if (bolt.branched && bolt.segments.length > 4) {
      const branchIdx = Math.floor(bolt.segments.length * 0.4);
      const branchStart = bolt.segments[branchIdx];
      ctx.globalAlpha = bolt.opacity * 0.6 * fade;
      ctx.strokeStyle = bolt.glowColor;
      ctx.lineWidth = bolt.width * 0.6;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(branchStart.x, branchStart.y);
      let bx = branchStart.x;
      let by = branchStart.y;
      for (let i = 0; i < 4; i++) {
        bx += (Math.random() - 0.3) * 40;
        by += 20 + Math.random() * 15;
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }

    // Flash at impact point
    const endPt = bolt.segments[bolt.segments.length - 1];
    if (bolt.life < 5) {
      const flashR = (5 - bolt.life) * 8;
      const flashGrad = ctx.createRadialGradient(endPt.x, endPt.y, 0, endPt.x, endPt.y, flashR);
      try {
        const hslMatch = bolt.glowColor.match(/^hsl\(([^)]+)\)$/);
        const midColor = hslMatch ? `hsla(${hslMatch[1]}, 0.4)` : 'rgba(100, 150, 255, 0.4)';
        flashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        flashGrad.addColorStop(0.4, midColor);
        flashGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } catch { /* skip frame if color parse fails */ }
      ctx.globalAlpha = bolt.opacity * fade;
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(endPt.x, endPt.y, flashR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, []);

  // ─── Main animation loop ─────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isActive = event && event.phase === 'active';
    const eventType = event?.type;

    // Reset particles when event changes
    particlesRef.current = [];
    meteorsRef.current = [];
    boltsRef.current = [];
    spawnTimerRef.current = 0;
    fadeOpacityRef.current = 0;

    if (!isActive) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      // Fade in
      fadeOpacityRef.current = Math.min(1, fadeOpacityRef.current + dt * 0.003);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      spawnTimerRef.current += dt;

      if (eventType === 'blizzard') {
        // Ambient frost tint
        ctx.save();
        ctx.globalAlpha = 0.06 * fadeOpacityRef.current;
        ctx.fillStyle = '#a8d8ea';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        spawnSnowflakes(w);

        // Global wind sway — all flakes drift together
        const windOffset = Math.sin(now * 0.0008) * 0.6;

        // Update & draw snowflakes
        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx + windOffset + Math.sin(p.life * 0.025 + p.rotation) * 0.4;
          p.y += p.vy;
          p.rotation += p.rotationSpeed;
          p.life += 1;
          // Wrap horizontally so flakes don't vanish at edges
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y > h + 20) {
            particles.splice(i, 1);
            continue;
          }
          drawSnowflake(ctx, p);
        }

        // Frost vignette around edges — heavier at corners
        ctx.save();
        ctx.globalAlpha = 0.3 * fadeOpacityRef.current;
        const frostGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.65);
        frostGrad.addColorStop(0, 'rgba(135, 206, 235, 0)');
        frostGrad.addColorStop(0.7, 'rgba(135, 206, 235, 0.15)');
        frostGrad.addColorStop(1, 'rgba(135, 206, 235, 0.5)');
        ctx.fillStyle = frostGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      if (eventType === 'meteor') {
        // Ambient warm tint
        ctx.save();
        ctx.globalAlpha = 0.05 * fadeOpacityRef.current;
        ctx.fillStyle = '#ff6b35';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // Spawn meteors periodically
        if (spawnTimerRef.current > METEOR_INTERVAL_MS) {
          spawnTimerRef.current = 0;
          spawnMeteor(w, h);
        }

        // Update & draw meteors
        const meteors = meteorsRef.current;
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.life += 1;

          if (!m.hasImpacted) {
            m.x += m.vx;
            m.y += m.vy;
            // Check impact
            if (m.y >= m.impactY) {
              m.hasImpacted = true;
              m.shockwaveOpacity = 1;
              m.shockwaveRadius = 5;
            }
          } else {
            m.shockwaveRadius += 4;
            m.shockwaveOpacity *= 0.94;
            m.opacity *= 0.95;
          }

          if (m.life > m.maxLife || (m.hasImpacted && m.opacity < 0.02)) {
            meteors.splice(i, 1);
            continue;
          }
          drawMeteor(ctx, m);
        }
      }

      if (eventType === 'lightning') {
        // Spawn lightning bolts with randomized intervals for unpredictability.
        // Double-strike removed: pre-fix it spawned 20% of the time, peaking at
        // 4 simultaneous bolts and stuttering on mid-tier mobile.
        const interval = LIGHTNING_INTERVAL_MS + (Math.sin(now * 0.002) * 200);
        if (spawnTimerRef.current > interval) {
          spawnTimerRef.current = 0;
          spawnLightning(w, h);
        }

        const fadeOp = fadeOpacityRef.current;
        const boltsActive = boltsRef.current.length > 0;

        // Soft screen flash — capped peak and faster decay to stay under photosensitivity threshold.
        // Skip entirely when user prefers reduced motion (WCAG 2.1 seizure guideline).
        const flashAge = spawnTimerRef.current;
        if (!prefersReducedMotion && flashAge < 70) {
          ctx.save();
          ctx.globalAlpha = (1 - flashAge / 70) * 0.12 * fadeOp;
          ctx.fillStyle = '#e8ecff';
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }

        // Ambient dark storm atmosphere — skip when overlay barely visible
        // (fade-in/out) and when no bolts are active to avoid a wasted full-screen
        // fillRect on every frame. Note: this lets the canvas-clear show through
        // briefly between bolts, which is fine — the edge-glow DOM overlay still
        // provides atmosphere.
        if (boltsActive && fadeOp > 0.05) {
          ctx.save();
          const ambientPulse = 0.035 + Math.sin(now * 0.0012) * 0.01;
          ctx.globalAlpha = ambientPulse * fadeOp;
          ctx.fillStyle = '#2a1a4e';
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }

        // Update & draw bolts. Per-frame segment jitter removed — bolts only live
        // ~15 frames (250ms) so static geometry reads identically, and the mutation
        // was the dominant CPU cost during the catalyst.
        const bolts = boltsRef.current;
        for (let i = bolts.length - 1; i >= 0; i--) {
          const b = bolts[i];
          b.life += 1;
          b.opacity = Math.max(0, 1 - b.life / b.maxLife);

          if (b.life >= b.maxLife) {
            bolts.splice(i, 1);
            continue;
          }

          drawLightningBolt(ctx, b);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [event, prefersReducedMotion, spawnSnowflakes, spawnMeteor, spawnLightning, drawSnowflake, drawMeteor, drawLightningBolt]);

  if (!event || event.phase !== 'active') return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-40 pointer-events-none"
      aria-hidden="true"
    />
  );
});
