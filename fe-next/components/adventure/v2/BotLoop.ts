import { useCombatStore } from '@/lib/adventure/v2/state/runStore';
import { pickBotWord } from '@/lib/adventure/v2/engine/botWordPicker';
import { calculateDamage } from '@/lib/adventure/v2/engine/damageCalculator';
import type { Tile, TileId } from '@/lib/adventure/v2/types';

const REVEAL_INTERVAL_MS = 1100;
const POST_FINALIZE_PAUSE_MS = 1400;
const NO_PICK_RETRY_MS = 1600;
const BOT_ACT_PROBABILITY = 0.7;

interface Plan {
  word: string;
  tileIds: TileId[];
  revealedCount: number;
}

export class BotLoop {
  private plan: Plan | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active = false;

  constructor(
    private onWordCompleted: (word: string, dmg: number, tileIds: TileId[]) => void,
    private onTargetReveal: (tileId: TileId) => void,
  ) {}

  start() {
    this.active = true;
    this.scheduleTick(REVEAL_INTERVAL_MS);
  }

  stop() {
    this.active = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.plan = null;
    useCombatStore.getState().clearBotTargets();
  }

  /** Player stole a target tile (or otherwise broke the plan) — restart. */
  invalidate() {
    this.plan = null;
    useCombatStore.getState().clearBotTargets();
  }

  private scheduleTick(delay: number) {
    if (!this.active) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), delay);
  }

  private tick() {
    if (!this.active) return;

    const store = useCombatStore.getState();
    const fsm = store.fsmState;

    if (fsm.type === 'victory' || fsm.type === 'defeat') {
      this.stop();
      return;
    }

    // Pause during non-compose states (player resolving, refresh, etc.)
    if (fsm.type !== 'player_compose') {
      this.scheduleTick(REVEAL_INTERVAL_MS);
      return;
    }

    // Validate existing plan: any revealed-target tile that's no longer free invalidates it
    if (this.plan) {
      const stillValid = this.plan.tileIds.slice(0, this.plan.revealedCount).every((id) => {
        const t = store.tiles.find((tt) => tt.id === id);
        return t && t.targetedBy === 'bot' && !t.claimedBy;
      });
      if (!stillValid) this.plan = null;
    }

    // Acquire a plan if we don't have one
    if (!this.plan) {
      if (Math.random() > BOT_ACT_PROBABILITY) {
        // Bot rests this beat — gives player breathing room
        this.scheduleTick(REVEAL_INTERVAL_MS);
        return;
      }
      const pick = pickBotWord(store.tiles, store.locale);
      if (!pick) {
        this.scheduleTick(NO_PICK_RETRY_MS);
        return;
      }
      this.plan = { word: pick.word, tileIds: pick.tileIds, revealedCount: 0 };
    }

    // Reveal next letter
    if (this.plan.revealedCount < this.plan.tileIds.length) {
      const nextId = this.plan.tileIds[this.plan.revealedCount];
      const tile = store.tiles.find((t) => t.id === nextId);

      // Skip if tile is no longer in a usable state
      const playerHasIt =
        store.fsmState.type === 'player_compose' &&
        store.fsmState.tilesUsed.includes(nextId);
      if (!tile || tile.claimedBy || playerHasIt) {
        this.invalidate();
        this.scheduleTick(REVEAL_INTERVAL_MS / 2);
        return;
      }

      store.targetTileForBot(nextId);
      this.onTargetReveal(nextId);
      this.plan.revealedCount++;
      this.scheduleTick(REVEAL_INTERVAL_MS);
      return;
    }

    // Plan fully revealed → finalize
    const tiles: Tile[] = this.plan.tileIds
      .map((id) => store.tiles.find((t) => t.id === id))
      .filter((t): t is Tile => Boolean(t));
    const dmg = calculateDamage(tiles, { critRoll: 1, runeBonusSum: 0, heroAtk: 0.7 });
    const word = this.plan.word;
    const tileIds = this.plan.tileIds;
    store.finalizeBotClaim(tileIds, 1);
    this.onWordCompleted(word, dmg, tileIds);
    this.plan = null;
    this.scheduleTick(POST_FINALIZE_PAUSE_MS);
  }
}
