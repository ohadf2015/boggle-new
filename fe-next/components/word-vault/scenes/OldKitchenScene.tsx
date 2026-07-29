'use client';

import { useState } from 'react';
import { EmberOverlay } from '@/components/word-vault/pixi/EmberOverlay';

/**
 * Room 1.5 — Uri's Old Kitchen
 *
 * Verb taxonomy:
 *   PRIMARY:   REVEAL  (tap mementos to discover photo fragments)
 *   SECONDARY: COMPOSE (assemble fragments into the family photo)
 *
 * Foreshadows the 1.6 spelling seal by surfacing the brother's name
 * (אורי) on the back of the center photo fragment.
 */

type FragmentId = 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | 'center';

interface Props {
  onSolved: () => void;
  onExit: () => void;
}

interface Memento {
  id: string;
  x: number;
  y: number;
  glyph: string;
  memoryHe: string;
  fragmentId: FragmentId;
}

const MEMENTOS: Memento[] = [
  {
    id: 'kettle',
    x: 0.18,
    y: 0.32,
    glyph: '☕',
    memoryHe: 'הקומקום שלו. תה בוקר. בכל בוקר.',
    fragmentId: 'corner-tl',
  },
  {
    id: 'apron',
    x: 0.78,
    y: 0.3,
    glyph: '🍳',
    memoryHe: 'הסינר. תמיד עם כתם קמח אחד שלא ירד.',
    fragmentId: 'corner-tr',
  },
  {
    id: 'spice',
    x: 0.2,
    y: 0.68,
    glyph: '🌿',
    memoryHe: 'מדף התבלינים. הוא ידע כל אחד בעיניים עצומות.',
    fragmentId: 'corner-bl',
  },
  {
    id: 'recipe',
    x: 0.82,
    y: 0.66,
    glyph: '📜',
    memoryHe: 'מתכון על דף קרוע. בכתב היד שלו.',
    fragmentId: 'corner-br',
  },
  {
    id: 'photo',
    x: 0.5,
    y: 0.5,
    glyph: '🖼️',
    memoryHe: 'התמונה המשפחתית. מאחור — חתימה.',
    fragmentId: 'center',
  },
];

export function OldKitchenScene({ onSolved, onExit }: Props) {
  const [revealedFragments, setRevealedFragments] = useState<Set<FragmentId>>(new Set());
  const [composedFragments, setComposedFragments] = useState<Set<FragmentId>>(new Set());
  const [activeMemento, setActiveMemento] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  const allComposed = composedFragments.size === 5;

  const handleMementoTap = (memento: Memento) => {
    setActiveMemento(memento.id);
    setRevealedFragments((prev) => new Set(prev).add(memento.fragmentId));
  };

  const handleFragmentTap = (fragmentId: FragmentId) => {
    const nextComposed = new Set(composedFragments).add(fragmentId);
    setComposedFragments(nextComposed);
    setRevealedFragments((prev) => {
      const updated = new Set(prev);
      updated.delete(fragmentId);
      return updated;
    });

    // Round-4 fix: signature reveal fires on PUZZLE COMPLETION (any-order),
    // not on center placement. Was: only triggered if center was composed last.
    if (nextComposed.size === 5) {
      setTimeout(() => setShowSignature(true), 400);
    }
  };

  const handlePhotoComplete = () => {
    setDone(true);
    setTimeout(() => onSolved(), 800);
  };

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 40%, rgba(255,220,160,0.25) 0%, rgba(40,30,20,0.95) 80%), #1a1208',
      }}
    >
      {/* BG image */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/word-vault/bg/old-kitchen.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.7) saturate(1.1) sepia(0.15)',
        }}
      />
      {/* Soft golden vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(40,20,12,0.7) 95%)',
        }}
      />

      {/* Soft golden Pixi mote drift */}
      <EmberOverlay density={28} tint={0xfff5d8} intensity={0.5} />

      {/* Header */}
      <div className="relative z-10 px-6 pt-5 text-center" dir="rtl">
        <p
          className="font-fredoka text-[11px] uppercase tracking-[0.4em]"
          style={{ color: 'rgba(255,225,180,0.45)' }}
        >
          המטבח הישן של אורי
        </p>
        <h2
          className="mt-1 font-fredoka text-2xl font-black"
          style={{ color: 'rgba(255,235,200,0.95)', textShadow: '2px 2px 0 #000' }}
        >
          {done ? 'אתה זוכרת.' : allComposed ? 'התצלום שלם.' : 'אסוף את הדברים שנותרו'}
        </h2>
        <p className="mt-1 font-rubik text-xs" style={{ color: 'rgba(255,225,180,0.5)' }}>
          {composedFragments.size} / 5
        </p>
      </div>

      {/* Mementos in scene */}
      <div className="relative z-10 mx-auto" style={{ height: '60vh' }}>
        {MEMENTOS.map((m) => (
          <MementoSpot
            key={m.id}
            memento={m}
            isRevealed={revealedFragments.has(m.fragmentId)}
            onClick={() => handleMementoTap(m)}
          />
        ))}
      </div>

      {/* Memory whisper modal */}
      {activeMemento && (
        <div
          className="absolute inset-x-0 bottom-32 z-30 flex justify-center px-6"
          dir="rtl"
        >
          <div
            className="max-w-md rounded-md border-4 border-amber-300/60 px-5 py-4 text-center shadow-[4px_4px_0_0_#000]"
            style={{
              background: 'linear-gradient(180deg, rgba(60,40,20,0.96), rgba(30,18,10,0.98))',
              animation: 'wv-memoryIn 0.6s ease-out',
            }}
          >
            <p className="font-fredoka text-xs uppercase tracking-[0.3em] text-amber-200/60">
              זיכרון
            </p>
            <p className="mt-2 font-rubik text-base leading-relaxed text-white">
              {MEMENTOS.find((m) => m.id === activeMemento)?.memoryHe}
            </p>
            <p className="mt-3 font-rubik text-[11px] italic text-amber-200/50">
              גע בשום מקום כדי לסגור.
            </p>
          </div>
        </div>
      )}

      {/* Photo frame grid with composed fragments */}
      {!done && (
        <div
          className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-6"
          dir="rtl"
        >
          <div className="max-w-sm space-y-3">
            {/* Frame container */}
            <div
              className="mx-auto grid w-full grid-cols-3 gap-3 rounded-md border-3 border-amber-300/30 bg-[#0a0805]/70 p-4"
              style={{
                background: allComposed
                  ? 'linear-gradient(135deg, rgba(255,235,180,0.15), rgba(255,200,100,0.1))'
                  : 'rgba(10,8,5,0.7)',
              }}
            >
              {/* Frame slots: TL TR BL BR Center */}
              <FrameSlot
                fragmentId="corner-tl"
                isComposed={composedFragments.has('corner-tl')}
              />
              <FrameSlot
                fragmentId="center"
                isCenter
                isComposed={composedFragments.has('center')}
              />
              <FrameSlot
                fragmentId="corner-tr"
                isComposed={composedFragments.has('corner-tr')}
              />
              <FrameSlot
                fragmentId="corner-bl"
                isComposed={composedFragments.has('corner-bl')}
              />
              <div />
              <FrameSlot
                fragmentId="corner-br"
                isComposed={composedFragments.has('corner-br')}
              />
            </div>

            {/* Revealed fragments drawer */}
            {revealedFragments.size > 0 && (
              <div className="flex flex-wrap justify-center gap-2 rounded-md border-2 border-amber-300/40 bg-[#1a0e08]/85 px-3 py-2">
                <span className="font-fredoka text-[10px] uppercase tracking-widest text-amber-200/60 w-full text-center">
                  גילויים
                </span>
                {Array.from(revealedFragments).map((fid) => (
                  <button
                    key={fid}
                    type="button"
                    onClick={() => handleFragmentTap(fid)}
                    className="rounded bg-amber-300/25 px-2 py-1 font-fredoka text-xs font-bold text-amber-200 transition-colors hover:bg-amber-300/40 active:scale-95"
                  >
                    {getFragmentLabel(fid)}
                  </button>
                ))}
              </div>
            )}

            {/* Signature reveal after all 5 fragments composed (order-agnostic per round-4 fix) */}
            {showSignature && (
              <div
                className="text-center"
                style={{
                  animation: 'wv-signatureIn 1.2s ease-out forwards',
                }}
              >
                <p
                  className="font-rubik text-sm italic"
                  style={{ color: 'rgba(255,235,200,0.8)' }}
                >
                  בכתב ידו.
                </p>
                <p
                  className="font-fredoka text-lg font-bold"
                  style={{
                    color: 'rgba(255,225,160,0.95)',
                    textShadow: '0 0 8px rgba(255,180,80,0.4)',
                  }}
                >
                  אורי
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Continue button after all composed */}
      {allComposed && !activeMemento && !done && (
        <div className="absolute inset-x-0 bottom-12 z-30 flex justify-center">
          <button
            type="button"
            onClick={handlePhotoComplete}
            className="rounded-md border-4 border-amber-300 bg-amber-200 px-8 py-3 font-fredoka text-xl font-black text-[#1a0e08] shadow-[4px_4px_0_0_#000]"
            style={{ animation: 'wv-continueIn 0.7s ease-out' }}
          >
            המשך &nbsp;→
          </button>
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

      {/* Done overlay */}
      {done && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 px-6 text-center"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(255,235,180,0.45) 0%, rgba(20,12,8,0.95) 70%)',
            animation: 'wv-bloom 1.4s ease-out forwards',
          }}
        >
          <p
            className="max-w-md font-fredoka text-xl font-bold leading-relaxed"
            style={{
              color: 'rgba(255,235,200,0.98)',
              textShadow: '2px 2px 0 #000, 0 0 18px rgba(255,180,80,0.6)',
            }}
            dir="rtl"
          >
            התצלום המשפחתי. שלם.
          </p>
          <button
            type="button"
            onClick={onSolved}
            className="mt-4 rounded-md border-4 border-amber-300 bg-amber-200 px-8 py-3 font-fredoka text-xl font-black text-[#1a0e08] shadow-[4px_4px_0_0_#000]"
          >
            המשך &nbsp;→
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes wv-bloom {
          0% {
            opacity: 0;
            transform: scale(0.92);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes wv-memoryIn {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes wv-continueIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes wv-mementoGlow {
          0%,
          100% {
            filter: drop-shadow(0 0 8px rgba(255, 200, 140, 0.4));
          }
          50% {
            filter: drop-shadow(0 0 18px rgba(255, 225, 180, 0.85));
          }
        }
        @keyframes wv-signatureIn {
          0% {
            opacity: 0;
            transform: translateY(-12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function MementoSpot({
  memento,
  isRevealed,
  onClick,
}: {
  memento: Memento;
  isRevealed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute z-10 flex flex-col items-center"
      style={{
        left: `${memento.x * 100}%`,
        top: `${memento.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
      aria-label={`זיכרון: ${memento.memoryHe}`}
    >
      {/* Glowing halo */}
      <span
        aria-hidden="true"
        className="absolute"
        style={{
          inset: -16,
          background: isRevealed
            ? 'radial-gradient(circle, rgba(255,210,140,0.18) 0%, transparent 65%)'
            : 'radial-gradient(circle, rgba(255,225,180,0.5) 0%, transparent 65%)',
          animation: isRevealed ? undefined : 'wv-mementoGlow 2.4s ease-in-out infinite',
          filter: 'blur(2px)',
        }}
      />
      <span
        className="text-4xl transition-opacity"
        style={{ opacity: isRevealed ? 0.6 : 1 }}
      >
        {memento.glyph}
      </span>
      <span
        className="mt-1 rounded px-1.5 py-0.5 font-rubik text-xs font-bold"
        style={{
          color: isRevealed ? 'rgba(220,200,180,0.5)' : 'rgba(255,235,200,0.95)',
          background: 'rgba(0,0,0,0.55)',
          textShadow: '0 1px 1px rgba(0,0,0,0.95)',
        }}
      >
        זיכרון
      </span>
    </button>
  );
}

function FrameSlot({
  fragmentId,
  isCenter = false,
  isComposed,
}: {
  fragmentId: FragmentId;
  isCenter?: boolean;
  isComposed: boolean;
}) {
  const baseClass = isCenter ? 'col-span-1 row-span-2' : '';
  return (
    <div
      className={`${baseClass} aspect-square rounded border-2 border-amber-300/40 bg-[#0a0805]/40`}
      style={{
        background: isComposed
          ? 'linear-gradient(135deg, rgba(255,235,180,0.25), rgba(255,200,100,0.15))'
          : 'rgba(10,8,5,0.4)',
        transition: 'all 0.5s ease-out',
      }}
    >
      {isComposed && (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            animation: 'wv-mementoGlow 1.8s ease-in-out infinite',
          }}
        >
          <div
            className="rounded bg-amber-300/30 px-2 py-1 font-fredoka text-[10px] font-bold text-amber-200/80"
            style={{
              textShadow: '0 0 6px rgba(255,180,80,0.3)',
            }}
          >
            ✓
          </div>
        </div>
      )}
    </div>
  );
}

function getFragmentLabel(fragmentId: FragmentId): string {
  const labels: Record<FragmentId, string> = {
    'corner-tl': 'TL',
    'corner-tr': 'TR',
    'corner-bl': 'BL',
    'corner-br': 'BR',
    center: 'C',
  };
  return labels[fragmentId];
}
