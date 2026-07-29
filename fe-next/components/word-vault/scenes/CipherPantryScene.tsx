'use client';

import { useCallback, useMemo, useState } from 'react';
import { normalizeHebrewFinalForms } from '@/lib/word-vault/engine/wordConstraintEngine';
import { EmberOverlay } from '@/components/word-vault/pixi/EmberOverlay';
import { getGameStore } from '@/lib/word-vault/state/gameStore';

/**
 * Room 1.2 — The Cipher Pantry
 *
 * Verb taxonomy:
 *   PRIMARY:   COMPOSE (drag/tap letters to unscramble each frozen jar)
 *   SECONDARY: REVEAL  (3 hotspots: cobweb / floorboard / broom — broom-hotspot
 *                       grants the cross-room broom item used in 1.3)
 */

interface Props {
  onSolved: () => void;
  onExit: () => void;
}

interface Jar {
  id: string;
  /** scrambled letters shown on the jar's outside (the "label") */
  scrambled: string[];
  /** Letter pool below — includes the answer's letters PLUS decoys */
  pool: string[];
  /** correct unscrambled answer */
  answer: string;
  /** Riddle hint — poetic, not descriptive */
  hintHe: string;
  /** position on shelf (0..1) */
  x: number;
  y: number;
}

/**
 * 4 jars, each holds an abstract concept tied to Cael's worldview.
 * Pool letters intentionally interleaved (decoys mixed with answer).
 */
const JARS: Jar[] = [
  {
    id: 'jar-blessing',
    scrambled: ['כ','ה','ב','ר'],
    pool: ['ע','ב','ש','ר','ח','כ','ל','ה','מ'],
    answer: 'ברכה',
    hintHe: 'אומרים אותה לפני שטועמים — ושוכחים אחרי.',
    x: 0.20, y: 0.32,
  },
  {
    id: 'jar-life',
    scrambled: ['י','י','ח','ם'],
    pool: ['ק','י','מ','ח','ש','י','א','ם','ל'],
    answer: 'חיים',
    hintHe: 'אבק לבן + מים + זמן = ?',
    x: 0.46, y: 0.32,
  },
  {
    id: 'jar-sleep',
    scrambled: ['ה','י','ש','נ'],
    pool: ['ק','ש','ר','י','ם','נ','ל','ה','ב'],
    answer: 'שינה',
    hintHe: 'מה שהמטבח עושה אחרי חצות.',
    x: 0.72, y: 0.32,
  },
  {
    id: 'jar-brothers',
    scrambled: ['ם','י','ח','א'],
    pool: ['ב','א','ע','ח','ת','י','ש','ם','ר'],
    answer: 'אחים',
    hintHe: 'התשובה שכולם מחפשים. ובאף בית אין מספיק.',
    x: 0.46, y: 0.66,
  },
];

interface PantryHotspot {
  id: string;
  x: number;
  y: number;
  glyph: string;
  /** Lore line revealed on first click */
  loreHe: string;
  /** Optional: letter shard found here (added to player's discovery log) */
  shardHe?: string;
}

const HOTSPOTS: PantryHotspot[] = [
  {
    id: 'cobweb',
    x: 0.10, y: 0.12,
    glyph: '🕸️',
    loreHe: 'קורי-עכביש בפינה. מתחתיהם — חריץ דק.',
    shardHe: 'ב',
  },
  {
    id: 'floorboard',
    x: 0.92, y: 0.85,
    glyph: '☐',
    loreHe: 'קרש שעלה מהרצפה. מתחת — חלל קטן.',
    shardHe: 'ח',
  },
  {
    id: 'old-broom',
    x: 0.06, y: 0.85,
    glyph: '〰',
    loreHe: 'אבק על הרצפה מצייר אות. כמעט נמחק.',
    shardHe: 'ה',
  },
];

const SECRET_PHRASE_HE = 'ארבעה צנצנות. ארבעה זיכרונות. אחד פתח את הדלת.';

export function CipherPantryScene({ onSolved, onExit }: Props) {
  const [activeJarId, setActiveJarId] = useState<string | null>(null);
  const [arrangements, setArrangements] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(JARS.map((j) => [j.id, []])),
  );
  const [solvedJars, setSolvedJars] = useState<Set<string>>(new Set());
  const [showBrief, setShowBrief] = useState(true);
  const [shake, setShake] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | undefined>();
  const [burstId, setBurstId] = useState(0);
  const [exploredHotspots, setExploredHotspots] = useState<Set<string>>(new Set());
  const [foundShards, setFoundShards] = useState<string[]>([]);
  const [activeHotspot, setActiveHotspot] = useState<PantryHotspot | null>(null);

  const allSolved = solvedJars.size === JARS.length;

  if (allSolved && !done) {
    setTimeout(() => setDone(true), 700);
  }

  const activeJar = activeJarId ? JARS.find((j) => j.id === activeJarId) : null;
  const activeArrangement = useMemo(
    () => (activeJarId ? arrangements[activeJarId] ?? [] : []),
    [activeJarId, arrangements],
  );

  const availableForActive = useMemo(() => {
    if (!activeJar) return [];
    const used = new Set(activeArrangement);
    return activeJar.scrambled.filter((l, i) => {
      const key = `${l}-${i}`;
      return !used.has(key);
    });
  }, [activeJar, activeArrangement]);

  const handleAddLetter = useCallback(
    (letter: string, scrambledIdx: number) => {
      if (!activeJarId || !activeJar) return;
      const key = `${letter}-${scrambledIdx}`;
      if (activeArrangement.includes(key)) return;
      const next = [...activeArrangement, key];
      setArrangements((prev) => ({ ...prev, [activeJarId]: next }));

      // Check completion
      if (next.length === activeJar.answer.length) {
        const word = next.map((k) => k.split('-')[0]).join('');
        if (normalizeHebrewFinalForms(word) === normalizeHebrewFinalForms(activeJar.answer)) {
          // correct
          setSolvedJars((prev) => new Set(prev).add(activeJar.id));
          setBurstId((b) => b + 1);
          if (typeof window !== 'undefined') {
            setBurst({
              id: burstId + 1,
              x: window.innerWidth * activeJar.x,
              y: window.innerHeight * activeJar.y,
            });
          }
          setTimeout(() => setActiveJarId(null), 800);
        } else {
          // wrong
          setShake(activeJar.id);
          setTimeout(() => {
            setShake(null);
            setArrangements((prev) => ({ ...prev, [activeJar.id]: [] }));
          }, 500);
        }
      }
    },
    [activeJarId, activeJar, activeArrangement, burstId],
  );

  const handleRemoveLetter = useCallback(
    (idx: number) => {
      if (!activeJarId) return;
      setArrangements((prev) => ({
        ...prev,
        [activeJarId]: (prev[activeJarId] ?? []).filter((_, i) => i !== idx),
      }));
    },
    [activeJarId],
  );

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, rgba(40,55,75,0.5) 0%, rgba(8,10,15,0.95) 75%), #050810",
      }}
    >
      {/* BG image */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/word-vault/bg/pantry.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.45) saturate(0.85) contrast(1.05)',
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 60%, transparent 35%, rgba(0,0,0,0.85) 95%)',
        }}
      />

      {/* Pixi cold-blue ember overlay */}
      <EmberOverlay density={20} tint={0x6ba0c8} intensity={0.35} burst={burst} />

      {/* Header */}
      <div className="relative z-10 px-6 pt-5 text-center" dir="rtl">
        <p className="font-fredoka text-[11px] uppercase tracking-[0.4em]" style={{ color: 'rgba(180,200,220,0.45)' }}>
          המזווה הקפוא
        </p>
        <h2
          className="mt-1 font-fredoka text-2xl font-black"
          style={{ color: 'rgba(220,235,255,0.92)', textShadow: '2px 2px 0 #000' }}
        >
          {done ? 'המזווה נפתח.' : 'פענח את התווית של כל צנצנת'}
        </h2>
        <p className="mt-1 font-rubik text-xs" style={{ color: 'rgba(180,200,220,0.55)' }}>
          נפתרו {solvedJars.size} / {JARS.length}
        </p>
      </div>

      {/* Jars on shelf */}
      <div className="relative z-10 mt-6 mx-auto" style={{ height: '60vh' }}>
        {JARS.map((jar) => (
          <JarOnShelf
            key={jar.id}
            jar={jar}
            isSolved={solvedJars.has(jar.id)}
            isActive={activeJarId === jar.id}
            isShaking={shake === jar.id}
            onClick={() => {
              if (solvedJars.has(jar.id)) return;
              setActiveJarId(activeJarId === jar.id ? null : jar.id);
            }}
          />
        ))}

        {/* Discovery hotspots — click to explore the scene */}
        {HOTSPOTS.map((h) => {
          const isExplored = exploredHotspots.has(h.id);
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                setActiveHotspot(h);
                if (!isExplored) {
                  setExploredHotspots((prev) => new Set(prev).add(h.id));
                  if (h.shardHe) {
                    setFoundShards((prev) => (prev.includes(h.shardHe!) ? prev : [...prev, h.shardHe!]));
                  }
                  if (h.id === 'old-broom') {
                    getGameStore().getState().grantItem('broom');
                  }
                }
              }}
              aria-label={h.id}
              className="absolute z-20 grid h-10 w-10 place-items-center rounded-full transition-all"
              style={{
                left: `${h.x * 100}%`,
                top: `${h.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                background: isExplored ? 'rgba(255,180,80,0.05)' : 'rgba(255,180,80,0.18)',
                border: isExplored ? '1.5px solid rgba(180,160,140,0.25)' : '2px solid rgba(255,180,80,0.55)',
                boxShadow: isExplored ? 'none' : '0 0 14px rgba(255,180,80,0.4)',
                color: isExplored ? 'rgba(180,160,140,0.4)' : 'rgba(255,210,140,0.9)',
                fontSize: 18,
                animation: isExplored ? undefined : 'wv-hotspotPulse 2s ease-in-out infinite',
              }}
            >
              {h.glyph}
            </button>
          );
        })}
      </div>

      {/* Found-shards bank — visible reward for exploration */}
      {foundShards.length > 0 && !done && (
        <div className="pointer-events-none absolute right-3 top-14 z-10 flex flex-col items-end gap-1" dir="rtl">
          <span className="font-fredoka text-[10px] uppercase tracking-widest text-amber-200/55">שברי אות</span>
          <div className="flex gap-1">
            {foundShards.map((s, i) => (
              <span
                key={i}
                className="grid h-7 w-7 place-items-center rounded border border-amber-300/55 bg-[#1a0e08]/85 font-fredoka text-base font-black"
                style={{ color: 'rgba(255,210,140,0.95)', textShadow: '0 0 8px rgba(255,180,80,0.6)' }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hotspot lore modal */}
      {activeHotspot && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 px-6"
          onClick={() => setActiveHotspot(null)}
        >
          <div
            className="max-w-md rounded-md border-4 border-amber-300/70 px-5 py-4 text-center shadow-[4px_4px_0_0_#000]"
            style={{ background: 'linear-gradient(180deg, #1a0e08 0%, #0a0604 100%)' }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <p className="font-rubik text-base leading-relaxed text-white">{activeHotspot.loreHe}</p>
            {activeHotspot.shardHe && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="font-fredoka text-[10px] uppercase tracking-widest text-amber-200/55">שבר אות</span>
                <span
                  className="grid h-9 w-9 place-items-center rounded-md border-2 border-amber-300 font-fredoka text-2xl font-black"
                  style={{ background: 'linear-gradient(180deg, #5a3a18, #2a160a)', color: 'rgba(255,225,160,1)', textShadow: '0 0 12px rgba(255,180,80,0.85)' }}
                >
                  {activeHotspot.shardHe}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveHotspot(null)}
              className="mt-4 rounded border-2 border-amber-300 px-4 py-1 font-fredoka text-sm font-bold text-amber-200"
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Active-jar editing tray */}
      {activeJar && !done && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 border-t-4 border-amber-300/40 bg-[#0a0c14]/95 px-4 py-4 backdrop-blur"
          dir="rtl"
        >
          <p className="text-center font-rubik text-sm" style={{ color: 'rgba(255,225,180,0.7)' }}>
            <em>{`"${activeJar.hintHe}"`}</em>
          </p>
          {/* Built word slots — carved obsidian look */}
          <div className="mt-3 flex items-center justify-center gap-2" dir="rtl">
            {Array.from({ length: activeJar.answer.length }).map((_, slotIdx) => {
              const placed = activeArrangement[slotIdx];
              const letter = placed?.split('-')[0] ?? '';
              return (
                <button
                  key={slotIdx}
                  type="button"
                  onClick={() => placed && handleRemoveLetter(slotIdx)}
                  className="grid h-12 w-12 place-items-center rounded font-fredoka text-2xl font-black"
                  style={{
                    background: placed
                      ? 'linear-gradient(180deg, rgba(80,55,32,0.95), rgba(40,25,14,0.95))'
                      : 'rgba(8,6,4,0.7)',
                    border: placed
                      ? '2px solid rgba(255,180,80,0.85)'
                      : '1.5px solid rgba(120,100,82,0.35)',
                    color: placed ? 'rgba(255,210,140,1)' : 'rgba(120,100,82,0.4)',
                    boxShadow: placed
                      ? 'inset 0 0 12px rgba(255,140,60,0.35), 0 0 14px rgba(255,140,60,0.3)'
                      : 'inset 0 0 8px rgba(0,0,0,0.65)',
                    textShadow: placed ? '0 0 12px rgba(255,180,80,0.85)' : 'none',
                    cursor: placed ? 'pointer' : 'default',
                  }}
                >
                  {letter || '·'}
                </button>
              );
            })}
          </div>
          {/* Letter pool — includes decoys; carved-stone tile look */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {activeJar.pool.map((ltr, idx) => {
              const key = `${ltr}-${idx}`;
              const used = activeArrangement.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleAddLetter(ltr, idx)}
                  disabled={used}
                  className="grid h-11 w-11 place-items-center rounded font-fredoka text-xl font-black transition-all"
                  style={{
                    background: used
                      ? 'rgba(20,14,10,0.6)'
                      : 'linear-gradient(180deg, rgba(60,42,28,0.95), rgba(28,18,12,0.98))',
                    border: used
                      ? '1.5px solid rgba(80,65,50,0.4)'
                      : '1.5px solid rgba(180,140,90,0.45)',
                    color: used ? 'rgba(120,100,80,0.4)' : 'rgba(225,205,180,0.92)',
                    boxShadow: used
                      ? 'inset 0 0 8px rgba(0,0,0,0.65)'
                      : 'inset 0 1px 0 rgba(255,210,160,0.12), 0 2px 0 rgba(0,0,0,0.7)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.75)',
                    transform: used ? 'translateY(1px)' : 'translateY(0)',
                  }}
                >
                  {ltr}
                </button>
              );
            })}
          </div>
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
            className="w-full max-w-md rounded-md border-4 border-cyan-300 p-6 text-center shadow-[6px_6px_0_0_#000]"
            style={{ background: 'linear-gradient(180deg, #14202c 0%, #08101a 100%)' }}
            dir="rtl"
          >
            <p className="font-fredoka text-xs uppercase tracking-[0.4em] text-cyan-300/60">
              המזווה הקפוא
            </p>
            <h2 className="mt-2 font-fredoka text-3xl font-black text-cyan-200" style={{ textShadow: '2px 2px 0 #000' }}>
              ארבע צנצנות. תוויותיהן התערבבו.
            </h2>
            <p className="mt-4 font-rubik text-base leading-relaxed text-white">
              אורי ערבב תוויות לפני שהקור התפשט.
              חידה אחת על כל צנצנת — וקצת אותיות נוספות שלא שייכות.
              קרא, חשוב, בחר.
            </p>
            <button
              type="button"
              onClick={() => setShowBrief(false)}
              className="mt-6 rounded-md border-4 border-cyan-300 bg-cyan-200 px-6 py-2 font-fredoka text-lg font-black text-[#0a141a] shadow-[3px_3px_0_0_#000]"
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
            background: 'radial-gradient(ellipse at center, rgba(120,200,255,0.3) 0%, rgba(8,10,15,0.95) 70%)',
            animation: 'wv-bloom 1.4s ease-out forwards',
          }}
        >
          <p className="font-rubik text-sm tracking-wide text-white" dir="rtl">
            כל הצנצנות פתוחות.
          </p>
          <div className="flex flex-wrap justify-center gap-3" dir="rtl">
            {JARS.map((j) => (
              <span
                key={j.id}
                className="rounded-md border-4 border-cyan-300 bg-cyan-200 px-4 py-2 font-fredoka text-2xl font-black text-[#0a141a] shadow-[3px_3px_0_0_#000]"
              >
                {j.answer}
              </span>
            ))}
          </div>
          <p
            className="mt-4 max-w-md font-fredoka text-lg font-bold leading-relaxed"
            style={{ color: 'rgba(220,235,255,0.95)', textShadow: '2px 2px 0 #000, 0 0 18px rgba(120,200,255,0.5)' }}
            dir="rtl"
          >
            {`"${SECRET_PHRASE_HE}"`}
          </p>
          <button
            type="button"
            onClick={onSolved}
            className="mt-6 rounded-md border-4 border-cyan-300 bg-cyan-200 px-8 py-3 font-fredoka text-xl font-black text-[#0a141a] shadow-[4px_4px_0_0_#000]"
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
        @keyframes wv-jarShake {
          0%,100% { transform: translate(-50%,-50%) translateX(0); }
          25% { transform: translate(-50%,-50%) translateX(-6px); }
          75% { transform: translate(-50%,-50%) translateX(6px); }
        }
        @keyframes wv-jarFrostMelt {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes wv-hotspotPulse {
          0%,100% { box-shadow: 0 0 12px rgba(255,180,80,0.4); transform: translate(-50%,-50%) scale(1); }
          50% { box-shadow: 0 0 22px rgba(255,200,120,0.85); transform: translate(-50%,-50%) scale(1.08); }
        }
      `}</style>
    </div>
  );
}

function JarOnShelf({
  jar,
  isSolved,
  isActive,
  isShaking,
  onClick,
}: {
  jar: Jar;
  isSolved: boolean;
  isActive: boolean;
  isShaking: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSolved}
      className="absolute z-10 flex flex-col items-center"
      style={{
        left: `${jar.x * 100}%`,
        top: `${jar.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        animation: isShaking ? 'wv-jarShake 0.4s' : undefined,
        cursor: isSolved ? 'default' : 'pointer',
      }}
      aria-label={jar.id}
    >
      {/* SVG jar */}
      <svg width="100" height="130" viewBox="0 0 100 130" style={{ filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.65))' }}>
        <defs>
          <linearGradient id={`jarG-${jar.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isSolved ? '#a4d8e8' : '#5a7a90'} />
            <stop offset="60%" stopColor={isSolved ? '#6ab0c8' : '#3a5670'} />
            <stop offset="100%" stopColor={isSolved ? '#487090' : '#1c2c3c'} />
          </linearGradient>
          <linearGradient id={`lidG-${jar.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a08868" />
            <stop offset="100%" stopColor="#5a4530" />
          </linearGradient>
        </defs>
        {/* Lid */}
        <rect x="22" y="6" width="56" height="14" rx="2" fill={`url(#lidG-${jar.id})`} stroke="#1a0e08" strokeWidth="2" />
        <rect x="20" y="14" width="60" height="6" fill={`url(#lidG-${jar.id})`} stroke="#1a0e08" strokeWidth="2" />
        {/* Body */}
        <path
          d="M22 22 Q18 26 18 32 L20 110 Q22 122 50 122 Q78 122 80 110 L82 32 Q82 26 78 22 Z"
          fill={`url(#jarG-${jar.id})`}
          stroke="#1a0e08"
          strokeWidth="2.5"
        />
        {/* Frost overlay (fades when solved) */}
        {!isSolved && (
          <g style={{ animation: isActive ? 'wv-jarFrostMelt 1.2s ease-out forwards' : undefined }}>
            {/* frosty patches */}
            <ellipse cx="35" cy="50" rx="14" ry="22" fill="rgba(220,240,255,0.55)" />
            <ellipse cx="65" cy="80" rx="16" ry="20" fill="rgba(220,240,255,0.5)" />
            <ellipse cx="50" cy="35" rx="20" ry="8" fill="rgba(240,250,255,0.6)" />
            {/* ice crystals */}
            <path d="M30 30 L34 26 M30 30 L26 26 M30 30 L30 22 M30 30 L34 34 M30 30 L26 34 M30 30 L30 38" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
            <path d="M70 60 L74 56 M70 60 L66 56 M70 60 L70 52 M70 60 L70 68" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
          </g>
        )}
        {/* Label area */}
        <rect x="28" y="62" width="44" height="22" fill={isSolved ? '#f5e6c4' : '#3a4a5c'} stroke="#1a0e08" strokeWidth="1.5" rx="1" />
        {/* Letters on label (visible when solved or scrambled when not) */}
        <text
          x="50"
          y="78"
          fontSize="13"
          textAnchor="middle"
          fontWeight="900"
          fontFamily="serif"
          fill={isSolved ? '#1a0e08' : 'rgba(255,255,255,0.45)'}
        >
          {isSolved ? jar.answer : jar.scrambled.join('')}
        </text>
        {/* Active highlight ring */}
        {isActive && !isSolved && (
          <rect x="14" y="2" width="72" height="124" rx="6" fill="none" stroke="rgba(120,200,255,0.95)" strokeWidth="3" strokeDasharray="4,3" />
        )}
        {/* Solved checkmark */}
        {isSolved && (
          <g>
            <circle cx="80" cy="20" r="10" fill="#9cd864" stroke="#1a0e08" strokeWidth="2" />
            <path d="M76 20 L79 23 L84 17" stroke="#0a3008" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </button>
  );
}
