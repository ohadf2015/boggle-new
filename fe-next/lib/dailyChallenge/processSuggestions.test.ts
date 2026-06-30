import { describe, it, expect, vi } from 'vitest';
import { processSuggestions, type SuggestionDeps } from './processSuggestions';
import type { DailyWordVerdict } from '@/lib/ai-service/dailyWordJudge';

const ok = (meaning = 'a thing'): DailyWordVerdict => ({ ok: true, reason: 'common', meaning });
const bad = (reason = 'proper noun'): DailyWordVerdict => ({ ok: false, reason, meaning: '' });

function makeDeps(over: Partial<SuggestionDeps> = {}): SuggestionDeps {
  return {
    loadPending: vi.fn().mockResolvedValue([]),
    judge: vi.fn(),
    isRecentlyUsed: vi.fn().mockResolvedValue(false),
    openFutureDates: vi.fn().mockResolvedValue(['2026-07-07', '2026-07-06']),
    placeWord: vi.fn().mockResolvedValue(undefined),
    markSuggestion: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
}
const opts = { languages: ['he'] as const };

describe('processSuggestions', () => {
  it('approves a good suggestion and places it on the furthest open date', async () => {
    const deps = makeDeps({
      loadPending: vi.fn().mockResolvedValue([{ id: 's1', word: 'גלידה' }]),
      judge: vi.fn().mockResolvedValue(ok('קינוח קר')),
    });
    const s = await processSuggestions(deps, opts);
    expect(deps.placeWord).toHaveBeenCalledWith('he', '2026-07-07', 'גלידה', 'קינוח קר');
    expect(deps.markSuggestion).toHaveBeenCalledWith('s1', 'approved', 'common', { usedDate: '2026-07-07', meaning: 'קינוח קר' });
    expect(s.approved).toBe(1);
  });

  it('rejects a proper-noun suggestion with the judge reason, no placement', async () => {
    const deps = makeDeps({
      loadPending: vi.fn().mockResolvedValue([{ id: 's1', word: 'קובורג' }]),
      judge: vi.fn().mockResolvedValue(bad('German city')),
    });
    const s = await processSuggestions(deps, opts);
    expect(deps.placeWord).not.toHaveBeenCalled();
    expect(deps.markSuggestion).toHaveBeenCalledWith('s1', 'rejected', 'German city');
    expect(s.rejected).toBe(1);
  });

  it('rejects a recently-used word', async () => {
    const deps = makeDeps({
      loadPending: vi.fn().mockResolvedValue([{ id: 's1', word: 'גלידה' }]),
      judge: vi.fn().mockResolvedValue(ok()),
      isRecentlyUsed: vi.fn().mockResolvedValue(true),
    });
    const s = await processSuggestions(deps, opts);
    expect(deps.placeWord).not.toHaveBeenCalled();
    expect((deps.markSuggestion as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe('rejected');
    expect(s.rejected).toBe(1);
  });

  it('rejects an out-of-range length without calling the judge', async () => {
    const deps = makeDeps({
      loadPending: vi.fn().mockResolvedValue([{ id: 's1', word: 'אב' }]), // 2 letters, too short for he
      judge: vi.fn(),
    });
    const s = await processSuggestions(deps, opts);
    expect(deps.judge).not.toHaveBeenCalled();
    expect((deps.markSuggestion as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe('rejected');
    expect(s.rejected).toBe(1);
  });

  it('leaves suggestions pending when no open dates remain', async () => {
    const deps = makeDeps({
      loadPending: vi.fn().mockResolvedValue([{ id: 's1', word: 'גלידה' }]),
      judge: vi.fn().mockResolvedValue(ok()),
      openFutureDates: vi.fn().mockResolvedValue([]),
    });
    const s = await processSuggestions(deps, opts);
    expect(deps.placeWord).not.toHaveBeenCalled();
    expect(deps.markSuggestion).not.toHaveBeenCalled();
    expect(s.approved).toBe(0);
  });

  it('respects maxPerLanguage, leaving extra good suggestions pending', async () => {
    const deps = makeDeps({
      loadPending: vi.fn().mockResolvedValue([{ id: 's1', word: 'גלידה' }, { id: 's2', word: 'פרחים' }]),
      judge: vi.fn().mockResolvedValue(ok()),
    });
    const s = await processSuggestions(deps, { languages: ['he'], maxPerLanguage: 1 });
    expect(s.approved).toBe(1);
    expect(deps.placeWord).toHaveBeenCalledTimes(1);
  });

  it('records a failure and leaves pending when the judge throws', async () => {
    const deps = makeDeps({
      loadPending: vi.fn().mockResolvedValue([{ id: 's1', word: 'גלידה' }]),
      judge: vi.fn().mockRejectedValue(new Error('model down')),
    });
    const s = await processSuggestions(deps, opts);
    expect(deps.markSuggestion).not.toHaveBeenCalled();
    expect(s.failures.length).toBe(1);
  });
});
