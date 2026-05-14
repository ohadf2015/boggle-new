/**
 * Tests for ReengagementEmailV2 (emails/reengagement-v2.tsx)
 *
 * Pure rendering tests — no Supabase/Resend mocks needed.
 * Covers: 5-language render, RTL + flipped shadows + bidi-isolated name,
 * v5 hero asset, lime caption band, CTA/preview/unsubscribe wiring,
 * recessed tile board, subject rotation.
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
    expect(html).toMatch(/long time no spell/);
    // Apostrophes get HTML-encoded → match the CTA loosely
    expect(html).toMatch(/Play today.{1,10}s word/i);
    // Branding lives in the hero illustration alt text (text wordmark removed)
    expect(html).toMatch(/alt="LexiClash[^"]*"/);
  });

  it('uses the v5 cool dynamic Lexi hero with descriptive alt text', async () => {
    const html = await renderHtml();
    // v5 hero: cool "animation-still" Lexi (translucent white cube mascot,
    // confident expression, motion streaks) bursting in with a "?" tile +
    // tumbling neo-brutalist letter tiles. Locale-agnostic 1104×468 JPEG.
    expect(html).toContain('https://www.lexiclash.live/email/reengagement-hero-v5.jpg');
    // Alt mentions brand + the visual subject (a11y + brand recall when images blocked)
    expect(html).toMatch(/alt="LexiClash[^"]*"/);
    // Old hero assets must be fully retired
    expect(html).not.toContain('reengagement-hero-v3');
    expect(html).not.toContain('reengagement-hero-v4');
    // Hero card is hard-shadowed neo-brutalist — 6px offset shadow, no blur
    expect(html).toMatch(/box-shadow:[^"';]*6px 6px 0px/);
    // Hero card scales fluidly across email clients (max-width 560 + width 100%)
    expect(html).toMatch(/max-width:560px/);
  });

  it('wraps the action block (greeting → CTA) in a neo-brutalist card matching the hero', async () => {
    const html = await renderHtml();
    // The action card uses the same hard-shadow + thick border treatment as the
    // hero card + lime caption band — so the email reads as cohesive stacked
    // units rather than "card + loose stack".
    const heroShadows = html.match(/6px 6px 0px/g) || [];
    // ≥ 3 occurrences: hero card + caption band + action card (CTA shadow is
    // also there but this lower-bound proves the action wrapper exists).
    expect(heroShadows.length).toBeGreaterThanOrEqual(3);
    // Action card declares the action-card class so client CSS can target it.
    expect(html).toContain('action-card');
  });

  it('flips the action-card hard-shadow X offset for Hebrew (RTL)', async () => {
    const html = await renderHtml({ language: 'he' });
    // RTL shadows use negative X offset across hero + caption band + action card.
    const rtlShadows = html.match(/-6px 6px 0px/g) || [];
    expect(rtlShadows.length).toBeGreaterThanOrEqual(2);
  });

  it('isolates the recipient name as LTR so RTL punctuation cannot reorder it', async () => {
    // A Latin name dropped raw into an RTL greeting drags the comma to the wrong
    // side ("Fish ,הכל טוב?"). The name must render inside an LTR isolate span.
    const html = await renderHtml({ language: 'he', recipientName: 'Fish' });
    expect(html).toMatch(/<span[^>]*dir="ltr"[^>]*>Fish<\/span>/);
    expect(html).toMatch(/unicode-bidi:\s*isolate/);
  });

  it('hero illustration is locale-agnostic — same v5 asset across all 5 languages', async () => {
    // Single shared illustration (Lexi) carries no language-specific text,
    // so the hero asset is identical across every locale.
    const heroUrls = new Set<string>();
    for (const lang of ['en', 'he', 'sv', 'ja', 'es']) {
      const html = await renderHtml({ language: lang });
      const match = html.match(/src="(https:\/\/www\.lexiclash\.live\/email\/reengagement-hero-v5[^"]+)"/);
      expect(match).not.toBeNull();
      heroUrls.add(match![1]);
      // Old per-locale OG cards must NOT leak back in
      expect(html).not.toContain(`og-image-${lang}.jpg`);
    }
    expect(heroUrls.size).toBe(1);
  });

  it('renders the bold lime caption band per locale', async () => {
    // The caption now lives in a dedicated lime color-block band between the
    // hero and the action card. Each locale ships its own caption.
    const expected: Record<string, string> = {
      en: "Today's puzzle is live",
      he: 'החידה של היום עלתה',
      sv: 'Dagens pussel är ute',
      ja: '今日のパズル、公開中',
      es: 'El reto de hoy ya está',
    };
    for (const [lang, caption] of Object.entries(expected)) {
      const html = await renderHtml({ language: lang });
      // Apostrophes get HTML-encoded — match loosely for English only
      if (lang === 'en') {
        expect(html).toMatch(/Today.{1,10}s puzzle is live/);
      } else {
        expect(html).toContain(caption);
      }
    }
    // The band carries the caption-band class for client dark-mode targeting.
    const enHtml = await renderHtml();
    expect(enHtml).toContain('caption-band');
  });

  it('renders tightened copy — drops the kettle/PS/urgency cruft', async () => {
    const html = await renderHtml();
    // Old wordy lines that were cut
    expect(html).not.toContain('kettle');
    expect(html).not.toContain('few friends asked about you');
    expect(html).not.toMatch(/Today.{1,10}s hint is ready when you are/);
    // New punchier replacements (apostrophes get HTML-encoded → tolerate)
    expect(html).toMatch(/Today.{1,10}s puzzle is live/);
    // Stronger pitch reframes the task as low-effort.
    expect(html.toLowerCase()).toMatch(/30 seconds/);
    expect(html.toLowerCase()).toMatch(/whole thing/);
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
    expect(html).toContain('מתחילה באות');
  });

  it('renders Swedish copy', async () => {
    const html = await renderHtml({ language: 'sv' });
    expect(html).toContain('Börjar på');
    expect(html).toContain('Spela dagens ord');
  });

  it('renders Japanese copy', async () => {
    const html = await renderHtml({ language: 'ja' });
    expect(html).toContain('最初の文字は');
    expect(html).toContain('今日の単語で遊ぶ');
  });

  it('renders Spanish copy', async () => {
    const html = await renderHtml({ language: 'es' });
    expect(html).toContain('Empieza con');
    expect(html).toContain('Jugar la palabra de hoy');
  });

  it('falls back to English for unknown language', async () => {
    const html = await renderHtml({ language: 'fr' });
    expect(html).toContain('Starts with');
  });

  it('also renders to plain text', async () => {
    const text = await render(ReengagementEmailV2(baseProps), { plainText: true });
    // Plain-text render uppercases headings — compare case-insensitively
    expect(text.toLowerCase()).toContain('ohad');
    expect(text.toLowerCase()).toContain("play today's word");
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

describe('ReengagementEmailV2 — puzzle-row visual', () => {
  it('renders a row of N tiles from wordLength prop, first filled with letter, rest blank', async () => {
    const html = await renderHtml({ firstLetter: 'S', wordLength: 5 } as never);
    // Filled tile contains the letter (visible Q-style match works for S too)
    expect(html).toMatch(/>\s*S\s*</);
    // Blank-tile slot has a non-breaking-space placeholder (so html escapes to &nbsp;)
    const blanks = (html.match(/data-blank-tile="1"/g) || []).length;
    // 5-letter word → 1 filled + 4 blanks
    expect(blanks).toBe(4);
  });

  it('defaults to 4 blank tiles when wordLength is missing or out of range', async () => {
    const html = await renderHtml();
    const blanks = (html.match(/data-blank-tile="1"/g) || []).length;
    expect(blanks).toBe(3); // default total 4 tiles → 1 filled + 3 blank
  });

  it('clamps wordLength to a 2–8 tile range to protect mobile layout', async () => {
    const huge = await renderHtml({ wordLength: 99 } as never);
    const hugeBlanks = (huge.match(/data-blank-tile="1"/g) || []).length;
    expect(hugeBlanks).toBeLessThanOrEqual(7); // capped at 8 total

    const tiny = await renderHtml({ wordLength: 1 } as never);
    const tinyBlanks = (tiny.match(/data-blank-tile="1"/g) || []).length;
    expect(tinyBlanks).toBeGreaterThanOrEqual(1); // floored at 2 total
  });

  it('renders the tiles inside a recessed game-board panel', async () => {
    const html = await renderHtml();
    expect(html).toContain('tile-board');
  });
});

describe('ReengagementEmailV2 — personalization hooks', () => {
  it('renders the missed-days loss-aversion line when daysSinceLastPlay >= 7', async () => {
    const html = await renderHtml({ daysSinceLastPlay: 14 } as never);
    // Number is interpolated into the line
    expect(html).toContain('14');
    // The phrase contains "off the grid" (EN copy)
    expect(html.toLowerCase()).toContain('off the grid');
  });

  it('hides the missed-days line when daysSinceLastPlay < 7 (avoids "1 days" weirdness)', async () => {
    const html = await renderHtml({ daysSinceLastPlay: 3 } as never);
    expect(html.toLowerCase()).not.toContain('off the grid');
  });

  it('hides the missed-days line when daysSinceLastPlay is undefined', async () => {
    const html = await renderHtml();
    expect(html.toLowerCase()).not.toContain('off the grid');
  });

  it('renders the social-proof line when playersToday >= 50', async () => {
    const html = await renderHtml({ playersToday: 1847 } as never);
    // Number rendered with locale grouping ("1,847" in en-US)
    expect(html).toMatch(/1[,  ]?847/);
    expect(html.toLowerCase()).toContain('already');
  });

  it('hides the social-proof line when playersToday < 50 (avoids "12 players" awkwardness)', async () => {
    const html = await renderHtml({ playersToday: 12 } as never);
    expect(html.toLowerCase()).not.toContain('already cracked');
  });

  it('renders the hours-left urgency chip when hoursUntilReset < 12', async () => {
    const html = await renderHtml({ hoursUntilReset: 6 } as never);
    expect(html).toMatch(/\b6h\b/);
    expect(html.toLowerCase()).toMatch(/(reset|before)/);
  });

  it('hides the hours-left chip when reset is more than 12h away', async () => {
    const html = await renderHtml({ hoursUntilReset: 18 } as never);
    expect(html).not.toMatch(/\b18h\b/);
  });

  it('renders all 3 hooks together when all metrics are above threshold', async () => {
    const html = await renderHtml({
      daysSinceLastPlay: 21,
      playersToday: 2400,
      hoursUntilReset: 4,
    } as never);
    expect(html).toContain('21');
    expect(html).toMatch(/2[,  ]?400/);
    expect(html).toMatch(/\b4h\b/);
  });

  it('gracefully renders without errors when zero metrics are provided', async () => {
    // No new props provided → component still renders, just without personalization chips.
    const html = await renderHtml();
    expect(html.length).toBeGreaterThan(1000);
    expect(html).toContain('Ohad');
  });

  it('localizes the missed-days line in Hebrew', async () => {
    const html = await renderHtml({ language: 'he', daysSinceLastPlay: 21 } as never);
    expect(html).toContain('21');
    expect(html).toMatch(/ימים/);
  });

  it('localizes the social-proof line in Japanese', async () => {
    const html = await renderHtml({ language: 'ja', playersToday: 1200 } as never);
    expect(html).toMatch(/1[,  ]?200/);
    expect(html).toContain('人');
  });

  it('localizes the hours-left chip in Spanish', async () => {
    const html = await renderHtml({ language: 'es', hoursUntilReset: 5 } as never);
    expect(html).toMatch(/\b5h\b/);
    expect(html.toLowerCase()).toContain('antes');
  });

  it('localizes the missed-days line in Swedish', async () => {
    const html = await renderHtml({ language: 'sv', daysSinceLastPlay: 18 } as never);
    expect(html).toContain('18');
    expect(html.toLowerCase()).toContain('dagar');
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
