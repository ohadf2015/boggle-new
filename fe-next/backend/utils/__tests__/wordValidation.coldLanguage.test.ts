import { vi, describe, it, expect } from 'vitest';

const { loaded } = vi.hoisted(() => ({ loaded: new Set<string>() }));
const words = new Set(['כלב']);

vi.mock('@/backend/dictionary', () => ({
  isDictionaryWord: (w: string, lang: string) => (loaded.has(lang) ? words.has(w) : null),
  isValidWordLoaded: async (w: string, lang: string) => { loaded.add(lang); return words.has(w); },
}));
vi.mock('@/backend/modules/wordValidatorPool', () => ({ isWordOnBoardAsync: async () => true }));

import { validateAndScoreWord } from '../wordValidation';

describe('duel word check on a language no game has loaded yet', () => {
  it('loads the language instead of rejecting a real word', async () => {
    const result = await validateAndScoreWord('כלב', [['כ', 'ל', 'ב']], 'he', []);
    expect(result.valid).toBe(true);
  });
});
