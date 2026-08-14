'use client';

import { Fragment, type ReactNode } from 'react';
import { ChevronsUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TowerNotice } from './TowerNotice';
import { WordTowerRewardReveal, type RewardRevealPayload } from './WordTowerRewardReveal';
import { showsTierKicker, type DropVerdict, type VerdictTone } from '@/lib/wordTower/dropVerdict';
import { TOWER_SURPRISE_META, UPDRAFT_MULT, type ActiveTowerSurprise } from '@/lib/wordTower/towerSurprise';
import type { ComboMilestone } from '@/lib/wordTower/comboMilestone';
import type { Achievement } from '@/lib/wordTower/achievements';
import type { TowerSkin } from '@/lib/wordTower/skins';

/** The `{ value, exiting }` shape produced by useExitReveal. */
interface Reveal<T> { value: T | null; exiting: boolean }

/** Verdict-pop colour by band — mirrors the swinging-beam tint families. */
const VERDICT_TONE_CLASS: Record<VerdictTone, string> = {
  lime: 'bg-neo-lime text-neo-black',
  cyan: 'bg-neo-cyan text-neo-black',
  yellow: 'bg-neo-yellow text-neo-black',
  red: 'bg-neo-red text-neo-white',
};

/** Long-word celebration label per tier — folded into the verdict pop so the
 *  "SKYSCRAPER!" beat rides with the drop verdict instead of as a 2nd pop. */
const TOWER_TIER_KEY: Record<'highRise' | 'tall' | 'skyscraper', string> = {
  highRise: 'wordTower.celebration.highRise',
  tall: 'wordTower.celebration.tall',
  skyscraper: 'wordTower.celebration.skyscraper',
};

/** Hard ceiling on simultaneous notices: TWO.
 *
 *  Three was a wall — the very first word of a fresh tower fired NEW DAILY BEST
 *  + a coin reveal + an achievement at once, three stacked cards over the play
 *  field before the player had seen their own floor land (2026-08-07).
 *
 *  ONE would be cleaner still, but it silently eats the beats it displaces: the
 *  verdict holds the only slot for VERDICT_MS (750) plus its exit reveal (160),
 *  so a TOAST_MS (950) achievement would surface for the last ~40ms of its life
 *  and read as nothing at all. Two lets the verdict and one companion share the
 *  moment while the rest queue behind them as their windows expire. */
const MAX_NOTICES = 2;

/** Priority order: the most screen-dominant / time-sensitive beats win when
 *  many fire at once. Verdict and alarms always lead; scenic flybys trail. */
const NOTICE_PRIORITY: Record<string, number> = {
  verdict: 10,
  hazard: 20,
  clutch: 30,
  critical: 35,
  newBest: 40,
  zone: 50,
  reward: 55,
  surprise: 60,
  combo: 70,
  milestone: 80,
  landmark: 90,
  skinUnlock: 100,
  ach: 110,
  wreckReport: 120,
  sabEarned: 130,
  sabAdEarned: 140,
  tease: 150,
};

export interface WordTowerNoticeColumnProps {
  verdict: Reveal<{ v: DropVerdict; key: number }>;
  /** Long-word tier of the last accepted word — drives the verdict kicker. */
  lastResultTier: 'none' | 'highRise' | 'tall' | 'skyscraper' | null;
  hazard: Reveal<string>;
  clutch: Reveal<string>;
  /** CRITICAL-lean alarm — parent gates it on pendingWord && !clutch. */
  critical: boolean;
  newBest: Reveal<string>;
  zone: Reveal<string>;
  /** Next-zone tease — parent nulls it while the zone banner is paying off. */
  tease: { nextBiomeId: string; metersToNext: number } | null;
  reward: RewardRevealPayload | null;
  /** Wrecking-ball earn beats (dismiss timers live in WordTowerSabotageBay). */
  sabEarned: number | null;
  sabAdEarned: boolean;
  skinUnlock: Reveal<TowerSkin>;
  surprise: Reveal<{ s: ActiveTowerSurprise; key: number }>;
  combo: Reveal<{ m: ComboMilestone; key: number }>;
  milestone: Reveal<string>;
  landmark: Reveal<string>;
  ach: Reveal<Achievement>;
  wreckReport: { names: string[]; floors: number } | null;
  reducedMotion: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Dedicated notice band top (px) from {@link playChromeFrame} — keeps banners
   *  in the sky above the construction zone instead of a hardcoded mid-screen. */
  noticeTopPx?: number;
  /** Max height of the notice stack so it never permanently occludes the tower. */
  noticeMaxHeightPx?: number;
}

/**
 * ── Notice column ── ALL of Word Tower's transient banners render here, one
 * centred flex column below the top chrome. Simultaneous beats STACK in
 * priority order (verdict first, alarms, celebrations, scenic beats last)
 * instead of overlapping at hand-tuned absolute offsets — a zone entry that
 * pays a wrecking ball AND coins reads as one tidy stack, not three toasts
 * fighting over the same pixels (founder screenshot, 2026-07-02).
 */
export function WordTowerNoticeColumn({
  verdict, lastResultTier, hazard, clutch, critical, newBest, zone, tease,
  reward, sabEarned, sabAdEarned, skinUnlock, surprise, combo, milestone,
  landmark, ach, wreckReport, reducedMotion, t,
  noticeTopPx, noticeMaxHeightPx,
}: WordTowerNoticeColumnProps) {
  const { language } = useLanguage();
  const fxClass = (exiting: boolean, enter: string) => (reducedMotion ? '' : exiting ? 'wt-toast-out' : enter);

  /** Build every visible beat as a keyed node + priority, then render only the
   *  top MAX_NOTICES so the stack never overwhelms the play area. */
  const notices: { key: string; priority: number; node: ReactNode }[] = [];

  // Unmistakable DROP VERDICT — the single big beat that answers "did I
  // nail it?". Band-coloured headline (PERFECT/NICE/SLOPPY/MISSED) + the
  // metres actually gained. Leads the column so it can't be missed AND
  // can't collide with the celebration stack below it.
  if (verdict.value) {
    const v = verdict.value;
    notices.push({
      key: `verdict-${v.key}`,
      priority: NOTICE_PRIORITY.verdict,
      node: (
        <div
          className={`pointer-events-none flex flex-col items-center gap-1.5 ${fxClass(verdict.exiting, 'animate-neo-pop')}`}
          aria-live="assertive"
          role="status"
        >
          {/* Tier kicker — the long-word celebration (SKYSCRAPER!) folded INTO
              the verdict so it is ONE consolidated beat. Hidden on a MISS so a
              fumbled drop never reads as a celebration. */}
          {lastResultTier && lastResultTier !== 'none' && showsTierKicker(v.v.tone) && (
            <div className="rounded-neo border-neo border-black bg-neo-yellow px-3 py-0.5 font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard">
              {t(TOWER_TIER_KEY[lastResultTier])}
            </div>
          )}
          <div
            className={`rounded-neo border-neo-thick border-black px-5 py-2.5 text-center font-neo-display text-2xl font-black uppercase tracking-wide shadow-hard ${VERDICT_TONE_CLASS[v.v.tone]} ${reducedMotion ? '' : v.v.toppled ? 'animate-neo-shake' : 'animate-neo-pop'}`}
          >
            {t(v.v.labelKey)}
          </div>
          {v.v.gainText !== '+0m' && (
            <div dir="ltr" className="rounded-neo border-neo border-black bg-neo-navy/95 px-3 py-1 font-neo-display text-lg font-black text-neo-white shadow-hard">
              {v.v.gainText}
            </div>
          )}
        </div>
      ),
    });
  }

  // Hazard "tower ruined" — bold + red so the loss is unmissable.
  if (hazard.value) {
    notices.push({
      key: `hazard-${hazard.value}`,
      priority: NOTICE_PRIORITY.hazard,
      node: (
        <TowerNotice
          key={`hazard-${hazard.value}`}
          tone="red"
          title={hazard.value}
          exiting={hazard.exiting}
          reducedMotion={reducedMotion}
          assertive
          shake
          titleClassName="normal-case"
        />
      ),
    });
  }

  // CLUTCH SAVE — the do-or-die payoff. Lime = triumph.
  if (clutch.value) {
    notices.push({
      key: `clutch-${clutch.value}`,
      priority: NOTICE_PRIORITY.clutch,
      node: (
        <TowerNotice
          key={`clutch-${clutch.value}`}
          tone="lime"
          title={clutch.value}
          exiting={clutch.exiting}
          reducedMotion={reducedMotion}
          assertive
          titleClassName="text-lg"
        />
      ),
    });
  }

  // CRITICAL-lean warning — persistent while the tower is one shaky drop
  // from falling; pulses (not pops) so it reads as a live alarm.
  if (critical) {
    notices.push({
      key: 'critical',
      priority: NOTICE_PRIORITY.critical,
      node: (
        <div
          key="critical"
          className={`flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-orange px-3 py-1.5 font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard ${reducedMotion ? '' : 'animate-pulse'}`}
          aria-live="assertive"
          role="status"
        >
          ⚠ {t('wordTower.clutch.critical')}
        </div>
      ),
    });
  }

  // New daily best — the self-comparison routine beat. Gold = record.
  if (newBest.value) {
    notices.push({
      key: `newBest-${newBest.value}`,
      priority: NOTICE_PRIORITY.newBest,
      node: (
        <TowerNotice
          key={`newBest-${newBest.value}`}
          tone="yellow"
          title={<>🏆 {newBest.value}</>}
          exiting={newBest.exiting}
          reducedMotion={reducedMotion}
        />
      ),
    });
  }

  // NEW ZONE banner — the headline of entering a new biome.
  if (zone.value) {
    notices.push({
      key: `zone-${zone.value}`,
      priority: NOTICE_PRIORITY.zone,
      node: (
        <TowerNotice
          key={`zone-${zone.value}`}
          tone="cyan"
          kicker={t('wordTower.zone.entered')}
          title={zone.value}
          exiting={zone.exiting}
          reducedMotion={reducedMotion}
        />
      ),
    });
  }

  // "You actually got coins" reveal — the granted amount + rarity, right
  // under the zone/achievement banner that usually pays it.
  if (reward) {
    notices.push({
      key: `reward-${reward.key}`,
      priority: NOTICE_PRIORITY.reward,
      node: <WordTowerRewardReveal key={`reward-${reward.key}`} reward={reward} t={t} language={language} reducedMotion={reducedMotion} />,
    });
  }

  // Wrecking-ball EARN toasts — surfaced here (not beside the rail chip)
  // so the "new zone → coins + wrecking ball" combo stacks as one beat.
  if (sabEarned != null) {
    notices.push({
      key: `sab-${sabEarned}`,
      priority: NOTICE_PRIORITY.sabEarned,
      node: (
        <TowerNotice
          key={`sab-${sabEarned}`}
          tone="yellow"
          title={<><span aria-hidden>🎯</span> {t('wordTower.sabotage.earned')}</>}
          detail={t('wordTower.sabotage.earnedHint', { n: sabEarned })}
          reducedMotion={reducedMotion}
          titleClassName="normal-case text-sm tracking-normal"
        />
      ),
    });
  }
  if (sabAdEarned) {
    notices.push({
      key: 'sab-ad',
      priority: NOTICE_PRIORITY.sabAdEarned,
      node: (
        <TowerNotice
          key="sab-ad"
          tone="cyan"
          title={t('wordTower.sabotage.adEarned')}
          reducedMotion={reducedMotion}
          titleClassName="normal-case text-sm tracking-normal"
        />
      ),
    });
  }

  // NEW SKIN UNLOCKED — variable-reward beat at a skin's height milestone.
  if (skinUnlock.value) {
    const unlocked = skinUnlock.value;
    notices.push({
      key: `skin-${unlocked.id}`,
      priority: NOTICE_PRIORITY.skinUnlock,
      node: (
        <TowerNotice
          key={`skin-${unlocked.id}`}
          tone="yellow"
          kicker={t('wordTower.skin.unlockedToast')}
          title={
            <span className="flex items-center gap-2">
              <span className="flex overflow-hidden rounded-neo border-neo border-black" aria-hidden>
                <span className="h-5 w-2.5" style={{ background: `#${unlocked.palette.city.toString(16).padStart(6, '0')}` }} />
                <span className="h-5 w-2.5" style={{ background: `#${unlocked.palette.galaxy.toString(16).padStart(6, '0')}` }} />
              </span>
              {t(unlocked.nameKey)}
            </span>
          }
          exiting={skinUnlock.exiting}
          reducedMotion={reducedMotion}
        />
      ),
    });
  }

  // Surprise pop — the variable-reward beat. Gold = lucky hit.
  if (surprise.value) {
    const surpriseFx = surprise.value;
    const meta = TOWER_SURPRISE_META[surpriseFx.s.event];
    notices.push({
      key: `surprise-${surpriseFx.key}`,
      priority: NOTICE_PRIORITY.surprise,
      node: (
        <TowerNotice
          key={surpriseFx.key}
          tone="yellow"
          title={meta ? <><span aria-hidden>{meta.emoji}</span> {t(`wordTower.surprise.${meta.key}`)}</> : null}
          detail={
            surpriseFx.s.event === 'updraft'
              // Updraft pays out on the NEXT word — surface the PROMISE
              // explicitly so the reward isn't hollow.
              ? <span className="tabular-nums">{t('wordTower.surprise.nextWord')} ×{UPDRAFT_MULT}</span>
              : (surpriseFx.s.bonusMeters > 0 || surpriseFx.s.bonusScrambles > 0)
                ? (
                  <span dir="ltr" className="tabular-nums">
                    {surpriseFx.s.bonusMeters > 0 && `+${Math.round(surpriseFx.s.bonusMeters)}m`}
                    {surpriseFx.s.bonusMeters > 0 && surpriseFx.s.bonusScrambles > 0 && ' · '}
                    {surpriseFx.s.bonusScrambles > 0 && `+${surpriseFx.s.bonusScrambles}🔀`}
                  </span>
                )
                : undefined
          }
          exiting={surprise.exiting}
          reducedMotion={reducedMotion}
          titleClassName="text-xl"
        />
      ),
    });
  }

  // Combo-milestone fanfare — flame-orange "×5 ON FIRE!".
  if (combo.value) {
    const comboFx = combo.value;
    notices.push({
      key: `combo-${comboFx.key}`,
      priority: NOTICE_PRIORITY.combo,
      node: (
        <TowerNotice
          key={comboFx.key}
          tone="orange"
          title={<>🔥 {t(comboFx.m.labelKey)} <span className="tabular-nums">×{comboFx.m.combo}</span></>}
          exiting={combo.exiting}
          reducedMotion={reducedMotion}
          titleClassName="text-lg"
        />
      ),
    });
  }

  // Witty milestone toast.
  if (milestone.value) {
    notices.push({
      key: `milestone-${milestone.value}`,
      priority: NOTICE_PRIORITY.milestone,
      node: (
        <TowerNotice
          key={`milestone-${milestone.value}`}
          tone="purple"
          title={milestone.value}
          exiting={milestone.exiting}
          reducedMotion={reducedMotion}
          titleClassName="normal-case text-sm tracking-normal"
        />
      ),
    });
  }

  // Calm landmark flyby — cosy cream so it reads scenic, not celebratory.
  if (landmark.value) {
    notices.push({
      key: `landmark-${landmark.value}`,
      priority: NOTICE_PRIORITY.landmark,
      node: (
        <TowerNotice
          key={`landmark-${landmark.value}`}
          tone="cream"
          title={landmark.value}
          exiting={landmark.exiting}
          reducedMotion={reducedMotion}
          titleClassName="normal-case text-sm tracking-normal"
        />
      ),
    });
  }

  // Achievement unlock.
  if (ach.value) {
    const achToast = ach.value;
    notices.push({
      key: `ach-${achToast.id}`,
      priority: NOTICE_PRIORITY.ach,
      node: (
        <TowerNotice
          key={achToast.id}
          tone="yellow"
          kicker={t('wordTower.ach.unlocked')}
          title={<>{achToast.icon} {t(achToast.nameKey)}</>}
          exiting={ach.exiting}
          reducedMotion={reducedMotion}
          titleClassName="normal-case text-sm tracking-normal"
        />
      ),
    });
  }

  // Wreck Report — a rival raided you while away; the hit has already been
  // folded in + you were handed a compensation scramble.
  if (wreckReport) {
    notices.push({
      key: `wreck-${wreckReport.names.join('-')}-${wreckReport.floors}`,
      priority: NOTICE_PRIORITY.wreckReport,
      node: (
        <TowerNotice
          key={`wreck-${wreckReport.names.join('-')}-${wreckReport.floors}`}
          tone="pink"
          title={<><span aria-hidden>🧨</span> {t('wordTower.wreck.reportTitle')}</>}
          detail={t('wordTower.wreck.reportBody', {
            name: wreckReport.names[0] ?? t('wordTower.wreck.defaultName'),
            floors: wreckReport.floors,
          })}
          reducedMotion={reducedMotion}
          titleClassName="normal-case"
        />
      ),
    });
  }

  // Next-zone tease — quiet anticipation chip in the approach window.
  if (tease) {
    notices.push({
      key: `tease-${tease.nextBiomeId}`,
      priority: NOTICE_PRIORITY.tease,
      node: (
        <div
          key={`tease-${tease.nextBiomeId}`}
          className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-navy/95 px-2 py-1 font-neo-body text-[11px] font-bold text-neo-cyan"
          aria-live="polite"
          role="status"
        >
          <ChevronsUp className="h-3 w-3" />
          {t('wordTower.zone.next', { zone: t(`wordTower.biome.${tease.nextBiomeId}`), m: Math.ceil(tease.metersToNext) })}
        </div>
      ),
    });
  }

  // Stable sort by priority so the most important beats render first.
  notices.sort((a, b) => a.priority - b.priority);
  const visible = notices.slice(0, MAX_NOTICES);

  return (
    <div
      data-testid="wt-notice-column"
      className="pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center gap-1.5 overflow-hidden px-3"
      style={{
        top: noticeTopPx ?? '8.75rem',
        maxHeight: noticeMaxHeightPx ?? undefined,
      }}
    >
      {visible.map(({ key, node }) => (
        <Fragment key={key}>{node}</Fragment>
      ))}
    </div>
  );
}
