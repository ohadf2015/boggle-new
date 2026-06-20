/**
 * useBossCombat — the interactive RPG layer for boss fights.
 *
 * Owns everything that turns "spell words at a punching bag" into a fight:
 *  - Player ability charge (from combo) + casting (smite / ward / focus)
 *  - Boss stun + player buffs (ward block, focus burst)
 *  - PARRY on word: a qualifying word during a telegraph blocks the attack,
 *    counters for damage, and stuns the boss.
 *
 * Pure combat math lives in lib/adventure/combat/*; this hook is the stateful
 * React shell. The weakness *crit* on normal words lives in word-submit (it has
 * the boss config locally); this hook owns the rest.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { BossTwistType } from '@/types/boss';
import { getBossWeakness, type WeaknessRule } from '@/lib/adventure/combat/weakness';
import {
  PLAYER_ABILITIES,
  chargesFromCombo,
  smiteDamage,
  type PlayerAbilityId,
  type PlayerAbilityDef,
  MAX_CHARGE,
} from '@/lib/adventure/combat/playerAbilities';
import {
  createCombatStatus,
  applyStun,
  isStunned,
  armFocus,
  consumeFocus,
  armWard,
  consumeWard,
  stunDurationForPhase,
  type CombatStatus,
} from '@/lib/adventure/combat/statusEffects';
import { evaluateParry, type ParryRequirement, type ParryReason, type BossVisualPhase } from '@/lib/adventure/combat/parry';

export interface UseBossCombatProps {
  twist: BossTwistType | undefined;
  world: number;
  phase: BossVisualPhase;
  comboCount: number;
  /** Most recent accepted word (drives parry + focus burst). */
  newestWord: string | null;
  /** Active parry requirement while the boss is telegraphing, else null. */
  parryReq: ParryRequirement | null;
  enabled: boolean;
  /** Deal counter/burst damage to the boss. */
  onCounterDamage: (damage: number) => void;
  /** Called when a parry succeeds (overlay cancels the pending attack). */
  onParrySuccess: () => void;
}

export interface AbilitySlot {
  def: PlayerAbilityDef;
  canCast: boolean;
}

export interface LastParry {
  reason: ParryReason;
  at: number;
}

export interface UseBossCombatReturn {
  weakness: WeaknessRule;
  charge: number;
  maxCharge: number;
  abilities: AbilitySlot[];
  cast: (id: PlayerAbilityId) => void;
  status: { stunned: boolean; focusArmed: boolean; wardArmed: boolean };
  lastParry: LastParry | null;
  consumeWardForAttack: () => boolean;
  /** Whether the boss is currently stunned (suppress ability activation). */
  isBossStunned: () => boolean;
}

const FALLBACK_TWIST: BossTwistType = 'popQuiz';

export function useBossCombat(props: UseBossCombatProps): UseBossCombatReturn {
  const { twist, world, phase, comboCount, newestWord, parryReq, enabled, onCounterDamage, onParrySuccess } = props;

  const weakness = useMemo(() => getBossWeakness(twist ?? FALLBACK_TWIST), [twist]);

  // Charge is a REGENERATING resource: each completed combo streak banks the
  // charges it earned, plus the current streak's in-progress charges. (A simple
  // peak-minus-spent model would let you cast only ~once per whole fight.)
  const comboStateRef = useRef({ prevCombo: 0, peak: 0, banked: 0 });
  const [, forceTick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const s = comboStateRef.current;
    if (comboCount > s.peak) {
      s.peak = comboCount;
      forceTick();
    } else if (comboCount < s.prevCombo) {
      // Streak broke: bank what this peak earned, then start a fresh streak.
      s.banked += chargesFromCombo(s.peak);
      s.peak = comboCount;
      forceTick();
    }
    s.prevCombo = comboCount;
  }, [comboCount]);
  const earned = comboStateRef.current.banked + chargesFromCombo(comboStateRef.current.peak);
  const [spent, setSpent] = useState(0);
  const charge = Math.max(0, Math.min(MAX_CHARGE, earned - spent));

  const [status, setStatus] = useState<CombatStatus>(createCombatStatus);
  const [lastParry, setLastParry] = useState<LastParry | null>(null);

  const now = () => Date.now();

  const cast = useCallback((id: PlayerAbilityId) => {
    if (!enabled) return;
    const def = PLAYER_ABILITIES.find(a => a.id === id);
    if (!def || charge < def.chargeCost) return;

    setSpent(s => s + def.chargeCost);
    if (id === 'smite') {
      onCounterDamage(smiteDamage(world));
    } else if (id === 'ward') {
      setStatus(s => armWard(s));
    } else if (id === 'focus') {
      setStatus(s => armFocus(s));
    }
  }, [enabled, charge, world, onCounterDamage]);

  // --- React to a new word: parry first, else focus burst. (effect, not render) ---
  const lastHandledWordRef = useRef<string | null>(null);
  // Keep the latest callbacks/context in refs so the word effect depends only on the word.
  const reactRef = useRef({ enabled, parryReq, world, phase, onCounterDamage, onParrySuccess });
  reactRef.current = { enabled, parryReq, world, phase, onCounterDamage, onParrySuccess };

  useEffect(() => {
    const r = reactRef.current;
    if (!r.enabled || !newestWord || newestWord === lastHandledWordRef.current) return;
    lastHandledWordRef.current = newestWord;

    let didParry = false;
    if (r.parryReq) {
      const res = evaluateParry(newestWord, r.parryReq);
      if (res.parried && res.reason) {
        didParry = true;
        // Counter scales with world; stun duration eases by phase.
        r.onCounterDamage(Math.round(smiteDamage(r.world) * 0.75));
        setStatus(s => applyStun(s, now(), stunDurationForPhase(r.phase)));
        setLastParry({ reason: res.reason, at: now() });
        r.onParrySuccess();
      }
    }
    if (!didParry) {
      // Focus burst fires on the next word after FOCUS is cast.
      setStatus(s => {
        const c = consumeFocus(s);
        if (c.consumed) {
          r.onCounterDamage(Math.round(smiteDamage(r.world) * 0.6));
        }
        return c.state;
      });
    }
  }, [newestWord]);

  const consumeWardForAttack = useCallback((): boolean => {
    if (!status.wardArmed) return false;
    setStatus(s => consumeWard(s).state);
    return true;
  }, [status.wardArmed]);

  // Derive the stun flag from a timer (render-pure: no Date.now() in render).
  const [stunnedNow, setStunnedNow] = useState(false);
  useEffect(() => {
    if (status.stunUntil <= 0) { setStunnedNow(false); return; }
    const ms = status.stunUntil - Date.now();
    if (ms <= 0) { setStunnedNow(false); return; }
    setStunnedNow(true);
    const id = setTimeout(() => setStunnedNow(false), ms);
    return () => clearTimeout(id);
  }, [status.stunUntil]);

  const isBossStunned = useCallback(() => stunnedNow, [stunnedNow]);

  const abilities: AbilitySlot[] = useMemo(
    () => PLAYER_ABILITIES.map(def => ({ def, canCast: charge >= def.chargeCost })),
    [charge]
  );

  return {
    weakness,
    charge,
    maxCharge: MAX_CHARGE,
    abilities,
    cast,
    status: { stunned: stunnedNow, focusArmed: status.focusArmed, wardArmed: status.wardArmed },
    lastParry,
    consumeWardForAttack,
    isBossStunned,
  };
}
