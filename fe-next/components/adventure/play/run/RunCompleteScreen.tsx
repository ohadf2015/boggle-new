'use client';

/** Boss down, run won: celebration, the world's trophy skin, run recap. */
import { useEffect } from 'react';
import { ChevronRight, Map as MapIcon } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { WORLD_SKIN_ITEM } from '@/lib/adventure/play/progress';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { RunMap } from '@/lib/adventure/play/runMap';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import BossDefeatFireworks from '@/components/celebration/BossDefeatFireworks';
import type { RunResult } from '../useAdventureRun';
import SkinSwatch from '../SkinSwatch';
import { levelLoot, resultRunStep, runSummary, type RunSummary } from './runSummary';
import { ResultShell, Stamp, primaryBtn, squareBtn } from './ResultShell';
import RunStats from './RunStats';
import RunLedger from './RunLedger';
import EcosystemRewards from './EcosystemRewards';
import BossShareButton from './BossShareButton';
import RewardChips from './RewardChips';
import { cn } from '@/lib/utils';

interface Props {
  world: number;
  result: RunResult;
  run: PublicRun | null;
  /** Best word across the whole run (falls back to this level's). */
  runBest?: RunSummary['bestWord'];
  /** The act map walked — the ledger reads its node kinds off `run.path`. */
  map?: RunMap | null;
  /** Words found across the whole run. */
  runWords?: number;
  /** Hearts left after the boss — `/complete` sends no `nextRun` on a win. */
  hpLeft?: number;
  maxHp?: number;
  hasNext: boolean;
  onNext: () => void;
  onMap: () => void;
  onEquipSkin: (world: number) => void;
}

export default function RunCompleteScreen({ world, result, run, runBest, map = null, runWords = 0, hpLeft, maxHp, hasNext, onNext, onMap, onEquipSkin }: Props) {
  const { t } = useLanguageSafe();
  const { playBossDefeatSound } = useSoundEffects();
  useEffect(() => {
    playBossDefeatSound?.();
    fireVictoryConfetti();
  }, [playBossDefeatSound]);
  const base = runSummary(run, result);
  const summary = { ...base, bestWord: runBest ?? base.bestWord };
  const loot = levelLoot(run, result, WORLD_SKIN_ITEM(world));

  return (
    <ResultShell>
      <BossDefeatFireworks active bossTier={world >= 8 ? 'elite' : world >= 4 ? 'standard' : 'mini'} />
      <div className="relative mt-3 text-center">
        <Stamp className="bg-neo-yellow">{t('adventurePlay.loot.runComplete')}</Stamp>
        <p className="mt-2 text-sm font-semibold opacity-85">{t('adventurePlay.loot.runCompleteSub')}</p>
      </div>

      {/* my-auto on the inner stack, not justify-center on the scroller: a short recap
          sits in the MIDDLE of the phone instead of leaving a third of the screen
          empty under it, and a long one still scrolls from the top. */}
      <div className="relative mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="my-auto w-full">
          {loot.skin && (
            <div className="mb-2.5 rounded-2xl border-[3px] border-black bg-neo-yellow p-3 text-center text-black shadow-[4px_4px_0_#000]">
              <div className="font-neo-display text-lg font-bold">{t('adventurePlay.skinUnlocked')}</div>
              <div className="mt-2 flex justify-center"><SkinSwatch world={world} /></div>
              <button type="button" onClick={() => onEquipSkin(world)}
                className="mt-2 w-full rounded-lg border-[3px] border-black bg-black py-2 font-bold text-neo-yellow active:translate-y-0.5">
                {t('adventurePlay.equipSkin')}
              </button>
            </div>
          )}
          {loot.items.length > 0 && <div className="mb-2.5"><RewardChips loot={{ ...loot, gold: 0, potions: [] }} /></div>}
          {/* Two ledgers, kept apart on purpose: the RUN score below is derived
              on this screen and never leaves it, while the strip above is the
              account's own xp / coins / season points from the server. */}
          <EcosystemRewards result={result} delay={0.9} celebrate className="mb-2.5" />
          {/* How deep the act went, pip by pip — the same row the RUN OVER screen
              shows, so both endings answer "how far did I get?" in one shape
              (Class 3: two screens for one question must not diverge). It rides
              INSIDE the ledger card: `step` is `path.length`, so the pip count
              and the ledger's `nodes` row are the same walk counted once, and
              one card keeps the final score above the action bar at 390px. */}
          <RunLedger
            pips={{ cleared: summary.levelsCleared, fell: false }}
            delay={0.5}
            map={map}
            path={run?.path ?? []}
            won
            words={runWords}
            bestWord={summary.bestWord}
            gold={summary.gold}
            relics={summary.relics}
            hp={hpLeft ?? 0}
            maxHp={maxHp ?? run?.maxHp ?? 0}
          />
          {/* The relic shelf last: the ledger has already counted them, this is
              the art. */}
          <div className="mt-2.5"><RunStats summary={summary} fell={false} variant="relics"
            runCtx={{ world, step: resultRunStep(run, true) }} /></div>
        </div>
      </div>

      <div className="relative mt-3 flex gap-2">
        <button type="button" onClick={onMap} aria-label={t('adventurePlay.backToMap')} className={squareBtn}>
          <MapIcon className="h-5 w-5" />
        </button>
        <BossShareButton world={world} word={summary.bestWord?.word} stars={result.stars} />
        {hasNext ? (
          <button type="button" onClick={onNext} className={cn(primaryBtn, 'bg-neo-lime')}>
            {t('adventurePlay.loot.nextWorld')} <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </button>
        ) : (
          <button type="button" onClick={onMap} className={cn(primaryBtn, 'bg-neo-lime')}>{t('adventurePlay.backToMap')}</button>
        )}
      </div>
    </ResultShell>
  );
}
