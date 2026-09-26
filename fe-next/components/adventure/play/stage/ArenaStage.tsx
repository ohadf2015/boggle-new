'use client';

/**
 * The combat stage as a real 2D arena: a lazy Pixi canvas with the hero on one
 * side and the foe on the other, and a thin neo-brutalist HUD laid over it —
 * name + chunky HP across the top, the intent dial floating above the foe's
 * head (Slay the Spire), the fight's one rule along the floor.
 *
 * The canvas is a picture; the DOM keeps the CONTRACT. Three invisible markers
 * track where Pixi draws, so the pieces that fly things around the screen keep
 * working unchanged:
 *   `[data-enemy-anchor]`   AttackFlight launches the foe's shot from here
 *   `[data-hero-anchor]`    …and lands it on the hero standing on stage
 *   `[data-adv-hit-target]` BoardFx flies the traced letters here
 *
 * That last one is THE BRIDGE, and it is deliberately small: a box on the foe's
 * chest, not the whole sprite. The board's letter volley is the only one there
 * is — the canvas draws no letters of its own — so it has to converge on the
 * foe, and BoardFx's damage sticker has to land on the foe rather than spanning
 * the arena. It also holds no `<img>`, so `BoardFx` throws no white afterimage
 * over the fight; the canvas does the flash, the knockback and the debris.
 */
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Crown, Swords } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import type { CombatState } from '@/lib/adventure/play/combat';
import type { RelicId } from '@/lib/adventure/play/relics';
import { cn } from '@/lib/utils';
import { ThreatPlate } from './IntentDial';
import { PLAYER_STATUS } from './PlayerBar';
import { enemyArt, hpSegments } from './combatView';
import type { CombatJuice } from './useCombatJuice';
import LootFlight from './LootFlight';
import type { ArenaLayout } from '../arena/arenaLayout';
import { commandsFromFeed, effectColor, type ArenaCommand, type FxEntry } from '../arena/arenaCommands';
import { wordPower } from '../arena/arenaBeats';
import type { HitEvent } from '../events';

const ArenaCanvas = dynamic(() => import('../arena/ArenaCanvas'), { ssr: false });

const SEGMENTS = 10;
const HERO_ART = '/images/adventure/play/hero-idle.webp';
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
  /** The last word that landed — the volley the canvas throws at the foe. */
  lastHit: HitEvent | null;
  /** The raw combat fx feed, one entry per resolved step. */
  fxFeed: readonly FxEntry[];
  gold: number;
  /** The relic this kill mints, if any (flies out of the corpse). */
  trophy: RelicId | null;
}

export default function ArenaStage({ world, isBoss, combat, juice, taunt, lastHit, fxFeed, gold, trophy }: Props) {
  const { t, language } = useLanguageSafe();
  const reduce = useReducedMotion();
  const rtl = language === 'he';
  const boss = isBoss ? getBossConfig(world) : null;
  const name = boss ? t(boss.displayName) : t(`adventurePlay.combat.elite.w${world}`);
  const [layout, setLayout] = useState<ArenaLayout | null>(null);
  const [corpse, setCorpse] = useState<{ x: number; y: number } | null>(null);
  const queueRef = useRef<ArenaCommand[]>([]);
  const seqRef = useRef(0);
  const hpRef = useRef(combat.hp);
  // Seed with the hit on screen: a stage that mounts mid-run (a boss node after
  // an elite one) must not re-cast a word from the PREVIOUS battle.
  const castRef = useRef<number | null>(lastHit?.id ?? null);
  const fxSeenRef = useRef(0);

  // --- Combat fx → arena commands (append-only; the canvas drains).
  // The RAW feed, not `juice.status`: the banner keeps one StatusId per step and
  // 'projectile' is not one, so a fireball used to reach the stage as silence.
  useEffect(() => {
    // Read the hp delta HERE, in the same commit the fx arrived in. A separate
    // effect would have already moved the ref on, and every hit would float -1.
    const lost = Math.max(1, hpRef.current - combat.hp);
    hpRef.current = combat.hp;
    const { cmds, lastId } = commandsFromFeed(fxFeed, fxSeenRef.current, { heartsLost: lost, gold, relic: !!trophy });
    fxSeenRef.current = lastId;
    for (const cmd of cmds) queueRef.current.push({ ...cmd, id: ++seqRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hearts/gold are read at feed time, never a trigger
  }, [fxFeed]);

  // A landed word: the traced letters become a volley into the foe.
  useEffect(() => {
    if (!lastHit || lastHit.result !== 'ok' || castRef.current === lastHit.id) return;
    castRef.current = lastHit.id;
    queueRef.current.push({
      kind: 'cast', id: ++seqRef.current, word: lastHit.word,
      power: wordPower(Array.from(lastHit.word).length),
    });
  }, [lastHit]);

  // The wind-up: charged in the foe's hand for as long as the telegraph runs.
  const teleKey = combat.telegraph?.startedAt ?? null;
  useEffect(() => {
    const tele = combat.telegraph;
    if (!tele) return;
    queueRef.current.push({
      kind: 'windup', id: ++seqRef.current, effect: tele.attack.effect,
      color: effectColor(tele.attack.effect), ms: Math.max(0, tele.endsAt - tele.startedAt),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one wind-up per telegraph
  }, [teleKey]);

  const getFacts = useCallback(() => {
    const tele = combat.telegraph;
    return {
      enraged: combat.phase === 2,
      defeated: combat.defeated,
      windupLeftMs: tele ? Math.max(0, tele.endsAt - combat.now) : null,
      windupColor: tele ? effectColor(tele.attack.effect) : 0xffffff,
      stunned: combat.stunnedUntil > combat.now,
    };
  }, [combat]);
  const factsRef = useRef(getFacts);
  factsRef.current = getFacts;
  const readFacts = useCallback(() => factsRef.current(), []);

  const sprites = useMemo(() => ({
    hero: HERO_ART,
    foeIdle: enemyArt(world, isBoss, 'idle'),
    foeHurt: enemyArt(world, isBoss, 'hurt'),
  }), [world, isBoss]);

  const segs = hpSegments(combat.enemyHp, combat.enemyMaxHp, SEGMENTS);
  const enraged = combat.phase === 2;
  // The DOM stamp still reads the collapsed banner — one word per beat is right
  // for a stamp. Only the canvas needs the full feed.
  const status = juice.status;
  const onEnemy = status && !PLAYER_STATUS.includes(status.kind);
  // Marker boxes follow the canvas: absolute, in canvas-local px.
  const foeBox = layout?.foe;
  const hand = layout?.foeHand;
  const heroHit = layout?.heroHit;
  // The foe's chest — small on purpose, see the note at the top of this file.
  const chest = foeBox && {
    x: Math.round(foeBox.x + foeBox.w * 0.28),
    y: Math.round(foeBox.y + foeBox.h * 0.22),
    w: Math.round(foeBox.w * 0.44),
    h: Math.round(foeBox.h * 0.4),
  };

  return (
    <div className="relative w-full h-[11rem]" data-testid="enemy-stage">
      {/* The arena itself. */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl border-[3px] border-black bg-[#0b132f] shadow-[4px_4px_0_#000]">
        <div aria-hidden className={cn('absolute inset-x-0 bottom-0 h-2/3 blur-2xl opacity-60 transition-colors', enraged ? 'bg-neo-pink/40' : 'bg-[#3b5bdb]/30')} />
        {/* ONE owner for the reduced-motion gate: `EnemyStage` only reaches this
            file when motion is allowed, so a second `reduce` branch here would
            be unreachable and would rot (dual source of truth). */}
        {/* Keyed on the foe: elite → boss inside one run must rebuild the
            scene, or the boss would fight wearing the elite's texture. */}
        <ArenaCanvas key={sprites.foeIdle} sprites={sprites} rtl={rtl} queue={queueRef.current}
          getFacts={readFacts} blockLabel={t('adventurePlay.combat.status.blocked')}
          onLayout={setLayout} onDeath={setCorpse} className="absolute inset-0" />
      </div>

      {/* Markers: invisible, but every flying thing on this screen aims at them. */}
      {chest && (
        <div data-adv-hit-target aria-hidden className="pointer-events-none absolute"
          style={{ left: chest.x, top: chest.y, width: chest.w, height: chest.h }} />
      )}
      {hand && <span data-enemy-anchor aria-hidden className="pointer-events-none absolute w-6 h-6 -ml-3 -mt-3" style={{ left: hand.x, top: hand.y }} />}
      {heroHit && <span data-hero-anchor aria-hidden className="pointer-events-none absolute w-8 h-8 -ml-4 -mt-4" style={{ left: heroHit.x, top: heroHit.y }} />}

      {/* Top band: who you are fighting and how much of it is left. */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-1.5 rounded-t-2xl border-b-[3px] border-black bg-black/75 px-2 py-1">
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-black px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-black',
          isBoss ? 'bg-neo-yellow' : 'bg-neo-cyan')}>
          {isBoss ? <Crown className="w-2.5 h-2.5" /> : <Swords className="w-2.5 h-2.5" />}
          {isBoss ? t('adventurePlay.combat.boss') : t('adventurePlay.combat.elite.tag')}
        </span>
        <span className="font-neo-display font-bold text-neo-cream text-[13px] leading-tight truncate min-w-0 max-w-[38%]">{name}</span>
        <div className={cn('relative flex flex-1 min-w-0 gap-[2px] rounded-md border-2 border-black bg-black p-px', enraged && 'shadow-[0_0_0_2px_#ff3366]')}
          role="progressbar" aria-label={t('adventurePlay.combat.enemyHp')} aria-valuemin={0} aria-valuemax={combat.enemyMaxHp} aria-valuenow={combat.enemyHp}>
          {segs.map((f, i) => (
            <div key={i} className="relative h-3 flex-1 rounded-[2px] bg-[#2a1030] overflow-hidden">
              <div className={cn('absolute inset-y-0 start-0 transition-[width] duration-300', enraged ? 'bg-neo-pink' : 'bg-[#ff4d4d]')} style={{ width: `${f * 100}%` }} />
            </div>
          ))}
          {[33, 66].map((p) => (
            <span key={p} aria-hidden className="absolute -top-0.5 -bottom-0.5 w-[2px] bg-neo-yellow" style={{ insetInlineStart: `${p}%` }} />
          ))}
        </div>
      </div>

      {/* The incoming hit, directly over the foe — the one thing the player must
          read mid-word. The move-list panel that sat beside it (09-21 declutter)
          restated it; the charge orb in the canvas carries the countdown. */}
      {!combat.defeated && (
        <div className="pointer-events-none absolute z-20"
          style={foeBox
            ? { insetInlineStart: Math.round((rtl ? layout!.w - foeBox.x - foeBox.w : foeBox.x) + foeBox.w * 0.5) - 34, top: 24 }
            : { insetInlineEnd: 6, top: 24 }}>
          <ThreatPlate combat={combat} />
        </div>
      )}

      {/* Taunt, over the hero's side of the sky. */}
      <AnimatePresence>
        {taunt && !combat.defeated && (
          <motion.p key={taunt} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute top-8 start-1 z-20 max-w-[11rem] rounded-xl rounded-es-none border-[3px] border-black bg-neo-cream px-2 py-1 text-[11px] font-bold leading-snug text-black line-clamp-3 shadow-[3px_3px_0_#000]">
            {t(taunt, { requirement: t('adventurePlay.longerWords') })}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Stamp: Interrupted! / Enraged! / Deflected! */}
      <AnimatePresence>
        {onEnemy && (
          <motion.div key={status.id} role="status"
            initial={reduce ? { opacity: 0 } : { scale: 1.8, rotate: -16, opacity: 0 }}
            animate={{ scale: 1, rotate: -8, opacity: 1 }} exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
            className={cn('absolute inset-x-0 top-[44%] z-20 mx-auto w-fit max-w-full rounded-lg border-[3px] border-black px-2 py-0.5 text-center font-neo-display text-lg font-black uppercase leading-tight shadow-[3px_3px_0_#000]',
              STATUS_STYLE[status.kind] ?? 'bg-neo-pink text-black')}>
            {status.kind === 'phase' && combat.phase < 2 ? t('adventurePlay.combat.phaseTwo') : t(`adventurePlay.combat.status.${status.kind}`)}
          </motion.div>
        )}
      </AnimatePresence>

      <LootFlight from={corpse} gold={gold} relic={trophy} onDone={() => setCorpse(null)} />
    </div>
  );
}
