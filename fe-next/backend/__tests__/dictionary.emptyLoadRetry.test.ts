/**
 * Regression: loadLanguage() swallows load errors, and ensureLanguageLoaded()
 * then marked the language as loaded anyway. One failed load left the word Set
 * empty for the life of the process — every later call short-circuited on
 * `loadedLanguages.has(lang)` and never retried, so the solver logged
 * "No dictionary available for language: es" forever (Sentry JAVASCRIPT-NEXTJS-208).
 *
 * The retry is throttled: a genuinely broken dictionary must not re-read a 30 MB
 * word file on every bot word-prep.
 */

let spanishLoadCalls = 0;
let spanishWordsToReturn: Set<string> = new Set();

vi.mock('../dictionaryLoaders', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../dictionaryLoaders')>();
  return {
    ...actual,
    loadSpanishDictionary: async () => {
      spanishLoadCalls++;
      return spanishWordsToReturn;
    },
    loadNounList: async () => new Set<string>(),
  };
});

import { dictionary } from '../dictionary';

const RETRY_MS = 60_000;

describe('ensureLanguageLoaded with a failed (empty) load', () => {
  beforeEach(() => {
    spanishLoadCalls = 0;
    spanishWordsToReturn = new Set();
    dictionary.unloadLanguage('es');
    dictionary.emptyLoadAt.delete('es');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries once the throttle expires instead of caching the empty dictionary forever', async () => {
    vi.useFakeTimers();

    await dictionary.ensureLanguageLoaded('es');
    expect(spanishLoadCalls).toBe(1);
    expect(dictionary.spanishWords.size).toBe(0);

    vi.advanceTimersByTime(RETRY_MS + 1);
    spanishWordsToReturn = new Set(['gato', 'perro']);

    await dictionary.ensureLanguageLoaded('es');
    expect(spanishLoadCalls).toBe(2);
    expect(dictionary.spanishWords.size).toBe(2);
  });

  it('does not re-read the dictionary on every call while the throttle holds', async () => {
    await dictionary.ensureLanguageLoaded('es');
    await dictionary.ensureLanguageLoaded('es');
    await dictionary.ensureLanguageLoaded('es');
    expect(spanishLoadCalls).toBe(1);
  });

  it('stops reloading once the dictionary is non-empty', async () => {
    spanishWordsToReturn = new Set(['gato']);
    await dictionary.ensureLanguageLoaded('es');
    await dictionary.ensureLanguageLoaded('es');
    expect(spanishLoadCalls).toBe(1);
  });
});
