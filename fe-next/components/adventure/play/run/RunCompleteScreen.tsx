'use client';

/** Boss down, run won: celebration, the world's trophy skin, run recap. */
import { useEffect } from 'react';
import { ChevronRight, Map as MapIcon } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { WORLD_SKIN_ITEM } from '@/lib/adventure/play/progress';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import BossDefeatFireworks from '@/components/celebration/BossDefeatFireworks';
import type { RunResult } from '../useAdventureRun';
import SkinSwatch from '../SkinSwatch';
import { levelLoot, runSummary, type RunSummary } from './runSummary';
import { ResultShell, Stamp, primaryBtn, squareBtn } from './ResultShell';
import RunStats from './RunStats';
import RewardChips from './RewardChips';
import { cn } from '@/lib/utils';

interface Props {
  world: number;
  result: RunResult;
  run: PublicRun | null;
  /** Best word across the whole run (falls back to this level's). */
  runBest?: RunSummary['bestWord'];
  hasNext: boolean;
  onNext: () => void;
  onMap: () => void;
  onEquipSkin: (world: number) => void;
}

export default function RunCompleteScreen({ world, result, run, runBest, hasNext, onNext, onMap, onEquipSkin }: Props) {
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

      <div className="relative mt-3 min-h-0 flex-1 overflow-y-auto">
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
        <RunStats summary={summary} fell={false} />
      </div>

      <div className="relative mt-3 flex gap-2">
        <button type="button" onClick={onMap} aria-label={t('adventurePlay.backToMap')} className={squareBtn}>
          <MapIcon className="h-5 w-5" />
        </button>
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
