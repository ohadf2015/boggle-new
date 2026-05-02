'use client';
/* eslint-disable @next/next/no-img-element -- Decorative character sprites; next/image not needed. */

import { useCallback, useState } from 'react';
import { EmberOverlay } from '@/components/word-vault/pixi/EmberOverlay';

interface Props {
  onSolved: () => void;
  onExit: () => void;
}

interface Ingredient {
  id: string;
  labelHe: string;
  /** Pot-safe ingredient = part of correct sequence; decoy = not */
  isCorrect: boolean;
  /** Decoy lore line shown when player tries it */
  decoyLine?: string;
  /** Color/glyph hint */
  glyph: 'water' | 'flour' | 'honey' | 'salt' | 'ash' | 'blood';
  /** Position on shelf (0..1) */
  x: number;
  y: number;
}

const INGREDIENTS: Ingredient[] = [
  { id: 'water', labelHe: 'מים',  isCorrect: true,  glyph: 'water', x: 0.18, y: 0.30 },
  { id: 'flour', labelHe: 'קמח',  isCorrect: true,  glyph: 'flour', x: 0.34, y: 0.30 },
  { id: 'honey', labelHe: 'דבש',  isCorrect: true,  glyph: 'honey', x: 0.50, y: 0.30 },
  { id: 'salt',  labelHe: 'מלח',  isCorrect: false, decoyLine: 'מלח? אתה חושב שזה דג?', glyph: 'salt',  x: 0.66, y: 0.30 },
  { id: 'ash',   labelHe: 'אפר',  isCorrect: false, decoyLine: 'אני אפר. אני יודע איך אפר טועם.', glyph: 'ash', x: 0.82, y: 0.30 },
  { id: 'blood', labelHe: 'דם',   isCorrect: false, decoyLine: 'לא. לא ככה הוא היה מבשל.', glyph: 'blood', x: 0.50, y: 0.45 },
];

const CORRECT_SEQUENCE = ['water', 'flour', 'honey'];

const CINDER_LINES = [
  'אני רעב. תאכיל אותי.',
  'מהר. אני שורף.',
  'אם תטעה — אני אטעם אותך.',
];

const SUCCESS_LINES = [
  '...זה? זה מוכר.',
  'אני זוכר את הריח...',
  'מלו? אני... אני קאל?',
];

export function LastRecipeScene({ onSolved, onExit }: Props) {
  const [potSequence, setPotSequence] = useState<string[]>([]);
  const [showBrief, setShowBrief] = useState(true);
  const [whisper, setWhisper] = useState<string | null>(null);
  const [transformed, setTransformed] = useState(false);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | undefined>();
  const [burstId, setBurstId] = useState(0);

  const cinderProgress = potSequence.filter((id) => CORRECT_SEQUENCE.includes(id)).length;
  const cinderHpPct = Math.max(0.1, 1 - cinderProgress * 0.3);

  const handleDrop = useCallback(
    (ing: Ingredient) => {
      if (done) return;

      // Decoy
      if (!ing.isCorrect) {
        setShake(true);
        setTimeout(() => setShake(false), 400);
        setWhisper(ing.decoyLine ?? 'לא.');
        setTimeout(() => setWhisper(null), 2200);
        return;
      }

      // Already in pot? skip
      if (potSequence.includes(ing.id)) {
        setWhisper('כבר שמת. תראה מה קורה.');
        setTimeout(() => setWhisper(null), 1800);
        return;
      }

      // Check sequence position
      const expectedAt = CORRECT_SEQUENCE[potSequence.length];
      if (ing.id !== expectedAt) {
        // wrong order — clear pot, comic recoil
        setShake(true);
        setTimeout(() => setShake(false), 400);
        setWhisper('לא בסדר הזה. אני זוכר אחרת.');
        setTimeout(() => {
          setWhisper(null);
          setPotSequence([]);
        }, 2200);
        return;
      }

      // Correct & in order
      const next = [...potSequence, ing.id];
      setPotSequence(next);
      setBurstId((b) => b + 1);
      if (typeof window !== 'undefined') {
        setBurst({ id: burstId + 1, x: window.innerWidth / 2, y: window.innerHeight * 0.7 });
      }
      const lineIdx = Math.min(next.length - 1, SUCCESS_LINES.length - 1);
      setWhisper(SUCCESS_LINES[lineIdx]);
      setTimeout(() => setWhisper(null), 2400);

      if (next.length === CORRECT_SEQUENCE.length) {
        // FULL TRANSFORMATION
        setTimeout(() => {
          setTransformed(true);
          setTimeout(() => setDone(true), 2200);
        }, 1500);
      }
    },
    [potSequence, done, burstId],
  );

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 70%, rgba(255,80,40,0.45) 0%, rgba(20,4,4,0.96) 75%), #08020a",
      }}
    >
      {/* BG image */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/word-vault/bg/cinder-room.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: transformed
            ? 'brightness(0.95) saturate(1.5) hue-rotate(-10deg)'
            : 'brightness(0.55) saturate(1.3) contrast(1.1)',
          transition: 'filter 1.6s ease-out',
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: transformed
            ? 'radial-gradient(ellipse at 50% 50%, rgba(255,225,160,0.5) 0%, rgba(40,20,10,0.85) 75%)'
            : 'radial-gradient(ellipse at 50% 65%, transparent 30%, rgba(0,0,0,0.85) 95%)',
          transition: 'background 1.6s',
        }}
      />

      {/* Pixi ember/spark overlay */}
      <EmberOverlay
        density={transformed ? 80 : 50}
        tint={transformed ? 0xffd47a : 0xff5018}
        intensity={transformed ? 1 : 0.85}
        burst={burst}
      />

      {/* Header */}
      <div className="relative z-10 px-6 pt-5 text-center" dir="rtl">
        <p className="font-fredoka text-[11px] uppercase tracking-[0.4em]" style={{ color: 'rgba(255,180,140,0.45)' }}>
          המתכון האחרון
        </p>
        <h2
          className="mt-1 font-fredoka text-2xl font-black"
          style={{
            color: transformed ? 'rgba(255,225,160,0.98)' : 'rgba(255,180,140,0.92)',
            textShadow: '2px 2px 0 #000',
          }}
        >
          {done ? 'קאל חזר.' : transformed ? 'הוא זוכר.' : 'בשל את המתכון של אחיו'}
        </h2>
      </div>

      {/* Cinder figure (silhouette) + HP/calm bar */}
      <div className="relative z-10 mx-auto mt-4 flex flex-col items-center" dir="rtl">
        <div className="flex w-full max-w-md flex-col items-center gap-1 px-4">
          <div className="flex w-full items-center justify-between text-xs">
            <span className="font-fredoka font-bold text-orange-300">סינדר</span>
            <span className="font-rubik text-white/60">
              {transformed ? 'נרגע' : `נשרף ${Math.round(cinderHpPct * 100)}%`}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border-2 border-orange-400 bg-[#1a0a08]">
            <div
              className="h-full transition-[width,background] duration-700"
              style={{
                width: `${(transformed ? 0 : cinderHpPct) * 100}%`,
                background: transformed
                  ? 'linear-gradient(90deg, #ffd47a, #fff5d8)'
                  : 'linear-gradient(90deg, #ff5018, #ff8a3c)',
              }}
            />
          </div>
        </div>
        <img
          src={transformed ? '/word-vault/characters/cael.png' : '/word-vault/villains/cinder.png'}
          alt={transformed ? 'קאל' : 'סינדר'}
          className="mt-3 h-48 w-48 select-none object-contain sm:h-56 sm:w-56"
          style={{
            filter: transformed
              ? 'drop-shadow(0 0 38px rgba(255,235,170,0.85))'
              : 'drop-shadow(0 0 28px rgba(255,107,53,0.85))',
            animation: shake ? 'wv-cinderShake 0.4s' : transformed ? 'wv-caelGlow 3s ease-in-out infinite' : 'wv-cinderRage 2.4s ease-in-out infinite',
            transition: 'filter 1.4s',
          }}
        />
      </div>

      {/* The pot */}
      <div className="relative z-10 mx-auto mt-2 flex flex-col items-center">
        <Pot sequence={potSequence} active={!done} />
      </div>

      {/* Ingredients shelf */}
      {!done && (
        <div className="relative z-10 mx-auto mt-4 grid max-w-2xl grid-cols-3 gap-3 px-4 pb-6 sm:grid-cols-6" dir="rtl">
          {INGREDIENTS.map((ing) => (
            <button
              key={ing.id}
              type="button"
              onClick={() => handleDrop(ing)}
              disabled={transformed}
              className="flex flex-col items-center gap-1 rounded border-2 border-amber-300/30 bg-[#1a0e08]/85 px-2 py-3 transition-all hover:border-amber-300/70 disabled:opacity-50"
              style={{
                opacity: potSequence.includes(ing.id) ? 0.4 : 1,
              }}
            >
              <IngredientGlyph kind={ing.glyph} />
              <span className="font-fredoka text-base font-black" style={{ color: 'rgba(255,225,180,0.95)' }}>
                {ing.labelHe}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Whisper */}
      {whisper && (
        <div className="pointer-events-none absolute inset-x-0 top-[12%] z-20 flex justify-center px-6" dir="rtl">
          <p
            className="rounded-md border-2 border-orange-300/50 bg-[#1a0808]/95 px-4 py-2 font-rubik text-base"
            style={{ color: 'rgba(255,225,180,0.95)', textShadow: '0 0 12px rgba(255,107,53,0.5)', animation: 'wv-toast 2.4s ease-out forwards' }}
          >
            {`"${whisper}"`}
          </p>
        </div>
      )}

      {/* Pause */}
      <button
        type="button"
        onClick={onExit}
        aria-label="חזרה"
        className="absolute left-3 top-3 z-30 rounded border border-white/10 px-2 py-1 text-xs text-white/30 hover:text-white/60"
      >
        ←
      </button>

      {/* Brief */}
      {showBrief && !done && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 px-6">
          <div
            className="w-full max-w-md rounded-md border-4 border-orange-300 p-6 text-center shadow-[6px_6px_0_0_#000]"
            style={{ background: 'linear-gradient(180deg, #2a0808 0%, #14060a 100%)' }}
            dir="rtl"
          >
            <p className="font-fredoka text-xs uppercase tracking-[0.4em] text-orange-300/60">המתכון האחרון</p>
            <h2 className="mt-2 font-fredoka text-3xl font-black text-orange-200" style={{ textShadow: '2px 2px 0 #000' }}>
              סינדר רעב.
            </h2>
            <p className="mt-4 font-rubik text-base leading-relaxed text-white/85">
              סיר. שש מצרכים. רק אחי שלי הכין את זה ככה.
              <br/>
              שלושה מצרכים. בסדר הנכון.
            </p>
            <p className="mt-3 font-rubik text-sm text-white/65">
              זוכר את המטבח? את הכף, את הספר, את התצלום? <strong>כל אחד אמר משהו</strong>. הסדר היה שם.
            </p>
            <button
              type="button"
              onClick={() => setShowBrief(false)}
              className="mt-6 rounded-md border-4 border-orange-300 bg-orange-300 px-6 py-2 font-fredoka text-lg font-black text-[#1a0808] shadow-[3px_3px_0_0_#000]"
            >
              להתחיל
            </button>
          </div>
        </div>
      )}

      {/* End overlay */}
      {done && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 px-6 text-center"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,225,170,0.5) 0%, rgba(20,8,8,0.96) 70%)',
            animation: 'wv-bloom 1.8s ease-out forwards',
          }}
        >
          <img
            src="/word-vault/characters/cael.png"
            alt="קאל"
            className="h-56 w-56 object-contain drop-shadow-[0_0_60px_rgba(255,225,170,0.95)] sm:h-72 sm:w-72"
          />
          <h2 className="font-fredoka text-4xl font-black text-amber-100" style={{ textShadow: '3px 3px 0 #000' }}>
            קאל
          </h2>
          <p
            className="max-w-md font-rubik text-lg leading-relaxed text-white/95"
            dir="rtl"
          >
            הלבה התקררה. הסדקים נסגרו. רגע אחד הוא חזר —
            {'חיבק את מלו, לחש "תודה",'}
            ונעלם, השאיר אחריו ספר מתכונים, קמע, ושיר אותיות.
          </p>
          <button
            type="button"
            onClick={onSolved}
            className="mt-4 rounded-md border-4 border-amber-300 bg-amber-200 px-8 py-3 font-fredoka text-xl font-black text-[#1a0e08] shadow-[4px_4px_0_0_#000]"
          >
            סיים את ספר 1 &nbsp;→
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
        @keyframes wv-cinderRage {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes wv-cinderShake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        @keyframes wv-caelGlow {
          0%,100% { transform: scale(1); filter: drop-shadow(0 0 30px rgba(255,225,170,0.7)); }
          50% { transform: scale(1.02); filter: drop-shadow(0 0 50px rgba(255,235,180,1)); }
        }
        @keyframes wv-potBubble {
          0%,100% { transform: translate(-50%, -10%) scaleY(1); }
          50% { transform: translate(-50%, -16%) scaleY(1.08); }
        }
      `}</style>
    </div>
  );
}

function Pot({ sequence, active }: { sequence: string[]; active: boolean }) {
  const filled = sequence.length;
  const colors: Record<string, string> = {
    water: '#6ba0d4',
    flour: '#e8e0c8',
    honey: '#e8a430',
  };
  const stewColor = filled === 0 ? '#1a0808' : filled === 1 ? colors.water : filled === 2 ? '#a08868' : '#d8a430';
  return (
    <svg width="240" height="160" viewBox="0 0 240 160" style={{ filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.7))' }}>
      <defs>
        <linearGradient id="potBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2818" />
          <stop offset="100%" stopColor="#0a0604" />
        </linearGradient>
        <radialGradient id="potShine">
          <stop offset="0%" stopColor="rgba(255,200,140,0.6)" />
          <stop offset="100%" stopColor="rgba(255,200,140,0)" />
        </radialGradient>
      </defs>
      {/* Stand */}
      <rect x="60" y="138" width="120" height="14" fill="#1a0e08" stroke="#0a0604" strokeWidth="2" />
      <rect x="50" y="148" width="20" height="10" fill="#1a0e08" />
      <rect x="170" y="148" width="20" height="10" fill="#1a0e08" />
      {/* Pot */}
      <ellipse cx="120" cy="140" rx="78" ry="10" fill="#0a0604" />
      <path d="M44 50 L196 50 L188 138 L52 138 Z" fill="url(#potBody)" stroke="#0a0604" strokeWidth="3" strokeLinejoin="round" />
      {/* Pot rim */}
      <ellipse cx="120" cy="50" rx="78" ry="10" fill="#5a3a22" stroke="#0a0604" strokeWidth="3" />
      <ellipse cx="120" cy="50" rx="72" ry="6" fill={stewColor} />
      {/* Handles */}
      <path d="M44 60 Q24 60 24 84 Q24 108 44 108" fill="none" stroke="#0a0604" strokeWidth="3" />
      <path d="M196 60 Q216 60 216 84 Q216 108 196 108" fill="none" stroke="#0a0604" strokeWidth="3" />
      {/* Stew bubbles */}
      {filled > 0 && (
        <g style={{ animation: active ? 'wv-potBubble 1.6s ease-in-out infinite' : undefined, transformOrigin: 'center' }}>
          <circle cx="100" cy="48" r="3" fill={stewColor} opacity="0.85" />
          <circle cx="130" cy="46" r="4" fill={stewColor} opacity="0.85" />
          <circle cx="148" cy="49" r="2" fill={stewColor} opacity="0.65" />
        </g>
      )}
      {/* Glow when filled */}
      {filled >= 2 && <ellipse cx="120" cy="50" rx="72" ry="6" fill="url(#potShine)" />}
      {/* Sequence pips on rim */}
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={88 + i * 32}
          cy={32}
          r="6"
          fill={i < filled ? '#ffd47a' : '#3a2818'}
          stroke="#0a0604"
          strokeWidth="1.5"
        />
      ))}
      {/* Highlight */}
      <ellipse cx="80" cy="68" rx="10" ry="20" fill="rgba(255,200,140,0.18)" />
    </svg>
  );
}

function IngredientGlyph({ kind }: { kind: Ingredient['glyph'] }) {
  const filter = 'drop-shadow(0 2px 3px rgba(0,0,0,0.7))';
  switch (kind) {
    case 'water':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ filter }}>
          <path d="M20 4 Q10 18 10 26 Q10 34 20 34 Q30 34 30 26 Q30 18 20 4 Z" fill="#6ba0d4" stroke="#1a2a3a" strokeWidth="2"/>
          <ellipse cx="16" cy="22" rx="2" ry="3" fill="#c4dcf0" opacity="0.5"/>
        </svg>
      );
    case 'flour':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ filter }}>
          <path d="M8 12 L8 36 L32 36 L32 12 Z" fill="#a08868" stroke="#3a2818" strokeWidth="2"/>
          <ellipse cx="20" cy="14" rx="12" ry="3" fill="#e8d4a8" stroke="#3a2818" strokeWidth="2"/>
          <text x="20" y="28" fontSize="6" textAnchor="middle" fill="#3a2818" fontWeight="bold">קמח</text>
        </svg>
      );
    case 'honey':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ filter }}>
          <path d="M14 8 L26 8 L28 14 L28 30 L24 36 L16 36 L12 30 L12 14 Z" fill="#e8a430" stroke="#5a3a08" strokeWidth="2"/>
          <ellipse cx="20" cy="11" rx="6" ry="2" fill="#5a3a08"/>
        </svg>
      );
    case 'salt':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ filter }}>
          <path d="M14 14 L26 14 L26 32 L14 32 Z" fill="#d8d4cc" stroke="#3a3830" strokeWidth="2"/>
          <rect x="12" y="10" width="16" height="4" fill="#9c9890" stroke="#3a3830" strokeWidth="1.5"/>
          {[18, 22, 26].map((y) => <line key={y} x1="16" y1={y} x2="20" y2={y - 2} stroke="#3a3830" strokeWidth="0.6"/>)}
        </svg>
      );
    case 'ash':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ filter }}>
          <ellipse cx="20" cy="32" rx="14" ry="3" fill="#1a1410"/>
          <path d="M8 32 Q10 22 14 18 Q12 24 16 24 Q14 26 18 25 Q24 22 24 32" fill="#3a3028" stroke="#1a1410" strokeWidth="1.5"/>
          <circle cx="14" cy="14" r="0.7" fill="#5a4838"/>
          <circle cx="20" cy="10" r="0.7" fill="#5a4838"/>
        </svg>
      );
    case 'blood':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ filter }}>
          <path d="M20 6 Q10 18 10 28 Q10 34 20 34 Q30 34 30 28 Q30 18 20 6 Z" fill="#7c1818" stroke="#2a0808" strokeWidth="2"/>
        </svg>
      );
  }
}
