'use client';

/**
 * The attack as a WATCHED EVENT: when the telegraph runs out, the charged shot
 * leaves the enemy's hand (`[data-enemy-anchor]`), arcs across the screen and
 * lands on its target — the hearts for strikes, the board for freeze / hex /
 * scramble — exactly on the reducer's beat. The impact bursts, and only then
 * the hit banner slams over the board ("FROZEN!" + what it cost you),
 * Bookworm's "Petrified! You lose two turns!".
 *
 * Portalled, pointer-events:none — never blocks the board.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { AttackEffect, CombatState } from '@/lib/adventure/play/combat';
import { cn } from '@/lib/utils';
import { EFFECT_COLOR } from './IntentDial';
import { PLAYER_STATUS } from './PlayerBar';
import { TRAVEL_MS, arcPoints, consequence, flightTarget, missileArt, releaseDelay } from './flightMath';
import type { StatusId } from './combatView';

interface Pt { x: number; y: number }
interface Flight { id: number; effect: AttackEffect; from: Pt; to: Pt }

const center = (el: Element | null): Pt | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

const BANNER: Partial<Record<StatusId, string>> = {
  freeze: 'bg-neo-cyan text-black', curse: 'bg-neo-purple text-white', shuffle: 'bg-neo-yellow text-black',
  hit: 'bg-neo-pink text-black', drain: 'bg-neo-pink text-black', blocked: 'bg-neo-lime text-black',
  revive: 'bg-neo-yellow text-black', heal: 'bg-neo-lime text-black',
};
const BANNER_ART: Partial<Record<StatusId, string>> = {
  freeze: '/images/adventure/fx/ice-shard.webp', curse: '/images/adventure/fx/curse-glyph.webp',
  shuffle: '/images/adventure/fx/curse-glyph.webp', hit: '/images/adventure/fx/slash.webp',
  drain: '/images/adventure/fx/slash.webp', blocked: '/images/adventure/fx/shield-bubble.webp',
};

interface Props {
  combat: CombatState;
  status: { id: number; kind: StatusId } | null;
}

export default function AttackFlight({ combat, status }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [impact, setImpact] = useState<{ id: number; at: Pt; color: string } | null>(null);
  const prevHp = useRef(combat.hp);
  const [lost, setLost] = useState(1);
  const tele = combat.telegraph;
  const teleKey = tele?.startedAt ?? null;
  const delay = releaseDelay(combat);
  const delayRef = useRef(delay);
  delayRef.current = delay;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (combat.hp < prevHp.current) setLost(prevHp.current - combat.hp);
    prevHp.current = combat.hp;
  }, [combat.hp]);

  // One release per telegraph, scheduled so the shot lands on the reducer's beat.
  useEffect(() => {
    if (teleKey == null || !tele || reduce) return;
    const effect = tele.attack.effect;
    const target = flightTarget(effect);
    if (!target) return;
    const id = setTimeout(() => {
      const from = center(document.querySelector('[data-enemy-anchor]'));
      const to = center(document.querySelector(target === 'hearts' ? '[data-player-hearts]' : '[data-testid="board-hazards"]'));
      if (from && to) setFlight({ id: teleKey, effect, from, to });
    }, delayRef.current ?? 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the telegraph itself
  }, [teleKey, reduce]);

  // Interrupted / phase break / kill mid-air: the shot fizzles where it is.
  const cancelled = status && (status.kind === 'interrupt' || status.kind === 'phase' || status.kind === 'defeated') ? status.id : null;
  useEffect(() => {
    if (cancelled != null) setFlight(null);
  }, [cancelled]);

  useEffect(() => {
    if (!impact) return;
    const id = setTimeout(() => setImpact(null), 500);
    return () => clearTimeout(id);
  }, [impact]);

  if (!mounted) return null;
  const arc = flight ? arcPoints(flight.from, flight.to) : null;
  const playerHit = status && PLAYER_STATUS.includes(status.kind) && BANNER[status.kind] ? status : null;
  const line = playerHit ? consequence(playerHit.kind, combat, lost) : null;
  const board = playerHit ? document.querySelector('[data-testid="board-hazards"]')?.getBoundingClientRect() : null;
  // Freeze / curse: the banner must not sit on the very tiles you now have to tap — lift it above the board.
  const onTiles = playerHit?.kind === 'freeze' || playerHit?.kind === 'curse';

  return createPortal(
    <div className="fixed inset-0 z-[58] pointer-events-none overflow-hidden" aria-hidden={!playerHit}>
      <AnimatePresence>
        {flight && arc && (
          <motion.div key={flight.id} className="absolute left-0 top-0"
            initial={{ x: arc.xs[0], y: arc.ys[0], scale: 0.9 }}
            animate={{ x: arc.xs, y: arc.ys, scale: [0.9, 1.3, 1.6] }}
            exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.15 } }}
            transition={{ duration: TRAVEL_MS / 1000, ease: 'linear' }}
            onAnimationComplete={() => {
              setImpact({ id: flight.id, at: flight.to, color: EFFECT_COLOR[flight.effect] });
              setFlight(null);
            }}
            data-testid="attack-missile">
            {/* Hot core + hard outline so the shot reads at a glance, even in a still. */}
            <div className="absolute -left-7 -top-7 w-14 h-14 rounded-full border-[3px] border-black"
              style={{ background: `radial-gradient(circle, #fff 0%, #fff 25%, ${EFFECT_COLOR[flight.effect]} 60%)`, boxShadow: `0 0 0 3px #fff, 0 0 26px 10px ${EFFECT_COLOR[flight.effect]}` }} />
            {/* eslint-disable-next-line @next/next/no-img-element -- fx sprite */}
            <img src={missileArt(flight.effect)} alt=""
              className={cn('absolute z-10 -left-10 -top-10 w-20 h-20 object-contain drop-shadow-[3px_3px_0_#000]', flight.effect !== 'hit' && flight.effect !== 'drain' && 'animate-spin [animation-duration:700ms]')} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {impact && (
          <motion.div key={`imp-${impact.id}`} className="absolute w-40 h-40 -ml-20 -mt-20 rounded-full border-[6px] border-black"
            style={{ left: impact.at.x, top: impact.at.y, background: `radial-gradient(circle, #fff 0%, ${impact.color} 45%, transparent 70%)` }}
            initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }} />
        )}
      </AnimatePresence>

      {/* The hit banner: a consequence of the shot you just watched land. */}
      <AnimatePresence>
        {playerHit && (
          <motion.div key={playerHit.id} role="status"
            className="absolute inset-x-3 flex flex-col items-center gap-1.5"
            style={{ top: board ? (onTiles ? Math.max(8, board.top - 104) : board.top + board.height / 2 - 56) : '50%' }}
            initial={reduce ? { opacity: 0 } : { scale: 2.4, rotate: 8, opacity: 0 }}
            animate={{ scale: 1, rotate: -3, opacity: 1 }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 17 }}>
            <div className={cn('relative flex items-center gap-2 rounded-2xl border-[4px] border-black px-4 py-1.5 shadow-[6px_6px_0_#000]', BANNER[playerHit.kind])}>
              {BANNER_ART[playerHit.kind] && (
                // eslint-disable-next-line @next/next/no-img-element -- fx sprite
                <img src={BANNER_ART[playerHit.kind]} alt="" className="-my-4 -ms-3 w-16 h-16 object-contain drop-shadow-[2px_2px_0_#000]" />
              )}
              <span className="font-neo-display font-black uppercase text-[clamp(1.75rem,9vw,2.5rem)] leading-none tracking-wide">
                {t(`adventurePlay.combat.status.${playerHit.kind}`)}
              </span>
            </div>
            {line && (
              <div className="max-w-[20rem] rounded-lg border-[3px] border-black bg-neo-cream px-3 py-1 text-center text-sm font-black text-black shadow-[3px_3px_0_#000] rotate-2">
                {t(line.key, { count: line.count })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
