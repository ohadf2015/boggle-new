'use client';

/** Boss portrait + HP bar + taunt bubble. Art reacts: idle → hurt flash on hit → enraged → defeated. */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getBossConfig, getBossImagePath, getBossTaunt } from '@/lib/adventure/bossConfig';
import type { BossPhase } from '@/lib/adventure/play/boss';
import { cn } from '@/lib/utils';

interface Props {
  world: number;
  hp: number;
  hpMax: number;
  phase: BossPhase;
  /** Bumps on every word that lands — triggers the hurt frame. */
  hitCount: number;
  /** Bumps on every boss attack — triggers the attack frame + taunt. */
  attackCount: number;
}

export default function BossPanel({ world, hp, hpMax, phase, hitCount, attackCount }: Props) {
  const { t } = useLanguageSafe();
  const boss = getBossConfig(world);
  const [flash, setFlash] = useState<'hurt' | 'attack' | null>(null);
  const [taunt, setTaunt] = useState(() => getBossTaunt(world, 'onStart'));

  useEffect(() => {
    if (!hitCount) return;
    setFlash('hurt');
    if (hitCount % 3 === 0) setTaunt(getBossTaunt(world, 'onGoodWord'));
    const id = setTimeout(() => setFlash(null), 450);
    return () => clearTimeout(id);
  }, [hitCount, world]);

  useEffect(() => {
    if (!attackCount) return;
    setFlash('attack');
    setTaunt(getBossTaunt(world, 'onMechanic'));
    const id = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(id);
  }, [attackCount, world]);

  if (!boss) return null;
  const state = phase === 'defeated' ? 'defeated' : flash ?? (phase === 'enraged' ? 'enraged' : 'idle');
  const pct = Math.max(0, Math.min(100, (hp / hpMax) * 100));

  return (
    <div className="flex items-center gap-3 w-full">
      <div
        className={cn(
          'relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-[3px] border-black bg-[#16213e] shadow-[4px_4px_0_#000] overflow-hidden',
          flash === 'hurt' && 'animate-[adv-shake_0.35s_ease-in-out]',
          phase === 'enraged' && 'border-neo-pink',
        )}
      >
        <Image src={getBossImagePath(world, state)} alt={t(boss.displayName)} fill sizes="96px" className="object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-neo-display font-bold text-neo-cream text-sm sm:text-base truncate">{t(boss.displayName)}</span>
          <span className="font-mono text-xs text-neo-cream/80 tabular-nums">{hp} HP</span>
        </div>
        <div className="mt-1 h-4 rounded-full border-[3px] border-black bg-black/60 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={hpMax} aria-valuenow={hp}>
          <div
            className={cn('h-full transition-[width] duration-300 ease-out', phase === 'enraged' ? 'bg-neo-pink' : 'bg-neo-red')}
            style={{ width: `${pct}%` }}
          />
        </div>
        {taunt && phase !== 'defeated' && (
          <p key={taunt} className="mt-1.5 text-xs sm:text-sm font-semibold text-neo-cream bg-black/55 rounded-lg px-2 py-1 border-2 border-black line-clamp-2">
            {t(taunt, { requirement: t('adventurePlay.longerWords') })}
          </p>
        )}
      </div>
    </div>
  );
}
