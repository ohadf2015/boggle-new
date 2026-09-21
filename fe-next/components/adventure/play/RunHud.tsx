'use client';

/**
 * The pinned run bar, Slay-the-Spire style: it sits above the stage so what you
 * own never leaves the screen.
 *
 * Row 1 is the relic rail and NOTHING else — every owned relic as a framed icon
 * (tap for name, rarity, effect and what it has paid out this run; it flashes
 * the moment a word triggers it). Row 2 is the resources: the room you are
 * standing in, your hearts (hidden in fights: the combat stage owns those),
 * your purse and the potions you can drink, with the fight's shield / telegraph
 * controls when they are asked for.
 *
 * On a LANDSCAPE canvas (TV, desktop) the two rows become ONE strip that runs
 * edge to edge — relics take the width, resources close it — and the shell puts
 * the stage beside the board. That layout is pure CSS (`run/landscape.ts`), so
 * it is right at first paint instead of snapping in after a measure.
 *
 * The purse used to share row 1. On a 390px phone that cost the rail ~66px of a
 * 336px band, which is the difference between six relics on one row and six on
 * two — and between twelve on two rows and twelve on three, over the boss board,
 * where the grid can least afford it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Shield } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { CombatEvent, CombatState } from '@/lib/adventure/play/combat';
import { POTION_IDS, type PotionId, type RelicId } from '@/lib/adventure/play/relics';
import type { LevelKind } from '@/lib/adventure/play/levels';
import type { NodeKind } from '@/lib/adventure/play/runMap';
import { relicContributions } from '@/lib/adventure/play/relicStack';
import type { HitEvent } from './events';
import { runLevels } from './run/offerValue';
import RelicBar, { type RelicPulse } from './run/RelicBar';
import NodeChip from './run/NodeChip';
import GoldCounter from './run/GoldCounter';
import PotionButton from './run/PotionButton';
import { triggeredRelics, relicBonusLabel } from './run/relicTriggers';
import { levelStartFire, fightStartFire, combatFxFire } from './run/relicEvents';
import { clearedRunWords } from './run/relicRunTotals';
import { potionUsable } from './run/potionUsable';
import { cn } from '@/lib/utils';

interface Props {
  hp: number;
  maxHp: number;
  gold: number;
  combat: CombatState | null;
  dispatchCombat: (ev: CombatEvent) => void;
  /** Omit both to leave hints to fx/HintButton. */
  hintsLeft?: number;
  onHint?: () => void;
  potionsLeft: Record<PotionId, number>;
  onPotion: (id: PotionId) => boolean | void;
  goal: string | null;
  playing: boolean;
  relics?: readonly RelicId[];
  /** The last submitted word + the words credited so far (drives the relic glow). */
  lastHit?: HitEvent | null;
  words?: readonly string[];
  /** Set false once the combat stage renders its own shield / telegraph controls. */
  combatControls?: boolean;
  /** Current level — lets the relic bar show live, stacked numbers from this run. */
  world?: number;
  level?: number;
  kind?: LevelKind;
  seconds?: number;
  /** Which map room this is — derive with `currentNodeKind(map, currentNode, lvl)`. */
  nodeKind?: NodeKind | null;
  /** The run's step (`run.step`) — how many nodes have been cleared, which keys the banked words. */
  step?: number;
  /** The fight stage, so an opened relic bubble never buries the boss HP bar or the attack countdown. */
  stageEl?: HTMLElement | null;
}

const btn = 'rounded-lg border-[3px] border-black bg-neo-cream text-black px-2 py-1 text-xs font-bold shadow-[2px_2px_0_#000] disabled:opacity-40 active:translate-y-0.5 active:shadow-none';

/**
 * `bare` drops the pill: inside the run bar the band already separates the
 * hearts from the world art, and a pill on a panel on art is three surfaces
 * deep. Every rail outside the bar (map, TV) keeps the pill.
 */
export function Hearts({ hp, maxHp, bare = false }: { hp: number; maxHp: number; bare?: boolean }) {
  const { t } = useLanguageSafe();
  const label = t('adventurePlay.loot.hearts', { hp, max: maxHp });
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-0.5',
      !bare && 'rounded-full border-[3px] border-black bg-black/70 px-1.5 py-1 shadow-[2px_2px_0_#000]')} role="img" aria-label={label}
      /* An ordinary rival's shot lands here (AttackFlight) when there is no arena hero. */
      data-player-hearts="">
      {maxHp <= 7
        ? Array.from({ length: maxHp }, (_, i) => (
          <Heart key={i} className={cn('h-4 w-4 stroke-black stroke-[2.5] lg:h-5 lg:w-5', i < hp ? 'fill-neo-pink' : 'fill-white/15')} />
        ))
        : (<><Heart className="h-4 w-4 fill-neo-pink stroke-black stroke-[2.5] lg:h-5 lg:w-5" /><span className="text-xs font-bold tabular-nums lg:text-sm">{hp}/{maxHp}</span></>)}
    </span>
  );
}

export default function RunHud({
  hp, maxHp, gold, combat, dispatchCombat, hintsLeft = 0, onHint, potionsLeft, onPotion, goal, playing,
  relics = [], lastHit = null, words = [], combatControls = true, world, level, kind, seconds, nodeKind = null, step,
  stageEl = null,
}: Props) {
  const { t } = useLanguageSafe();
  const inFight = !!combat;

  const wordPulse = useMemo(() => {
    if (!lastHit || lastHit.result !== 'ok' || !relics.length) return null;
    const w = lastHit.word.toLowerCase().trim();
    const idx = words.indexOf(w);
    // The heal happens on the FIGHT's health bar, not the run's hearts — and it
    // only happens below max, so that is what decides whether the fang may claim it.
    const canHeal = combat ? combat.hp < combat.maxHp : hp < maxHp;
    const fired = triggeredRelics(w, idx >= 0 ? idx : Math.max(0, words.length - 1), relics, { inFight, canHeal });
    const at = idx >= 0 ? idx : Math.max(0, words.length - 1);
    return fired.length ? { relics: fired, labels: Object.fromEntries(fired.map((r) => [r, relicBonusLabel(r, w, at)])) } : null;
  }, [lastHit, relics, words, inFight, hp, maxHp, combat]);

  // One pulse channel, many triggers. A word is only ONE of the ways a relic
  // acts: the passives apply when the level is dealt, the bookmark's shield when
  // a fight opens, the feather and the ward when the enemy swings. Firing all of
  // them through the rail is what makes an owned relic legible as working.
  const [pulse, setPulse] = useState<RelicPulse | null>(null);
  const pulseSeq = useRef(0);
  const fire = useRef((f: { relics: RelicId[]; labels: Partial<Record<RelicId, string>> } | null) => {
    if (!f?.relics.length) return;
    setPulse({ id: (pulseSeq.current += 1), relics: f.relics, labels: f.labels });
  });

  useEffect(() => { if (wordPulse) fire.current(wordPulse as never); }, [wordPulse]);
  // Level dealt: the passives that already changed this level's terms.
  useEffect(() => { if (playing) fire.current(levelStartFire(relics)); }, [playing, relics]);
  // Fight opened holding a shield you did not earn in this fight.
  const fightOpened = !!combat && combat.now === 0;
  useEffect(() => {
    if (fightOpened && combat) fire.current(fightStartFire(relics, combat.shields));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per fight, not per combat tick
  }, [fightOpened, relics]);
  // The enemy's last move: a revive spent, an effect cut short.
  const fxKey = combat?.fx?.join(',') ?? '';
  useEffect(() => {
    if (combat?.fx?.length) fire.current(combatFxFire(relics, combat.fx));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the fx list itself
  }, [fxKey, relics]);

  // Each relic's running share of THIS level's points (same formula the server credits).
  const contrib = useMemo(() => relicContributions(words, relics, kind), [words, relics, kind]);
  // Nodes already cleared this run, read once per node. Keyed by STEP: under the branching
  // map several nodes share one level slot, so `level` would drop cleared nodes from the total.
  const prior = useMemo(
    () => (world ? runLevels(world, clearedRunWords(world, step ?? level ?? 1)) : []),
    [world, level, step],
  );
  const stackCtx = useMemo(
    () => ({ levels: [...prior, { words, kind, seconds }], owned: relics }),
    [prior, words, kind, seconds, relics],
  );

  // Every potion slot, held or not. Filtering empties out made the rail vanish
  // whenever you held nothing, which reads as "this game has no potions".
  const showControls = combatControls && !!combat;

  // The trigger callout parks below the WHOLE band, not below the relic rail:
  // under the rail it landed squarely on the potion slots and the purse.
  const band = useRef<HTMLDivElement>(null);
  const [bandEl, setBandEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => setBandEl(band.current), []);

  return (
    /* ONE band, not five floating chips: the HUD used to sit straight on the
       world art, where a sunlit backdrop swallowed the potion sockets and the
       bar read as scattered stickers. A single dark panel with the house border
       is the Slay-the-Spire top bar — legible over any world, and on a TV it
       reads as one instrument cluster instead of confetti. */
    <div ref={band} data-adv-slot="hud" className="mt-2 flex flex-col gap-1 rounded-2xl border-[3px] border-black bg-[#0f1b3d]/85 px-2 pb-1.5 shadow-[3px_3px_0_#000]" data-testid="run-hud">
      {/* Relic row — the strip and nothing else, so it owns the band's full
          width. Sharing it with the purse cost ~66px and pushed a twelve-relic
          haul onto a third row over the boss board. */}
      <div className="flex items-center" data-testid="run-hud-relics">
        {/* The rail keeps its place even when it is empty: relics have a home you can point at. */}
        {relics.length > 0 ? (
          <RelicBar relics={relics} pulse={pulse} contrib={contrib} stackCtx={stackCtx} calloutHost={bandEl}
            tooltipAvoid={stageEl} className="min-w-0 flex-1" />
        ) : (
          /* The band behind it supplies the contrast, so the empty rail is a
             dashed socket and nothing more. */
          <span className="my-2 flex h-9 min-w-0 flex-1 items-center truncate rounded-lg border-[3px] border-dashed border-neo-cream/35 px-2 text-[11px] font-bold text-neo-cream/80">
            {t('adventurePlay.loot.noRelics')}
          </span>
        )}
      </div>
      {/* Resource row: the room you are in, your hearts, your purse, and the potions you can drink right now. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5" data-testid="run-hud-resources">
          {nodeKind && <NodeChip kind={nodeKind} />}
          {/* Elite/boss stages draw their own hearts; a fight node's rival leaves them here. */}
          {(!inFight || combatControls) && <Hearts hp={hp} maxHp={maxHp} bare />}
          <GoldCounter value={gold} />
          <span className="flex items-center gap-1.5" data-testid="run-hud-potions" aria-label={t('adventurePlay.loot.potionsTitle')}>
            {POTION_IDS.map((id) => (
              <PotionButton key={id} id={id} count={potionsLeft[id] ?? 0} onDrink={onPotion}
                disabled={!potionUsable(id, { playing, inFight, hp, maxHp, fightHp: combat?.hp, fightMaxHp: combat?.maxHp })} />
            ))}
          </span>
          {showControls && (
            <button type="button" className={btn} disabled={!playing || combat!.shields <= 0 || combat!.guard}
              onClick={() => dispatchCombat({ type: 'tapShield' })}>
              <Shield className="inline h-3.5 w-3.5" /> {t('adventurePlay.shield', { count: combat!.shields })}
            </button>
          )}
          {onHint && (
            <button type="button" className={btn} disabled={!playing || hintsLeft <= 0} onClick={onHint}>
              {t('adventurePlay.hint', { count: hintsLeft })}
            </button>
          )}
      </div>
      {/* No telegraph row here: the band's height is what the board is sized
          from, so an alert appearing mid-fight shoved the stage down and shrank
          the grid. The rival's wind-up and deflects live on its card (FoeTarget). */}
      {goal && <div className="text-xs font-bold opacity-90">{goal}</div>}
    </div>
  );
}
