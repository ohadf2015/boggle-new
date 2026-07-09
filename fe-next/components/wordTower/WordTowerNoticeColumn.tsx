'use client';

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

  return (
    <div
      data-testid="wt-notice-column"
      className="pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center gap-1.5 overflow-hidden px-3"
      style={{
        top: noticeTopPx ?? '8.75rem',
        maxHeight: noticeMaxHeightPx ?? undefined,
      }}
    >
      {/* Unmistakable DROP VERDICT — the single big beat that answers "did I
          nail it?". Band-coloured headline (PERFECT/NICE/SLOPPY/MISSED) + the
          metres actually gained. Leads the column so it can't be missed AND
          can't collide with the celebration stack below it. */}
      {verdict.value && (() => { const v = verdict.value; return (
        <div
          key={v.key}
          className={`pointer-events-none flex flex-col items-center gap-1.5 ${fxClass(verdict.exiting, '')}`}
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
            <div dir="ltr" className="rounded-neo border-neo border-black bg-neo-navy/85 px-3 py-1 font-neo-display text-lg font-black text-neo-white shadow-hard backdrop-blur-sm">
              {v.v.gainText}
            </div>
          )}
        </div>
      ); })()}

      {/* Hazard "tower ruined" — bold + red so the loss is unmissable. */}
      {hazard.value && (
        <TowerNotice tone="red" title={hazard.value} exiting={hazard.exiting} reducedMotion={reducedMotion} assertive shake titleClassName="normal-case" />
      )}

      {/* CLUTCH SAVE — the do-or-die payoff. Lime = triumph. */}
      {clutch.value && (
        <TowerNotice tone="lime" title={clutch.value} exiting={clutch.exiting} reducedMotion={reducedMotion} assertive titleClassName="text-lg" />
      )}

      {/* CRITICAL-lean warning — persistent while the tower is one shaky drop
          from falling; pulses (not pops) so it reads as a live alarm. */}
      {critical && (
        <div
          className={`flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-orange px-3 py-1.5 font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard ${reducedMotion ? '' : 'animate-pulse'}`}
          aria-live="assertive"
        >
          ⚠ {t('wordTower.clutch.critical')}
        </div>
      )}

      {/* New daily best — the self-comparison routine beat. Gold = record. */}
      {newBest.value && (
        <TowerNotice tone="yellow" title={<>🏆 {newBest.value}</>} exiting={newBest.exiting} reducedMotion={reducedMotion} />
      )}

      {/* NEW ZONE banner — the headline of entering a new biome. */}
      {zone.value && (
        <TowerNotice tone="cyan" kicker={t('wordTower.zone.entered')} title={zone.value} exiting={zone.exiting} reducedMotion={reducedMotion} />
      )}

      {/* Next-zone tease — quiet anticipation chip in the approach window. */}
      {tease && (
        <div
          className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-navy/75 px-2 py-1 font-neo-body text-[11px] font-bold text-neo-cyan backdrop-blur-sm"
          aria-live="polite"
        >
          <ChevronsUp className="h-3 w-3" />
          {t('wordTower.zone.next', { zone: t(`wordTower.biome.${tease.nextBiomeId}`), m: Math.ceil(tease.metersToNext) })}
        </div>
      )}

      {/* "You actually got coins" reveal — the granted amount + rarity, right
          under the zone/achievement banner that usually pays it. */}
      <WordTowerRewardReveal reward={reward} t={t} language={language} reducedMotion={reducedMotion} />

      {/* Wrecking-ball EARN toasts — surfaced here (not beside the rail chip)
          so the "new zone → coins + wrecking ball" combo stacks as one beat. */}
      {sabEarned != null && (
        <TowerNotice
          tone="yellow"
          title={<><span aria-hidden>🎯</span> {t('wordTower.sabotage.earned')}</>}
          detail={t('wordTower.sabotage.earnedHint', { n: sabEarned })}
          reducedMotion={reducedMotion}
          titleClassName="normal-case text-sm tracking-normal"
        />
      )}
      {sabAdEarned && (
        <TowerNotice
          tone="cyan"
          title={t('wordTower.sabotage.adEarned')}
          reducedMotion={reducedMotion}
          titleClassName="normal-case text-sm tracking-normal"
        />
      )}

      {/* NEW SKIN UNLOCKED — variable-reward beat at a skin's height milestone. */}
      {skinUnlock.value && (() => { const unlocked = skinUnlock.value; return (
        <TowerNotice
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
      ); })()}

      {/* Surprise pop — the variable-reward beat. Gold = lucky hit. */}
      {surprise.value && (() => {
        const surpriseFx = surprise.value;
        const meta = TOWER_SURPRISE_META[surpriseFx.s.event];
        return (
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
        );
      })()}

      {/* Combo-milestone fanfare — flame-orange "×5 ON FIRE!". */}
      {combo.value && (() => { const comboFx = combo.value; return (
        <TowerNotice
          key={comboFx.key}
          tone="orange"
          title={<>🔥 {t(comboFx.m.labelKey)} <span className="tabular-nums">×{comboFx.m.combo}</span></>}
          exiting={combo.exiting}
          reducedMotion={reducedMotion}
          titleClassName="text-lg"
        />
      ); })()}

      {/* Witty milestone toast. */}
      {milestone.value && (
        <TowerNotice tone="purple" title={milestone.value} exiting={milestone.exiting} reducedMotion={reducedMotion} titleClassName="normal-case text-sm tracking-normal" />
      )}

      {/* Calm landmark flyby — cosy cream so it reads scenic, not celebratory. */}
      {landmark.value && (
        <TowerNotice tone="cream" title={landmark.value} exiting={landmark.exiting} reducedMotion={reducedMotion} titleClassName="normal-case text-sm tracking-normal" />
      )}

      {/* Achievement unlock. */}
      {ach.value && (() => { const achToast = ach.value; return (
        <TowerNotice
          tone="yellow"
          kicker={t('wordTower.ach.unlocked')}
          title={<>{achToast.icon} {t(achToast.nameKey)}</>}
          exiting={ach.exiting}
          reducedMotion={reducedMotion}
          titleClassName="normal-case text-sm tracking-normal"
        />
      ); })()}

      {/* Wreck Report — a rival raided you while away; the hit has already been
          folded in + you were handed a compensation scramble. */}
      {wreckReport && (
        <TowerNotice
          tone="pink"
          title={<><span aria-hidden>🧨</span> {t('wordTower.wreck.reportTitle')}</>}
          detail={t('wordTower.wreck.reportBody', {
            name: wreckReport.names[0] ?? t('wordTower.wreck.defaultName'),
            floors: wreckReport.floors,
          })}
          reducedMotion={reducedMotion}
          titleClassName="normal-case"
        />
      )}
    </div>
  );
}
