'use client';
/* eslint-disable @next/next/no-img-element -- Boss-fight character sprites; next/image not needed. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CINDER_HURT_LINES,
  CINDER_PHASE3_WHISPERS,
  CINDER_TAUNTS,
  computeAttackDamage,
  ensureMercyLetters,
  isCryoBonus,
  isMercyWord,
  isSootheWord,
  rollNewLetter,
  rollStartingLetters,
} from '@/lib/word-vault/combat/wordCombat';

interface Props {
  onVictoryMercy: () => void;
  onVictoryDamage: () => void;
  onDefeat: () => void;
}

const CINDER_MAX_HP = 220;
const MELO_MAX_HP = 100;
const MERCY_PER_SOOTHE = 25;
const MERCY_NEEDED = 100;
const TILE_BAR_SIZE = 9;
const CINDER_COUNTER_BASE = 6;

type FloatingNum = { id: number; n: number; tone: 'damage' | 'cryo' | 'soothe' | 'hurt' };

type Phase = 'rage' | 'desperate' | 'mercy';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function CinderBossFight({
  onVictoryMercy,
  onVictoryDamage,
  onDefeat,
}: Props) {
  const [cinderHp, setCinderHp] = useState(CINDER_MAX_HP);
  const [meloHp, setMeloHp] = useState(MELO_MAX_HP);
  const [letters, setLetters] = useState<string[]>(() => rollStartingLetters(TILE_BAR_SIZE));
  const [selected, setSelected] = useState<number[]>([]);
  const [taunt, setTaunt] = useState<string>('היכנס בו, גם זה לא יעצור אותי.');
  const [mercy, setMercy] = useState(0);
  const [floats, setFloats] = useState<FloatingNum[]>([]);
  const [outcome, setOutcome] = useState<null | 'mercy' | 'damage' | 'defeat'>(null);
  const floatId = useRef(0);

  const phase: Phase =
    cinderHp <= CINDER_MAX_HP * 0.25
      ? 'mercy'
      : cinderHp <= CINDER_MAX_HP * 0.6
      ? 'desperate'
      : 'rage';

  // When phase shifts to mercy, force-include the letters needed for win conditions
  const enteredMercy = useRef(false);
  useEffect(() => {
    if (phase === 'mercy' && !enteredMercy.current) {
      enteredMercy.current = true;
      setLetters((prev) => ensureMercyLetters(prev));
      setTaunt('אני זוכר… משהו… איך קראו לאחי? תאמרי לי…');
    }
  }, [phase]);

  const word = useMemo(() => selected.map((i) => letters[i]).join(''), [selected, letters]);
  const cinderHpPct = Math.max(0, cinderHp / CINDER_MAX_HP);
  const meloHpPct = Math.max(0, meloHp / MELO_MAX_HP);
  const mercyPct = mercy / MERCY_NEEDED;

  const pushFloat = useCallback((n: number, tone: FloatingNum['tone']) => {
    floatId.current += 1;
    const id = floatId.current;
    setFloats((f) => [...f, { id, n, tone }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1200);
  }, []);

  const refillLetters = useCallback((toRemove: number[]) => {
    setLetters((prev) => {
      const next = [...prev];
      const removeSet = new Set(toRemove);
      for (let i = 0; i < next.length; i += 1) {
        if (removeSet.has(i)) next[i] = rollNewLetter();
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((idx: number) => {
    if (outcome) return;
    setSelected((s) => (s.includes(idx) ? s.filter((i) => i !== idx) : [...s, idx]));
  }, [outcome]);

  const clearWord = useCallback(() => setSelected([]), []);

  const cinderCounter = useCallback(() => {
    if (phase === 'mercy') return; // no counter in mercy phase
    const dmg = CINDER_COUNTER_BASE + Math.floor(Math.random() * 6);
    setMeloHp((hp) => Math.max(0, hp - dmg));
    pushFloat(dmg, 'hurt');
    setTaunt(pickRandom(CINDER_TAUNTS));
  }, [phase, pushFloat]);

  const handleAttack = useCallback(() => {
    if (outcome || word.length < 2) return;

    const dmg = computeAttackDamage(word);
    const used = [...selected];

    // Phase-specific behavior
    if (phase === 'mercy') {
      if (isMercyWord(word) && mercy >= MERCY_NEEDED) {
        setOutcome('mercy');
        pushFloat(0, 'soothe');
        setTaunt('…מלו? זה אתה? אני… אני זוכר…');
        return;
      }
      if (isMercyWord(word) && mercy < MERCY_NEEDED) {
        setTaunt('כמעט… אבל אני עוד לא מוכן לזכור. דברי איתי עוד.');
        refillLetters(used);
        setSelected([]);
        return;
      }
      if (isSootheWord(word)) {
        setMercy((m) => Math.min(MERCY_NEEDED, m + MERCY_PER_SOOTHE));
        pushFloat(MERCY_PER_SOOTHE, 'soothe');
        setTaunt(pickRandom(CINDER_PHASE3_WHISPERS));
      } else {
        // Damage attempts in mercy phase do nothing
        pushFloat(0, 'damage');
        setTaunt('המכות שלך כבר לא כואבות. תזכור אותי.');
      }
      refillLetters(used);
      setSelected([]);
      return;
    }

    // rage / desperate phases
    const cryoMul = phase === 'desperate' && isCryoBonus(word) ? 1 : 0;
    const finalDmg = Math.round(dmg * (1 + cryoMul * 0.5));
    setCinderHp((hp) => {
      const next = Math.max(0, hp - finalDmg);
      if (next <= 0) {
        // Damage victory — bad ending
        setOutcome('damage');
      }
      return next;
    });
    pushFloat(finalDmg, cryoMul > 0 ? 'cryo' : 'damage');
    setTaunt(pickRandom(CINDER_HURT_LINES));
    refillLetters(used);
    setSelected([]);

    // counter-attack on a tick
    setTimeout(cinderCounter, 600);
  }, [outcome, word, selected, phase, mercy, pushFloat, refillLetters, cinderCounter]);

  // Defeat detection
  useEffect(() => {
    if (meloHp <= 0 && !outcome) {
      setOutcome('defeat');
    }
  }, [meloHp, outcome]);

  return (
    <div className="relative flex h-full min-h-[100dvh] w-full flex-col items-stretch overflow-hidden">
      {/* Atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/word-vault/bg/hearth-halls.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.32) saturate(1.2)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(255,107,53,0.45) 0%, transparent 55%), linear-gradient(180deg, rgba(11,18,32,0.6) 0%, rgba(26,14,14,0.85) 100%)',
        }}
      />

      {/* Top: Cinder */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center pt-8">
        <CinderHpBar pct={cinderHpPct} phase={phase} />

        <div className="relative mt-4">
          <img
            src="/word-vault/villains/cinder.png"
            alt="סינדר"
            className={
              'h-56 w-56 select-none object-contain transition-all sm:h-72 sm:w-72 ' +
              (phase === 'mercy' ? 'opacity-70 saturate-50' : '')
            }
            style={{
              filter: 'drop-shadow(0 0 28px rgba(255,107,53,0.85))',
              animation:
                phase === 'rage'
                  ? 'wv-rage 2.4s ease-in-out infinite'
                  : phase === 'desperate'
                  ? 'wv-rage 1.4s ease-in-out infinite'
                  : 'wv-mercy 4s ease-in-out infinite',
            }}
          />
          {floats.map((f) => (
            <FloatingDmg key={f.id} {...f} />
          ))}
        </div>

        <p
          className={
            'mt-4 max-w-md rounded-md px-4 py-2 text-center font-rubik text-lg ' +
            (phase === 'mercy'
              ? 'border-2 border-cyan-300/60 bg-cyan-300/10 text-cyan-200'
              : 'border-2 border-orange-300/60 bg-orange-300/10 text-orange-200')
          }
          dir="rtl"
        >
          “{taunt}”
        </p>

        {phase === 'mercy' && (
          <div className="mt-3 flex w-full max-w-md flex-col items-center gap-1">
            <div className="h-3 w-full overflow-hidden rounded-full border-2 border-cyan-300 bg-[#0b1220]">
              <div
                className="h-full bg-cyan-300 transition-[width] duration-500"
                style={{ width: `${mercyPct * 100}%` }}
              />
            </div>
            <span className="font-fredoka text-xs text-cyan-200">
              רחמים — {Math.round(mercyPct * 100)}%
              {mercy >= MERCY_NEEDED && ' · ספרי את שמו'}
            </span>
          </div>
        )}
      </div>

      {/* Bottom: Player UI */}
      <div className="relative z-10 flex flex-col gap-3 border-t-4 border-white/10 bg-[#0b1220]/95 px-4 pt-3 pb-6 backdrop-blur">
        <MeloHpBar pct={meloHpPct} />

        {/* Spell display */}
        <div className="flex min-h-[56px] items-center justify-center rounded-md border-4 border-lime-300 bg-[#0b1220] p-2" dir="rtl">
          <span className="font-fredoka text-3xl font-black tracking-widest text-lime-200">
            {word || ' '}
          </span>
        </div>

        {/* Word wheel */}
        <WordWheel
          letters={letters}
          selectedIndices={selected}
          onSelect={handleSelect}
          disabled={!!outcome}
        />

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={clearWord}
            disabled={!selected.length || !!outcome}
            className="rounded border-2 border-white/40 bg-transparent px-4 py-2 font-bold text-white disabled:opacity-30"
          >
            נקה
          </button>
          <button
            type="button"
            onClick={handleAttack}
            disabled={word.length < 2 || !!outcome}
            className={
              'rounded border-4 px-6 py-2 font-fredoka text-xl font-black shadow-[3px_3px_0_0_#000] transition active:translate-y-[2px] active:shadow-[1px_1px_0_0_#000] disabled:opacity-30 ' +
              (phase === 'mercy'
                ? 'border-cyan-300 bg-cyan-300 text-[#0b1220]'
                : 'border-lime-300 bg-lime-300 text-[#0b1220]')
            }
          >
            {phase === 'mercy' ? 'דברי' : 'תקוף'}
          </button>
        </div>
      </div>

      {outcome === 'mercy' && <MercyEnding onContinue={onVictoryMercy} />}
      {outcome === 'damage' && <DamageEnding onContinue={onVictoryDamage} />}
      {outcome === 'defeat' && <DefeatEnding onContinue={onDefeat} />}

      <style jsx global>{`
        @keyframes wv-rage {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        @keyframes wv-mercy {
          0%,
          100% {
            transform: scale(0.97);
          }
          50% {
            transform: scale(1.0);
          }
        }
        @keyframes wv-float {
          0% {
            transform: translateY(0) translateX(-50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-60px) translateX(-50%) scale(1.4);
            opacity: 0;
          }
        }
        @keyframes wv-bloom {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function MercyEnding({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(255,235,180,0.25) 0%, rgba(11,18,32,0.95) 70%)',
        animation: 'wv-bloom 1.4s ease-out forwards',
      }}
    >
      <img
        src="/word-vault/characters/cael.png"
        alt=""
        className="h-56 w-56 object-contain drop-shadow-[0_0_50px_rgba(255,235,180,0.7)] sm:h-72 sm:w-72"
      />
      <h2 className="font-fredoka text-4xl font-black text-amber-100 drop-shadow-[3px_3px_0_#000]">
        קאל
      </h2>
      <p className="max-w-md font-rubik text-lg leading-relaxed text-white">
        הלבה מתקררת. הסדקים נסגרים. רגע אחד הוא חוזר להיות הוא — חם, רך, מחבק.
        “תודה, מלו… זכרת אותי.” ואז הוא נעלם, משאיר אחריו ספר מתכונים וקסם של אותיות.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-md border-4 border-amber-300 bg-amber-200 px-8 py-3 font-fredoka text-xl font-black text-[#1a0e0e] shadow-[4px_4px_0_0_#000] transition active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000]"
      >
        המשך
      </button>
    </div>
  );
}

function DamageEnding({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(80,20,20,0.6) 0%, rgba(0,0,0,0.95) 70%)',
        animation: 'wv-bloom 1.2s ease-out forwards',
      }}
    >
      <h2 className="font-fredoka text-3xl font-black text-pink-300 drop-shadow-[3px_3px_0_#000]">
        הוא לא הספיק לזכור
      </h2>
      <p className="max-w-md font-rubik text-lg leading-relaxed text-white">
        ניצחת. הלבה כבתה. אבל הוא היה אחיך. אולי בפעם הבאה תקשיבי לפני שתכי.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-md border-4 border-pink-300 bg-pink-300/20 px-8 py-3 font-fredoka text-xl font-black text-pink-100 shadow-[4px_4px_0_0_#000]"
      >
        חזרה למרתף
      </button>
    </div>
  );
}

function DefeatEnding({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(255,107,53,0.45) 0%, rgba(0,0,0,0.95) 70%)',
        animation: 'wv-bloom 1.2s ease-out forwards',
      }}
    >
      <h2 className="font-fredoka text-3xl font-black text-orange-300 drop-shadow-[3px_3px_0_#000]">
        סינדר ניצח
      </h2>
      <p className="max-w-md font-rubik text-lg leading-relaxed text-white">
        מילים לא הספיקו. אולי תנסי שוב — עם אוצר מילים גדול יותר.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-md border-4 border-orange-300 bg-orange-300 px-8 py-3 font-fredoka text-xl font-black text-[#0b1220] shadow-[4px_4px_0_0_#000]"
      >
        ניסיון נוסף
      </button>
    </div>
  );
}

function WordWheel({
  letters,
  selectedIndices,
  onSelect,
  disabled,
}: {
  letters: string[];
  selectedIndices: number[];
  onSelect: (i: number) => void;
  disabled: boolean;
}) {
  // 1 center + N around
  const ringCount = Math.max(0, letters.length - 1);
  const radius = 110;
  return (
    <div className="relative mx-auto h-[280px] w-[280px] sm:h-[320px] sm:w-[320px]">
      {letters.map((ltr, i) => {
        const isCenter = i === 0;
        const isSelected = selectedIndices.includes(i);
        const angle = isCenter ? 0 : ((i - 1) / ringCount) * 2 * Math.PI - Math.PI / 2;
        const x = isCenter ? 0 : Math.cos(angle) * radius;
        const y = isCenter ? 0 : Math.sin(angle) * radius;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(i)}
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
            className={
              'absolute left-1/2 top-1/2 grid place-items-center rounded-full border-4 font-fredoka font-black shadow-[3px_3px_0_0_#000] transition-all active:translate-y-[1px] disabled:opacity-30 ' +
              (isCenter
                ? 'h-20 w-20 text-3xl '
                : 'h-14 w-14 text-2xl ') +
              (isSelected
                ? 'border-lime-300 bg-lime-300 text-[#0b1220] scale-95'
                : isCenter
                ? 'border-amber-300 bg-amber-200 text-[#1a0e0e] hover:bg-amber-100'
                : 'border-white bg-pink-400 text-[#0b1220] hover:bg-pink-300')
            }
          >
            {ltr}
          </button>
        );
      })}
      {/* Subtle ring guide */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border-2 border-white/15"
        style={{
          width: radius * 2 + 56,
          height: radius * 2 + 56,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
}

function FloatingDmg({ n, tone }: FloatingNum) {
  const colors: Record<FloatingNum['tone'], string> = {
    damage: 'text-orange-300',
    cryo: 'text-cyan-200',
    soothe: 'text-lime-200',
    hurt: 'text-pink-300',
  };
  return (
    <span
      className={`pointer-events-none absolute left-1/2 top-1/3 font-fredoka text-3xl font-black ${colors[tone]} drop-shadow-[2px_2px_0_#000]`}
      style={{ animation: 'wv-float 1.1s ease-out forwards' }}
    >
      {tone === 'soothe' && n === 0 ? '💖' : tone === 'soothe' ? `+${n}` : tone === 'hurt' ? `-${n}` : n === 0 ? '0' : `-${n}`}
    </span>
  );
}

function CinderHpBar({ pct, phase }: { pct: number; phase: Phase }) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-1 px-4">
      <div className="flex w-full items-center justify-between text-xs">
        <span className="font-fredoka font-bold text-orange-300">סינדר</span>
        <span className="font-rubik text-white">
          {phase === 'rage' ? 'רותח' : phase === 'desperate' ? 'נלחץ' : 'מבולבל'}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full border-2 border-orange-300 bg-[#0b1220]">
        <div
          className="h-full transition-[width] duration-500"
          style={{
            width: `${pct * 100}%`,
            background: 'linear-gradient(90deg, #ff6b35 0%, #ff3366 100%)',
          }}
        />
      </div>
    </div>
  );
}

function MeloHpBar({ pct }: { pct: number }) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-1 self-center">
      <div className="flex w-full items-center justify-between text-xs">
        <span className="font-fredoka font-bold text-lime-200">מלו</span>
        <span className="font-rubik text-white">{Math.round(pct * 100)}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full border-2 border-lime-300 bg-[#0b1220]">
        <div
          className="h-full bg-lime-300 transition-[width] duration-500"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
