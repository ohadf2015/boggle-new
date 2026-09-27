import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDailyPuzzle, generateFreeplayPuzzle } from '../generate.daily';

// The baked pool is a build artefact; stub it so this test asserts the ROUTING, not the content.
vi.mock('../bigPool', () => ({
  pickBigPuzzle: vi.fn(),
}));
import { pickBigPuzzle } from '../bigPool';

const mocked = vi.mocked(pickBigPuzzle);

describe('format routing', () => {
  beforeEach(() => mocked.mockReset());

  it('serves the mini from the runtime generator', async () => {
    const puzzle = await generateDailyPuzzle('2026-08-14', 'en', 'mini');
    expect(puzzle?.size).toBe(5);
    expect(mocked).not.toHaveBeenCalled();
  });

  it('serves the full board from the baked pool', async () => {
    mocked.mockResolvedValue({ size: 11 } as never);
    const puzzle = await generateDailyPuzzle('2026-08-14', 'en', 'full');
    expect(puzzle?.size).toBe(11);
    expect(mocked).toHaveBeenCalledOnce();
  });

  /**
   * The whole point of the format switch is that "Full" means full. Quietly handing back a 5×5
   * when the pool can't serve one would look exactly like the feature not working, and would be
   * invisible in logs — so the failure has to surface to the caller's error path instead.
   */
  it('returns null rather than downgrading a full request to a mini', async () => {
    mocked.mockResolvedValue(null);
    expect(await generateDailyPuzzle('2026-08-14', 'en', 'full')).toBeNull();
    expect(await generateFreeplayPuzzle(7, 'en', 'medium', 'full')).toBeNull();
  });

  it('gives the same board to everyone on the same date', async () => {
    const a = await generateDailyPuzzle('2026-08-14', 'en', 'mini');
    const b = await generateDailyPuzzle('2026-08-14', 'en', 'mini');
    expect(a?.slots.map((s) => s.answer)).toEqual(b?.slots.map((s) => s.answer));
  });

  it('keeps mini and full dailies on separate ids so their progress cannot collide', async () => {
    mocked.mockImplementation(async (_seed, _clues, meta) => ({ ...meta, size: 11 }) as never);
    const mini = await generateDailyPuzzle('2026-08-14', 'en', 'mini');
    const full = await generateDailyPuzzle('2026-08-14', 'en', 'full');
    expect(mini?.id).not.toBe(full?.id);
  });

  /**
   * Saved progress is keyed by puzzle id. Renaming the mini's id would orphan every solve that
   * was in flight when this deployed — a silent data loss that no test failure would surface.
   */
  it('leaves the mini ids byte-identical to the shipped format', async () => {
    expect((await generateDailyPuzzle('2026-08-14', 'en', 'mini'))?.id).toBe('en-daily-2026-08-14');
    expect((await generateFreeplayPuzzle(7, 'en'))?.id).toBe('en-free-7');
  });
});
