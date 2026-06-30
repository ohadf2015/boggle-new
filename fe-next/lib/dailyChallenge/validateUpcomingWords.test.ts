import { describe, it, expect, vi } from 'vitest';
import { validateUpcomingWords, type ValidateDeps } from './validateUpcomingWords';
import type { DailyWordVerdict } from '@/lib/ai-service/dailyWordJudge';

const ok = (meaning = 'a thing'): DailyWordVerdict => ({ ok: true, reason: 'common', meaning });
const bad = (reason = 'proper noun'): DailyWordVerdict => ({ ok: false, reason, meaning: '' });

function makeDeps(over: Partial<ValidateDeps> = {}): ValidateDeps {
  return {
    loadRow: vi.fn().mockResolvedValue(null),
    judge: vi.fn(),
    getCandidates: vi.fn().mockResolvedValue([]),
    blockBankWord: vi.fn().mockResolvedValue(undefined),
    saveMeaning: vi.fn().mockResolvedValue(undefined),
    saveReplacement: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
}

const row = (o: Partial<ReturnType<typeof baseRow>> = {}) => ({ ...baseRow(), ...o });
function baseRow() {
  return { targetWord: 'WORD', overrideWord: null as string | null, overrideBy: null as string | null,
    meaning: null as string | null, validatedAt: null as string | null, updatedAt: '2026-06-30T00:00:00Z' };
}
const opts = { languages: ['he'] as const, dates: ['2026-07-01'] };

describe('validateUpcomingWords', () => {
  it('keeps a GOOD word and stores its meaning, no replacement', async () => {
    const deps = makeDeps({ loadRow: vi.fn().mockResolvedValue(row({ targetWord: 'גלידה' })), judge: vi.fn().mockResolvedValue(ok('קינוח קר')) });
    const s = await validateUpcomingWords(deps, opts);
    expect(deps.saveMeaning).toHaveBeenCalledWith('he', '2026-07-01', 'קינוח קר');
    expect(deps.saveReplacement).not.toHaveBeenCalled();
    expect(s.meaningsFilled).toBe(1);
    expect(s.replaced).toBe(0);
  });

  it('replaces a BAD word with the first GOOD bank candidate and blocks the bad word', async () => {
    const judge = vi.fn()
      .mockResolvedValueOnce(bad('German city'))   // served
      .mockResolvedValueOnce(ok('a flower'));       // candidate
    const deps = makeDeps({
      loadRow: vi.fn().mockResolvedValue(row({ targetWord: 'קובורג' })),
      judge,
      getCandidates: vi.fn().mockResolvedValue(['פרחים']),
    });
    const s = await validateUpcomingWords(deps, opts);
    expect(deps.blockBankWord).toHaveBeenCalledWith('he', 'קובורג');
    expect(deps.saveReplacement).toHaveBeenCalledWith('he', '2026-07-01', 'פרחים', 'a flower');
    expect(s.replaced).toBe(1);
  });

  it('blocks rejected candidates and picks the next GOOD one (cleans bank)', async () => {
    const judge = vi.fn()
      .mockResolvedValueOnce(bad('inflected'))  // served
      .mockResolvedValueOnce(bad('a name'))     // cand1
      .mockResolvedValueOnce(ok('a star'));     // cand2
    const deps = makeDeps({
      loadRow: vi.fn().mockResolvedValue(row({ targetWord: 'יעילותו' })),
      judge,
      getCandidates: vi.fn().mockResolvedValue(['סבסטיאן', 'כוכבים']),
    });
    const s = await validateUpcomingWords(deps, opts);
    expect(deps.blockBankWord).toHaveBeenCalledWith('he', 'יעילותו');
    expect(deps.blockBankWord).toHaveBeenCalledWith('he', 'סבסטיאן');
    expect(deps.saveReplacement).toHaveBeenCalledWith('he', '2026-07-01', 'כוכבים', 'a star');
    expect(s.replaced).toBe(1);
  });

  it('is idempotent: skips a row already validated with a meaning and no newer update', async () => {
    const deps = makeDeps({ loadRow: vi.fn().mockResolvedValue(row({
      targetWord: 'גלידה', meaning: 'קינוח', validatedAt: '2026-06-30T05:00:00Z', updatedAt: '2026-06-30T00:00:00Z' })) });
    const s = await validateUpcomingWords(deps, opts);
    expect(deps.judge).not.toHaveBeenCalled();
    expect(s.checked).toBe(1);
  });

  it('never replaces a human override; stores meaning only', async () => {
    const deps = makeDeps({
      loadRow: vi.fn().mockResolvedValue(row({ overrideWord: 'ירושלים', overrideBy: 'admin-uuid' })),
      judge: vi.fn().mockResolvedValue(bad('city')),
    });
    await validateUpcomingWords(deps, opts);
    expect(deps.saveReplacement).not.toHaveBeenCalled();
    expect(deps.blockBankWord).not.toHaveBeenCalled();
    expect(deps.saveMeaning).toHaveBeenCalled();
  });

  it('does not reuse a replacement word across days in the same run (no repeats)', async () => {
    const goodWords = new Set(['גלידה', 'מטריה']);
    const judge = vi.fn().mockImplementation((w: string) => Promise.resolve(goodWords.has(w) ? ok('treat') : bad('city')));
    // both days' served word bad; candidate pool offers two good words, day2 must not reuse day1's pick
    const deps = makeDeps({
      loadRow: vi.fn().mockResolvedValue(row({ targetWord: 'קובורג' })),
      judge,
      getCandidates: vi.fn().mockImplementation((_l, _c, exclude: Set<string>) =>
        Promise.resolve(['גלידה', 'מטריה'].filter((w) => !exclude.has(w)))),
    });
    const s = await validateUpcomingWords(deps, { languages: ['he'], dates: ['2026-07-01', '2026-07-02'] });
    const replaced = (deps.saveReplacement as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[2]);
    expect(replaced).toContain('גלידה');
    expect(new Set(replaced).size).toBe(replaced.length); // no duplicate replacement
    expect(s.replaced).toBe(2);
  });

  it('skips and records a failure when the judge throws on the served word', async () => {
    const deps = makeDeps({
      loadRow: vi.fn().mockResolvedValue(row({ targetWord: 'גלידה' })),
      judge: vi.fn().mockRejectedValue(new Error('Vertex down')),
    });
    const s = await validateUpcomingWords(deps, opts);
    expect(s.skipped).toBe(1);
    expect(s.failures.length).toBe(1);
    expect(deps.saveReplacement).not.toHaveBeenCalled();
  });
});
