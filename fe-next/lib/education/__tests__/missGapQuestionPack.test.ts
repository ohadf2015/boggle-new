/**
 * Miss-gap → Live question pack — Kahoot ChatGPT-app foil (in-product, no hop).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  QUICK_LAUNCH_FLOW,
  QUICK_LAUNCH_KEY,
  readQuickLaunchIntent,
} from '@/components/teacher/dashboard/quickLaunchIntent';
import {
  buildMissGapQuestionPackIntent,
  missGapQuestionPackLivePath,
  normalizeMissGapQuestionPackWords,
  stageMissGapQuestionPackLaunch,
} from '../missGapQuestionPack';

describe('normalizeMissGapQuestionPackWords', () => {
  it('dedupes case-insensitively and drops blanks', () => {
    expect(
      normalizeMissGapQuestionPackWords([' Neutron ', 'neutron', '', 'quark', '  ']),
    ).toEqual(['Neutron', 'quark']);
  });

  it('returns null when nothing usable remains', () => {
    expect(normalizeMissGapQuestionPackWords([])).toBeNull();
    expect(normalizeMissGapQuestionPackWords(['  ', ''])).toBeNull();
  });
});

describe('buildMissGapQuestionPackIntent', () => {
  it('builds a paste quickLaunch intent from missed words', () => {
    const intent = buildMissGapQuestionPackIntent({
      missedWords: ['neutron', 'quark'],
      title: 'Miss-gap reteach — Physics 101',
      language: 'en',
    });
    expect(intent).toEqual({
      source: 'paste',
      title: 'Miss-gap reteach — Physics 101',
      language: 'en',
      words: ['neutron', 'quark'],
    });
  });

  it('returns null without words, title, or language', () => {
    expect(
      buildMissGapQuestionPackIntent({
        missedWords: [],
        title: 'x',
        language: 'en',
      }),
    ).toBeNull();
    expect(
      buildMissGapQuestionPackIntent({
        missedWords: ['a'],
        title: '',
        language: 'en',
      }),
    ).toBeNull();
    expect(
      buildMissGapQuestionPackIntent({
        missedWords: ['a'],
        title: 'x',
        language: '',
      }),
    ).toBeNull();
  });
});

describe('missGapQuestionPackLivePath', () => {
  it('points at classroom-game express flow inside LexiClash', () => {
    expect(missGapQuestionPackLivePath('he')).toBe(
      `/he/education/classroom-game?flow=${QUICK_LAUNCH_FLOW}`,
    );
    expect(missGapQuestionPackLivePath('en')).not.toContain('chatgpt');
    expect(missGapQuestionPackLivePath('en')).not.toContain('openai');
  });
});

describe('stageMissGapQuestionPackLaunch', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes paste intent and returns the express path (no ChatGPT hop)', () => {
    const path = stageMissGapQuestionPackLaunch(
      {
        missedWords: ['neutron', 'quark'],
        title: 'Miss-gap pack — Physics',
        language: 'en',
      },
      1_700_000_000_000,
    );
    expect(path).toBe(`/en/education/classroom-game?flow=${QUICK_LAUNCH_FLOW}`);
    expect(path).not.toContain('chatgpt');
    const intent = readQuickLaunchIntent(1_700_000_000_000);
    expect(intent?.source).toBe('paste');
    expect(intent?.words).toEqual(['neutron', 'quark']);
    expect(store.has(QUICK_LAUNCH_KEY)).toBe(true);
  });

  it('returns null when there is nothing to stage', () => {
    expect(
      stageMissGapQuestionPackLaunch({
        missedWords: [],
        title: 'x',
        language: 'en',
      }),
    ).toBeNull();
  });
});
