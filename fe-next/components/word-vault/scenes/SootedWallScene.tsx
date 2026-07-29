'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { normalizeHebrewFinalForms } from '@/lib/word-vault/engine/wordConstraintEngine';
import { getGameStore } from '@/lib/word-vault/state/gameStore';
import { useReveal } from '@/lib/word-vault/hooks/useReveal';

/**
 * Room 1.3 — The Sooted Wall
 *
 * Verb taxonomy:
 *   PRIMARY:   REVEAL  (drag-wipe soot to expose carved word fragments)
 *   SECONDARY: COMPOSE (after wipe past per-carving threshold, fill the
 *                       missing letter from the shared pool)
 *
 * Cross-room item perks: melo-lantern auto-reveals first carving;
 * defrost-candle lowers wipe threshold globally (0.55→0.40); broom
 * lowers it deeply on the honey-carving (0.55→0.25) + visual sparkle.
 */

interface Props {
  onSolved: () => void;
  onExit: () => void;
}

interface Carving {
  id: string;
  /** Full word, with one position marked by '_' placeholder */
  partial: string;
  /** Correct missing letter */
  answer: string;
  /** Hint subtitle that appears once enough soot is wiped */
  hintHe: string;
  /** Final answer for the recipe (display once filled) */
  fullWord: string;
  /** Position on the wall (0..1 each) */
  x: number;
  y: number;
}

const CARVINGS: Carving[] = [
  { id: 'water',  partial: 'מי_',  answer: 'ם', fullWord: 'מים',  hintHe: 'שותה הכל. גם זמן.', x: 0.22, y: 0.30 },
  { id: 'flour',  partial: 'ק_ח',  answer: 'מ', fullWord: 'קמח',  hintHe: 'אבק שלא מת.',          x: 0.62, y: 0.28 },
  { id: 'bread',  partial: '_חם',  answer: 'ל', fullWord: 'לחם',  hintHe: 'מה שלוקח זמן.',        x: 0.22, y: 0.62 },
  { id: 'honey',  partial: 'דב_',  answer: 'ש', fullWord: 'דבש',  hintHe: 'הזיכרון של דבורים.',   x: 0.62, y: 0.60 },
];

// Letter pool: 4 correct (ם,מ,ל,ש) + 4 decoys, shuffled order
const LETTER_POOL = ['ת', 'מ', 'ר', 'ל', 'ה', 'ש', 'ב', 'ם'];

const REVEAL_THRESHOLD = 0.55;   // baseline: soot must be wiped >55% to reveal hint
const DEFROST_THRESHOLD = 0.40;  // defrost-candle holder gets a uniform speedup
const BROOM_THRESHOLD = 0.25;    // broom holder gets a deep speedup on the thickest carving
const BROOM_TARGET_CARVING = 'honey'; // the thickest-soot carving — broom helps here
const SECRET_PHRASE_HE = 'אין מתכון בלי האות שחסרה. לחם הוא קודם לכל מים.';

const CARVING_IDS = CARVINGS.map((c) => c.id);

export function SootedWallScene({ onSolved, onExit }: Props) {
  const [filled, setFilled] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(CARVINGS.map((c) => [c.id, null])),
  );
  const [activeCarving, setActiveCarving] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState(true);
  const [showGestureDemo, setShowGestureDemo] = useState(true);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState<string | null>(null);
  const [whisper, setWhisper] = useState<string | null>(null);
  const [hasBroom, setHasBroom] = useState(false);
  const [hasDefrost, setHasDefrost] = useState(false);
  const [broomSparkleId, setBroomSparkleId] = useState(0); // increments to remount sparkle overlay; 0 = never fired

  const thresholdFor = useCallback(
    (carvingId: string): number => {
      if (hasBroom && carvingId === BROOM_TARGET_CARVING) return BROOM_THRESHOLD;
      if (hasDefrost) return DEFROST_THRESHOLD;
      return REVEAL_THRESHOLD;
    },
    [hasBroom, hasDefrost],
  );

  // useReveal owns: per-carving wipe progress, pointer handlers, threshold check
  const reveal = useReveal({ targetIds: CARVING_IDS, thresholdFor });

  // Item perks on mount: lantern auto-reveals 1 carving; broom = fast-wipe on thickest; defrost candle = uniform speedup
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const items = getGameStore().getState().permanentItems;
    if (items.includes('broom')) setHasBroom(true);
    if (items.includes('defrost-candle')) setHasDefrost(true);
    if (items.includes('melo-lantern')) {
      reveal.setProgress(CARVINGS[0].id, 1);
      setTimeout(() => setWhisper('הפנס מאיר חריץ אחד.'), 700);
      setTimeout(() => setWhisper(null), 3200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot mount effect; reveal is stable
  }, []);

  const allCorrect = useMemo(
    () => CARVINGS.every((c) => filled[c.id] === c.answer),
    [filled],
  );

  // Trigger solve when all correct
  if (allCorrect && !done) {
    setTimeout(() => setDone(true), 600);
  }

  const carvingsRevealed = CARVINGS.filter((c) => reveal.isRevealed(c.id)).length;

  // Dismiss the gesture demo as soon as ANY wipe progress is detected
  useEffect(() => {
    if (showGestureDemo && CARVING_IDS.some((id) => (reveal.revealed[id] ?? 0) > 0)) {
      setShowGestureDemo(false);
    }
  }, [reveal.revealed, showGestureDemo]);

  const handleSelectLetter = useCallback(
    (letter: string) => {
      if (!activeCarving || done) return;
      const c = CARVINGS.find((x) => x.id === activeCarving);
      if (!c) return;
      if (!reveal.isRevealed(c.id)) {
        setWhisper('עוד לא מספיק נקי. נגב עוד.');
        setTimeout(() => setWhisper(null), 1800);
        return;
      }
      const norm = normalizeHebrewFinalForms(letter);
      const ansNorm = normalizeHebrewFinalForms(c.answer);
      if (norm === ansNorm) {
        setFilled((prev) => ({ ...prev, [c.id]: c.answer }));
        setActiveCarving(null);
      } else {
        setShake(c.id);
        setTimeout(() => setShake(null), 350);
      }
    },
    [activeCarving, done, reveal],
  );

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, rgba(60,30,18,0.55) 0%, rgba(15,8,4,0.95) 75%), #0a0604",
      }}
    >
      {/* Dim charred-wall BG image */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/word-vault/bg/hearth-halls.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 70%',
          filter: 'brightness(0.28) saturate(0.6) contrast(1.1)',
          mixBlendMode: 'multiply',
        }}
      />

      {/* Stone-wall texture overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='s'%3E%3CfeTurbulence baseFrequency='0.03' numOctaves='4'/%3E%3CfeColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.08  0 0 0 0.95 0'/%3E%3C/filter%3E%3Crect width='600' height='600' filter='url(%23s)'/%3E%3C/svg%3E\")",
          backgroundSize: 'cover',
        }}
      />

      {/* Edge vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.85) 95%)',
        }}
      />

      {/* Header */}
      <div className="relative z-10 px-6 pt-5 text-center" dir="rtl">
        <p className="font-fredoka text-[11px] uppercase tracking-[0.4em]" style={{ color: 'rgba(220,200,180,0.4)' }}>
          הקיר המפויח
        </p>
        <h2
          className="mt-1 font-fredoka text-2xl font-black"
          style={{ color: 'rgba(255,225,180,0.92)', textShadow: '2px 2px 0 #000' }}
        >
          {done ? 'הקיר נסדק.' : 'נגב את הפיח. השלם את האות.'}
        </h2>
        <p className="mt-1 font-rubik text-xs" style={{ color: 'rgba(220,200,180,0.5)' }}>
          חשוף {carvingsRevealed} / 4 · השלם {Object.values(filled).filter(Boolean).length} / 4
        </p>
      </div>

      {/* Wall carvings */}
      <div className="relative z-10 mt-6 mx-auto flex w-full max-w-3xl items-center justify-center" style={{ height: '60vh' }}>
        {CARVINGS.map((c, idx) => {
          const handlers = reveal.handlersFor(c.id);
          const locked = !!filled[c.id] || done;
          return (
          <CarvingPanel
            key={c.id}
            carving={c}
            revealAmount={reveal.revealed[c.id] ?? 0}
            threshold={thresholdFor(c.id)}
            filledLetter={filled[c.id]}
            isActive={activeCarving === c.id}
            isShaking={shake === c.id}
            showGestureDemo={showGestureDemo && idx === 0 && !showBrief}
            onPointerDown={locked ? () => undefined : handlers.onPointerDown}
            onPointerMove={locked ? () => undefined : handlers.onPointerMove}
            onPointerUp={handlers.onPointerUp}
            onTap={() => {
              if (!filled[c.id] && reveal.isRevealed(c.id)) {
                setActiveCarving(c.id);
                // Broom legibility: visual-only sparkle burst on the honey carving the first time
                // a broom-holder activates it. No whisper — let the player notice their tool worked.
                if (hasBroom && c.id === BROOM_TARGET_CARVING && broomSparkleId === 0) {
                  setBroomSparkleId(Date.now());
                }
              } else if (filled[c.id]) {
                // already filled — show whisper of hint
                setWhisper(`"${c.hintHe}"`);
                setTimeout(() => setWhisper(null), 2500);
              } else {
                setWhisper('עוד לא מספיק נקי. נגב עוד.');
                setTimeout(() => setWhisper(null), 1800);
              }
            }}
          />
          );
        })}

        {/* Broom sparkle burst — visual-only feedback, fires once per playthrough on honey-carving activation */}
        {broomSparkleId > 0 && (() => {
          const honey = CARVINGS.find((c) => c.id === BROOM_TARGET_CARVING);
          if (!honey) return null;
          return (
            <div
              key={broomSparkleId}
              aria-hidden="true"
              className="pointer-events-none absolute"
              style={{
                left: `${honey.x * 100}%`,
                top: `${honey.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: 240,
                height: 150,
                background:
                  'radial-gradient(circle at center, rgba(255,225,160,0.85) 0%, rgba(255,180,80,0.4) 40%, transparent 70%)',
                animation: 'wv-broomSparkle 1.5s ease-out forwards',
                mixBlendMode: 'screen',
              }}
            />
          );
        })()}
      </div>

      {/* Letter pool — only renders when player has wiped a carving and tapped it (discovery-first) */}
      {!done && activeCarving && (
        <div className="relative z-10 mx-auto mt-2 flex max-w-md flex-col items-center px-4 pb-6" dir="rtl">
          <p className="mb-2 font-fredoka text-xs text-amber-200/60">בחר את האות החסרה:</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {LETTER_POOL.map((ltr) => (
              <button
                key={ltr}
                type="button"
                onClick={() => handleSelectLetter(ltr)}
                className="grid h-12 w-12 place-items-center rounded-md border-2 font-fredoka text-2xl font-black transition-all"
                style={{
                  background: 'linear-gradient(180deg, #d4ba8a 0%, #8a6c44 100%)',
                  borderColor: '#5a3a18',
                  color: '#1a0e08',
                  boxShadow: '0 3px 0 rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,235,180,0.3)',
                }}
              >
                {ltr}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Whisper */}
      {whisper && (
        <div className="pointer-events-none absolute inset-x-0 top-[15%] z-20 flex justify-center px-6" dir="rtl">
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

      {/* Brief overlay */}
      {showBrief && !done && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 px-6">
          <div
            className="w-full max-w-md rounded-md border-4 border-amber-300 p-6 text-center shadow-[6px_6px_0_0_#000]"
            style={{ background: 'linear-gradient(180deg, #2a1f14 0%, #1a1208 100%)' }}
            dir="rtl"
          >
            <p className="font-fredoka text-xs uppercase tracking-[0.4em] text-amber-200/60">הקיר המפויח</p>
            <h2 className="mt-2 font-fredoka text-3xl font-black text-amber-200" style={{ textShadow: '2px 2px 0 #000' }}>
              אורי חרת. הפיח כיסה.
            </h2>
            <p className="mt-4 font-rubik text-base leading-relaxed text-white">
              ארבע מילים נשרטו בקיר — מצרכי לחם.
              בכל אחת אות אחת חסרה מתחת לפיח.
            </p>
            <p className="mt-3 font-rubik text-sm text-white">
              <strong>גרור</strong> על אזור בקיר כדי לנגב פיח (מספיק כדי לקרוא).
              <strong> גע</strong> במילה החשופה. <strong>בחר</strong> את האות הנכונה מהאוסף למטה.
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
            background:
              'radial-gradient(ellipse at center, rgba(255,180,80,0.45) 0%, rgba(11,8,4,0.95) 70%)',
            animation: 'wv-bloom 1.4s ease-out forwards',
          }}
        >
          <p className="font-rubik text-sm tracking-wide text-white" dir="rtl">המתכון שלם.</p>
          <div className="flex flex-wrap justify-center gap-2" dir="rtl">
            {CARVINGS.map((c) => (
              <span
                key={c.id}
                className="rounded-md border-4 border-amber-300 bg-amber-200 px-4 py-2 font-fredoka text-2xl font-black text-[#1a0e08] shadow-[3px_3px_0_0_#000]"
              >
                {c.fullWord}
              </span>
            ))}
          </div>
          <p
            className="mt-4 max-w-md font-fredoka text-lg font-bold leading-relaxed"
            style={{ color: 'rgba(255,225,180,0.95)', textShadow: '2px 2px 0 #000, 0 0 18px rgba(255,140,60,0.6)' }}
            dir="rtl"
          >
            “{SECRET_PHRASE_HE}”
          </p>
          <button
            type="button"
            onClick={onSolved}
            className="mt-6 rounded-md border-4 border-amber-300 bg-amber-200 px-8 py-3 font-fredoka text-xl font-black text-[#1a0e08] shadow-[4px_4px_0_0_#000] transition active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000]"
          >
            המשך &nbsp;→
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes wv-toast {
          0% { opacity: 0; transform: translateY(8px); }
          15%, 80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-12px); }
        }
        @keyframes wv-bloom {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes wv-shakeX {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes wv-emberPulse {
          0%,100% { box-shadow: 0 0 18px rgba(255,140,60,0.5); }
          50% { box-shadow: 0 0 28px rgba(255,180,80,0.85); }
        }
        @keyframes wv-finger {
          0%   { left: 24px;  opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
          15%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          80%  { left: 196px; opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { left: 196px; opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
        }
        @keyframes wv-trail {
          0%   { opacity: 0; transform: translateY(-50%) scaleX(0); transform-origin: left center; }
          25%  { opacity: 0.85; }
          80%  { opacity: 0.85; transform: translateY(-50%) scaleX(1); transform-origin: left center; }
          100% { opacity: 0; }
        }
        @keyframes wv-wipeArc {
          0%   { opacity: 0; left: 24px; }
          25%  { opacity: 0.9; }
          80%  { opacity: 0.9; left: 196px; }
          100% { opacity: 0; left: 196px; }
        }
        @keyframes wv-broomSparkle {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          25%  { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
          70%  { opacity: 0.8; transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.4); }
        }
      `}</style>
    </div>
  );
}

function FingerCursor() {
  return (
    <svg width="36" height="44" viewBox="0 0 36 44" style={{ filter: 'drop-shadow(2px 3px 4px rgba(0,0,0,0.7))' }}>
      {/* finger silhouette */}
      <defs>
        <linearGradient id="fingerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d4a8"/>
          <stop offset="100%" stopColor="#a08060"/>
        </linearGradient>
      </defs>
      {/* hand back */}
      <path d="M14 26 Q12 30 14 36 L26 40 Q28 36 28 32 L26 26 Z" fill="url(#fingerGrad)" stroke="#3a2818" strokeWidth="1.4" strokeLinejoin="round"/>
      {/* index finger */}
      <path d="M16 4 Q14 6 14 12 L14 28 Q16 30 22 30 L22 12 Q22 4 19 4 Q17 4 16 4 Z" fill="url(#fingerGrad)" stroke="#3a2818" strokeWidth="1.4" strokeLinejoin="round"/>
      {/* fingernail highlight */}
      <ellipse cx="18" cy="8" rx="2.2" ry="2.8" fill="#fff5d8" opacity="0.7"/>
      {/* knuckle */}
      <line x1="14" y1="20" x2="22" y2="20" stroke="#3a2818" strokeWidth="0.8" opacity="0.6"/>
      {/* glow halo around fingertip */}
      <circle cx="18" cy="6" r="6" fill="none" stroke="rgba(255,210,140,0.6)" strokeWidth="1.5" opacity="0.5"/>
    </svg>
  );
}

function CarvingPanel({
  carving,
  revealAmount,
  threshold,
  filledLetter,
  isActive,
  isShaking,
  showGestureDemo,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onTap,
}: {
  carving: Carving;
  revealAmount: number;
  threshold: number;
  filledLetter: string | null;
  isActive: boolean;
  isShaking: boolean;
  showGestureDemo: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onTap: () => void;
}) {
  const sootOpacity = Math.max(0, 0.95 - revealAmount * 1.05);
  const carvingVisible = revealAmount > 0.25;
  const hintVisible = revealAmount >= threshold;
  const isLocked = !!filledLetter;
  // Affordance glow: ready-to-tap once wiped past per-carving threshold + not yet filled + not currently active
  const readyToTap = hintVisible && !isLocked && !isActive;

  // Compose displayed word with placeholder/letter
  const displayText = isLocked ? carving.fullWord : carving.partial;

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onTap}
      style={{
        position: 'absolute',
        left: `${carving.x * 100}%`,
        top: `${carving.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        width: 220,
        height: 130,
        touchAction: 'none',
        animation: isShaking ? 'wv-shakeX 0.35s' : undefined,
      }}
      className="select-none"
    >
      {/* Stone slab */}
      <div
        className="relative h-full w-full overflow-hidden rounded-lg"
        style={{
          background:
            'linear-gradient(180deg, rgba(80,55,38,0.55) 0%, rgba(40,28,18,0.85) 100%)',
          border: isLocked
            ? '3px solid rgba(220,200,160,0.85)'  // solved = cool steady gold
            : isActive
            ? '3px solid rgba(255,200,120,0.65)'
            : readyToTap
            ? '2.5px solid rgba(255,200,120,0.85)'
            : '2px solid rgba(120,90,60,0.55)',
          boxShadow: isLocked
            ? 'inset 0 0 24px rgba(0,0,0,0.7), 0 0 10px rgba(220,200,160,0.35)'  // solved = subtle steady glow
            : readyToTap
            ? 'inset 0 0 24px rgba(0,0,0,0.7), 0 0 18px rgba(255,180,80,0.55)'
            : 'inset 0 0 24px rgba(0,0,0,0.7)',
          // Animation reserved for "ready" state ONLY — solved is steady, not pulsing
          animation: readyToTap ? 'wv-emberPulse 1.8s ease-in-out infinite' : undefined,
        }}
      >
        {/* stone grain */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-50 mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='130'%3E%3Cfilter id='r'%3E%3CfeTurbulence baseFrequency='0.05' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0'/%3E%3C/filter%3E%3Crect width='200' height='130' filter='url(%23r)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Carved word — only visible after wiping */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            opacity: carvingVisible ? Math.min(1, revealAmount * 1.6) : 0,
            transition: 'opacity 220ms',
          }}
          dir="rtl"
        >
          <span
            className="font-fredoka text-5xl font-black"
            style={{
              color: isLocked ? '#ffe4a8' : '#b8a080',
              textShadow: isLocked
                ? '0 0 20px rgba(255,180,80,0.95), 1px 1px 0 #000, -1px -1px 0 #000'
                : 'inset 0 1px 0 #000, 1px 1px 0 #000, -1px -1px 0 #000',
              letterSpacing: 6,
            }}
          >
            {displayText}
          </span>
          {hintVisible && !isLocked && (
            <span
              className="mt-1 font-rubik text-xs italic"
              style={{ color: 'rgba(255,225,180,0.65)' }}
            >
              {`"${carving.hintHe}"`}
            </span>
          )}
        </div>

        {/* Soot overlay — fades as wiped */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 40%, rgba(15,10,6,0.95) 0%, rgba(8,5,3,1) 80%), linear-gradient(135deg, rgba(8,5,3,1) 0%, rgba(20,12,6,0.95) 100%)',
            opacity: sootOpacity,
            transition: 'opacity 200ms',
          }}
        />

        {/* Animated gesture demo — finger swipe across the slab */}
        {showGestureDemo && revealAmount < 0.05 && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {/* trail behind finger */}
            <span
              className="absolute"
              style={{
                top: '50%',
                left: 24,
                width: 110,
                height: 18,
                transform: 'translateY(-50%)',
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,210,140,0.35) 30%, rgba(255,180,80,0.55) 70%, transparent 100%)',
                borderRadius: 12,
                filter: 'blur(3px)',
                opacity: 0,
                animation: 'wv-trail 1.8s ease-in-out infinite',
              }}
            />
            {/* fading wipe arc that "cleans" the soot */}
            <span
              className="absolute"
              style={{
                top: '50%',
                left: 24,
                width: 110,
                height: 36,
                transform: 'translateY(-50%)',
                borderRadius: 18,
                background:
                  'radial-gradient(ellipse at 30% 50%, rgba(255,225,180,0.3) 0%, transparent 70%)',
                opacity: 0,
                animation: 'wv-wipeArc 1.8s ease-in-out infinite',
              }}
            />
            {/* the finger / hand cursor */}
            <span
              className="absolute"
              style={{
                top: '50%',
                left: 24,
                transform: 'translate(-50%, -50%)',
                opacity: 0,
                animation: 'wv-finger 1.8s ease-in-out infinite',
              }}
            >
              <FingerCursor />
            </span>
            {/* tiny prompt */}
            <span
              className="absolute bottom-1 right-2 font-rubik text-[10px] tracking-wider"
              style={{ color: 'rgba(255,210,140,0.55)' }}
              dir="rtl"
            >
              ← גרור לנגב
            </span>
          </div>
        )}

        {/* Static fallback "swipe me" hint */}
        {!showGestureDemo && revealAmount < 0.05 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="font-rubik text-xs" style={{ color: 'rgba(255,200,120,0.4)' }}>
              ↻ נגב
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
