'use client';

/**
 * The player's side of the fight: HP as hearts (a lost heart shatters) and the
 * SHIELD button — charges earned by long words, raised by a tap right before a
 * hit lands. Glows when an attack is winding up and a charge is ready. The
 * hit banner itself is AttackFlight's (it lands with the shot).
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Heart, Shield } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { MAX_SHIELDS, type CombatEvent, type CombatState } from '@/lib/adventure/play/combat';
import { cn } from '@/lib/utils';
import { heartStates, type StatusId } from './combatView';

/** Statuses that land on the player (stamped over the hearts, Bookworm-style). */
export const PLAYER_STATUS: readonly StatusId[] = ['hit', 'drain', 'curse', 'freeze', 'shuffle', 'death', 'revive', 'heal', 'blocked'];

interface Props {
  combat: CombatState;
  dispatchCombat: (ev: CombatEvent) => void;
  playing: boolean;
}

export default function PlayerBar({ combat, dispatchCombat, playing }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const prevHp = useRef(combat.hp);
  const [broken, setBroken] = useState<{ id: number; from: number; to: number } | null>(null);

  useEffect(() => {
    if (combat.hp < prevHp.current) setBroken({ id: Date.now(), from: combat.hp, to: prevHp.current });
    prevHp.current = combat.hp;
  }, [combat.hp]);
  useEffect(() => {
    if (!broken) return;
    const id = setTimeout(() => setBroken(null), 700);
    return () => clearTimeout(id);
  }, [broken]);

  const ready = combat.shields > 0 && !combat.guard;
  const urgent = ready && !!combat.telegraph && combat.telegraph.attack.damage > 0;
  const earnLen = combat.script.rules?.shieldLen ?? 5;
  const hearts = heartStates(combat.hp, combat.maxHp);

  return (
    <div className="mt-2 flex items-stretch gap-2" data-testid="player-bar">
      <div data-player-hearts className="relative flex-1 min-w-0 flex items-center gap-0.5 rounded-xl border-[3px] border-black bg-black/70 px-2 py-1 shadow-[3px_3px_0_#000]"
        role="meter" aria-label={t('adventurePlay.combat.yourHp')} aria-valuemin={0} aria-valuemax={combat.maxHp} aria-valuenow={combat.hp}>
        {hearts.map((h, i) => {
          const shattering = broken && i >= broken.from && i < broken.to;
          return (
            <span key={i} className="relative w-7 h-7 grid place-items-center">
              <Heart className={cn('w-6 h-6 stroke-black stroke-[2.5]', h === 'full' ? 'fill-neo-pink' : 'fill-[#2a2a4e]')} />
              <AnimatePresence>
                {shattering && !reduce && (
                  <motion.span key={broken.id} className="absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }}>
                    <motion.span className="absolute inset-0 grid place-items-center [clip-path:polygon(0_0,55%_0,40%_100%,0_100%)]"
                      initial={{ x: 0, y: 0, rotate: 0 }} animate={{ x: -10, y: 14, rotate: -35 }} transition={{ duration: 0.6 }}>
                      <Heart className="w-6 h-6 fill-neo-pink stroke-black stroke-[2.5]" />
                    </motion.span>
                    <motion.span className="absolute inset-0 grid place-items-center [clip-path:polygon(55%_0,100%_0,100%_100%,40%_100%)]"
                      initial={{ x: 0, y: 0, rotate: 0 }} animate={{ x: 10, y: 14, rotate: 35 }} transition={{ duration: 0.6 }}>
                      <Heart className="w-6 h-6 fill-neo-pink stroke-black stroke-[2.5]" />
                    </motion.span>
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          );
        })}
        {combat.guard && (
          // eslint-disable-next-line @next/next/no-img-element -- the raised shield wraps the player's hearts
          <img src="/images/adventure/fx/shield-bubble.webp" alt="" aria-hidden
            className="pointer-events-none absolute -top-3 -end-2 w-12 h-12 object-contain drop-shadow-[2px_2px_0_#000] animate-pulse" />
        )}
      </div>

      <motion.button
        type="button"
        onClick={() => dispatchCombat({ type: 'tapShield' })}
        disabled={!playing || !ready}
        aria-label={t('adventurePlay.combat.shieldAria', { count: combat.shields })}
        animate={urgent && !reduce ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={urgent ? { duration: 0.5, repeat: Infinity } : { duration: 0.2 }}
        className={cn(
          'relative shrink-0 min-w-[7.5rem] rounded-xl border-[3px] border-black px-2 py-1 text-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none',
          combat.guard ? 'bg-neo-lime' : ready ? 'bg-neo-cyan' : 'bg-[#2a3358] text-neo-cream/60 cursor-not-allowed',
          urgent && 'shadow-[0_0_0_3px_#22d3ee,3px_3px_0_#000]',
        )}
      >
        <span className="flex items-center justify-center gap-1 font-neo-display font-black uppercase text-sm leading-none">
          <Shield className={cn('w-4 h-4', ready || combat.guard ? 'fill-white' : '')} strokeWidth={2.75} />
          {combat.guard ? t('adventurePlay.combat.shieldUp') : urgent ? t('adventurePlay.combat.raiseShield') : t('adventurePlay.combat.shieldLabel')}
        </span>
        <span className={cn('mt-1 flex items-center justify-center gap-1', combat.guard && 'invisible')}>
          {Array.from({ length: MAX_SHIELDS }, (_, i) => (
            <span key={i} className={cn('w-3 h-3 rounded-full border-2 border-black', i < combat.shields ? 'bg-white' : 'bg-black/40')} />
          ))}
        </span>
        {/* Guard window: drains until the shield drops. */}
        {combat.guard && (
          <span className="absolute inset-x-1.5 bottom-1 h-1.5 rounded-full bg-black/40 overflow-hidden" aria-hidden>
            <motion.span key={combat.guardUntil} className="block h-full bg-black origin-left rtl:origin-right"
              initial={{ scaleX: 1 }} animate={{ scaleX: 0 }}
              transition={{ duration: Math.max(0, combat.guardUntil - combat.now) / 1000, ease: 'linear' }} />
          </span>
        )}
        {!combat.shields && !combat.guard && (
          <span className="block text-[9px] font-bold leading-tight mt-0.5">{t('adventurePlay.combat.shieldEarn', { count: earnLen })}</span>
        )}
      </motion.button>
    </div>
  );
}
