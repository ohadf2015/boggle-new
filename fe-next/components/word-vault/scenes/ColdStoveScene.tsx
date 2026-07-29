'use client';

import { useCallback, useEffect, useState } from 'react';
import { EmberOverlay } from '@/components/word-vault/pixi/EmberOverlay';
import { getGameStore } from '@/lib/word-vault/state/gameStore';
import { useSequence } from '@/lib/word-vault/hooks/useSequence';

/**
 * Room 1.4 — The Cold Stove
 *
 * Verb taxonomy:
 *   PRIMARY:   SEQUENCE (turn 4 valves in correct ignition order: gas→air→fire)
 *   SECONDARY: REVEAL   (the broken time-valve is a red herring; brass-key
 *                        from 1.3 silently auto-snaps the gas valve + golden shimmer)
 *
 * Graduated feedback: wrong sequence keeps the correct prefix instead of full reset.
 */

interface Props {
  onSolved: () => void;
  onExit: () => void;
  /** True when player re-enters a solved room from the hub. Enables persistent post-solve visuals. */
  isRevisit?: boolean;
}

type ValveId = 'gas' | 'air' | 'fire' | 'time';

interface Valve {
  id: ValveId;
  labelHe: string;
  /** Position on the stove (0..1) */
  x: number;
  y: number;
  /** Color tone */
  color: string;
}

const VALVES: Valve[] = [
  { id: 'gas',  labelHe: 'גז',     x: 0.30, y: 0.60, color: '#7ac0e8' },
  { id: 'air',  labelHe: 'אוויר',  x: 0.45, y: 0.60, color: '#c8d4e0' },
  { id: 'fire', labelHe: 'אש',     x: 0.60, y: 0.60, color: '#ff8a3c' },
  { id: 'time', labelHe: 'זמן',    x: 0.75, y: 0.60, color: '#a888c4' },
];

const CORRECT_ORDER: ValveId[] = ['gas', 'air', 'fire'];
const BROKEN_VALVE: ValveId = 'time';
const SECRET_PHRASE_HE = 'אש לא רוצה זמן. אש רוצה אוויר.';

type SmokeShape = 'heart' | 'fish' | 'star' | 'cloud' | 'cross';
const SMOKE_LINES_BY_SHAPE: Record<SmokeShape, string> = {
  heart: 'התנור מתגעגע. נסה אחר.',
  fish:  'משהו מתחת. לא לחם.',
  star:  'אורות לא דולקים בלי דלק.',
  cloud: 'עשן בלי מטרה.',
  cross: 'התנור אמר לא.',
};

export function ColdStoveScene({ onSolved, onExit, isRevisit = false }: Props) {
  const [showBrief, setShowBrief] = useState(true);
  const [done, setDone] = useState(false);
  const [smokeShape, setSmokeShape] = useState<SmokeShape | null>(null);
  const [smokeKey, setSmokeKey] = useState(0);
  const [whisper, setWhisper] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | undefined>();
  const [burstId, setBurstId] = useState(0);
  const [revealed, setRevealed] = useState<Set<ValveId>>(new Set());
  const [brassKeyShimmerId, setBrassKeyShimmerId] = useState(0);

  // Read brass-key once at construction (singleton store is sync-readable client-side)
  const initialSequence: ValveId[] =
    typeof window !== 'undefined' && getGameStore().getState().permanentItems.includes('brass-key')
      ? [CORRECT_ORDER[0]]
      : [];

  // useSequence owns: attempt order, dedupe, prefix-keep on wrong, red-herring routing
  const seq = useSequence<ValveId>({
    correctOrder: CORRECT_ORDER,
    initialSequence,
    redHerringId: BROKEN_VALVE,
    onRedHerring: () => {
      setRevealed((prev) => new Set(prev).add(BROKEN_VALVE));
      setWhisper('"זמן לא אופים. אבל הזמן אופה אותנו."');
      setTimeout(() => setWhisper(null), 2400);
    },
  });

  const sequence = seq.sequence;

  // Brass-key visual side-effects: reveal gas valve + golden shimmer
  useEffect(() => {
    if (initialSequence.length === 0) return;
    setRevealed((prev) => new Set(prev).add(CORRECT_ORDER[0]));
    setTimeout(() => setBrassKeyShimmerId(Date.now()), 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot mount effect; initialSequence stable
  }, []);

  const handleTurn = useCallback(
    (id: ValveId) => {
      if (done) return;
      const result = seq.tryStep(id);

      switch (result) {
        case 'redherring':
          // onRedHerring callback already fired the whisper
          return;
        case 'duplicate':
          setWhisper('"כבר סובב."');
          setTimeout(() => setWhisper(null), 1400);
          return;
        case 'wrong': {
          // Hook keeps the wrong tail visible briefly then auto-rewinds to correct prefix.
          // Layer in the smoke + whisper for game-feel.
          setRevealed((prev) => new Set(prev).add(id));
          const shapes: SmokeShape[] = ['heart', 'fish', 'star', 'cloud', 'cross'];
          const shape = shapes[Math.floor(Math.random() * shapes.length)];
          setSmokeShape(shape);
          setSmokeKey((k) => k + 1);
          setWhisper(SMOKE_LINES_BY_SHAPE[shape]);
          setTimeout(() => {
            setSmokeShape(null);
            setWhisper(null);
          }, 2400);
          return;
        }
        case 'correct':
        case 'complete': {
          setRevealed((prev) => new Set(prev).add(id));
          if (result === 'complete') {
            setBurstId((b) => b + 1);
            if (typeof window !== 'undefined') {
              setBurst({
                id: burstId + 1,
                x: window.innerWidth / 2,
                y: window.innerHeight * 0.55,
              });
            }
            setTimeout(() => setDone(true), 1200);
          }
          return;
        }
      }
    },
    [done, seq, burstId],
  );

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, rgba(60,40,30,0.55) 0%, rgba(8,5,3,0.95) 80%), #0a0604",
      }}
    >
      {/* BG image */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/word-vault/bg/stove.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: done
            ? 'brightness(0.85) saturate(1.4)'
            : isRevisit
            ? 'brightness(0.6) saturate(1.1)'  // post-solve warmth persists on revisit
            : 'brightness(0.4) saturate(0.85)',
          transition: 'filter 1.4s ease-out',
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            done
              ? 'radial-gradient(ellipse at 50% 60%, rgba(255,140,55,0.45) 0%, rgba(20,8,4,0.85) 75%)'
              : 'radial-gradient(ellipse at 50% 60%, transparent 35%, rgba(0,0,0,0.85) 95%)',
          transition: 'background 1.4s ease-out',
        }}
      />

      {/* Pixi ember/spark overlay */}
      <EmberOverlay
        density={done ? 100 : isRevisit ? 35 : 12}
        tint={done || isRevisit ? 0xff8a3c : 0x4a5060}
        intensity={done ? 1 : isRevisit ? 0.6 : 0.4}
        burst={burst}
      />

      {/* Header */}
      <div className="relative z-10 px-6 pt-5 text-center" dir="rtl">
        <p className="font-fredoka text-[11px] uppercase tracking-[0.4em]" style={{ color: 'rgba(220,200,180,0.45)' }}>
          התנור המעשן
        </p>
        <h2
          className="mt-1 font-fredoka text-2xl font-black"
          style={{
            color: done ? 'rgba(255,225,180,0.95)' : 'rgba(220,200,180,0.92)',
            textShadow: '2px 2px 0 #000',
            transition: 'color 1.4s',
          }}
        >
          {done ? 'התנור נדלק.' : 'הדלק את התנור — בסדר הנכון'}
        </h2>
        <p className="mt-1 font-rubik text-xs" style={{ color: 'rgba(220,200,180,0.55)' }}>
          {done ? 'המפתח נפל מהתנור.' : 'אין הוראות. נסה. הקשב.'}
        </p>
      </div>

      {/* Valve sequence display */}
      {!done && sequence.length > 0 && (
        <div className="relative z-10 mt-3 flex justify-center" dir="rtl">
          <div className="flex items-center gap-2 rounded border-2 border-amber-300/30 bg-black/40 px-4 py-2">
            {sequence.map((id, i) => {
              const v = VALVES.find((x) => x.id === id)!;
              return (
                <span
                  key={i}
                  className="font-fredoka text-base font-bold"
                  style={{ color: v.color }}
                >
                  {v.labelHe}
                  {i < sequence.length - 1 && <span className="mx-1 text-white">·</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* The stove (SVG illustration) with valves */}
      <div className="relative z-10 mt-6 mx-auto" style={{ height: '52vh', maxWidth: 720 }}>
        <Stove />
        {VALVES.map((v) => (
          <ValveButton
            key={v.id}
            valve={v}
            isInSequence={sequence.includes(v.id)}
            isRevealed={revealed.has(v.id)}
            onClick={() => handleTurn(v.id)}
            disabled={done}
          />
        ))}

        {/* Brass-key shimmer — visual-only "the key did this" cue on the gas valve */}
        {brassKeyShimmerId > 0 && (() => {
          const gas = VALVES.find((v) => v.id === CORRECT_ORDER[0]);
          if (!gas) return null;
          return (
            <div
              key={brassKeyShimmerId}
              aria-hidden="true"
              className="pointer-events-none absolute"
              style={{
                left: `${gas.x * 100}%`,
                top: `${gas.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: 110,
                height: 110,
                background:
                  'radial-gradient(circle at center, rgba(255,225,160,0.95) 0%, rgba(255,180,80,0.45) 45%, transparent 75%)',
                animation: 'wv-keyShimmer 1.2s ease-out forwards',
                mixBlendMode: 'screen',
              }}
            />
          );
        })()}

        {/* Smoke shape from chimney */}
        {smokeShape && (
          <div
            key={smokeKey}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: '50%',
              top: -20,
              transform: 'translateX(-50%)',
              animation: 'wv-smokeRise 2.4s ease-out forwards',
            }}
          >
            <SmokeShapeSvg shape={smokeShape} />
          </div>
        )}
      </div>

      {/* Whisper */}
      {whisper && (
        <div className="pointer-events-none absolute inset-x-0 top-[18%] z-20 flex justify-center px-6" dir="rtl">
          <p
            className="rounded-md border-2 border-amber-300/40 bg-[#1a0e08]/90 px-4 py-2 font-rubik text-base"
            style={{
              color: 'rgba(255,225,180,0.95)',
              textShadow: '0 0 12px rgba(255,140,60,0.4)',
              animation: 'wv-toast 2.5s ease-out forwards',
            }}
          >
            {whisper}
          </p>
        </div>
      )}

      {/* Pause */}
      <button
        type="button"
        onClick={onExit}
        aria-label="חזרה"
        className="absolute left-3 top-3 z-30 rounded border border-white/10 px-2 py-1 text-xs text-white hover:text-white"
      >
        ←
      </button>

      {/* Brief */}
      {showBrief && !done && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 px-6">
          <div
            className="w-full max-w-md rounded-md border-4 border-amber-300 p-6 text-center shadow-[6px_6px_0_0_#000]"
            style={{ background: 'linear-gradient(180deg, #2a1f14 0%, #1a1208 100%)' }}
            dir="rtl"
          >
            <p className="font-fredoka text-xs uppercase tracking-[0.4em] text-amber-200/60">התנור המעשן</p>
            <h2 className="mt-2 font-fredoka text-3xl font-black text-amber-200" style={{ textShadow: '2px 2px 0 #000' }}>
              ארבעה ברזים. אש אחת.
            </h2>
            <p className="mt-4 font-rubik text-base leading-relaxed text-white">
              אורי ידע את הסדר. את צריכה ללמוד אותו.
              סובב ברזים. הקשב למה שהתנור עושה.
            </p>
            <p className="mt-3 font-rubik text-sm text-white">
              סדר שגוי = עשן בצורה מוזרה.
              <br />
              סדר נכון = אש.
            </p>
            <button
              type="button"
              onClick={() => setShowBrief(false)}
              className="mt-6 rounded-md border-4 border-amber-300 bg-amber-200 px-6 py-2 font-fredoka text-lg font-black text-[#1a0e08] shadow-[3px_3px_0_0_#000]"
            >
              להתחיל
            </button>
          </div>
        </div>
      )}

      {/* Solve overlay */}
      {done && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 px-6 text-center"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,180,80,0.45) 0%, rgba(11,8,4,0.95) 70%)',
            animation: 'wv-bloom 1.4s ease-out forwards',
          }}
        >
          <p className="font-rubik text-sm tracking-wide text-white" dir="rtl">
            התנור נדלק. ספר המתכונים נפל פנימה — ויצא חזרה.
          </p>
          <div className="flex flex-wrap justify-center gap-3" dir="rtl">
            {CORRECT_ORDER.map((id) => {
              const v = VALVES.find((x) => x.id === id)!;
              return (
                <span
                  key={id}
                  className="rounded-md border-4 border-amber-300 bg-amber-200 px-4 py-2 font-fredoka text-2xl font-black text-[#1a0e08] shadow-[3px_3px_0_0_#000]"
                  style={{ color: v.color, background: '#1a0e08', borderColor: v.color }}
                >
                  {v.labelHe}
                </span>
              );
            })}
          </div>
          <p
            className="mt-4 max-w-md font-fredoka text-lg font-bold leading-relaxed"
            style={{ color: 'rgba(255,225,180,0.95)', textShadow: '2px 2px 0 #000, 0 0 18px rgba(255,140,60,0.6)' }}
            dir="rtl"
          >
            {`"${SECRET_PHRASE_HE}"`}
          </p>
          <button
            type="button"
            onClick={onSolved}
            className="mt-6 rounded-md border-4 border-amber-300 bg-amber-200 px-8 py-3 font-fredoka text-xl font-black text-[#1a0e08] shadow-[4px_4px_0_0_#000]"
          >
            המשך &nbsp;→
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes wv-bloom {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes wv-toast {
          0% { opacity: 0; transform: translateY(8px); }
          15%, 80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-12px); }
        }
        @keyframes wv-smokeRise {
          0% { opacity: 0; transform: translate(-50%, 40px) scale(0.6); }
          25% { opacity: 0.95; transform: translate(-50%, 0) scale(1); }
          80% { opacity: 0.7; transform: translate(-50%, -120px) scale(1.4); }
          100% { opacity: 0; transform: translate(-50%, -180px) scale(1.7); }
        }
        @keyframes wv-valveTurn {
          0% { transform: translate(-50%,-50%) rotate(0); }
          100% { transform: translate(-50%,-50%) rotate(180deg); }
        }
        @keyframes wv-keyShimmer {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          25%  { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
          70%  { opacity: 0.7; transform: translate(-50%, -50%) scale(1.15); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }
        }
      `}</style>
    </div>
  );
}

function Stove() {
  return (
    <svg
      viewBox="0 0 600 400"
      className="absolute left-1/2 top-1/2"
      style={{
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        maxWidth: 600,
        maxHeight: 400,
        filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.8))',
      }}
    >
      <defs>
        <linearGradient id="stoveBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2a20" />
          <stop offset="50%" stopColor="#1a0e08" />
          <stop offset="100%" stopColor="#08040a" />
        </linearGradient>
        <linearGradient id="stoveTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a4030" />
          <stop offset="100%" stopColor="#2a1812" />
        </linearGradient>
      </defs>
      {/* chimney */}
      <rect x="270" y="10" width="60" height="60" fill="url(#stoveTop)" stroke="#1a0e08" strokeWidth="3" />
      <ellipse cx="300" cy="14" rx="34" ry="6" fill="#0a0604" />
      {/* top */}
      <rect x="80" y="60" width="440" height="40" fill="url(#stoveTop)" stroke="#1a0e08" strokeWidth="3" />
      {/* body */}
      <rect x="100" y="100" width="400" height="240" fill="url(#stoveBody)" stroke="#1a0e08" strokeWidth="4" />
      {/* oven door */}
      <rect x="180" y="180" width="240" height="140" rx="4" fill="#1a0e08" stroke="#3a2418" strokeWidth="3" />
      <rect x="190" y="190" width="220" height="100" rx="2" fill="#08040a" />
      {/* door handle */}
      <rect x="290" y="300" width="20" height="6" rx="2" fill="#a08868" stroke="#1a0e08" strokeWidth="1.5" />
      {/* feet */}
      <rect x="100" y="340" width="40" height="20" fill="url(#stoveTop)" stroke="#1a0e08" strokeWidth="2" />
      <rect x="460" y="340" width="40" height="20" fill="url(#stoveTop)" stroke="#1a0e08" strokeWidth="2" />
      {/* highlight */}
      <line x1="100" y1="100" x2="500" y2="100" stroke="rgba(255,200,140,0.2)" strokeWidth="2" />
    </svg>
  );
}

function ValveButton({
  valve,
  isInSequence,
  isRevealed,
  onClick,
  disabled,
}: {
  valve: Valve;
  isInSequence: boolean;
  isRevealed: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const [turning, setTurning] = useState(false);
  const handle = () => {
    if (disabled) return;
    setTurning(true);
    setTimeout(() => setTurning(false), 600);
    onClick();
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      className="absolute z-10"
      style={{
        left: `${valve.x * 100}%`,
        top: `${valve.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        cursor: disabled ? 'default' : 'pointer',
      }}
      aria-label={valve.labelHe}
    >
      <div className="relative flex flex-col items-center">
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          style={{
            filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.65))',
            animation: turning ? 'wv-valveSpin 0.6s ease-out' : undefined,
          }}
        >
          <defs>
            <radialGradient id={`v-${valve.id}`}>
              <stop offset="0%" stopColor={valve.color} />
              <stop offset="100%" stopColor="#1a0e08" />
            </radialGradient>
          </defs>
          {/* base mount */}
          <rect x="20" y="36" width="16" height="16" fill="#3a2418" stroke="#1a0e08" strokeWidth="2" />
          {/* wheel */}
          <circle cx="28" cy="24" r="20" fill={`url(#v-${valve.id})`} stroke="#1a0e08" strokeWidth="2.5" />
          <circle cx="28" cy="24" r="14" fill="none" stroke="#1a0e08" strokeWidth="1.2" />
          {/* spokes */}
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <line
                key={a}
                x1={28 + Math.cos(rad) * 6}
                y1={24 + Math.sin(rad) * 6}
                x2={28 + Math.cos(rad) * 18}
                y2={24 + Math.sin(rad) * 18}
                stroke="#1a0e08"
                strokeWidth="2"
              />
            );
          })}
          <circle cx="28" cy="24" r="4" fill="#1a0e08" />
          {/* highlight */}
          <ellipse cx="22" cy="14" rx="6" ry="2.5" fill="rgba(255,255,255,0.3)" />
        </svg>
        {/* label appears once revealed */}
        {isRevealed && (
          <span
            className="mt-1 rounded px-1.5 py-0.5 font-fredoka text-xs font-black"
            style={{
              background: '#1a0e08',
              color: valve.color,
              border: `1px solid ${valve.color}`,
            }}
          >
            {valve.labelHe}
          </span>
        )}
        {/* pulse if in sequence */}
        {isInSequence && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              top: 4,
              left: 4,
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: `2px solid ${valve.color}`,
              opacity: 0.8,
            }}
          />
        )}
      </div>
      <style jsx>{`
        @keyframes wv-valveSpin {
          0% { transform: rotate(0); }
          100% { transform: rotate(180deg); }
        }
      `}</style>
    </button>
  );
}

function SmokeShapeSvg({ shape }: { shape: SmokeShape }) {
  const fill = 'rgba(180,180,180,0.85)';
  const stroke = 'rgba(220,220,220,0.5)';
  switch (shape) {
    case 'heart':
      return (
        <svg width="80" height="80" viewBox="0 0 80 80">
          <path d="M40 60 Q14 38 14 24 Q14 12 24 12 Q34 12 40 22 Q46 12 56 12 Q66 12 66 24 Q66 38 40 60 Z" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case 'fish':
      return (
        <svg width="80" height="60" viewBox="0 0 80 60">
          <path d="M10 30 Q24 14 50 14 Q72 14 76 30 Q72 46 50 46 Q24 46 10 30 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M10 30 L0 18 L0 42 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          <circle cx="60" cy="26" r="2" fill="#0a0604" />
        </svg>
      );
    case 'star':
      return (
        <svg width="70" height="70" viewBox="0 0 70 70">
          <polygon points="35,4 43,28 68,28 48,42 56,66 35,52 14,66 22,42 2,28 27,28" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case 'cloud':
      return (
        <svg width="90" height="60" viewBox="0 0 90 60">
          <path d="M14 44 Q4 36 14 28 Q14 14 32 18 Q40 6 56 14 Q72 12 78 26 Q88 30 84 44 Q84 56 70 54 L24 54 Q12 54 14 44 Z" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case 'cross':
      return (
        <svg width="60" height="60" viewBox="0 0 60 60">
          <line x1="14" y1="14" x2="46" y2="46" stroke={fill} strokeWidth="10" strokeLinecap="round" />
          <line x1="46" y1="14" x2="14" y2="46" stroke={fill} strokeWidth="10" strokeLinecap="round" />
        </svg>
      );
  }
}
