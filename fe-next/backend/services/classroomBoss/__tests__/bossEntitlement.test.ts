import { describe, it, expect, vi } from 'vitest';
import { resolveBossForTeacher } from '../bossEntitlement';

vi.mock('../../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const FUTURE = new Date(Date.now() + 30 * 86_400_000).toISOString();
const proRow = { tier: 'pro', status: 'active', source: 'polar', current_period_end: FUTURE };

describe('resolveBossForTeacher (server-side boss roster)', () => {
  it('given a free teacher asking for a Pro boss, then the room gets the Lexicon Dragon', async () => {
    const lookup = vi.fn().mockResolvedValue({ row: null });
    expect(await resolveBossForTeacher('t1', 'spellingBee', { lookup })).toBe('lexiconDragon');
  });

  it('given a Pro teacher, then the chosen boss is kept', async () => {
    const lookup = vi.fn().mockResolvedValue({ row: proRow });
    expect(await resolveBossForTeacher('t1', 'spellingBee', { lookup })).toBe('spellingBee');
  });

  it('given a lapsed Pro row, then it falls back to the free boss', async () => {
    const lookup = vi.fn().mockResolvedValue({ row: { ...proRow, status: 'canceled' } });
    expect(await resolveBossForTeacher('t1', 'msGrammar', { lookup })).toBe('lexiconDragon');
  });

  it('given the Pro lookup fails, then it fails closed to the free boss', async () => {
    const lookup = vi.fn().mockRejectedValue(new Error('db down'));
    expect(await resolveBossForTeacher('t1', 'msGrammar', { lookup })).toBe('lexiconDragon');
    const errored = vi.fn().mockResolvedValue({ row: null, error: 'timeout' });
    expect(await resolveBossForTeacher('t1', 'msGrammar', { lookup: errored })).toBe('lexiconDragon');
  });

  it('given the free boss or no boss, then no lookup is made', async () => {
    const lookup = vi.fn();
    expect(await resolveBossForTeacher('t1', 'lexiconDragon', { lookup })).toBe('lexiconDragon');
    expect(await resolveBossForTeacher('t1', undefined, { lookup })).toBeUndefined();
    expect(await resolveBossForTeacher('t1', 'notABoss', { lookup })).toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
  });
});
