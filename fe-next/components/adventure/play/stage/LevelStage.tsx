'use client';

/**
 * The stage above the board: enemy/boss fight for combat levels, star track otherwise.
 * Owns everything the player fights or races against.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getBossTaunt } from '@/lib/adventure/bossConfig';
import { initCombat, type CombatState } from '@/lib/adventure/play/combat';
import { BASE_HP } from '@/lib/adventure/play/relics';
import type { useAdventureRun } from '../useAdventureRun';
import type { HitEvent } from '../events';
import { cn } from '@/lib/utils';
import EnemyStage from './EnemyStage';
import PlayerBar from './PlayerBar';
import CombatOverlay from './CombatOverlay';
import AttackFlight from './AttackFlight';
import { useCombatJuice } from './useCombatJuice';

type Run = ReturnType<typeof useAdventureRun>;

interface Props {
  world: number;
  run: Run;
  lastHit: HitEvent | null;
  popups: Array<{ id: number; pts: number }>;
  /** Combat finale over (kill banner / defeat beat dismissed). */
  onFinaleDone?: () => void;
}

/** Elite + boss: enemy stage, player hearts + shield, full-screen moments. */
function CombatStage({ world, run, lastHit, onFinaleDone }: { world: number; run: Run; lastHit: HitEvent | null; onFinaleDone?: () => void }) {
  const reduce = useReducedMotion();
  const lvl = run.lvl!;
  const isBoss = lvl.kind === 'boss';
  // Before the fight starts (intro card up), show the enemy at full health.
  const preview = useMemo<CombatState>(() => initCombat({
    enemyId: lvl.enemyId ?? `${lvl.kind}-w${world}`, world, enemyHp: lvl.bossHp,
    hp: run.run?.hp ?? BASE_HP, maxHp: run.run?.maxHp ?? BASE_HP, relics: run.run?.relics ?? [], size: run.grid.length || 4, seed: 'preview',
  }), [lvl, world, run.run, run.grid.length]);
  const combat = run.combat ?? preview;
  const juice = useCombatJuice(run.combatFx ?? []);
  const [taunt, setTaunt] = useState<string | null>(() => (isBoss ? getBossTaunt(world, 'onStart') : null));

  useEffect(() => {
    if (!isBoss || !juice.status) return;
    const k = juice.status.kind;
    if (k === 'interrupt') setTaunt(getBossTaunt(world, 'onGoodWord'));
    else if (k === 'hit' || k === 'drain' || k === 'freeze' || k === 'curse' || k === 'shuffle') setTaunt(getBossTaunt(world, 'onMechanic'));
  }, [isBoss, juice.status, world]);
  const shake = useAnimationControls();
  useEffect(() => {
    if (juice.hurtPulse && !reduce) void shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } });
  }, [juice.hurtPulse, reduce, shake]);
  useEffect(() => {
    if (!taunt) return;
    const id = setTimeout(() => setTaunt(null), 4000);
    return () => clearTimeout(id);
  }, [taunt]);

  return (
    <motion.div className="w-full" animate={shake}>
      <EnemyStage world={world} isBoss={isBoss} combat={combat} juice={juice} taunt={taunt}
        lastHit={lastHit} fxFeed={run.combatFx ?? []} gold={run.run?.gold ?? 0} trophy={run.trophy ?? null} />
      <PlayerBar combat={combat} dispatchCombat={run.dispatchCombat} playing={run.phase === 'playing' && !!run.combat} />
      {run.combat && <AttackFlight combat={run.combat} status={juice.status} />}
      {run.combat && (
        <CombatOverlay world={world} isBoss={isBoss} combat={run.combat} hurtPulse={juice.hurtPulse} phasePulse={juice.phasePulse}
          victoryLine={isBoss ? getBossTaunt(world, 'onVictory') : null} defeatLine={isBoss ? getBossTaunt(world, 'onDefeat') : null}
          trophy={run.trophy} bossTrophy={!!run.result?.rewards?.some((r) => r.startsWith('boss-trophy-'))}
          bossStars={run.result?.won ? run.result.stars : 0} onFinaleDone={onFinaleDone} />
      )}
    </motion.div>
  );
}

export default function LevelStage({ world, run, lastHit, popups, onFinaleDone }: Props) {
  const { t } = useLanguageSafe();
  const lvl = run.lvl;
  if (!lvl) return null;
  const top = lvl.stars[2] || 1;

  if (lvl.kind === 'elite' || lvl.kind === 'boss') return <CombatStage world={world} run={run} lastHit={lastHit} onFinaleDone={onFinaleDone} />;
  return (
    <div className="w-full rounded-xl border-[3px] border-black bg-black/60 px-3 pt-1.5 pb-3 shadow-[3px_3px_0_#000]">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-bold uppercase tracking-wide opacity-80">{t('adventurePlay.score')}</span>
        <span className="relative font-neo-display font-bold text-2xl tabular-nums">
          {run.score}
          {popups.map((p) => (
            <span key={p.id} className="absolute -top-2 end-0 translate-x-full ps-1 text-neo-lime text-base animate-[adv-float-up_0.8s_ease-out_forwards]">+{p.pts}</span>
          ))}
        </span>
      </div>
      <div className="relative mt-1 h-5 rounded-full border-[3px] border-black bg-black/60">
        <div className="h-full rounded-full bg-neo-lime transition-[width] duration-300" style={{ width: `${Math.min(100, (run.score / top) * 100)}%` }} />
        {lvl.stars.map((s, i) => (
          <Star key={i} className={cn('absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-6 h-6 stroke-black stroke-[2.5]', run.score >= s ? 'fill-neo-yellow' : 'fill-[#2a2a4e]')}
            style={{ insetInlineStart: `${(s / top) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}
