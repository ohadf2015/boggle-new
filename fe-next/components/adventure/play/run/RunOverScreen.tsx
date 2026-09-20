'use client';

/** Death / failed level: the run ends. Recap, then a fresh run from level 1 (stars + collection kept). */
import { useEffect } from 'react';
import { RotateCcw, Map as MapIcon } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { RunResult } from '../useAdventureRun';
import { runSummary, type RunSummary } from './runSummary';
import { ResultShell, Stamp, primaryBtn, squareBtn } from './ResultShell';
import RunStats from './RunStats';
import { cn } from '@/lib/utils';

interface Props {
  result: RunResult;
  run: PublicRun | null;
  /** Best word across the whole run (falls back to this level's). */
  runBest?: RunSummary['bestWord'];
  onRestartRun: () => void;
  onMap: () => void;
}

export default function RunOverScreen({ result, run, runBest, onRestartRun, onMap }: Props) {
  const { t } = useLanguageSafe();
  const { playDefeatSound } = useSoundEffects();
  useEffect(() => { playDefeatSound?.(); }, [playDefeatSound]);
  const base = runSummary(run, result);
  const summary = { ...base, bestWord: runBest ?? base.bestWord };

  return (
    <ResultShell tone="dusk">
      <div className="mt-4 text-center">
        <Stamp className="bg-neo-pink">{t('adventurePlay.loot.runOver')}</Stamp>
        <p className="mx-auto mt-3 max-w-xs text-sm font-semibold opacity-85">{t('adventurePlay.loot.runOverSub')}</p>
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <RunStats summary={summary} fell />
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onMap} aria-label={t('adventurePlay.backToMap')} className={squareBtn}>
          <MapIcon className="h-5 w-5" />
        </button>
        <button type="button" onClick={onRestartRun} data-testid="run-restart" className={cn(primaryBtn, 'bg-neo-cyan')}>
          <RotateCcw className="h-5 w-5" /> {t('adventurePlay.loot.newRun')}
        </button>
      </div>
    </ResultShell>
  );
}
