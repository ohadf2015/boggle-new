'use client';

/**
 * In-level run HUD. Row 1: hearts carried through the run (hidden in fights —
 * the combat stage owns fight hearts), the relic bar (tap for a tooltip; a
 * relic glows when the last word triggered it), gold. Row 2: potion flasks,
 * shield + incoming-attack + projectile controls, hunt / chain goal.
 */
import { useMemo } from 'react';
import { Heart, Shield } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { CombatEvent, CombatState } from '@/lib/adventure/play/combat';
import { POTION_IDS, type PotionId, type RelicId } from '@/lib/adventure/play/relics';
import type { LevelKind } from '@/lib/adventure/play/levels';
import { relicContributions } from '@/lib/adventure/play/relicStack';
import type { HitEvent } from './events';
import { readRunWords } from './runStorage';
import { runLevels } from './run/offerValue';
import RelicBar from './run/RelicBar';
import GoldCounter from './run/GoldCounter';
import PotionButton from './run/PotionButton';
import { triggeredRelics, relicBonusLabel } from './run/relicTriggers';
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
}

const btn = 'rounded-lg border-[3px] border-black bg-neo-cream text-black px-2 py-1 text-xs font-bold shadow-[2px_2px_0_#000] disabled:opacity-40 active:translate-y-0.5 active:shadow-none';

export function Hearts({ hp, maxHp }: { hp: number; maxHp: number }) {
  const { t } = useLanguageSafe();
  const label = t('adventurePlay.loot.hearts', { hp, max: maxHp });
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border-[3px] border-black bg-black/70 px-1.5 py-1 shadow-[2px_2px_0_#000]" role="img" aria-label={label}>
      {maxHp <= 7
        ? Array.from({ length: maxHp }, (_, i) => (
          <Heart key={i} className={cn('h-4 w-4 stroke-black stroke-[2.5]', i < hp ? 'fill-neo-pink' : 'fill-white/15')} />
        ))
        : (<><Heart className="h-4 w-4 fill-neo-pink stroke-black stroke-[2.5]" /><span className="text-xs font-bold tabular-nums">{hp}/{maxHp}</span></>)}
    </span>
  );
}

export default function RunHud({
  hp, maxHp, gold, combat, dispatchCombat, hintsLeft = 0, onHint, potionsLeft, onPotion, goal, playing,
  relics = [], lastHit = null, words = [], combatControls = true, world, level, kind, seconds,
}: Props) {
  const { t } = useLanguageSafe();
  const tele = combat?.telegraph;
  const inFight = !!combat;

  const pulse = useMemo(() => {
    if (!lastHit || lastHit.result !== 'ok' || !relics.length) return null;
    const w = lastHit.word.toLowerCase().trim();
    const idx = words.indexOf(w);
    const fired = triggeredRelics(w, idx >= 0 ? idx : Math.max(0, words.length - 1), relics, { inFight });
    const at = idx >= 0 ? idx : Math.max(0, words.length - 1);
    return fired.length ? { id: lastHit.id, relics: fired, labels: Object.fromEntries(fired.map((r) => [r, relicBonusLabel(r, w, at)])) } : null;
  }, [lastHit, relics, words, inFight]);

  // Each relic's running share of THIS level's points (same formula the server credits).
  const contrib = useMemo(() => relicContributions(words, relics, kind), [words, relics, kind]);
  // Earlier cleared levels of this run, read once per level.
  const prior = useMemo(
    () => (world && level ? runLevels(world, readRunWords(world).slice(0, level - 1)) : []),
    [world, level],
  );
  const stackCtx = useMemo(
    () => ({ levels: [...prior, { words, kind, seconds }], owned: relics }),
    [prior, words, kind, seconds, relics],
  );

  const potions = POTION_IDS.filter((id) => potionsLeft[id] > 0);
  const showControls = combatControls && !!combat;
  const row2 = potions.length > 0 || showControls || onHint;

  return (
    <div className="mt-2 flex flex-col gap-1.5" data-testid="run-hud">
      <div className="flex items-center gap-1.5">
        {!inFight && <Hearts hp={hp} maxHp={maxHp} />}
        <RelicBar relics={relics} pulse={pulse} contrib={contrib} stackCtx={stackCtx} className="min-w-0 flex-1" />
        <GoldCounter value={gold} />
      </div>
      {row2 && (
        <div className="flex flex-wrap items-center gap-2">
          {potions.map((id) => (
            <PotionButton key={id} id={id} count={potionsLeft[id]} onDrink={onPotion}
              disabled={!potionUsable(id, { playing, inFight, hp, maxHp, fightHp: combat?.hp, fightMaxHp: combat?.maxHp })} />
          ))}
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
      )}
      {combatControls && tele && (
        <div role="alert" className="rounded-lg border-[3px] border-black bg-neo-pink px-2 py-1 text-xs font-bold text-black animate-pulse">
          {t('adventurePlay.incoming')} {Math.max(0, Math.ceil((tele.endsAt - combat!.now) / 1000))}
        </div>
      )}
      {combatControls && combat?.projectiles.map((p) => (
        <button key={p.id} type="button" className={`${btn} bg-neo-yellow`} onClick={() => dispatchCombat({ type: 'swipeProjectile', id: p.id })}>
          {t('adventurePlay.deflect')}
        </button>
      ))}
      {goal && <div className="text-xs font-bold opacity-90">{goal}</div>}
    </div>
  );
}
