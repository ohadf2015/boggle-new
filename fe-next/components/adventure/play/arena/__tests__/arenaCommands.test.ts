import { describe, it, expect } from 'vitest';
import { commandFromFx, commandsFromFeed, effectColor } from '../arenaCommands';

const ctx = { heartsLost: 1, gold: 12, relic: true };

describe('commandFromFx', () => {
  it('turns a landed enemy attack into a strike that cost hearts', () => {
    const c = commandFromFx(7, ['hit', 'damage'], ctx);
    expect(c).toMatchObject({ kind: 'strike', id: 7, blocked: false, heartsLost: 1 });
  });

  // 'damage' is the ENEMY losing HP to a word — it says nothing about the hero.
  // Gating the heart float on it meant the float never once fired in a fight.
  it('floats hearts for the fx that actually call hurt(), and only those', () => {
    expect(commandFromFx(1, ['hit'], ctx)).toMatchObject({ heartsLost: 1 });
    expect(commandFromFx(1, ['drain'], ctx)).toMatchObject({ heartsLost: 1 });
    expect(commandFromFx(1, ['curse'], ctx)).toMatchObject({ heartsLost: 1 });
  });

  it('costs no hearts for a swing that only touches the board', () => {
    expect(commandFromFx(1, ['freeze'], ctx)).toMatchObject({ heartsLost: 0 });
    expect(commandFromFx(1, ['shuffle'], ctx)).toMatchObject({ heartsLost: 0 });
    // The launch beat: the shot is in the air, nothing has landed yet.
    expect(commandFromFx(1, ['projectile'], ctx)).toMatchObject({ heartsLost: 0 });
  });

  it('never floats a heart the hero did not actually lose', () => {
    expect(commandFromFx(1, ['hit'], { ...ctx, heartsLost: 0 })).toMatchObject({ heartsLost: 0 });
  });

  it('marks a blocked attack as a strike that cost nothing', () => {
    expect(commandFromFx(2, ['blocked'], ctx)).toMatchObject({ kind: 'strike', blocked: true, heartsLost: 0 });
  });

  it('treats a board effect (freeze / curse / shuffle) as a strike too, so the foe still swings', () => {
    expect(commandFromFx(3, ['freeze'], ctx)).toMatchObject({ kind: 'strike', blocked: false });
    expect(commandFromFx(4, ['shuffle'], ctx)).toMatchObject({ kind: 'strike' });
  });

  it('prefers death over everything else in the same step', () => {
    expect(commandFromFx(9, ['damage', 'defeated'], ctx)).toMatchObject({ kind: 'death', gold: 12, relic: true });
  });

  it('reads an interrupt and a phase break', () => {
    expect(commandFromFx(1, ['interrupt'], ctx)).toMatchObject({ kind: 'interrupt' });
    expect(commandFromFx(1, ['phase'], ctx)).toMatchObject({ kind: 'phase' });
  });

  it('ignores a bare telegraph — the wind-up is driven by combat.telegraph, not the feed', () => {
    expect(commandFromFx(1, ['telegraph'], ctx)).toBeNull();
    expect(commandFromFx(1, [], ctx)).toBeNull();
  });

  it('reads a heal / revive as a hero beat', () => {
    expect(commandFromFx(1, ['heal'], ctx)).toMatchObject({ kind: 'heal' });
    expect(commandFromFx(1, ['revive'], ctx)).toMatchObject({ kind: 'heal' });
  });
});

describe('commandsFromFeed', () => {
  // The arena must read the RAW fx feed. The stamped banner collapses a step to
  // one StatusId, and 'projectile' is not one — reading the banner made a
  // fireball land with no wind-down, no flinch, nothing on stage.
  it('reads a projectile attack the stamped-status path throws away', () => {
    const out = commandsFromFeed([{ id: 1, fx: ['projectile'] }], 0, ctx);
    expect(out.cmds).toHaveLength(1);
    expect(out.cmds[0]).toMatchObject({ kind: 'strike', color: 0xff8a00 });
  });

  it('only reads entries newer than the last one it saw', () => {
    const feed = [{ id: 1, fx: ['hit' as const, 'damage' as const] }, { id: 2, fx: ['interrupt' as const] }];
    expect(commandsFromFeed(feed, 1, ctx).cmds.map((c) => c.kind)).toEqual(['interrupt']);
    expect(commandsFromFeed(feed, 2, ctx).cmds).toHaveLength(0);
  });

  it('reports the newest id it consumed so the caller can advance its cursor', () => {
    expect(commandsFromFeed([{ id: 4, fx: ['telegraph'] }, { id: 9, fx: [] }], 0, ctx).lastId).toBe(9);
    expect(commandsFromFeed([], 5, ctx).lastId).toBe(5);
  });

  it('restarts from zero when the feed is emptied for a new fight', () => {
    expect(commandsFromFeed([{ id: 1, fx: ['hit'] }], 40, ctx).cmds).toHaveLength(1);
  });

  it('keeps every beat of a busy step instead of collapsing it to one banner', () => {
    const out = commandsFromFeed([{ id: 1, fx: ['freeze'] }, { id: 2, fx: ['damage', 'hit'] }], 0, ctx);
    expect(out.cmds.map((c) => c.kind)).toEqual(['strike', 'strike']);
  });
});

describe('effectColor', () => {
  it('returns a Pixi-safe 24-bit number for every attack effect', () => {
    for (const e of ['hit', 'freeze', 'curse', 'projectile', 'shuffle', 'drain'] as const) {
      const n = effectColor(e);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(0xffffff);
    }
  });
});
