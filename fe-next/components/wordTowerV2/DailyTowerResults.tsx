import { useEffect, useState } from 'react';
import { Coins, Hammer, Home, Medal, Send, Target, X } from 'lucide-react';
import { useRegisterHeaderAudioControl } from '@/contexts/NavigationContext';
import { DailyResultsHero } from '@/components/daily/results/DailyResultsHero';
import { floorsAt } from '@/lib/wordTowerV2/biomes';
import type { RevengeEntry, RivalView } from './useEstate';
import { RaidFlow } from './rivals/RaidFlow';
import { RivalBoard } from './rivals/RivalBoard';
import { ResultsMute } from './ResultsMute';
import { DailyChestRow } from './rewards/DailyChestRow';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { V2ResultsProps } from './V2Results';

type Props = V2ResultsProps & { daily: NonNullable<V2ResultsProps['daily']> };

function GoalMeter({ t, daily, coins }: { t: Props['t']; daily: Props['daily']; coins: React.ReactNode }) {
  const hit = daily.targetM > 0 && daily.growthM >= daily.targetM;
  const pct = daily.targetM > 0 ? Math.min(100, (daily.growthM / daily.targetM) * 100) : 0;
  const unit = t('wordTowerV2.unitM');
  return (
    <div data-testid="wt2-daily-meter" className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 font-neo-display text-xs font-black uppercase tracking-wide text-neo-white/80">
        <Target className="h-3.5 w-3.5 shrink-0 text-neo-yellow" aria-hidden />
        <span className={hit ? 'text-neo-lime' : undefined}>
          {hit ? t('wordTowerV2.dailyTower.goalHit') : t('wordTowerV2.dailyTower.goal')}
        </span>
        <span className="tabular-nums text-neo-white">{`${Math.min(daily.growthM, daily.targetM)}/${daily.targetM}${unit}`}</span>
        <span className="ms-auto flex items-center gap-2 tabular-nums">
          {daily.rank ? <span className="rounded-full border-2 border-neo-black bg-neo-purple px-1.5 text-neo-white">{`#${daily.rank}`}</span> : null}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-sm border-2 border-neo-cream bg-neo-navy" role="progressbar" aria-valuemin={0} aria-valuemax={daily.targetM} aria-valuenow={Math.min(daily.growthM, daily.targetM)}>
        <div className={`h-full origin-left ${hit ? 'bg-neo-lime' : 'bg-neo-yellow'}`} style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
      {coins}
    </div>
  );
}

/**
 * The daily tower's results: the same dark sheet and hero every daily mode
 * ends on, so finishing the tower reads like finishing the rest of the day.
 * Coins fill in when the server answers — the sheet never waits for it.
 */
export function DailyTowerResults(p: Props) {
  const { t, daily, run } = p;
  useRegisterHeaderAudioControl();
  const reducedMotion = usePrefersReducedMotion();
  const [target, setTarget] = useState<{ rival: RivalView; revenge: RevengeEntry | null } | null>(null);
  const onRaidOpen = p.rivals?.onRaidOpen;
  useEffect(() => {
    onRaidOpen?.(target !== null);
  }, [target, onRaidOpen]);
  const { onClose } = p;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const floors = Math.max(run.floors, Math.floor(floorsAt(p.peakM) + 0.05));
  const hit = daily.targetM > 0 && daily.growthM >= daily.targetM;
  const headline = p.isBest ? t('wordTower.daily.newBest') : t('wordTowerV2.dailyResults.headline', { n: floors });
  const paid = p.payoutStatus?.status === 'paid';
  const coinsLine =
    p.payoutStatus && p.payoutStatus.status !== 'none' ? (
      <div data-testid="wt2-daily-coins" className="flex items-center gap-1.5 font-neo-display text-xs font-black uppercase tracking-wide text-neo-white/70">
        <Coins className="h-3.5 w-3.5 text-neo-yellow" aria-hidden />
        {paid ? (
          <span className="tabular-nums text-neo-yellow">{`+${p.payoutStatus.coins.toLocaleString()}`} {t('common.coins')}</span>
        ) : (
          <span aria-live="polite">{t('wordTowerV2.results.coinsLoading')}</span>
        )}
      </div>
    ) : null;

  return (
    <>
      <div
        data-testid="wt2-daily-results"
        data-wt2-results-backdrop
        className="absolute inset-0 z-40 flex flex-col bg-neo-navy"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative h-14 shrink-0 pt-[env(safe-area-inset-top)]">
          <ResultsMute />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('wordTowerV2.results.close')}
            className="absolute end-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-8 w-8 items-center justify-center rounded-neo border-neo border-neo-black bg-neo-cream text-neo-navy shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div data-wt2-results-scroll className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="mx-auto flex w-full max-w-md flex-col gap-4 md:max-w-xl">
            <DailyResultsHero
              mode="word-tower"
              outcome={p.isBest || hit ? 'win' : 'done'}
              headline={headline}
              eyebrow={p.dateLabel}
              score={daily.growthM}
              scoreLabel={t('wordTowerV2.dailyTower.grewToday')}
              celebrate={p.celebrate}
              meter={<GoalMeter t={t} daily={daily} coins={coinsLine} />}
              stats={[
                { value: floors, label: t('wordTowerV2.dailyResults.floors') },
                { value: `${p.peakM.toFixed(1)}${t('wordTowerV2.unitM')}`, label: t('wordTowerV2.dailyResults.height') },
                { value: p.bestWord ? p.bestWord.toUpperCase() : '—', label: t('wordTowerV2.dailyResults.bestWord') },
              ]}
            >
              {p.recapSrc || p.onShare ? (
                <div className="flex items-center gap-3">
                  {p.recapSrc ? (
                    // Runtime-generated recap PNG: next/image cannot optimize it.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.recapSrc}
                      alt={t('wordTowerV2.recapAlt', { floors, m: p.peakM.toFixed(1) })}
                      className="w-28 shrink-0 rounded-md border-2 border-neo-black"
                      width={1200}
                      height={630}
                    />
                  ) : null}
                  {p.onShare ? (
                    <button
                      type="button"
                      onClick={p.onShare}
                      aria-label={t('wordTowerV2.wreck.share')}
                      className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-black bg-neo-cyan px-3 py-2.5 font-neo-display text-base font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
                    >
                      <Send className="h-5 w-5 shrink-0" aria-hidden />
                      <span className="truncate">{t('wordTowerV2.wreck.share')}</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </DailyResultsHero>

            {p.badges.length > 0 ? (
              <ul className="flex flex-wrap justify-center gap-1.5" aria-label={t('wordTowerV2.results.badges')}>
                {p.badges.map((id) => (
                  <li key={id} className="flex items-center gap-1 rounded-neo border-neo border-neo-black bg-neo-purple px-2 py-0.5 font-neo-display text-xs font-bold text-neo-white shadow-hard-sm">
                    <Medal className="h-3.5 w-3.5" aria-hidden />
                    {t(`wordTowerV2.ach.${id}.name`)}
                  </li>
                ))}
              </ul>
            ) : null}

            <DailyChestRow t={t} payoutStatus={p.payoutStatus} reducedMotion={reducedMotion} />
            {p.nextSlot}
            {p.boardSlot}
            {p.rivals ? (
              <RivalBoard
                t={t}
                estate={p.rivals.estate}
                myTower={p.rivals.myTower}
                myHeightM={p.peakM}
                onPick={(rival, revenge) => setTarget({ rival, revenge })}
              />
            ) : null}
            {p.extra || (p.onSmash && p.smashLabel) ? (
              <div className="flex gap-2">
                {p.extra ? <div className="min-w-0 flex-1">{p.extra}</div> : null}
                {p.onSmash && p.smashLabel ? (
                  <button
                    type="button"
                    onClick={p.onSmash}
                    className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-black bg-neo-lime px-4 py-2.5 font-neo-display text-base font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
                  >
                    <Hammer className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="truncate">{p.smashLabel}</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div data-wt2-results-actions className="shrink-0 border-t-3 border-neo-cream bg-neo-navy-light p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-md items-center gap-2">
            <button
              type="button"
              onClick={p.onRestart}
              autoFocus
              className="flex-1 rounded-neo border-neo-thick border-neo-black bg-neo-pink px-6 py-3 font-neo-display text-xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
            >
              {t('wordTowerV2.dailyTower.keepBuilding')}
            </button>
            <button
              type="button"
              onClick={p.onHome}
              aria-label={t('wordTowerV2.results.home')}
              className="flex h-14 w-14 items-center justify-center rounded-neo border-neo border-neo-cream bg-neo-navy text-neo-cream shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <Home className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
      {p.rivals && target ? (
        <RaidFlow
          t={t}
          estate={p.rivals.estate}
          rival={target.rival}
          revenge={!!target.revenge}
          grievance={target.revenge}
          balls={p.rivals.balls}
          reducedMotion={p.rivals.reducedMotion}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </>
  );
}
