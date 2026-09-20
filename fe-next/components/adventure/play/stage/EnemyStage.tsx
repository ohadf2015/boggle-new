'use client';

/**
 * The combat stage. The real fight is `ArenaStage` — a Pixi arena with the hero
 * and the foe facing each other. This file is the single-column DOM stage it
 * falls back to when the canvas must not run: prefers-reduced-motion, or a
 * browser where WebGL / the Pixi chunk never came up. Same markers, same HUD,
 * no animation budget: enemy portrait, name, chunky segmented HP with phase
 * breaks, intent dial, and the fight's one rule.
 */
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Crown, Swords } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import type { CombatState } from '@/lib/adventure/play/combat';
import { cn } from '@/lib/utils';
import IntentDial, { EFFECT_COLOR } from './IntentDial';
import ArenaStage from './ArenaStage';
import type { FxEntry } from '../arena/arenaCommands';
import type { HitEvent } from '../events';
import type { RelicId } from '@/lib/adventure/play/relics';
import { PLAYER_STATUS } from './PlayerBar';
import { enemyArt, hpSegments, ruleKey, type ArtState } from './combatView';
import type { CombatJuice } from './useCombatJuice';
import { TRAVEL_MS, missileArt } from './flightMath';

const SEGMENTS = 10;

const STATUS_STYLE: Record<string, string> = {
  interrupt: 'bg-neo-lime text-black', phase: 'bg-neo-pink text-black',
  defeated: 'bg-neo-yellow text-black', deflect: 'bg-neo-cyan text-black', cleanse: 'bg-neo-cyan text-black',
};

interface Props {
  world: number;
  isBoss: boolean;
  combat: CombatState;
  juice: CombatJuice;
  taunt: string | null;
  /** The word that just landed — the volley the arena throws at the foe. */
  lastHit?: HitEvent | null;
  /** RAW combat fx feed. The arena reads this, never the one stamped banner. */
  fxFeed?: readonly FxEntry[];
  gold?: number;
  /** Relic this kill mints; it flies out of the corpse. */
  trophy?: RelicId | null;
}

export default function EnemyStage({ world, isBoss, combat, juice, taunt, lastHit = null, fxFeed = [], gold = 0, trophy = null }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  // The arena canvas is the stage; this DOM column is the no-motion fallback.
  if (!reduce) {
    return <ArenaStage world={world} isBoss={isBoss} combat={combat} juice={juice} taunt={taunt}
      lastHit={lastHit} fxFeed={fxFeed} gold={gold} trophy={trophy} />;
  }
  return <StaticEnemyStage world={world} isBoss={isBoss} combat={combat} juice={juice} taunt={taunt} t={t} reduce={reduce} />;
}

type Translate = ReturnType<typeof useLanguageSafe>['t'];

interface StaticProps extends Omit<Props, 'lastHit' | 'fxFeed' | 'gold' | 'trophy'> {
  t: Translate;
  reduce: boolean | null;
}

function StaticEnemyStage({ world, isBoss, combat, juice, taunt, t, reduce }: StaticProps) {
  const boss = isBoss ? getBossConfig(world) : null;
  const name = boss ? t(boss.displayName) : t(`adventurePlay.combat.elite.w${world}`);
  const tele = combat.telegraph;
  const art: ArtState = combat.defeated ? 'defeated'
    : juice.flash ?? (tele ? 'attack' : combat.phase === 2 ? 'enraged' : 'idle');
  const segs = hpSegments(combat.enemyHp, combat.enemyMaxHp, SEGMENTS);
  const enraged = combat.phase === 2;
  const status = juice.status;
  const onEnemy = status && !PLAYER_STATUS.includes(status.kind);
  const stunned = combat.stunnedUntil > combat.now;
  const color = tele ? EFFECT_COLOR[tele.attack.effect] : '#ffffff';
  // Charge orb: grows over the wind-up from `startedAt`, on the GPU.
  const teleMs = tele ? tele.endsAt - tele.startedAt : 1;
  const chargeFrom = tele ? Math.min(1, (combat.now - tele.startedAt) / Math.max(1, teleMs)) : 0;
  const chargeLeft = tele ? Math.max(0, tele.endsAt - combat.now - TRAVEL_MS) / 1000 : 0;
  // Once the shot leaves the hand (AttackFlight carries it), the orb is gone — projectiles stay until they spawn.
  const released = !!tele && !reduce && tele.attack.effect !== 'projectile' && tele.endsAt - combat.now <= TRAVEL_MS + 100;

  const body = reduce ? undefined
    : combat.defeated ? { rotate: -14, y: 18, scale: 0.92 }
      : juice.flash === 'hurt' ? { x: [0, -16, 12, -6, 0], rotate: [0, -8, 5, 0] }
        : juice.flash === 'attack' ? { y: [0, 22, 0], scale: [1, 1.16, 1], rotate: [0, 6, 0] }
          : tele ? { rotate: [-5, -9, -5], scale: [1.04, 1.08, 1.04], y: [0, -3, 0] }
            : stunned ? { rotate: [-4, 4, -4] }
              : { y: [0, -6, 0], scale: [1, 1.02, 1] };
  const bodyT = combat.defeated ? { duration: 0.6 }
    : juice.flash ? { duration: juice.flash === 'hurt' ? 0.4 : 0.45 }
      : { duration: tele ? 0.45 : stunned ? 0.35 : 2.4, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <div className="relative w-full" data-testid="enemy-stage">
      <div className="relative flex items-end gap-2 h-[11.5rem]">
        {/* The body — no frame, standing in the arena. */}
        <div className="relative shrink-0 w-[10rem] h-full">
          <div aria-hidden className={cn('absolute inset-x-2 top-3 bottom-4 rounded-full blur-2xl opacity-70 transition-colors',
            enraged ? 'bg-neo-pink' : tele ? '' : 'bg-[#3b5bdb]')} style={tele ? { background: color } : undefined} />
          <div aria-hidden className="absolute bottom-1 inset-x-5 h-5 rounded-[50%] bg-black/60 blur-[2px]" />
          <motion.div className="absolute inset-x-0 bottom-2 top-0 origin-bottom" animate={body} transition={bodyT}>
            <Image src={enemyArt(world, isBoss, art)} alt={name} fill sizes="160px" priority
              className={cn('object-contain object-bottom drop-shadow-[4px_4px_0_#000]',
                juice.flash === 'hurt' && 'brightness-200 saturate-0',
                combat.defeated && 'grayscale')} />
          </motion.div>

          {/* Charge orb in the enemy's hand: the telegraph made physical — the same shot that then flies. */}
          <div data-enemy-anchor className="absolute top-[34%] end-0 w-16 h-16 -translate-y-1/2 pointer-events-none">
            <AnimatePresence>
              {tele && !released && (
                <motion.div key={tele.startedAt} className="absolute inset-0"
                  initial={{ scale: reduce ? 1 : 0.2 + chargeFrom * 0.8, opacity: 1 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: reduce ? 0 : chargeLeft, ease: 'easeIn' }}>
                  <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: `radial-gradient(circle, #fff 0%, ${color} 45%, transparent 70%)`, boxShadow: `0 0 24px 10px ${color}` }} />
                  {/* eslint-disable-next-line @next/next/no-img-element -- fx sprite */}
                  <img src={missileArt(tele.attack.effect)} alt="" className={cn('absolute inset-1 w-14 h-14 object-contain drop-shadow-[2px_2px_0_#000]', !reduce && 'animate-spin [animation-duration:1.4s]')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Enemy-side stamps: Interrupted! / Enraged! / Deflected! */}
          <AnimatePresence>
            {onEnemy && (
              <motion.div key={status.id} role="status"
                initial={reduce ? { opacity: 0 } : { scale: 1.8, rotate: -16, opacity: 0 }}
                animate={{ scale: 1, rotate: -8, opacity: 1 }} exit={{ opacity: 0, y: -12 }}
                transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                className={cn('absolute inset-x-0 top-[40%] z-10 mx-auto w-fit max-w-full text-center rounded-lg border-[3px] border-black px-2 py-0.5 font-neo-display font-black text-lg leading-tight uppercase shadow-[3px_3px_0_#000]',
                  STATUS_STYLE[status.kind] ?? 'bg-neo-pink text-black')}>
                {status.kind === 'phase' && combat.phase < 2 ? t('adventurePlay.combat.phaseTwo') : t(`adventurePlay.combat.status.${status.kind}`)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Taunt: a speech bubble off the enemy's head. */}
          <AnimatePresence>
            {taunt && !combat.defeated && (
              <motion.p key={taunt} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute top-0 start-0 z-20 max-w-[12rem] rounded-xl rounded-es-none border-[3px] border-black bg-neo-cream px-2 py-1 text-[11px] font-bold leading-snug text-black line-clamp-3 shadow-[3px_3px_0_#000]">
                {t(taunt, { requirement: t('adventurePlay.longerWords') })}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Name, HP, intent, rule */}
        <div className="min-w-0 flex-1 flex flex-col justify-end gap-1.5 pb-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
            <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-black px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black',
              isBoss ? 'bg-neo-yellow' : 'bg-neo-cyan')}>
              {isBoss ? <Crown className="w-3 h-3" /> : <Swords className="w-3 h-3" />}
              {isBoss ? t('adventurePlay.combat.boss') : t('adventurePlay.combat.elite.tag')}
            </span>
            <span className="font-neo-display font-bold text-neo-cream text-base leading-tight line-clamp-2 break-words min-w-0 drop-shadow-[2px_2px_0_#000]">{name}</span>
          </div>
          <div className={cn('relative flex gap-[3px] rounded-lg border-[3px] border-black bg-black p-[2px] shadow-[3px_3px_0_#000]', enraged && 'shadow-[3px_3px_0_#ff3366]')}
            role="progressbar" aria-label={t('adventurePlay.combat.enemyHp')} aria-valuemin={0} aria-valuemax={combat.enemyMaxHp} aria-valuenow={combat.enemyHp}>
            {segs.map((f, i) => (
              <div key={i} className="relative h-4 flex-1 rounded-[3px] bg-[#2a1030] overflow-hidden">
                <div className={cn('absolute inset-y-0 start-0 transition-[width] duration-300', enraged ? 'bg-neo-pink' : 'bg-[#ff4d4d]')}
                  style={{ width: `${f * 100}%` }} />
              </div>
            ))}
            {[33, 66].map((p) => (
              <span key={p} aria-hidden className="absolute -top-1 -bottom-1 w-[3px] bg-neo-yellow border-x border-black" style={{ insetInlineStart: `${p}%` }} />
            ))}
          </div>
          <div className="rounded-xl border-[3px] border-black bg-[#0f1b3d]/90 p-1.5 shadow-[3px_3px_0_#000]">
            <IntentDial combat={combat} />
          </div>
          <div className="flex items-start gap-1 rounded-lg border-2 border-black bg-neo-purple px-1.5 py-1 text-[10px] font-bold text-neo-cream leading-snug">
            <span className="shrink-0 rounded bg-black px-1 text-[9px] font-black uppercase tracking-wider text-neo-yellow">{t('adventurePlay.combat.ruleTag')}</span>
            <span className="min-w-0 line-clamp-3">{t(ruleKey(world, isBoss))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
