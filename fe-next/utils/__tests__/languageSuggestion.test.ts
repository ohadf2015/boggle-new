import { describe, it, expect } from 'vitest';
import {
  mapToSupportedLanguage,
  detectPreferredLanguage,
  resolveSuggestedLanguage,
  isBrowserTranslating,
  SUGGESTION_COPY,
  SUPPORTED_SUGGESTION_LANGUAGES,
} from '../languageSuggestion';

describe('mapToSupportedLanguage', () => {
  it('maps a region-qualified tag to its primary supported language', () => {
    // Given a US-Spanish speaker's tag, When mapped, Then we get 'es'
    expect(mapToSupportedLanguage('es-MX')).toBe('es');
    expect(mapToSupportedLanguage('es-US')).toBe('es');
    expect(mapToSupportedLanguage('en-GB')).toBe('en');
  });

  it('maps the legacy Hebrew code "iw" to "he"', () => {
    expect(mapToSupportedLanguage('iw')).toBe('he');
    expect(mapToSupportedLanguage('iw-IL')).toBe('he');
  });

  it('offers Spanish to close Romance speakers we do not ship natively', () => {
    // A Brazilian (pt-BR) understands our Spanish bundle far better than English.
    expect(mapToSupportedLanguage('pt-BR')).toBe('es');
    expect(mapToSupportedLanguage('pt')).toBe('es');
    expect(mapToSupportedLanguage('it')).toBe('es');
  });

  it('returns null for unsupported or empty tags', () => {
    expect(mapToSupportedLanguage('fr-FR')).toBeNull();
    expect(mapToSupportedLanguage('de')).toBeNull();
    expect(mapToSupportedLanguage('')).toBeNull();
    expect(mapToSupportedLanguage(null)).toBeNull();
    expect(mapToSupportedLanguage(undefined)).toBeNull();
  });
});

describe('detectPreferredLanguage', () => {
  it('returns the first supported language in the browser preference list', () => {
    // The first (top-priority) supported preference wins.
    expect(detectPreferredLanguage(['en-US', 'en', 'es'])).toBe('en');
    // A Spanish-first speaker (e.g. US Latino) → es, even with region suffix.
    expect(detectPreferredLanguage(['es-419', 'es', 'en-US'])).toBe('es');
  });

  it('skips unsupported tags until it finds a supported one', () => {
    expect(detectPreferredLanguage(['fr-FR', 'de', 'ja'])).toBe('ja');
  });

  it('returns null when nothing is supported or list is empty', () => {
    expect(detectPreferredLanguage(['fr', 'de'])).toBeNull();
    expect(detectPreferredLanguage([])).toBeNull();
    expect(detectPreferredLanguage(undefined)).toBeNull();
  });
});

describe('resolveSuggestedLanguage', () => {
  const base = { current: 'en' as const, preferred: 'es' as const, explicit: false, dismissed: false, browserTranslating: false };

  it('suggests the native language when it differs and no explicit choice was made', () => {
    // The screenshot case: app is en, browser prefers es → offer es.
    expect(resolveSuggestedLanguage(base)).toBe('es');
  });

  it('does not suggest when the app is already in the preferred language', () => {
    expect(resolveSuggestedLanguage({ ...base, current: 'es' })).toBeNull();
  });

  it('does not suggest when there is no supported preference', () => {
    expect(resolveSuggestedLanguage({ ...base, preferred: null })).toBeNull();
  });

  it('does not suggest once dismissed for that language', () => {
    expect(resolveSuggestedLanguage({ ...base, dismissed: true })).toBeNull();
  });

  it('respects an explicit user choice (no nagging)', () => {
    expect(resolveSuggestedLanguage({ ...base, explicit: true })).toBeNull();
  });

  it('overrides an explicit choice when the browser is actively translating', () => {
    // Strong signal the explicit pick no longer matches what they want to read.
    expect(resolveSuggestedLanguage({ ...base, explicit: true, browserTranslating: true })).toBe('es');
  });

  it('still respects an explicit dismissal even under active translation', () => {
    expect(resolveSuggestedLanguage({ ...base, explicit: true, browserTranslating: true, dismissed: true })).toBeNull();
  });
});

describe('isBrowserTranslating', () => {
  const makeDoc = (setup: (html: HTMLElement) => void): Document => {
    const doc = document.implementation.createHTMLDocument('t');
    setup(doc.documentElement);
    return doc;
  };

  it('detects Google Translate via the translated-ltr/rtl class on <html>', () => {
    expect(isBrowserTranslating(makeDoc((html) => html.classList.add('translated-ltr')))).toBe(true);
    expect(isBrowserTranslating(makeDoc((html) => html.classList.add('translated-rtl')))).toBe(true);
  });

  it('detects injected Google Translate banner/skiptranslate nodes', () => {
    expect(
      isBrowserTranslating(
        makeDoc((html) => {
          const el = html.ownerDocument.createElement('div');
          el.className = 'skiptranslate';
          html.appendChild(el);
        }),
      ),
    ).toBe(true);
  });

  it('returns false for a normal, untranslated document', () => {
    expect(isBrowserTranslating(makeDoc(() => {}))).toBe(false);
    expect(isBrowserTranslating(undefined)).toBe(false);
  });
});

describe('SUGGESTION_COPY', () => {
  it('provides target-language copy for every supported language', () => {
    for (const lang of SUPPORTED_SUGGESTION_LANGUAGES) {
      const copy = SUGGESTION_COPY[lang];
      expect(copy).toBeTruthy();
      expect(copy.nativeName.length).toBeGreaterThan(0);
      expect(copy.prompt.length).toBeGreaterThan(0);
      expect(copy.accept.length).toBeGreaterThan(0);
      expect(copy.dismiss.length).toBeGreaterThan(0);
    }
  });

  it('writes the Spanish prompt in Spanish (so a US Spanish speaker understands it)', () => {
    expect(SUGGESTION_COPY.es.nativeName).toBe('Español');
    expect(SUGGESTION_COPY.es.prompt).toMatch(/Español/);
  });
});
