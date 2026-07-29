'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmberOverlay } from '@/components/word-vault/pixi/EmberOverlay';

/**
 * Room 1.1 — The Cracked Door
 *
 * Verb taxonomy:
 *   PRIMARY:   REVEAL  (find lantern hotspot in dark; light reveals door letters)
 *   SECONDARY: COMPOSE (tap א then ש in order to spell אש)
 *
 * Establishes the game's grammar: scene-as-interface, no floating UI,
 * the lantern is your primary tool — callback paid off in 1.3.
 */

interface Props {
  onSolved: () => void;
  onExit: () => void;
}

interface DoorLetter {
  id: string;
  letter: 'א' | 'ש';
  x: number; // position on door (0..1)
  y: number;
  order: number; // 0 = first (א), 1 = second (ש)
}

const DOOR_LETTERS: DoorLetter[] = [
  { id: 'aleph', letter: 'א', x: 0.32, y: 0.45, order: 0 },
  { id: 'shin', letter: 'ש', x: 0.62, y: 0.55, order: 1 },
];

type Whisper = { id: number; text: string };

interface Hotspot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  icon: 'diary' | 'lantern' | 'portrait';
  lines: string[];
  isLantern?: boolean; // special flag for lantern ignition
}

const HOTSPOTS: Hotspot[] = [
  {
    id: 'diary',
    x: 0.91,
    y: 0.82,
    w: 70,
    h: 70,
    icon: 'diary',
    lines: [
      '"אורי היה מדליק את האח קודם."',
      '"אש קטנה. אז כל השאר."',
    ],
  },
  {
    id: 'lantern',
    x: 0.08,
    y: 0.78,
    w: 60,
    h: 92,
    icon: 'lantern',
    lines: ['הפנס ריק. הזכוכית סדוקה.'],
    isLantern: true,
  },
  {
    id: 'portrait',
    x: 0.93,
    y: 0.18,
    w: 78,
    h: 78,
    icon: 'portrait',
    lines: [
      'חמישה בני דודים. אחד חסר.',
      'הקטן מחבק את הגדול.',
    ],
  },
];

export function DarkDoorScene({ onSolved, onExit }: Props) {
  const [lanternLit, setLanternLit] = useState(false);
  const [tappedLetters, setTappedLetters] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [bossRoared, setBossRoared] = useState(false);
  const [idleHint, setIdleHint] = useState(false);
  const [whispers, setWhispers] = useState<Whisper[]>([]);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [examined, setExamined] = useState<Set<string>>(new Set());
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | undefined>(undefined);
  const burstId = useRef(0);
  const whisperId = useRef(0);
  const sceneRef = useRef<HTMLDivElement>(null);

  // Soft safety net: if the player hasn't lit the lantern after 8s, surface an ultra-subtle ember
  // particle near the lantern hotspot. Clears the moment the lantern is lit OR on unmount.
  useEffect(() => {
    if (lanternLit) {
      setIdleHint(false);
      return;
    }
    const t = setTimeout(() => setIdleHint(true), 8000);
    return () => clearTimeout(t);
  }, [lanternLit]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: cx * 12, y: cy * 8 });
  }, []);

  const pushWhisper = useCallback((text: string) => {
    whisperId.current += 1;
    const id = whisperId.current;
    setWhispers((w) => [...w, { id, text }]);
    setTimeout(() => setWhispers((w) => w.filter((x) => x.id !== id)), 3500);
  }, []);

  const handleHotspot = useCallback(
    (h: Hotspot) => {
      // Lantern ignition
      if (h.isLantern && !lanternLit) {
        setLanternLit(true);
        setExamined((prev) => {
          const next = new Set(prev);
          next.add(h.id);
          return next;
        });
        // Boss roar after 600ms
        setTimeout(() => {
          if (!bossRoared) {
            pushWhisper('חזרי, קטנטונת!');
            setBossRoared(true);
          }
        }, 600);
        return;
      }

      // Other hotspots disabled after lantern lit
      if (lanternLit) return;

      const line = h.lines[Math.floor(Math.random() * h.lines.length)];
      pushWhisper(line);
      setExamined((prev) => {
        const next = new Set(prev);
        next.add(h.id);
        return next;
      });
    },
    [lanternLit, bossRoared, pushWhisper],
  );

  const handleLetterTap = useCallback(
    (letter: DoorLetter) => {
      if (!lanternLit || done) return;

      const nextIndex = tappedLetters.length;
      const expectedLetter = DOOR_LETTERS.find((l) => l.order === nextIndex);

      if (!expectedLetter || letter.id !== expectedLetter.id) {
        // Wrong letter
        setShakeId(letter.id);
        setTimeout(() => setShakeId(null), 280);
        pushWhisper('לא בסדר הזה. תאיתי קודם את האות הראשונה.');
        return;
      }

      // Correct letter
      const newTapped = [...tappedLetters, letter.letter];
      setTappedLetters(newTapped);

      // Check if puzzle complete
      if (newTapped.length === 2) {
        setDone(true);
        // Burst animation
        burstId.current += 1;
        if (typeof window !== 'undefined') {
          setBurst({ id: burstId.current, x: window.innerWidth / 2, y: window.innerHeight * 0.55 });
        }
        // Fire onSolved after cinematic
        setTimeout(() => {
          onSolved();
        }, 2000);
      }
    },
    [lanternLit, done, tappedLetters, pushWhisper, onSolved],
  );

  return (
    <div
      ref={sceneRef}
      className="relative h-full min-h-[100dvh] w-full overflow-hidden"
      onMouseMove={onMouseMove}
    >
      {/* Layer 1: room background image (dimmed) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/word-vault/bg/hearth-halls.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center 70%',
          filter: lanternLit
            ? 'brightness(0.85) saturate(1.4) contrast(1.1)'
            : 'brightness(0.32) saturate(0.9) contrast(1.05)',
          transform: `translate(${parallax.x * 0.4}px, ${parallax.y * 0.4}px) scale(1.06)`,
          transition: 'filter 1.6s ease-out',
        }}
      />

      {/* Layer 2: warm radial glow (cold when off, ember when on) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: lanternLit
            ? 'radial-gradient(ellipse at 50% 65%, rgba(255,150,55,0.55) 0%, rgba(80,30,12,0.7) 45%, rgba(20,8,4,0.9) 100%)'
            : 'radial-gradient(ellipse at 50% 70%, rgba(40,30,30,0.3) 0%, rgba(8,6,12,0.85) 80%)',
          transition: 'background 1.8s ease-out',
        }}
      />

      {/* Layer 3: vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.85) 92%)',
        }}
      />

      {/* Layer 4: ambient dust motes */}
      <DustMotes count={18} lanternLit={lanternLit} />

      {/* Pixi-powered ember/spark overlay */}
      <EmberOverlay
        density={lanternLit ? 80 : 18}
        tint={lanternLit ? 0xff8a3c : 0xff5818}
        intensity={lanternLit ? 1 : 0.5}
        burst={burst}
      />

      {/* Hotspots — interactive scene objects */}
      {HOTSPOTS.map((h) => (
        <HotspotButton
          key={h.id}
          hotspot={h}
          onActivate={() => handleHotspot(h)}
          parallax={parallax}
          lanternLit={lanternLit}
          examined={examined.has(h.id)}
        />
      ))}

      {/* Idle safety: soft ember pulses near the lantern after 8s of no progress */}
      {idleHint && !lanternLit && (() => {
        const lanternHotspot = HOTSPOTS.find((h) => h.isLantern);
        if (!lanternHotspot) return null;
        return (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `${lanternHotspot.x * 100}%`,
              top: `${lanternHotspot.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 80,
              height: 80,
              background:
                'radial-gradient(circle at center, rgba(255,180,80,0.45) 0%, transparent 65%)',
              animation: 'wv-idleHint 2.4s ease-in-out infinite',
              mixBlendMode: 'screen',
            }}
          />
        );
      })()}

      {/* Atmospheric line */}
      <div className="relative z-10 px-6 pt-6 text-center" dir="rtl">
        <p
          className="font-rubik text-sm tracking-widest"
          style={{
            color: lanternLit ? 'rgba(255,235,180,0.95)' : 'rgba(220,200,180,0.5)',
            transition: 'color 1.4s',
            textTransform: 'lowercase',
          }}
        >
          {lanternLit ? 'אור.' : 'חשוך כאן.'}
        </p>
      </div>

      {/* Door with carved letters (revealed by lantern) */}
      {lanternLit && (
        <div
          className="relative z-20 mt-12 flex flex-col items-center justify-center select-none"
          style={{
            animation: 'wv-doorReveal 1.2s ease-out forwards',
          }}
        >
          {/* Door silhouette */}
          <div
            className="relative flex flex-col items-center"
            style={{
              width: 140,
              height: 240,
              marginBottom: 24,
            }}
          >
            <div
              className="absolute inset-0 rounded-t-3xl border-4 border-amber-400/80"
              style={{
                background: 'linear-gradient(180deg, rgba(60,30,15,0.95) 0%, rgba(40,20,10,0.95) 100%)',
                boxShadow: '0 0 80px rgba(255,140,60,0.7)',
              }}
            />

            {/* Carved letters on door */}
            {DOOR_LETTERS.map((letter) => {
              const isShaking = shakeId === letter.id;
              const isTapped = tappedLetters.includes(letter.letter);
              return (
                <button
                  key={letter.id}
                  type="button"
                  onClick={() => handleLetterTap(letter)}
                  disabled={done || isTapped}
                  className="absolute z-10 flex items-center justify-center font-fredoka font-black transition-all"
                  style={{
                    left: `${letter.x * 100}%`,
                    top: `${letter.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 64,
                    height: 64,
                    fontSize: 42,
                    color: isTapped
                      ? 'rgba(255,180,80,0.3)'
                      : 'rgba(255,220,140,1)',
                    textShadow: isTapped
                      ? 'none'
                      : '0 0 20px rgba(255,170,80,1), 0 0 40px rgba(255,140,60,0.8)',
                    background: isTapped
                      ? 'rgba(20,10,5,0.6)'
                      : 'radial-gradient(circle, rgba(255,200,120,0.2) 0%, transparent 70%)',
                    borderRadius: '50%',
                    border: isTapped ? '1px solid rgba(100,80,60,0.4)' : '2px solid rgba(255,200,120,0.6)',
                    boxShadow: isTapped
                      ? 'inset 0 0 12px rgba(0,0,0,0.5)'
                      : 'inset 0 0 16px rgba(255,200,120,0.4), 0 0 24px rgba(255,160,80,0.6)',
                    cursor: done || isTapped ? 'default' : 'pointer',
                    opacity: done && !isTapped ? 0.3 : 1,
                    animation: isShaking ? 'wv-shake 0.28s' : undefined,
                  }}
                  aria-label={`Letter ${letter.letter}`}
                >
                  {letter.letter}
                </button>
              );
            })}
          </div>

          {/* Instruction text */}
          {tappedLetters.length === 0 && (
            <p
              className="font-rubik text-sm text-center"
              style={{
                color: 'rgba(255,210,150,0.85)',
                textShadow: '0 0 12px rgba(255,107,53,0.5)',
                animation: 'wv-whisper 4s ease-out forwards',
              }}
            >
              בחרי את האותיות בסדר הנכון.
            </p>
          )}

          {/* Progress: show tapped letters */}
          {tappedLetters.length > 0 && !done && (
            <div
              className="mt-4 flex gap-4"
              style={{
                animation: 'wv-popBurst 0.6s ease-out',
              }}
            >
              {DOOR_LETTERS.map((letter) => (
                <span
                  key={letter.id}
                  className="font-fredoka text-3xl font-black"
                  style={{
                    color: tappedLetters.includes(letter.letter)
                      ? 'rgba(255,220,140,1)'
                      : 'rgba(100,80,60,0.3)',
                    textShadow: tappedLetters.includes(letter.letter)
                      ? '0 0 16px rgba(255,170,80,1)'
                      : 'none',
                    transition: 'color 400ms, text-shadow 400ms',
                  }}
                >
                  {letter.letter}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* The campfire — diegetic prompt */}
      <Campfire lanternLit={lanternLit} parallax={parallax} />

      {/* Whispers (lore from clicked objects + boss roar) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-28 z-30 flex flex-col items-center gap-1 px-6" dir="rtl">
        {whispers.map((w) => (
          <WhisperLine key={w.id} text={w.text} />
        ))}
      </div>

      {/* Pause button */}
      <button
        type="button"
        onClick={onExit}
        aria-label="חזרה"
        className="absolute left-3 top-3 z-30 rounded border border-white/10 px-2 py-1 text-xs text-white hover:text-white"
      >
        ←
      </button>

      <style jsx global>{`
        @keyframes wv-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @keyframes wv-flame {
          0%, 100% { transform: translateX(-50%) scaleY(1) scaleX(1); opacity: 1; }
          50% { transform: translateX(-50%) scaleY(1.1) scaleX(0.92); opacity: 0.9; }
        }
        @keyframes wv-spark {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -110px) scale(0.3); opacity: 0; }
        }
        @keyframes wv-dust {
          0% { transform: translate(0, 100vh); opacity: 0; }
          10% { opacity: 0.55; }
          90% { opacity: 0.55; }
          100% { transform: translate(40px, -10vh); opacity: 0; }
        }
        @keyframes wv-whisper {
          0% { opacity: 0; transform: translateY(8px); }
          15%, 80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-12px); }
        }
        @keyframes wv-idleHint {
          0%,100% { opacity: 0.15; transform: translate(-50%, -50%) scale(0.85); }
          50%     { opacity: 0.55; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes wv-popBurst {
          0% { opacity: 0.95; transform: scale(0.6); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes wv-doorReveal {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function HotspotButton({
  hotspot,
  onActivate,
  parallax,
  lanternLit,
  examined,
}: {
  hotspot: Hotspot;
  onActivate: () => void;
  parallax: { x: number; y: number };
  lanternLit: boolean;
  examined: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [popKey, setPopKey] = useState(0);

  const handleClick = () => {
    setPopKey((k) => k + 1);
    onActivate();
  };

  // Lantern hotspot disables after lit; others disable after lantern lit (except lantern itself)
  const isDisabled = hotspot.isLantern ? lanternLit : lanternLit;

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      disabled={isDisabled}
      className="absolute z-20 flex items-center justify-center"
      style={{
        left: `calc(${hotspot.x * 100}% - ${hotspot.w / 2}px)`,
        top: `calc(${hotspot.y * 100}% - ${hotspot.h / 2}px)`,
        width: hotspot.w,
        height: hotspot.h,
        transform: `translate(${parallax.x * 0.6}px, ${parallax.y * 0.4}px) scale(${
          hover ? 1.1 : 1
        })`,
        transition: 'transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: isDisabled ? 'default' : 'pointer',
        opacity: examined ? 0.6 : 1,
      }}
      aria-label={hotspot.id}
    >
      {/* Outer halo glow */}
      <span
        aria-hidden="true"
        className="absolute"
        style={{
          inset: -16,
          background: hover
            ? 'radial-gradient(circle, rgba(255,180,80,0.45) 0%, transparent 65%)'
            : 'radial-gradient(circle, rgba(255,180,80,0.16) 0%, transparent 70%)',
          transition: 'background 320ms',
          filter: 'blur(2px)',
        }}
      />

      {/* Click pop-burst */}
      <span
        key={popKey}
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          inset: -10,
          borderRadius: '50%',
          border: '2px solid rgba(255,200,120,0.9)',
          opacity: 0,
          animation: popKey > 0 ? 'wv-popBurst 0.8s ease-out' : undefined,
        }}
      />

      {/* Examined check */}
      {examined && (
        <span
          aria-hidden="true"
          className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-amber-200/70 bg-[#1a0e08] text-[10px] font-bold text-amber-200 shadow-[0_0_8px_rgba(255,180,80,0.6)]"
        >
          ✓
        </span>
      )}

      <HotspotIcon kind={hotspot.icon} hover={hover} />
    </button>
  );
}

function HotspotIcon({ kind, hover }: { kind: Hotspot['icon']; hover: boolean }) {
  const ink = hover ? '#f5d8a8' : '#9c8770';
  const inkSoft = hover ? '#d5b08a' : '#6b594a';
  const wood = hover ? '#7a4528' : '#4a2c1a';
  const woodDark = hover ? '#5a3320' : '#321b0e';
  const paper = hover ? '#c9b08a' : '#7a6650';
  const paperDark = hover ? '#a08766' : '#5a4838';

  if (kind === 'diary') {
    return (
      <svg width="56" height="62" viewBox="0 0 56 62" style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.6))' }}>
        <defs>
          <linearGradient id="diaryCover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={wood} />
            <stop offset="100%" stopColor={woodDark} />
          </linearGradient>
        </defs>
        <path d="M5 6 L48 4 L51 56 L8 58 Z" fill="url(#diaryCover)" stroke="#1a0a04" strokeWidth="1.5" />
        <path d="M5 6 L8 8 L11 56 L8 58 Z" fill="#2a160a" stroke="#1a0a04" strokeWidth="1" />
        <circle cx="9" cy="14" r="1.4" fill={ink} />
        <circle cx="9" cy="30" r="1.4" fill={ink} />
        <circle cx="9" cy="46" r="1.4" fill={ink} />
        <path d="M28 18 Q24 24 26 30 Q28 26 30 28 Q32 24 30 20 Q28 24 28 18 Z" fill={ink} opacity={hover ? 0.9 : 0.5} />
        <line x1="13" y1="10" x2="49" y2="9" stroke={paper} strokeWidth="0.8" />
        <line x1="14" y1="14" x2="50" y2="13" stroke={paperDark} strokeWidth="0.6" />
        <path d="M48 4 L52 8 L49 9 Z" fill={woodDark} />
      </svg>
    );
  }
  if (kind === 'lantern') {
    return (
      <svg width="44" height="76" viewBox="0 0 44 76" style={{ filter: 'drop-shadow(2px 4px 5px rgba(0,0,0,0.65))' }}>
        <defs>
          <linearGradient id="lanternMetal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hover ? '#a89070' : '#5a4d3a'} />
            <stop offset="100%" stopColor={hover ? '#6e5a3e' : '#3a2e22'} />
          </linearGradient>
          <linearGradient id="lanternGlass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hover ? 'rgba(180,160,130,0.5)' : 'rgba(60,55,50,0.7)'} />
            <stop offset="100%" stopColor={hover ? 'rgba(120,100,80,0.6)' : 'rgba(30,25,22,0.85)'} />
          </linearGradient>
        </defs>
        <path d="M22 2 Q22 8 22 12" stroke={ink} strokeWidth="1.8" fill="none" />
        <path d="M18 4 Q22 1 26 4" stroke={ink} strokeWidth="1.5" fill="none" />
        <path d="M10 12 L34 12 L31 18 L13 18 Z" fill="url(#lanternMetal)" stroke="#1a0a04" strokeWidth="1.2" />
        <rect x="11" y="18" width="22" height="38" fill="url(#lanternGlass)" stroke="#1a0a04" strokeWidth="1.5" />
        <line x1="13" y1="18" x2="13" y2="56" stroke="#2a1f12" strokeWidth="1.2" />
        <line x1="33" y1="18" x2="33" y2="56" stroke="#2a1f12" strokeWidth="1.2" />
        <line x1="11" y1="36" x2="33" y2="36" stroke="#2a1f12" strokeWidth="1" />
        <path d="M16 28 L20 32 L18 36 L22 40 L19 46" stroke="rgba(220,40,40,0.55)" strokeWidth="0.9" fill="none" />
        <path d="M22 24 L25 30" stroke="rgba(220,40,40,0.45)" strokeWidth="0.7" fill="none" />
        <path d="M9 56 L35 56 L33 62 L11 62 Z" fill="url(#lanternMetal)" stroke="#1a0a04" strokeWidth="1.2" />
        <path d="M11 62 L33 62 L31 70 L13 70 Z" fill={woodDark} stroke="#1a0a04" strokeWidth="1.2" />
      </svg>
    );
  }
  // portrait
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ filter: 'drop-shadow(2px 5px 7px rgba(0,0,0,0.65))' }}>
      <defs>
        <linearGradient id="portraitFrame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hover ? '#9a7a4a' : '#5a4530'} />
          <stop offset="50%" stopColor={hover ? '#7a5e36' : '#3a2e1d'} />
          <stop offset="100%" stopColor={hover ? '#5a4022' : '#2a1d12'} />
        </linearGradient>
        <radialGradient id="portraitInner" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor={hover ? '#3a2a22' : '#1a1410'} />
          <stop offset="100%" stopColor="#0a0604" />
        </radialGradient>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="4" fill="url(#portraitFrame)" stroke="#0a0604" strokeWidth="1.5" />
      <rect x="8" y="8" width="48" height="48" rx="2" fill="none" stroke={hover ? '#bd9560' : '#604a30'} strokeWidth="0.8" />
      <circle cx="8" cy="8" r="2" fill={hover ? '#d4a060' : '#7a5630'} />
      <circle cx="56" cy="8" r="2" fill={hover ? '#d4a060' : '#7a5630'} />
      <circle cx="8" cy="56" r="2" fill={hover ? '#d4a060' : '#7a5630'} />
      <circle cx="56" cy="56" r="2" fill={hover ? '#d4a060' : '#7a5630'} />
      <rect x="11" y="11" width="42" height="42" fill="url(#portraitInner)" />
      <rect x="13" y="38" width="8" height="8" rx="1.5" fill={inkSoft} opacity="0.55" />
      <rect x="20" y="34" width="8" height="8" rx="1.5" fill={ink} opacity="0.85" />
      <rect x="27" y="30" width="9" height="9" rx="1.5" fill={hover ? '#ffd47a' : '#9a7846'} opacity="1" />
      <rect x="35" y="34" width="8" height="8" rx="1.5" fill={ink} opacity="0.85" />
      <rect x="42" y="38" width="8" height="8" rx="1.5" fill={inkSoft} opacity="0.55" />
      <text x="32" y="22" fontSize="6" textAnchor="middle" fill={hover ? '#ff8866' : '#5a3a30'} opacity="0.8">♥</text>
    </svg>
  );
}

function WhisperLine({ text }: { text: string }) {
  return (
    <p
      className="font-rubik text-base font-bold"
      style={{
        color: 'rgba(255,200,140,0.95)',
        textShadow: '2px 2px 0 #000, 0 0 18px rgba(255,107,53,0.7)',
        animation: 'wv-whisper 3.5s ease-out forwards',
      }}
    >
      {text}
    </p>
  );
}

function DustMotes({ count, lanternLit }: { count: number; lanternLit: boolean }) {
  const motes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = (n: number) => (((i + 1) * (n + 17) * 9301 + 49297) % 233280) / 233280;
        return {
          id: i,
          left: seed(1) * 100,
          delay: seed(2) * -30,
          dur: 18 + seed(3) * 18,
          size: 1.2 + seed(4) * 2,
        };
      }),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {motes.map((m) => (
        <span
          key={m.id}
          className="absolute rounded-full"
          style={{
            left: `${m.left}%`,
            bottom: 0,
            width: m.size,
            height: m.size,
            background: lanternLit
              ? 'rgba(255,170,90,0.9)'
              : 'rgba(220,200,180,0.55)',
            filter: 'blur(0.5px)',
            animation: `wv-dust ${m.dur}s ${m.delay}s linear infinite`,
            boxShadow: lanternLit
              ? '0 0 6px rgba(255,150,70,0.6)'
              : '0 0 3px rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </div>
  );
}

function Campfire({
  lanternLit,
  parallax,
}: {
  lanternLit: boolean;
  parallax: { x: number; y: number };
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 z-0 -translate-x-1/2"
      style={{
        bottom: '14%',
        transform: `translate(calc(-50% + ${parallax.x * -0.3}px), ${parallax.y * -0.2}px)`,
      }}
    >
      <div className="relative flex flex-col items-center">
        {lanternLit && (
          <>
            <div
              className="absolute"
              style={{
                bottom: 38,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 70,
                height: 110,
                background:
                  'radial-gradient(ellipse at 50% 80%, rgba(255,225,90,1) 0%, rgba(255,140,40,0.95) 35%, rgba(220,60,20,0.6) 70%, transparent 100%)',
                filter: 'blur(2px)',
                animation: 'wv-flame 0.6s ease-in-out infinite',
                borderRadius: '50% 50% 30% 30% / 70% 70% 30% 30%',
              }}
            />
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="absolute"
                style={{
                  bottom: 100,
                  left: `${48 + (i - 2) * 8}%`,
                  width: 4,
                  height: 4,
                  background: 'rgba(255,220,120,0.95)',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px rgba(255,180,80,0.95)',
                  animation: `wv-spark ${1.5 + i * 0.25}s ${i * 0.18}s ease-out infinite`,
                }}
              />
            ))}
          </>
        )}
        <svg
          width="200"
          height="86"
          viewBox="0 0 200 86"
          style={{ filter: lanternLit ? 'brightness(1.5) saturate(1.4)' : 'brightness(0.6)' }}
        >
          <ellipse cx="100" cy="68" rx="88" ry="14" fill="#2a2018" stroke="#0a0806" strokeWidth="2" />
          <ellipse cx="100" cy="64" rx="84" ry="11" fill="#1a1410" stroke="#0a0806" strokeWidth="1.5" />
          <rect x="36" y="36" width="128" height="14" rx="6" fill={lanternLit ? '#5b3018' : '#3a2418'} stroke="#100a06" strokeWidth="2" transform="rotate(-12 100 43)" />
          <rect x="36" y="48" width="128" height="14" rx="6" fill={lanternLit ? '#4a2614' : '#2a1812'} stroke="#100a06" strokeWidth="2" transform="rotate(10 100 55)" />
          <rect x="36" y="58" width="128" height="14" rx="6" fill={lanternLit ? '#5b3018' : '#3a2418'} stroke="#100a06" strokeWidth="2" transform="rotate(-7 100 65)" />
          {lanternLit && (
            <>
              <circle cx="86" cy="58" r="3" fill="#ffaa44" />
              <circle cx="110" cy="52" r="2.5" fill="#ffcc66" />
              <circle cx="100" cy="62" r="2" fill="#ff7733" />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
