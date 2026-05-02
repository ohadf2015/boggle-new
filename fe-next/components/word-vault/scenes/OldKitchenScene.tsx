'use client';

import { useState } from 'react';
import { EmberOverlay } from '@/components/word-vault/pixi/EmberOverlay';

interface Props {
  onSolved: () => void;
  onExit: () => void;
}

interface Memento {
  id: string;
  x: number;
  y: number;
  glyph: 'apron' | 'ladle' | 'cookbook' | 'hat' | 'photo';
  labelHe: string;
  /** Memory line that plays when clicked */
  memoryHe: string;
  /** A single emphasized HE word/phrase that the player should notice */
  highlightedHe: string;
}

const MEMENTOS: Memento[] = [
  {
    id: 'apron',
    x: 0.18,
    y: 0.42,
    glyph: 'apron',
    labelHe: 'הסינר',
    memoryHe: 'הוא לבש אותו כל בוקר. הריח של בצק בוקע מהבד.',
    highlightedHe: 'בצק',
  },
  {
    id: 'ladle',
    x: 0.40,
    y: 0.58,
    glyph: 'ladle',
    labelHe: 'הכף',
    memoryHe: 'הוא בחש בה לאט. אמר: "מים לא ממהרים. מי שממהר — לא טועם."',
    highlightedHe: 'מים',
  },
  {
    id: 'cookbook',
    x: 0.62,
    y: 0.45,
    glyph: 'cookbook',
    labelHe: 'הספר',
    memoryHe: 'דפיו פתוחים על מתכון לחם. שורה ראשונה: "תחילה מים, אז קמח."',
    highlightedHe: 'קמח',
  },
  {
    id: 'hat',
    x: 0.82,
    y: 0.30,
    glyph: 'hat',
    labelHe: 'הכובע',
    memoryHe: 'הוא היה גדול עליו. הילדים צחקו. הוא חייך.',
    highlightedHe: 'דבש',
  },
  {
    id: 'photo',
    x: 0.50,
    y: 0.22,
    glyph: 'photo',
    labelHe: 'התצלום',
    memoryHe: 'חמישה בני דודים. הוא במרכז. בידו: לחם.',
    highlightedHe: 'לחם',
  },
];

const FINAL_LINE_HE =
  'מים. קמח. דבש. הסדר היה תמיד שלו.';

export function OldKitchenScene({ onSolved, onExit }: Props) {
  const [examined, setExamined] = useState<Set<string>>(new Set());
  const [activeMemento, setActiveMemento] = useState<Memento | null>(null);
  const [done, setDone] = useState(false);

  const allExamined = examined.size === MEMENTOS.length;

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, rgba(255,220,160,0.25) 0%, rgba(40,30,20,0.95) 80%), #1a1208",
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
      {/* Soft golden vignette — bittersweet warmth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(40,20,12,0.7) 95%)',
        }}
      />

      {/* Soft golden Pixi mote drift — different tint than other rooms */}
      <EmberOverlay density={28} tint={0xfff5d8} intensity={0.5} />

      {/* Header */}
      <div className="relative z-10 px-6 pt-5 text-center" dir="rtl">
        <p className="font-fredoka text-[11px] uppercase tracking-[0.4em]" style={{ color: 'rgba(255,225,180,0.45)' }}>
          המטבח הישן של קאל
        </p>
        <h2
          className="mt-1 font-fredoka text-2xl font-black"
          style={{ color: 'rgba(255,235,200,0.95)', textShadow: '2px 2px 0 #000' }}
        >
          {done ? 'אתה זוכר.' : allExamined ? 'הכל נראה. עכשיו תזכור.' : 'גע בכל מה שנותר ממנו'}
        </h2>
        <p className="mt-1 font-rubik text-xs" style={{ color: 'rgba(255,225,180,0.5)' }}>
          {examined.size} / {MEMENTOS.length}
        </p>
      </div>

      {/* Mementos in scene */}
      <div className="relative z-10 mx-auto" style={{ height: '60vh' }}>
        {MEMENTOS.map((m) => (
          <MementoSpot
            key={m.id}
            memento={m}
            isExamined={examined.has(m.id)}
            onClick={() => {
              setActiveMemento(m);
              setExamined((prev) => new Set(prev).add(m.id));
            }}
          />
        ))}
      </div>

      {/* Memory whisper modal */}
      {activeMemento && (
        <div
          className="absolute inset-x-0 bottom-24 z-30 flex justify-center px-6"
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
              {activeMemento.labelHe}
            </p>
            <p className="mt-2 font-rubik text-base leading-relaxed text-white/90">
              {renderHighlighted(activeMemento.memoryHe, activeMemento.highlightedHe)}
            </p>
            <button
              type="button"
              onClick={() => setActiveMemento(null)}
              className="mt-4 rounded border-2 border-amber-300 px-4 py-1 font-fredoka text-sm font-bold text-amber-200"
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Continue button after all examined */}
      {allExamined && !activeMemento && !done && (
        <div className="absolute inset-x-0 bottom-12 z-30 flex justify-center">
          <button
            type="button"
            onClick={() => setDone(true)}
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
        className="absolute left-3 top-3 z-30 rounded border border-white/10 px-2 py-1 text-xs text-white/30 hover:text-white/60"
      >
        ←
      </button>

      {/* Done overlay */}
      {done && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 px-6 text-center"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,235,180,0.45) 0%, rgba(20,12,8,0.95) 70%)',
            animation: 'wv-bloom 1.4s ease-out forwards',
          }}
        >
          <p
            className="max-w-md font-fredoka text-xl font-bold leading-relaxed"
            style={{ color: 'rgba(255,235,200,0.98)', textShadow: '2px 2px 0 #000, 0 0 18px rgba(255,180,80,0.6)' }}
            dir="rtl"
          >
            {`"${FINAL_LINE_HE}"`}
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
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes wv-memoryIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes wv-continueIn {
          0% { opacity: 0; transform: translateY(20px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes wv-mementoGlow {
          0%,100% { filter: drop-shadow(0 0 8px rgba(255,200,140,0.4)); }
          50% { filter: drop-shadow(0 0 18px rgba(255,225,180,0.85)); }
        }
      `}</style>
    </div>
  );
}

function renderHighlighted(text: string, highlight: string) {
  if (!text.includes(highlight)) return text;
  const parts = text.split(highlight);
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <em
          className="font-fredoka not-italic font-black"
          style={{
            color: 'rgba(255,210,140,1)',
            textShadow: '0 0 14px rgba(255,180,80,0.85)',
            padding: '0 2px',
          }}
        >
          {highlight}
        </em>
      )}
    </span>
  ));
}

function MementoSpot({
  memento,
  isExamined,
  onClick,
}: {
  memento: Memento;
  isExamined: boolean;
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
      aria-label={memento.labelHe}
    >
      {/* Glowing halo */}
      <span
        aria-hidden="true"
        className="absolute"
        style={{
          inset: -16,
          background: isExamined
            ? 'radial-gradient(circle, rgba(255,210,140,0.18) 0%, transparent 65%)'
            : 'radial-gradient(circle, rgba(255,225,180,0.5) 0%, transparent 65%)',
          animation: isExamined ? undefined : 'wv-mementoGlow 2.4s ease-in-out infinite',
          filter: 'blur(2px)',
        }}
      />
      <MementoGlyph kind={memento.glyph} faded={isExamined} />
      <span
        className="mt-1 rounded px-1.5 py-0.5 font-rubik text-xs font-bold"
        style={{
          color: isExamined ? 'rgba(220,200,180,0.5)' : 'rgba(255,235,200,0.95)',
          background: 'rgba(0,0,0,0.55)',
          textShadow: '0 1px 1px rgba(0,0,0,0.95)',
        }}
      >
        {memento.labelHe}
      </span>
    </button>
  );
}

function MementoGlyph({ kind, faded }: { kind: Memento['glyph']; faded: boolean }) {
  const ink = '#3a2818';
  const cream = faded ? '#a08868' : '#f5d8a8';
  const cloth = faded ? '#8a6e4a' : '#e8c688';
  const wood = faded ? '#5a3e26' : '#9c6e3e';
  const opacity = faded ? 0.6 : 1;
  const filter = faded
    ? 'saturate(0.7) brightness(0.9)'
    : 'drop-shadow(2px 4px 4px rgba(0,0,0,0.6))';
  const size = 64;

  switch (kind) {
    case 'apron':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter, opacity }}>
          <path d="M22 8 Q22 14 26 16 M42 8 Q42 14 38 16" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M22 8 L22 18 L42 18 L42 8 Z" fill={cloth} stroke={ink} strokeWidth="1.8"/>
          <path d="M18 18 Q14 32 16 56 L48 56 Q50 32 46 18 Z" fill={cloth} stroke={ink} strokeWidth="2" strokeLinejoin="round"/>
          <rect x="24" y="38" width="16" height="10" rx="1" fill="none" stroke={ink} strokeWidth="1"/>
        </svg>
      );
    case 'ladle':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter, opacity }}>
          <ellipse cx="44" cy="44" rx="14" ry="11" fill="#9ca0a8" stroke={ink} strokeWidth="2"/>
          <ellipse cx="44" cy="42" rx="11" ry="8" fill="#5e6068"/>
          <rect x="6" y="14" width="28" height="6" rx="2" fill={wood} stroke={ink} strokeWidth="2" transform="rotate(-25 20 17)"/>
          <line x1="34" y1="36" x2="14" y2="14" stroke={ink} strokeWidth="2"/>
        </svg>
      );
    case 'cookbook':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter, opacity }}>
          <path d="M8 12 L56 8 L52 56 L8 52 Z" fill={wood} stroke={ink} strokeWidth="2"/>
          <path d="M30 10 L30 54" stroke={ink} strokeWidth="1.5"/>
          {[18, 26, 34, 42].map((y) => <line key={y} x1="14" y1={y} x2="28" y2={y - 1} stroke={ink} strokeWidth="0.8" opacity="0.5"/>)}
          {[18, 26, 34, 42].map((y) => <line key={y} x1="34" y1={y - 1} x2="48" y2={y - 2} stroke={ink} strokeWidth="0.8" opacity="0.5"/>)}
          <text x="42" y="22" fontSize="6" fill={cream} fontWeight="bold" fontFamily="serif">לחם</text>
        </svg>
      );
    case 'hat':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter, opacity }}>
          <ellipse cx="32" cy="48" rx="22" ry="6" fill={cloth} stroke={ink} strokeWidth="2"/>
          <path d="M18 48 Q14 32 18 22 Q22 14 32 14 Q42 14 46 22 Q50 32 46 48 Z" fill={cream} stroke={ink} strokeWidth="2" strokeLinejoin="round"/>
          <ellipse cx="22" cy="22" rx="4" ry="3" fill={cream} stroke={ink} strokeWidth="1.5"/>
          <ellipse cx="32" cy="18" rx="5" ry="3.5" fill={cream} stroke={ink} strokeWidth="1.5"/>
          <ellipse cx="42" cy="22" rx="4" ry="3" fill={cream} stroke={ink} strokeWidth="1.5"/>
        </svg>
      );
    case 'photo':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter, opacity }}>
          <rect x="6" y="8" width="52" height="48" rx="2" fill={cream} stroke={ink} strokeWidth="2"/>
          <rect x="9" y="11" width="46" height="34" fill="#3a4a5c"/>
          <rect x="13" y="32" width="9" height="11" rx="1" fill={ink} opacity="0.65"/>
          <rect x="22" y="28" width="9" height="15" rx="1" fill={ink} opacity="0.85"/>
          <rect x="30" y="24" width="11" height="19" rx="1" fill={cream} opacity="0.95"/>
          <rect x="40" y="28" width="9" height="15" rx="1" fill={ink} opacity="0.85"/>
          <rect x="48" y="32" width="9" height="11" rx="1" fill={ink} opacity="0.65"/>
        </svg>
      );
  }
}
