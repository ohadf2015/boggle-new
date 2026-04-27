/**
 * Tests for ReengagementEmailV2 (emails/reengagement-v2.tsx)
 *
 * Pure rendering tests — no Supabase/Resend mocks needed.
 * Covers: 5-language render, RTL + flipped shadows, mascot asset,
 * CTA/preview/unsubscribe wiring, giant letter tile, subject rotation.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@react-email/components';
import ReengagementEmailV2, {
  getReengagementSubjectV2,
  SUBJECT_LINES,
} from '@/emails/reengagement-v2';

const baseProps = {
  recipientName: 'Ohad',
  firstLetter: 'S',
  language: 'en',
  unsubscribeUrl: 'https://lexiclash.live/api/email/unsubscribe?token=abc',
  playUrl: 'https://lexiclash.live/en/daily',
};

async function renderHtml(overrides: Partial<typeof baseProps> = {}) {
  return render(ReengagementEmailV2({ ...baseProps, ...overrides }));
}

describe('ReengagementEmailV2 — component render', () => {
  it('renders HTML for English with greeting, pitch and CTA', async () => {
    const html = await renderHtml();
    expect(html).toContain('Ohad');
    expect(html).toMatch(/you\s*good/);
    // Apostrophes get HTML-encoded → match "Let" + "s go" loosely
    expect(html).toMatch(/Let.{1,10}s go/);
    // Branding now lives in the OG image alt text (text wordmark removed)
    expect(html).toContain('alt="LexiClash"');
  });

  it('includes the circular marshmallow mascot with alt text', async () => {
    const html = await renderHtml();
    expect(html).toContain('https://www.lexiclash.live/mascot/waving.gif');
    expect(html).toContain('Lexi waving hello');
    // Circular clipping — border-radius 9999px applied to the ring cell
    expect(html).toContain('border-radius:9999px');
  });

  it('uses the localized OG image as branded header (proves it is LexiClash)', async () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es']) {
      const html = await renderHtml({ language: lang });
      expect(html).toContain(`https://www.lexiclash.live/og-image-${lang}.jpg`);
      expect(html).toContain('alt="LexiClash"');
    }
  });

  it('renders tightened copy — drops the kettle/PS/urgency cruft', async () => {
    const html = await renderHtml();
    // Old wordy lines that were cut
    expect(html).not.toContain('kettle');
    expect(html).not.toContain('few friends asked about you');
    expect(html).not.toMatch(/Today.{1,10}s hint is ready when you are/);
    // New punchier replacements (apostrophes get HTML-encoded → tolerate)
    expect(html).toMatch(/Today.{1,10}s word is waiting/);
    expect(html).toMatch(/That.{1,10}s it/);
  });

  it('renders the giant letter tile with firstLetter', async () => {
    const html = await renderHtml({ firstLetter: 'Q' });
    // The tile contains the single letter
    expect(html).toMatch(/>\s*Q\s*</);
  });

  it('wires play + unsubscribe URLs into the markup', async () => {
    const html = await renderHtml();
    expect(html).toContain('https://lexiclash.live/en/daily');
    expect(html).toContain('https://lexiclash.live/api/email/unsubscribe?token=abc');
  });

  it('uses dir="ltr" for English', async () => {
    const html = await renderHtml();
    expect(html).toContain('dir="ltr"');
  });

  it('uses dir="rtl" and flips hard-shadow X offset for Hebrew', async () => {
    const html = await renderHtml({ language: 'he' });
    expect(html).toContain('dir="rtl"');
    // RTL shadows use negative X offset
    expect(html).toContain('-6px 6px 0px');
    // Hebrew copy present
    expect(html).toContain('הרמז שלך להיום');
  });

  it('renders Swedish copy', async () => {
    const html = await renderHtml({ language: 'sv' });
    expect(html).toContain('Din ledtråd för idag');
    expect(html).toContain('Nu kör vi');
  });

  it('renders Japanese copy', async () => {
    const html = await renderHtml({ language: 'ja' });
    expect(html).toContain('今日のヒント');
    expect(html).toContain('いこう');
  });

  it('renders Spanish copy', async () => {
    const html = await renderHtml({ language: 'es' });
    expect(html).toContain('Tu pista de hoy');
    expect(html).toContain('Vamos');
  });

  it('falls back to English for unknown language', async () => {
    const html = await renderHtml({ language: 'fr' });
    expect(html).toContain('Your hint for today');
  });

  it('also renders to plain text', async () => {
    const text = await render(ReengagementEmailV2(baseProps), { plainText: true });
    // Plain-text render uppercases headings — compare case-insensitively
    expect(text.toLowerCase()).toContain('ohad');
    expect(text.toLowerCase()).toContain("let's go");
  });
});

describe('getReengagementSubjectV2 — subject rotation', () => {
  it('returns a non-empty string for every supported language', () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es']) {
      const subject = getReengagementSubjectV2(lang, 'S', 'Ohad');
      expect(typeof subject).toBe('string');
      expect(subject.length).toBeGreaterThan(0);
    }
  });

  it('falls back to English lines for unknown language', () => {
    const subject = getReengagementSubjectV2('fr', 'S', 'Ohad');
    const enSubjects = SUBJECT_LINES.en.map((fn) => fn('S', 'Ohad'));
    expect(enSubjects).toContain(subject);
  });

  it('interpolates the first letter into letter-based subject lines', () => {
    // 6 lines in en — at least one bakes in the letter
    const allEn = SUBJECT_LINES.en.map((fn) => fn('Z', 'Ohad'));
    expect(allEn.some((s) => s.includes('Z'))).toBe(true);
  });

  it('interpolates the recipient name into name-based subject lines', () => {
    const allEn = SUBJECT_LINES.en.map((fn) => fn('S', 'Ohad'));
    expect(allEn.some((s) => s.includes('Ohad'))).toBe(true);
  });

  it('has 6 subject variants for each supported language', () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es']) {
      expect(SUBJECT_LINES[lang]).toHaveLength(6);
    }
  });
});

describe('ReengagementEmailV2 — stress copy guardrails', () => {
  // Stop death/crisis metaphors creeping back into re-engagement.
  // These targets disengaged users — guilt + medical imagery = churn driver.
  const STRESS_PHRASES_BY_LANG: Record<string, string[]> = {
    en: ['life support', 'streak is dying', 'last chance', "don't lose"],
    he: ['תלוי בחוט', 'בטיפול נמרץ', 'גוסס'],
    sv: ['intensiven', 'akuten', 'döende'],
    ja: ['瀕死', '危篤'],
    es: ['terapia intensiva', 'cuelga de un hilo', 'agonizando'],
  };

  it('rendered HTML contains no death/crisis metaphors per language', async () => {
    for (const [lang, phrases] of Object.entries(STRESS_PHRASES_BY_LANG)) {
      const html = await renderHtml({ language: lang });
      for (const phrase of phrases) {
        expect(html).not.toContain(phrase);
      }
    }
  });

  it('subject lines contain no death/crisis metaphors per language', () => {
    for (const [lang, phrases] of Object.entries(STRESS_PHRASES_BY_LANG)) {
      const subjects = SUBJECT_LINES[lang].map((fn) => fn('S', 'Ohad'));
      for (const phrase of phrases) {
        expect(subjects.some((s) => s.includes(phrase))).toBe(false);
      }
    }
  });

  it('Hebrew uses correct mascot spelling "לקסי" (not "וקסי" or bare "קסי")', async () => {
    const html = await renderHtml({ language: 'he' });
    const heSubjects = SUBJECT_LINES.he.map((fn) => fn('ש', 'אוהד'));
    expect(html).not.toContain('וקסי');
    for (const s of heSubjects) {
      expect(s).not.toContain('וקסי');
      // Bare "קסי" alone (not preceded by ל) is wrong — match word boundary
      expect(s).not.toMatch(/(^|[^ל])קסי/);
    }
  });
});
