'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { celebrateHolidayEgg, holidayGet, holidayPost, holidayQuery } from '@/lib/holidays/holidayClient';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import { cn } from '@/lib/utils';

const BELLS = 108;
const BELL_KEY = 'lx_holiday_bells';
const CHIME_SECONDS = 12;
const WISH_WORDS = ['ЧУДО', 'ЁЛКА', 'СНЕГ', 'МЕЧТА', 'ПОДАРОК'];
const POLL_MS = 60_000;

function confetti() {
  void import('@/utils/confettiUtils').then(({ fireConfetti }) => fireConfetti({ particleCount: 140, spread: 90, disableForReducedMotion: true }));
}

const btn = 'rounded-lg border-2 border-black px-3 py-1 font-neo-display text-xs font-bold shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none';

export function KohakuRace() {
  const { t } = useLanguage();
  const [totals, setTotals] = useState<{ red: number; white: number; team: 'red' | 'white' | null } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => {
      const q = holidayQuery();
      if (!q) return;
      holidayGet<{ red: number; white: number; team: 'red' | 'white' | null }>('kohaku', q)
        .then((r) => alive && (setTotals(r), setFailed(false)))
        .catch(() => alive && setFailed(true));
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (failed && !totals) return <p className="text-xs">{t('holiday.moment.loadError')}</p>;
  if (!totals) return <p className="text-xs text-neo-white/70">{t('holiday.wrapped.loading')}</p>;
  const sum = totals.red + totals.white || 1;
  const redPct = Math.round((totals.red / sum) * 100);
  return (
    <div data-testid="kohaku-race" className="flex flex-col gap-2">
      <p className="text-xs">{totals.team ? t(`holiday.moment.kohaku.team.${totals.team}`) : t('holiday.moment.kohaku.guest')}</p>
      <div className="flex h-6 overflow-hidden rounded-full border-2 border-black bg-neo-holiday-snow" aria-hidden="true">
        <div className="origin-left bg-neo-holiday-red transition-transform duration-700" style={{ width: '100%', transform: `scaleX(${redPct / 100})` }} />
      </div>
      <p className="flex justify-between text-xs font-bold tabular-nums">
        <span>{t('holiday.moment.kohaku.red', { count: totals.red })}</span>
        <span>{t('holiday.moment.kohaku.white', { count: totals.white })}</span>
      </p>
    </div>
  );
}

function readBells(): number {
  try {
    return Number(sessionStorage.getItem(BELL_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function BellTap() {
  const { t } = useLanguage();
  const { playTileSelectSound, playAchievementSound } = useSoundEffects();
  const [count, setCount] = useState(readBells);
  const [ring, setRing] = useState(0);

  const strike = () => {
    if (count >= BELLS) return;
    const next = count + 1;
    setCount(next);
    setRing((r) => r + 1);
    try {
      sessionStorage.setItem(BELL_KEY, String(next));
    } catch {}
    if (next === BELLS) {
      playAchievementSound();
      confetti();
      celebrateHolidayEgg('bells108');
    } else playTileSelectSound();
  };

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={strike} aria-label={t('holiday.moment.bells.label')} className="size-16 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cream">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={ring} src="/holidays/gold-bell.webp" alt="" width={64} height={64} className={cn('size-full object-contain', ring > 0 && 'holiday-bell-ring')} />
      </button>
      <div>
        <p className="font-neo-display text-2xl font-bold tabular-nums text-neo-cream" aria-live="polite">{count}/{BELLS}</p>
        <p className="text-xs">{count >= BELLS ? t('holiday.moment.bells.done') : t('holiday.moment.bells.hint')}</p>
      </div>
    </div>
  );
}

function scramble(word: string, seed: number): string[] {
  const letters = [...word];
  for (let i = letters.length - 1; i > 0; i--) {
    const j = (seed * (i + 7)) % (i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join('') === word ? [...letters.slice(1), letters[0]] : letters;
}

export function ChimesWish() {
  const { t } = useLanguage();
  const { playCountdownBeep, playAchievementSound, playErrorSound } = useSoundEffects();
  const [phase, setPhase] = useState<'idle' | 'play' | 'won' | 'lost'>('idle');
  const [left, setLeft] = useState(CHIME_SECONDS);
  const [picked, setPicked] = useState<number[]>([]);
  const word = useRef(WISH_WORDS[0]);
  const tiles = useRef<string[]>([]);
  const round = useRef(0);

  useEffect(() => {
    if (phase !== 'play') return;
    if (left <= 0) {
      setPhase('lost');
      playErrorSound();
      return;
    }
    playCountdownBeep(left);
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, left, playCountdownBeep, playErrorSound]);

  const start = () => {
    round.current += 1;
    const seed = round.current * 131 + 7;
    word.current = WISH_WORDS[seed % WISH_WORDS.length];
    tiles.current = scramble(word.current, seed);
    setPicked([]);
    setLeft(CHIME_SECONDS);
    setPhase('play');
  };

  const pick = (i: number) => {
    if (phase !== 'play' || picked.includes(i)) return;
    const next = [...picked, i];
    const spelled = next.map((k) => tiles.current[k]).join('');
    if (!word.current.startsWith(spelled)) {
      setPicked([]);
      playErrorSound();
      return;
    }
    setPicked(next);
    if (spelled === word.current) {
      setPhase('won');
      playAchievementSound();
      confetti();
      celebrateHolidayEgg('chimes');
    }
  };

  if (phase === 'idle' || phase === 'lost') {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-xs">{t(phase === 'lost' ? 'holiday.moment.chimes.lost' : 'holiday.moment.chimes.intro')}</p>
        <button type="button" onClick={start} className={cn(btn, 'bg-neo-holiday-red text-neo-white')}>{t('holiday.moment.chimes.start')}</button>
      </div>
    );
  }
  if (phase === 'won') return <p className="holiday-pop-in font-neo-display text-sm font-bold text-neo-cream">{t('holiday.moment.chimes.won', { word: word.current })}</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="holiday-chime font-neo-display text-3xl font-bold tabular-nums text-neo-cream" aria-live="assertive">{left}</p>
      <div className="flex flex-wrap gap-1.5">
        {tiles.current.map((ch, i) => (
          <button
            key={i}
            type="button"
            onClick={() => pick(i)}
            className={cn('size-10 rounded-lg border-2 border-black font-neo-display text-lg font-bold', picked.includes(i) ? 'bg-neo-holiday-red text-neo-white' : 'bg-neo-cream text-neo-navy')}
          >
            {ch}
          </button>
        ))}
      </div>
    </div>
  );
}

type RosconOutcome = 'haba' | 'figurine' | 'none';

export function RosconPick() {
  const { t } = useLanguage();
  const { playChestOpenSound, playCoinCollectSound } = useSoundEffects();
  const [result, setResult] = useState<{ outcome: RosconOutcome; coins: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (!hasSupabaseSession()) return <p className="text-xs">{t('holiday.moment.roscon.signIn')}</p>;

  const pick = async (slice: number) => {
    const q = holidayQuery();
    if (!q || busy) return;
    setBusy(true);
    playChestOpenSound();
    try {
      const r = await holidayPost<{ status: string; outcome?: RosconOutcome; coins?: number }>('eggs', q, { roscon: slice });
      if (r.outcome) {
        setResult({ outcome: r.outcome, coins: r.coins ?? 0 });
        if (r.outcome !== 'none') confetti();
        if (r.coins) playCoinCollectSound();
      }
    } catch {
      setError(true);
    }
    setBusy(false);
  };

  if (result) return <p className="holiday-pop-in font-neo-display text-sm font-bold">{t(`holiday.moment.roscon.${result.outcome}`, { count: result.coins })}</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs">{error ? t('holiday.moment.loadError') : t('holiday.moment.roscon.hint')}</p>
      <div className="relative mx-auto size-40" role="group" aria-label={t('holiday.moment.roscon.title')}>
        {Array.from({ length: 8 }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={busy}
            onClick={() => pick(i)}
            aria-label={t('holiday.moment.roscon.slice', { n: i + 1 })}
            className="absolute start-1/2 top-1/2 -ms-5 -mt-5 size-10 rounded-full border-2 border-black bg-neo-orange shadow-hard-sm active:scale-95"
            style={{ transform: `rotate(${i * 45}deg) translateY(-56px) rotate(${-i * 45}deg)` }}
          >
            <span className="block size-3 translate-x-3 rounded-full bg-neo-holiday-red" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
