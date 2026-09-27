import { describe, expect, it } from 'vitest';
import { emptyEstate } from '../estate';
import { type Db, estateToRow, loadEstate, mutateEstate } from '../estateServer';
import type { Wallet } from '../estateWallet';

/**
 * Word Tower coins ARE the app's coins: `profiles.total_coins` is the only
 * balance. The estate row keeps plots/tokens; its legacy `coins` column is
 * folded into the wallet once and never written with a balance again.
 */

type Row = Record<string, unknown>;

function fakeDb(estates: Row[], opts: { raceOnce?: boolean } = {}) {
  let clock = 0;
  let race = !!opts.raceOnce;
  const from = (table: string) => {
    if (table !== 'word_tower_estates') throw new Error(`unexpected table ${table}`);
    const filters: [string, unknown][] = [];
    let op: 'select' | 'update' | 'upsert' = 'select';
    let patch: Row = {};
    const run = () => {
      const hit = estates.filter((r) => filters.every(([k, v]) => r[k] === v));
      if (op === 'update') {
        if (race) {
          // Another tab wrote between our read and our compare-and-swap.
          race = false;
          for (const r of estates) r.updated_at = `other${++clock}`;
          return { data: [], error: null };
        }
        hit.forEach((r) => Object.assign(r, patch, { updated_at: `t${++clock}` }));
        return { data: hit.map((r) => ({ ...r })), error: null };
      }
      if (op === 'upsert') {
        if (!estates.some((r) => r.player_id === patch.player_id)) estates.push({ ...patch, updated_at: `t${++clock}` });
        return { data: null, error: null };
      }
      return { data: hit.map((r) => ({ ...r })), error: null };
    };
    const b = {
      select: () => b,
      eq: (k: string, v: unknown) => (filters.push([k, v]), b),
      update: (p: Row) => ((op = 'update'), (patch = p), b),
      upsert: (p: Row) => ((op = 'upsert'), (patch = p), b),
      maybeSingle: async () => ({ data: run().data?.[0] ?? null, error: null }),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  };
  return { from } as unknown as Db;
}

function fakeWallet(start: number) {
  const log: { delta: number; reason: string }[] = [];
  let bal = start;
  const wallet: Wallet = {
    balance: async () => bal,
    apply: async (_id, delta, reason) => {
      if (bal + delta < 0) return { ok: false, reason: 'insufficient' };
      bal += delta;
      log.push({ delta, reason });
      return { ok: true, balance: bal };
    },
  };
  return { wallet, log, get balance() { return bal; } };
}

const row = (coins: number): Row => ({ player_id: 'p1', ...estateToRow(emptyEstate()), coins, updated_at: 't0' });

describe('estate wallet', () => {
  it('given a wallet balance, when the estate loads, then its coins ARE the wallet', async () => {
    const w = fakeWallet(750);
    const got = await loadEstate(fakeDb([row(0)]), 'p1', w.wallet);
    expect(got?.estate.coins).toBe(750);
    expect(w.log).toEqual([]);
  });

  it('given legacy coins in the estate row, when it loads, then they move into the wallet exactly once', async () => {
    const estates = [row(489)];
    const db = fakeDb(estates);
    const w = fakeWallet(100);
    expect((await loadEstate(db, 'p1', w.wallet))?.estate.coins).toBe(589);
    expect(estates[0].coins).toBe(0);
    expect((await loadEstate(db, 'p1', w.wallet))?.estate.coins).toBe(589);
    expect(w.log).toEqual([{ delta: 489, reason: 'word_tower_estate_merge' }]);
  });

  it('given enough coins, when a step spends, then the wallet is debited and the row never stores a balance', async () => {
    const estates = [row(0)];
    const w = fakeWallet(100);
    const res = await mutateEstate(fakeDb(estates), 'p1', (e) => ({ ok: true, estate: { ...e, coins: e.coins - 60, runs: 1 }, extra: {} }), 3, w.wallet);
    expect(res.ok && res.estate.coins).toBe(40);
    expect(w.balance).toBe(40);
    expect(estates[0].coins).toBe(0);
    expect(estates[0].runs).toBe(1);
  });

  it('given a step that earns, when it commits, then the wallet is credited', async () => {
    const w = fakeWallet(10);
    const res = await mutateEstate(fakeDb([row(0)]), 'p1', (e) => ({ ok: true, estate: { ...e, coins: e.coins + 250 }, extra: {} }), 3, w.wallet);
    expect(res.ok && res.estate.coins).toBe(260);
    expect(w.log).toEqual([{ delta: 250, reason: 'word_tower_earn' }]);
  });

  it('given the wallet was drained elsewhere, when a spend lands, then nothing is written and the refusal says coins', async () => {
    const estates = [row(0)];
    const w = fakeWallet(100);
    const res = await mutateEstate(
      fakeDb(estates),
      'p1',
      (e) => {
        void w.wallet.apply('p1', -100, 'daily_retry'); // spent in another mode mid-request
        return { ok: true, estate: { ...e, coins: e.coins - 60, runs: 1 }, extra: {} };
      },
      3,
      w.wallet,
    );
    expect(res).toEqual({ ok: false, reason: 'coins' });
    expect(estates[0].runs).toBe(0);
    expect(w.balance).toBe(0);
  });

  it('given a lost compare-and-swap, when it retries, then the first debit is refunded and only one spend sticks', async () => {
    const estates = [row(0)];
    const w = fakeWallet(100);
    const res = await mutateEstate(fakeDb(estates, { raceOnce: true }), 'p1', (e) => ({ ok: true, estate: { ...e, coins: e.coins - 60 }, extra: {} }), 3, w.wallet);
    expect(res.ok && res.estate.coins).toBe(40);
    expect(w.balance).toBe(40);
    expect(w.log.map((l) => l.delta)).toEqual([-60, 60, -60]);
  });
});
