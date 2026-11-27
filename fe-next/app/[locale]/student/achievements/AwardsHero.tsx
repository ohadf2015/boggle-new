'use client';

import { m } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import { AnimatedNumber, CelebrationBurst, EDU_MOTION, Reveal, useReducedMotionSafe } from '@/components/education/motion';
import { Medallion, toneStyle, type Tone } from '@/components/student/academy/chrome';
import { getTierDisplay, type TierName } from '@/utils/achievementTiers';
import { cn } from '@/lib/utils';
import { summarizeAwards, type NextAward } from './awardsSummary';

type T = (k: string, fallback?: string, params?: Record<string, unknown>) => string;

const TIERS: { tier: TierName; tone: Tone }[] = [
  { tier: 'BRONZE', tone: 'ember' },
  { tier: 'SILVER', tone: 'teal' },
  { tier: 'GOLD', tone: 'gold' },
  { tier: 'PLATINUM', tone: 'plum' },
];
const TIER_TONE = Object.fromEntries(TIERS.map(({ tier, tone }) => [tier, tone])) as Record<TierName, Tone>;
const tierLabel = (t: T, tier: TierName) => t(`achievementTiers.${tier.toLowerCase()}`, tier);
const CAPS = 'font-neo-display text-xs font-black uppercase tracking-[0.08em]';
// Sunken well inside the summary card: sets Next up apart without a second bordered card.
const WELL = 'rounded-[14px] border-3 border-edu-line bg-edu-surface p-2 shadow-edu-lip-sm sm:p-2.5';

/** Chunky quest-style bar; the fill grows by transform, never by width. */
function FillBar({ pct, className, children }: { pct: number; className?: string; children?: React.ReactNode }) {
  const reduced = useReducedMotionSafe();
  const scale = Math.max(0, Math.min(1, pct));
  return (
    <span className={cn('relative block overflow-hidden rounded-full border-2 border-edu-line bg-edu-surface', className)}>
      <m.span
        className="absolute inset-0 block origin-left rounded-full rtl:origin-right"
        style={toneStyle('gold', { shadow: 0, trim: 1 })}
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: scale }}
        transition={reduced ? { duration: 0 } : { ...EDU_MOTION.spring.settle, delay: 0.15 }}
      />
      {children && (
        <span className="relative flex h-full items-center justify-center font-neo-display text-xs font-black text-neo-black">
          {children}
        </span>
      )}
    </span>
  );
}

function NextUpCard({ next, t, lead = true }: { next: NextAward; t: T; lead?: boolean }) {
  const icon = getTierDisplay(next.nextTier)?.icon;
  return (
    <div data-testid={lead ? 'awards-next' : 'awards-next-more'} className={cn(WELL, 'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5')}>
      <Medallion tone="gold" size={lead ? 44 : 32} shadow={2} className="row-span-2 self-start">
        <span className="text-xl leading-none">{next.award.icon}</span>
      </Medallion>
      <div className="min-w-0">
        <p className="flex items-baseline gap-2">
          {lead && <span dir="auto" className={cn(CAPS, 'shrink-0 rounded-full border-2 border-neo-black bg-neo-pink px-2 text-neo-black')}>{t('academy.pages.awardsNextUp', 'Next up')}</span>}
          <span dir="auto" className="ms-auto truncate font-neo-body text-xs font-bold text-edu-ink/80">
            {t('academy.pages.awardsToTier', '{left} more for {tier}', { left: next.left, tier: tierLabel(t, next.nextTier) })}
          </span>
        </p>
        <p dir="auto" className={cn('truncate font-neo-display font-black leading-tight text-edu-ink', lead ? 'text-lg sm:text-xl' : 'text-sm')}>
          {t(next.award.nameKey)}
        </p>
        {lead && (
          <p data-testid="awards-next-how" dir="auto" className="font-neo-body text-sm font-bold leading-snug text-edu-ink/85">
            {t(next.award.descriptionKey)}
          </p>
        )}
      </div>
      <div className="col-start-2 flex items-center gap-2">
        <span
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={next.threshold}
          aria-valuenow={next.count}
          aria-label={t(next.award.nameKey)}
          className="min-w-0 flex-1"
        >
          <FillBar pct={next.pct} className={lead ? 'h-6' : 'h-5'}>
            <bdi>{next.count} / {next.threshold}</bdi>
          </FillBar>
        </span>
        <Medallion tone={TIER_TONE[next.nextTier]} size={30} shadow={2}>
          <span className="text-sm leading-none">{icon}</span>
        </Medallion>
      </div>
    </div>
  );
}

// Duolingo-style summary above the wall, in ONE card so the badge wall still shows on a short phone.
export function AwardsHero({ achievements, celebrate = false }: { achievements: Record<string, Achievement>; celebrate?: boolean }) {
  const { t: rawT } = useLanguage();
  const t = rawT as unknown as T;
  const summary = useMemo(() => summarizeAwards(achievements), [achievements]);
  const [landed, setLanded] = useState(false);
  if (summary.total === 0) return null;
  const { earned, total, tiers, next, nexts } = summary;

  return (
    <div data-testid="awards-hero" data-total={total} className="mb-3">
      <Reveal>
        <div
          data-testid="awards-hero-card"
          data-hero-card
          className="relative grid gap-2.5 md:grid-cols-2 md:gap-3"
        >
          <div className="flex min-w-0 flex-col justify-center gap-2.5">
            <div className="flex items-center gap-3">
              <Medallion tone="gold" size={48} shadow={2}>
                <span className="text-2xl leading-none">🏆</span>
              </Medallion>
              <div className="min-w-0 flex-1">
                <p dir="auto" className={cn(CAPS, 'text-edu-ink')}>{t('academy.pages.awardsWon', 'Awards won')}</p>
                <div className="flex items-center gap-2.5">
                  <p className="flex shrink-0 items-baseline gap-1.5">
                    <span data-testid="awards-hero-earned" className={cn('font-neo-display text-[2rem] font-black leading-none text-edu-ink tabular-nums sm:text-4xl')}>
                      <AnimatedNumber to={earned} from={0} onDone={() => setLanded(true)} />
                    </span>
                    <span dir="auto" className={cn('font-neo-display text-base font-black text-edu-ink/85')}>
                      {t('academy.pages.awardsOfTotal', 'of {total}', { total })}
                    </span>
                  </p>
                  <FillBar pct={total ? earned / total : 0} className="h-3 min-w-0 flex-1" />
                </div>
              </div>
            </div>
            {earned > 0 && <ul className="grid grid-cols-4 gap-2">
              {TIERS.map(({ tier, tone }) => {
                const n = tiers[tier];
                return (
                  <li
                    key={tier}
                    data-testid={`awards-tier-${tier}`}
                    aria-label={t('academy.pages.awardsTierCount', '{tier}: {count}', { tier: tierLabel(t, tier), count: n })}
                    className={cn('flex items-center justify-center gap-1 rounded-full border-2 border-neo-black py-1', n === 0 && 'opacity-50 grayscale')}
                    style={toneStyle(tone, { shadow: 2, trim: 1 })}
                  >
                    <span aria-hidden="true" className="text-sm leading-none">{getTierDisplay(tier)?.icon}</span>
                    <span className="font-neo-display text-sm font-black text-neo-black tabular-nums">{n}</span>
                  </li>
                );
              })}
            </ul>}
          </div>
          {next ? (
            <div className="flex min-w-0 flex-col gap-2 order-first">
              <NextUpCard next={next} t={t} />
              {nexts.slice(1).map((n) => (
                <NextUpCard key={n.id} next={n} t={t} lead={false} />
              ))}
            </div>
          ) : (
            <p dir="auto" className={cn(WELL, 'flex items-center justify-center text-center font-neo-display text-base font-black text-edu-ink')}>
              {t('academy.pages.awardsAllMaxed', 'Every award maxed out!')}
            </p>
          )}
          <CelebrationBurst playing={landed && celebrate && earned > 0} burstKey={earned} count={12} />
        </div>
      </Reveal>
    </div>
  );
}
