'use client';

/** Death / failed level: the run ends. Recap, then a fresh run on a fresh act map (stars + collection kept). */
import { useEffect } from 'react';
import { RotateCcw, Map as MapIcon } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { RunMap } from '@/lib/adventure/play/runMap';
import type { RunResult } from '../useAdventureRun';
import { resultRunStep, runSummary, type RunSummary } from './runSummary';
import { ResultShell, Stamp, primaryBtn, squareBtn } from './ResultShell';
import RunStats from './RunStats';
import RunLedger from './RunLedger';
import EcosystemRewards from './EcosystemRewards';
import { cn } from '@/lib/utils';

interface Props {
  result: RunResult;
  run: PublicRun | null;
  /** Best word across the whole run (falls back to this level's). */
  runBest?: RunSummary['bestWord'];
  /** The act map walked — the ledger reads its node kinds off `run.path`. */
  map?: RunMap | null;
  /** Words found across the whole run. */
  runWords?: number;
  onRestartRun: () => void;
  onMap: () => void;
}

export default function RunOverScreen({ result, run, runBest, map = null, runWords = 0, onRestartRun, onMap }: Props) {
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
      {/* my-auto, not justify-center: a short recap sits in the MIDDLE of the phone
          instead of leaving a third of the screen empty under it, and a long one
          still scrolls from the top instead of being clipped. */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="my-auto w-full">
          {/* The same itemized ledger the win screen shows, pip row and all — a
              death is scored too, so a run that got further reads as a better
              run. */}
          <RunLedger
            pips={{ cleared: summary.levelsCleared, fell: true }}
            delay={0.4}
            map={map}
            path={run?.path ?? []}
            won={false}
            words={runWords}
            bestWord={summary.bestWord}
            gold={summary.gold}
            relics={summary.relics}
            hp={0}
            maxHp={run?.maxHp ?? 0}
          />
          <div className="mt-2.5"><RunStats summary={summary} fell variant="relics"
            runCtx={{ world: run?.w, step: resultRunStep(run, false) }} /></div>
          {/* A death still pays: milestone coins + the banked purse land in the wallet. */}
          <EcosystemRewards result={result} delay={0.9} className="mt-2.5" />
        </div>
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
