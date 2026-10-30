import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { DAILY_MODES } from '@/lib/dailyModes';
import WheelHowTo from './wheel/WheelHowTo';
import { useWheelHowTo } from './wheel/useWheelHowTo';
import { scoreForLength } from '@/utils/dailyChallenge/wordWheelScoring';

type T = (key: string, params?: Record<string, string | number>) => string;

interface WordWheelReadyCardProps {
  t: T;
  centerLetter: string;
  outerLetters: string[];
  puzzleNumber: number;
  streakDays: number;
  onPlay: () => void;
  /** Wide screens put the board beside the card instead of under it. */
  wide?: boolean;
  /** Today's board (behind one tap on phones). */
  children?: React.ReactNode;
  isPractice?: boolean;
  /** First-time player: open the hands-on how-to once on its own. */
  autoShowHowTo?: boolean;
  /** Bonus-dated daily: combo multiplier is live. */
  bonuses?: boolean;
  /** Today has a gold letter (not named here: the outer letters stay hidden until play). */
  goldLetter?: string | null;
}

// Decoy glyphs, never the real outer letter, so the pre-game scout can't read
// the answer from the markup. Deterministic per seed so SSR and client match.
const DECOY_GLYPHS = ['Q', 'X', 'Z', 'K', 'W', 'V', 'Y', 'J'] as const;
function CensorTile({ seed, avoid }: { seed: number; avoid?: string }) {
  let glyph = DECOY_GLYPHS[seed % DECOY_GLYPHS.length];
  if (avoid && glyph === avoid.toUpperCase()) {
    glyph = DECOY_GLYPHS[(seed + 1) % DECOY_GLYPHS.length];
  }
  return (
    <span
      data-testid="censor-blur"
      className="flex h-full w-full select-none items-center justify-center font-neo-display font-black text-neo-navy"
      style={{ filter: 'blur(4px)', fontSize: '1.1rem' }}
      aria-hidden
    >
      {glyph}
    </span>
  );
}

const ORBIT = 72;
const STEP = DAILY_MODES.findIndex((d) => d.id === 'word-wheel') + 1;

export default function WordWheelReadyCard({
  t, centerLetter, outerLetters, puzzleNumber, streakDays, onPlay, wide = false, children,
  isPractice = false, autoShowHowTo = false, bonuses = false, goldLetter = null,
}: WordWheelReadyCardProps) {
  const { language } = useLanguage();
  const howTo = useWheelHowTo(autoShowHowTo);
  const [learned, setLearned] = useState(false);
  return (
    <div
      className={cn(
        'flex-1 w-full flex flex-col items-center gap-4 px-4 pt-6 pb-bottom-stack sm:pb-6 overflow-y-auto',
        wide && 'lg:flex-row lg:items-start lg:justify-center lg:gap-8 lg:pt-12',
      )}
    >
      <section className="w-full max-w-sm shrink-0 rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard-lg overflow-hidden">
        <div className="px-5 pt-5 text-center">
          <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-neo-lime/80">
            {!isPractice && (
              <span data-testid="ready-step">{t('daily.journeyStepOf', { n: STEP, total: DAILY_MODES.length })} · </span>
            )}
            {t('daily.puzzleNumber', { number: puzzleNumber })}
          </span>
          <h1 className="font-neo-display font-black text-4xl text-neo-white mt-1">{t('wordWheel.title')}</h1>
        </div>

        {howTo.open ? <WheelHowTo onAccepted={() => setLearned(true)} /> : (
        <div className="relative mx-auto my-5 w-52 h-52 flex items-center justify-center" aria-hidden>
          <div className="absolute inset-0 rounded-full border-2 border-neo-lime/25 shadow-[0_0_36px_rgba(191,255,0,0.18),inset_0_0_30px_rgba(191,255,0,0.08)]" />
          <div className="absolute inset-6 rounded-full border border-neo-cyan/15" />
          <m.div
            className="w-[72px] h-[72px] rounded-full border-3 border-neo-black bg-neo-lime flex items-center justify-center font-neo-display font-black text-4xl text-neo-black shadow-[3px_3px_0px_black,0_0_24px_rgba(191,255,0,0.5)]"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {centerLetter}
          </m.div>
          {outerLetters.map((letter, i) => {
            const rad = (i * (360 / outerLetters.length) * Math.PI) / 180;
            const x = Math.sin(rad) * ORBIT;
            const y = -Math.cos(rad) * ORBIT;
            return (
              <m.div
                key={`outer-${i}`}
                data-testid="preview-outer-letter"
                className="absolute inset-0 m-auto w-12 h-12 rounded-full border-3 border-neo-black bg-neo-white overflow-hidden shadow-[2px_2px_0px_black]"
                initial={{ scale: 0, x, y }}
                animate={{ scale: 1, x, y }}
                transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 400, damping: 18 }}
              >
                <CensorTile seed={i + 1} avoid={letter} />
              </m.div>
            );
          })}
        </div>
        )}

        <p data-testid="ready-rules" className="px-5 text-center text-sm font-semibold text-neo-white/80 leading-relaxed">
          {t('wordWheel.centerLetterRule')}
          <span aria-hidden className="mx-1.5 text-neo-lime">·</span>
          {t('wordWheel.minLetters', { min: '3' })}
          <span aria-hidden className="mx-1.5 text-neo-lime">·</span>
          {t('wordWheel.timeLimit')}
        </p>

        <p data-testid="ready-length-tip" className="mt-2 px-5 text-center text-sm font-black text-neo-lime">
          {t('wordWheel.longerWordsTip', { short: scoreForLength(3), long: scoreForLength(7) })}
        </p>
        {bonuses && (
          <p data-testid="ready-combo-tip" className="mt-1 px-5 text-center text-xs font-semibold text-neo-white/75">
            {t('wordWheel.comboTip')}
          </p>
        )}
        {goldLetter && (
          <p data-testid="ready-gold-tip" className="mt-1 px-5 text-center text-xs font-semibold text-neo-yellow">
            <span aria-hidden className="me-1">★</span>
            {t('wordWheel.goldTip')}
          </p>
        )}

        {streakDays >= 1 && (
          <p data-testid="ready-streak" className="mt-3 flex items-center justify-center gap-1.5 text-neo-orange font-neo-display font-black text-sm uppercase tracking-wide">
            <Flame className="w-4 h-4" strokeWidth={2.5} aria-hidden />
            {t('wordWheel.results.streakChip', { count: streakDays })}
          </p>
        )}

        <div className="p-5">
          <m.button
            type="button"
            onClick={onPlay}
            className={cn(
              'w-full h-14 rounded-neo border-3 border-neo-black bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black font-neo-display font-black text-2xl tracking-wide shadow-hard active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
              learned && 'ring-4 ring-neo-yellow ring-offset-2 ring-offset-neo-navy-light',
            )}
            animate={learned ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 0.45 }}
            whileTap={{ scale: 0.97 }}
          >
            {t('daily.play')}
          </m.button>
          <div className="mt-3 flex items-center justify-center gap-4 text-sm font-bold">
            {!howTo.open && (
              <button type="button" data-testid="ready-howto-link" onClick={howTo.show} className="text-neo-cyan underline underline-offset-4">
                {t('daily.howToPlay')}
              </button>
            )}
            {!isPractice && (
              // Full navigation: the load hook decides practice once per mount.
              <a data-testid="ready-practice-link" href={`/${language}/daily/word-wheel?practice=1`} className="text-neo-white/75 underline underline-offset-4">
                {t('singlePlayer.practiceMode')}
              </a>
            )}
          </div>
        </div>
      </section>

      {children && <div className={cn('w-full max-w-sm', wide && 'lg:max-w-xl')}>{children}</div>}
    </div>
  );
}
