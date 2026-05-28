'use client';
/* eslint-disable @next/next/no-img-element -- Decorative character sprites; next/image not needed. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmberOverlay } from '@/components/word-vault/pixi/EmberOverlay';
import { getGameStore } from '@/lib/word-vault/state/gameStore';
import { useCompose } from '@/lib/word-vault/hooks/useCompose';
import type { ItemId } from '@/lib/word-vault/types';

/**
 * Room 1.6 — The Last Recipe (Book 1 climax)
 *
 * Verb taxonomy:
 *   PRIMARY:   SEQUENCE (place 4 ritual items on the altar — any order accepted)
 *   SECONDARY: COMPOSE  (spell אורי from a 4-letter pool to summon the brother)
 *
 * The two verbs land in two phases (placing → spelling). Decoys (broom,
 * defrost-candle) are inventory items that shake when wrongly placed.
 * Canonical placement order (light→key→memory→truth) earns a richer flame burst.
 */

interface Props {
  onSolved: () => void;
  onExit: () => void;
  /** True when player re-enters a solved room from the hub. Enables persistent post-solve visuals. */
  isRevisit?: boolean;
}

const RITUAL_ORDER: ItemId[] = ['melo-lantern', 'brass-key', 'family-photo', 'cael-recipe-book'];
const RITUAL_SET = new Set<ItemId>(RITUAL_ORDER);
const RITUAL_LENGTH = 4;

// Spelling seal: after 4 items placed, player spells the brother's name.
// Pool collapsed to the exact 4 letters per round-3 critique — 6 letters made the
// finale feel like 8 micro-puzzles. Now: pick the next correct letter, advance.
const SEAL_TARGET = ['א', 'ו', 'ר', 'י']; // אורי
const SEAL_POOL = ['א', 'ו', 'ר', 'י'];

const ITEM_GLYPH: Record<ItemId, string> = {
  'melo-lantern': '🏮',
  'defrost-candle': '🕯️',
  'brass-key': '🗝️',
  'cael-recipe-book': '📖',
  'family-photo': '🖼️',
  'cinder-charm': '🔥',
  'broom': '🧹',
};

const DECOY_LINES: Partial<Record<ItemId, string>> = {
  'defrost-candle': 'הנר ימס את הפיח. לא את האח.',
  'broom': 'מטאטא לא מנגן את שירת האחים.',
  'cinder-charm': 'הקמע שלך — אבל לא הזמן שלו.',
};

const SUCCESS_LINES = [
  '...אש? הפנס שלך... מאיר.',
  '...זה הברז של הזמן. מהמרתף.',
  '...אני זוכר. אני זוכרת אותם.',
  '"מים. קמח. דבש. לחם של אורי." — אורי חזר.',
];

type Phase = 'placing' | 'spelling' | 'transforming' | 'done';

export function LastRecipeScene({ onSolved, onExit, isRevisit = false }: Props) {
  const [slotsFilled, setSlotsFilled] = useState<ItemId[]>([]);
  const [phase, setPhase] = useState<Phase>('placing');
  // useCompose owns the spelling-seal state (player spells אורי letter-by-letter)
  const seal = useCompose<string>({ target: SEAL_TARGET });
  const sealLetters = seal.composed;
  const [showBrief, setShowBrief] = useState(true);
  const [whisper, setWhisper] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | undefined>();
  const [burstId, setBurstId] = useState(0);
  const [inventory, setInventory] = useState<ItemId[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setInventory(getGameStore().getState().permanentItems);
  }, []);

  const transformed = phase === 'transforming' || phase === 'done';
  const done = phase === 'done';
  const cinderHpPct = Math.max(0.1, 1 - (slotsFilled.length / RITUAL_LENGTH) * 0.9);

  // Canonical = items placed in the narrative order light → key → memory → truth
  const placedInCanonicalOrder = useMemo(
    () => slotsFilled.length === RITUAL_LENGTH && slotsFilled.every((id, i) => id === RITUAL_ORDER[i]),
    [slotsFilled],
  );

  const handlePlaceItem = useCallback(
    (itemId: ItemId) => {
      if (phase !== 'placing') return;

      // Already placed? Friendly no-op
      if (slotsFilled.includes(itemId)) {
        setWhisper('כבר על המזבח.');
        setTimeout(() => setWhisper(null), 1600);
        return;
      }

      // Decoy item (not in the ritual set) → shake + per-item line
      if (!RITUAL_SET.has(itemId)) {
        setShake(true);
        setTimeout(() => setShake(false), 400);
        const decoyLine = DECOY_LINES[itemId] ?? 'לא. זה לא נכון.';
        setWhisper(decoyLine);
        setTimeout(() => setWhisper(null), 2200);
        return;
      }

      // Correct ritual item — accepts in any order
      const next = [...slotsFilled, itemId];
      setSlotsFilled(next);
      setBurstId((b) => b + 1);
      if (typeof window !== 'undefined') {
        setBurst({ id: burstId + 1, x: window.innerWidth / 2, y: window.innerHeight * 0.65 });
      }

      const lineIdx = Math.min(next.length - 1, SUCCESS_LINES.length - 1);
      setWhisper(SUCCESS_LINES[lineIdx]);
      setTimeout(() => setWhisper(null), 2400);

      // 4 items placed — open the spelling seal phase silently (the empty letter slots ARE the prompt)
      if (next.length === RITUAL_LENGTH) {
        setTimeout(() => setPhase('spelling'), 1500);
      }
    },
    [phase, slotsFilled, burstId],
  );

  const handleSealLetter = useCallback(
    (letter: string) => {
      if (phase !== 'spelling') return;
      const result = seal.tryItem(letter);
      if (result === 'wrong') {
        setShake(true);
        setTimeout(() => setShake(false), 400);
        setWhisper('לא האות הזאת.');
        setTimeout(() => setWhisper(null), 1600);
        return;
      }
      if (result === 'complete') {
        // Name fully spelled — trigger transformation. Canonical-order players get a richer flame
        // (delivered visually via the EmberOverlay density/tint ramp below — no VO line).
        setTimeout(() => {
          setPhase('transforming');
          setTimeout(() => {
            setPhase('done');
            setTimeout(() => onSolved(), 800);
          }, 2200);
        }, 600);
      }
    },
    [phase, seal, onSolved],
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
      {/* Canonical-order players get a richer flame; revisit retains a soft ember whisper. */}
      <EmberOverlay
        density={transformed ? (placedInCanonicalOrder ? 120 : 80) : isRevisit ? 25 : 50}
        tint={transformed ? (placedInCanonicalOrder ? 0xfff4c8 : 0xffd47a) : isRevisit ? 0xffb878 : 0xff5018}
        intensity={transformed ? 1 : isRevisit ? 0.5 : 0.85}
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
          {done ? 'אורי חזר.' : transformed ? 'היא זוכרת.' : 'טקס הזיכרון'}
        </h2>
      </div>

      {/* Cinder/Gachelet figure + HP bar */}
      <div className="relative z-10 mx-auto mt-4 flex flex-col items-center" dir="rtl">
        <div className="flex w-full max-w-md flex-col items-center gap-1 px-4">
          <div className="flex w-full items-center justify-between text-xs">
            <span className="font-fredoka font-bold text-orange-300">גחלת</span>
            <span className="font-rubik text-white">
              {transformed ? 'נרגעת' : `עולה ${Math.round((1 - cinderHpPct) * 100)}%`}
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
          alt={transformed ? 'אורי' : 'גחלת'}
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

      {/* Ritual Altar */}
      <div className="relative z-10 mx-auto mt-2 flex flex-col items-center">
        <Altar slotsFilled={slotsFilled} active={!done} />
      </div>

      {/* Inventory drawer — only during placing phase */}
      {phase === 'placing' && (
        <div className="relative z-10 mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2 px-4" dir="rtl">
          {inventory.map((itemId) => (
            <button
              key={itemId}
              type="button"
              onClick={() => handlePlaceItem(itemId)}
              disabled={slotsFilled.includes(itemId)}
              className="flex flex-col items-center gap-1 rounded border-2 border-amber-300/30 bg-[#1a0e08]/85 px-3 py-2 transition-all hover:border-amber-300/70 disabled:opacity-50"
            >
              <span className="text-3xl">{ITEM_GLYPH[itemId]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Spelling seal — letter pool to spell אורי */}
      {phase === 'spelling' && (
        <div className="relative z-10 mx-auto mt-4 flex max-w-md flex-col items-center px-4" dir="rtl">
          <div className="mb-2 flex gap-2">
            {SEAL_TARGET.map((target, i) => {
              const placed = sealLetters[i];
              return (
                <span
                  key={i}
                  className="grid h-12 w-12 place-items-center rounded-md border-2 font-fredoka text-2xl font-black"
                  style={{
                    background: placed ? 'linear-gradient(180deg, #ffd47a 0%, #c98b2a 100%)' : 'rgba(40,20,12,0.6)',
                    borderColor: placed ? '#5a3a18' : 'rgba(180,140,80,0.4)',
                    color: placed ? '#1a0e08' : 'rgba(220,180,120,0.4)',
                    textShadow: placed ? '0 0 6px rgba(255,225,170,0.9)' : 'none',
                  }}
                >
                  {placed ?? target}
                </span>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SEAL_POOL.map((ltr, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSealLetter(ltr)}
                className="grid h-11 w-11 place-items-center rounded-md border-2 font-fredoka text-xl font-black transition-all"
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
        className="absolute left-3 top-3 z-30 rounded border border-white/10 px-2 py-1 text-xs text-white hover:text-white"
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
              גחלת זעומה.
            </h2>
            <p className="mt-4 font-rubik text-base leading-relaxed text-white">
              הרחוק מן האש. הפנס שלך, הברז, התצלום, הספר.
              <br/>
              ארבע דברים. סדר אחד. <strong>הסדר של אורי.</strong>
            </p>
            <p className="mt-3 font-rubik text-sm text-white">
              רק אש זוכרת את הסדר הזה.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowBrief(false);
                // Round-4 stitch: echo the brother's name once when ritual room opens.
                // Bridges 1.5's "אורי" foreshadow to the 1.6 spelling-seal payoff.
                setTimeout(() => {
                  setWhisper('אחיך… אורי.');
                  setTimeout(() => setWhisper(null), 2400);
                }, 800);
              }}
              className="mt-6 rounded-md border-4 border-orange-300 bg-orange-300 px-6 py-2 font-fredoka text-lg font-black text-[#1a0e08] shadow-[3px_3px_0_0_#000]"
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
            alt="אורי"
            className="h-56 w-56 object-contain drop-shadow-[0_0_60px_rgba(255,225,170,0.95)] sm:h-72 sm:w-72"
          />
          <h2 className="font-fredoka text-4xl font-black text-amber-100" style={{ textShadow: '3px 3px 0 #000' }}>
            אורי
          </h2>
          <p
            className="max-w-md font-rubik text-lg leading-relaxed text-white"
            dir="rtl"
          >
            הלבה התקררה. הסדקים נסגרו. רגע אחד הוא חזר —
            {'חיבק את אש, לחש "תודה",'}
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
        @keyframes wv-altarIgnite {
          0% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 1; }
          100% { opacity: 0.8; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function Altar({ slotsFilled, active }: { slotsFilled: ItemId[]; active: boolean }) {
  const ITEM_GLYPH: Record<ItemId, string> = {
    'melo-lantern': '🏮',
    'defrost-candle': '🕯️',
    'brass-key': '🗝️',
    'cael-recipe-book': '📖',
    'family-photo': '🖼️',
    'cinder-charm': '🔥',
    'broom': '🧹',
  };

  return (
    <svg width="280" height="120" viewBox="0 0 280 120" style={{ filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.7))' }}>
      <defs>
        <linearGradient id="altarStone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a3a28" />
          <stop offset="100%" stopColor="#1a0e08" />
        </linearGradient>
        <radialGradient id="slotGlow">
          <stop offset="0%" stopColor="rgba(255,160,80,0.8)" />
          <stop offset="100%" stopColor="rgba(255,160,80,0)" />
        </radialGradient>
      </defs>

      {/* Altar base */}
      <rect x="20" y="60" width="240" height="50" fill="url(#altarStone)" stroke="#0a0604" strokeWidth="2" rx="4" />

      {/* Slot circles */}
      {[0, 1, 2, 3].map((i) => {
        const cx = 50 + i * 70;
        const cy = 45;
        const isFilled = i < slotsFilled.length;
        const itemId = slotsFilled[i];

        return (
          <g key={i}>
            {/* Slot circle */}
            <circle
              cx={cx}
              cy={cy}
              r="16"
              fill={isFilled ? '#2a1a08' : '#1a0e08'}
              stroke={isFilled ? '#ffd47a' : '#5a4030'}
              strokeWidth="2"
            />

            {/* Slot index */}
            <text x={cx} y={cy + 28} fontSize="11" textAnchor="middle" fill="#8a7060" fontWeight="bold">
              {i + 1}
            </text>

            {/* Item glyph or ? */}
            {isFilled && itemId ? (
              <text
                x={cx}
                y={cy + 6}
                fontSize="20"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ animation: active ? 'wv-altarIgnite 0.6s ease-out' : undefined }}
              >
                {ITEM_GLYPH[itemId]}
              </text>
            ) : (
              <text x={cx} y={cy + 4} fontSize="18" textAnchor="middle" dominantBaseline="middle" fill="#5a4030" fontWeight="bold">
                ?
              </text>
            )}

            {/* Glow on filled slot */}
            {isFilled && <circle cx={cx} cy={cy} r="16" fill="url(#slotGlow)" />}
          </g>
        );
      })}

      {/* Narrative labels */}
      <text x="50" y="20" fontSize="9" textAnchor="middle" fill="rgba(255,180,100,0.6)" fontWeight="bold">
        אור
      </text>
      <text x="120" y="20" fontSize="9" textAnchor="middle" fill="rgba(255,180,100,0.6)" fontWeight="bold">
        פתח
      </text>
      <text x="190" y="20" fontSize="9" textAnchor="middle" fill="rgba(255,180,100,0.6)" fontWeight="bold">
        זיכרון
      </text>
      <text x="260" y="20" fontSize="9" textAnchor="middle" fill="rgba(255,180,100,0.6)" fontWeight="bold">
        ריפוי
      </text>
    </svg>
  );
}
