'use client';

/**
 * Cleared a level mid-run: stamp + stars, coins burst into the gold counter
 * and count up, then the chest (tap to open) hands out its loot. The button
 * leads into the next level's draft.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Map as MapIcon, ChevronRight } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { RunResult } from '../useAdventureRun';
import { levelLoot } from './runSummary';
import { ResultShell, Stamp, primaryBtn, squareBtn } from './ResultShell';
import GoldCounter from './GoldCounter';
import CoinBurst from './CoinBurst';
import ChestOpen from './ChestOpen';
import RelicBar from './RelicBar';
import LevelUpBurst from './LevelUpBurst';
import { cn } from '@/lib/utils';

interface Props {
  result: RunResult;
  run: PublicRun | null;
  onNext: () => void;
  onMap: () => void;
}

export default function LevelCleared({ result, run, onNext, onMap }: Props) {
  const { t } = useLanguageSafe();
  const { playVictorySound, playCoinCollectSound, playCoinCascadeSound } = useSoundEffects();
  const reduce = useReducedMotion();
  const loot = levelLoot(run, result);
  const startGold = run?.gold ?? 0;
  const endGold = result.nextRun?.gold ?? startGold;
  const coinFrom = useRef<HTMLDivElement>(null);
  const coinTo = useRef<HTMLSpanElement>(null);
  const [burst, setBurst] = useState(false);
  const [counted, setCounted] = useState(false);
  const [opened, setOpened] = useState(false);
  const [burstDone, setBurstDone] = useState(false);
  // Beat 1: the LEVEL UP! payoff owns the screen. Beat 2: stars, coins, chest.
  const [leveled, setLeveled] = useState(false);
  const after = result.nextRun ?? run;
  const clearedRun = after ? { ...after, step: run?.step ?? Math.max(1, after.step - 1) } : null;

  useEffect(() => {
    if (!leveled) return;
    playVictorySound?.();
    const id = setTimeout(() => { setBurst(true); playCoinCascadeSound?.(); }, reduce ? 0 : 650);
    return () => clearTimeout(id);
  }, [leveled, playVictorySound, playCoinCascadeSound, reduce]);

  const coins = Math.min(12, Math.max(4, Math.round(loot.gold / 3)));
  const hasChest = loot.gold > 0 || loot.potions.length > 0 || loot.items.length > 0;

  if (!leveled) {
    return (
      <ResultShell>
        <LevelUpBurst run={clearedRun} stars={result.stars} gold={loot.gold} onDone={() => setLeveled(true)} />
      </ResultShell>
    );
  }

  return (
    <ResultShell>
      <div className="flex items-center justify-between gap-2 pe-11">
        <RelicBar relics={run?.relics ?? []} className="min-w-0 flex-1" />
        <GoldCounter value={counted ? endGold : startGold} from={startGold} anchorRef={coinTo} size="lg" durationMs={700} />
      </div>

      <div className="mt-6 text-center">
        <Stamp className="bg-neo-lime">{t('adventurePlay.cleared')}</Stamp>
      </div>

      <div ref={coinFrom} className="mt-5 flex justify-center gap-2" aria-label={t('adventurePlay.starsEarned', { stars: result.stars })}>
        {[1, 2, 3].map((n) => (
          <motion.span key={n}
            initial={reduce ? false : { scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.25 + n * 0.12 }}>
            <Star className={cn('h-14 w-14 stroke-black stroke-[2.5]', n <= result.stars ? 'fill-neo-yellow' : 'fill-white/10', n === 2 && '-mt-3')} />
          </motion.span>
        ))}
      </div>
      <div className="mt-2 text-center font-neo-display text-lg font-bold tabular-nums opacity-90">
        {t('adventurePlay.score')} {result.score} · {t('adventurePlay.words')} {result.validWords.length}
      </div>

      <div className="flex flex-1 items-center justify-center">
        {hasChest && counted && (
          <motion.div initial={reduce ? false : { y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
            <ChestOpen loot={loot} onOpened={() => setOpened(true)} />
          </motion.div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onMap} aria-label={t('adventurePlay.backToMap')} className={squareBtn}>
          <MapIcon className="h-5 w-5" />
        </button>
        <button type="button" onClick={onNext} disabled={hasChest && !opened && !reduce} data-testid="loot-continue"
          className={cn(primaryBtn, 'bg-neo-lime')}>
          {t('adventurePlay.loot.continueToDraft')} <ChevronRight className="h-5 w-5 rtl:rotate-180" />
        </button>
      </div>

      {burst && !burstDone && (
        <CoinBurst fromRef={coinFrom} toRef={coinTo} count={coins}
          onLand={(i) => { if (i % 3 === 0) playCoinCollectSound?.(); if (i === 0) setCounted(true); }}
          onDone={() => { setCounted(true); setBurstDone(true); }} />
      )}
    </ResultShell>
  );
}
