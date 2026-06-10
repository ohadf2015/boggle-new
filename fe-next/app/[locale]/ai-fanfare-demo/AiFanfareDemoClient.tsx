'use client';

import { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { MascotCelebrationVideo, type MascotCelebrationKind } from '@/components/mascot/MascotCelebrationVideo';
import { PreResultFanfare } from '@/components/results/PreResultFanfare';

const LEXICLASH_COLORS = [
  '#BFFF00', // electric lime
  '#FF1493', // hot pink
  '#00FFFF', // cyan
  '#FFE066', // honey yellow
  '#8B5CF6', // royal purple
  '#FF6B35', // orange
  '#FFFFFF', // white
];

const BINGO = ['B', 'I', 'N', 'G', 'O', '!'];

const CELEBRATION_KINDS: { key: MascotCelebrationKind; label: string; hasVersion3: boolean }[] = [
  { key: 'champion', label: 'CHAMPION', hasVersion3: true },
  { key: 'bingo', label: 'BINGO', hasVersion3: true },
  { key: 'streak', label: 'STREAK', hasVersion3: true },
  { key: 'defeat', label: 'DEFEAT (GG)', hasVersion3: true },
  { key: 'knight', label: 'VICTORY', hasVersion3: true },
  { key: 'mission-complete', label: 'MISSION COMPLETE', hasVersion3: true },
  { key: 'runner-up', label: 'RUNNER-UP', hasVersion3: false },
  { key: 'explorer', label: 'EXPLORER', hasVersion3: false },
];

function getCelebrationSrc(kind: MascotCelebrationKind, version: 1 | 2 | 3): string {
  const base = `/mascots/celebration-${kind}`;
  if (version === 1) return `${base}.mp4`;
  return `${base}-${version}.mp4`;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
  rotation: number;
  rv: number;
}

function ConfettiBurst({ trigger, particleCount = 140 }: { trigger: number; particleCount?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (trigger === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.55;

    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 22,
      vy: Math.random() * -22 - 6,
      color: LEXICLASH_COLORS[Math.floor(Math.random() * LEXICLASH_COLORS.length)],
      life: 1,
      size: Math.random() * 9 + 5,
      rotation: Math.random() * 360,
      rv: (Math.random() - 0.5) * 14,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.life -= 0.012;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45;
        p.vx *= 0.995;
        p.rotation += p.rv;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (alive) rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [trigger, particleCount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999]"
    />
  );
}

function ScoreCountUp({ to, durationMs = 1400 }: { to: number; durationMs?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs]);
  return <span className="tabular-nums">+{n.toLocaleString()}</span>;
}

export default function AiFanfareDemoClient() {
  const [trigger, setTrigger] = useState(1);
  const [scoreSeed, setScoreSeed] = useState(0);
  const [selectedKind, setSelectedKind] = useState<MascotCelebrationKind>('champion');
  const [selectedVersion, setSelectedVersion] = useState<1 | 2 | 3>(3); // default to the latest post-feedback improved clip

  // Demo of the requested "pre result page → transition to result page" flow
  const [showPreDemo, setShowPreDemo] = useState(false);

  const fire = () => {
    setTrigger((t) => t + 1);
    setScoreSeed((s) => s + 1);
  };

  const currentSrc = getCelebrationSrc(selectedKind, selectedVersion);
  const currentKindLabel = CELEBRATION_KINDS.find((k) => k.key === selectedKind)?.label ?? selectedKind;

  const startPreResultDemo = () => {
    setShowPreDemo(true);
  };

  const handlePreComplete = () => {
    setShowPreDemo(false);
    // Trigger the existing result content entrance (confetti + score pop)
    fire();
  };

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[#0A1828] text-white">
      {/* Screen-edge electric flash on trigger change */}
      <div
        key={`flash-${trigger}`}
        className="pointer-events-none fixed inset-0 z-[60] animate-[edgeFlash_900ms_ease-out_forwards]"
        style={{
          background:
            'radial-gradient(circle at center, transparent 50%, rgba(191,255,0,0.0) 60%, rgba(255,20,147,0.18) 78%, rgba(0,255,255,0.32) 100%)',
        }}
      />

      <style>{`
        @keyframes edgeFlash {
          0%   { opacity: 0; }
          18%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes letterPop {
          0%   { transform: translateY(40px) scale(0.4) rotate(-10deg); opacity: 0; }
          55%  { transform: translateY(-12px) scale(1.25) rotate(4deg); opacity: 1; }
          80%  { transform: translateY(4px) scale(0.96) rotate(-2deg); }
          100% { transform: translateY(0)   scale(1)    rotate(0);    opacity: 1; }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes scorePop {
          0%   { transform: scale(0.6); opacity: 0; }
          50%  { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes videoEnter {
          0%   { transform: translateY(60px) scale(0.7); opacity: 0; }
          70%  { transform: translateY(-8px) scale(1.04); opacity: 1; }
          100% { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes haloPulse {
          0%, 100% { transform: scale(1);   opacity: 0.35; }
          50%      { transform: scale(1.08); opacity: 0.7; }
        }
      `}</style>

      <ConfettiBurst trigger={trigger} />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-10 px-6 py-12">
        {/* BINGO! hero text */}
        <h1
          key={`bingo-${trigger}`}
          className="select-none text-center font-black leading-none [text-shadow:6px_6px_0_#000] sm:[text-shadow:8px_8px_0_#000]"
          style={{ fontFamily: 'Fredoka, system-ui, sans-serif' }}
        >
          {BINGO.map((ch, i) => (
            <span
              key={`${ch}-${i}-${trigger}`}
              className="inline-block bg-clip-text text-[clamp(72px,16vw,180px)] text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, #BFFF00 0%, #00FFFF 25%, #FF1493 50%, #8B5CF6 75%, #FFE066 100%)',
                backgroundSize: '200% 100%',
                animation: `letterPop 640ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 80}ms both, gradientShift 3.5s linear ${i * 80}ms infinite alternate`,
                WebkitTextStroke: '2px #000',
              }}
            >
              {ch}
            </span>
          ))}
        </h1>

        {/* Score count-up */}
        <div
          key={`score-${scoreSeed}`}
          className="rounded-2xl border-4 border-black bg-[#BFFF00] px-6 py-3 text-3xl font-black text-black shadow-[8px_8px_0_#000] sm:text-4xl"
          style={{
            fontFamily: 'Rubik, system-ui, sans-serif',
            animation: 'scorePop 520ms cubic-bezier(0.34, 1.56, 0.64, 1) 380ms both',
          }}
        >
          <ScoreCountUp to={1280 + scoreSeed * 37} />
          <span className="ml-2 text-base font-bold text-black/70">pts · 7-letter bingo</span>
        </div>

        {/* Demo the new "pre-result video then transition to result page" experience */}
        <div className="mb-4">
          <button
            type="button"
            onClick={startPreResultDemo}
            className="rounded-2xl border-4 border-black bg-[#BFFF00] px-6 py-2 text-base font-black text-neo-black shadow-hard-lg transition active:translate-x-1 active:translate-y-1 active:shadow-hard-sm"
          >
            ▶ Play as PRE-RESULT FANFARE → transition to results
          </button>
          <p className="mt-1 text-center text-[10px] text-white/50">Uses the real PreResultFanfare (video first, then hands off)</p>
        </div>

        {/* Controls for previewing the different result moments + clip versions */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          {CELEBRATION_KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => {
                setSelectedKind(k.key);
                // If switching to a kind without v3, clamp to v2
                if (!k.hasVersion3 && selectedVersion === 3) setSelectedVersion(2);
                fire();
              }}
              className={`rounded-xl border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wider shadow-hard-sm transition active:translate-x-px active:translate-y-px ${
                selectedKind === k.key
                  ? 'bg-neo-lime text-neo-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {/* Version selector (the different AI generations for the same moment) */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[2px] text-white/60">Clip version</span>
          {[1, 2, 3].map((v) => {
            const kindInfo = CELEBRATION_KINDS.find((k) => k.key === selectedKind);
            const hasIt = v === 1 || (v === 2 && (kindInfo?.hasVersion3 || selectedKind !== 'runner-up')) || (v === 3 && !!kindInfo?.hasVersion3);
            const isActive = selectedVersion === v;
            return (
              <button
                key={v}
                type="button"
                disabled={!hasIt}
                onClick={() => {
                  setSelectedVersion(v as 1 | 2 | 3);
                  fire();
                }}
                className={`rounded-lg border-2 border-black px-2.5 py-0.5 text-xs font-black shadow-hard-sm disabled:opacity-40 ${
                  isActive ? 'bg-[#00FFFF] text-neo-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={v === 3 ? 'Latest refined (post 17-20 feedback)' : v === 2 ? 'Previous variant' : 'Original'}
              >
                v{v}
              </button>
            );
          })}
          <span className="ml-2 text-[10px] text-white/50">({currentKindLabel})</span>
        </div>

        {/* Pre-result fanfare vs inline result content — demonstrates the requested flow */}
        <AnimatePresence mode="wait">
          {showPreDemo ? (
            <m.div
              key="pre"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <PreResultFanfare
                kind={selectedKind}
                onComplete={handlePreComplete}
                t={(key, fallback) => fallback || key}
              />
            </m.div>
          ) : (
            <m.div
              key={`inline-${selectedKind}-${selectedVersion}-${trigger}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-full max-w-[min(420px,92vw)]"
            >
              {/* Inline preview of the video treatment (for quick switching) */}
              <MascotCelebrationVideo
                kind={selectedKind}
                overlay={false}
                autoDismissMs={0}
                forceSrc={currentSrc}
                title={undefined}
              />
              <div className="pointer-events-none absolute -right-2 -top-2 rotate-6 rounded-xl border-2 border-black bg-[#FF1493] px-2 py-0.5 text-[10px] font-black text-white shadow-[2px_2px_0_#000]">
                AI · {selectedVersion === 3 ? 'latest refined' : `v${selectedVersion}`}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Replay + provenance */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={fire}
            className="rounded-2xl border-4 border-black bg-[#FFE066] px-6 py-3 text-lg font-black text-black shadow-[6px_6px_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0_#000]"
            style={{ fontFamily: 'Rubik, system-ui, sans-serif' }}
          >
            Replay Fanfare ↻
          </button>
        </div>

        <p className="max-w-xl text-center text-sm text-white">
          Real <code className="text-white">MascotCelebrationVideo</code> component (exact result-page treatment: halo, sparkles, title, hard frame).
          Use the pills above to switch moments and clip versions (v3 = the new refined ones after 17-20 feedback).
          Raw motion is AI-generated (image-to-video from the exact kawaii cube mascot references).
        </p>
      </div>
    </main>
  );
}
