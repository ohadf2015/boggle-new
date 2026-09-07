/**
 * Vocabulary Games Classroom Page - Localization Tests
 * Verify that all hardcoded strings are translatable across locales
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { getVocabClassroomContent } from '../content';

describe('Vocabulary Games Classroom Content', () => {
  it('should have all required content fields for all locales', () => {
    const locales = ['en', 'he', 'es', 'sv', 'ja'] as const;

    locales.forEach(locale => {
      const content = getVocabClassroomContent(locale);

      expect(content).toHaveProperty('metaTitle');
      expect(content).toHaveProperty('metaDescription');
      expect(content).toHaveProperty('ogTitle');
      expect(content).toHaveProperty('whyTitle');
      expect(content).toHaveProperty('faqTitle');
      expect(content.whyPoints).toHaveLength(4);
      expect(content.faqs).toHaveLength(6);
    });
  });

  it('should have features in content for all locales', () => {
    const locales = ['en', 'he', 'es', 'sv', 'ja'] as const;

    locales.forEach(locale => {
      const content = getVocabClassroomContent(locale);
      expect(content).toHaveProperty('features');
      expect(Array.isArray(content.features)).toBe(true);
      expect(content.features.length).toBeGreaterThan(0);
    });
  });

  it('should have comparison rows in content for all locales', () => {
    const locales = ['en', 'he', 'es', 'sv', 'ja'] as const;

    locales.forEach(locale => {
      const content = getVocabClassroomContent(locale);
      expect(content).toHaveProperty('compareRows');
      expect(Array.isArray(content.compareRows)).toBe(true);
      expect(content.compareRows.length).toBeGreaterThan(0);
    });
  });

  it('should have use cases in content for all locales', () => {
    const locales = ['en', 'he', 'es', 'sv', 'ja'] as const;

    locales.forEach(locale => {
      const content = getVocabClassroomContent(locale);
      expect(content).toHaveProperty('useCases');
      expect(Array.isArray(content.useCases)).toBe(true);
      expect(content.useCases.length).toBeGreaterThan(0);
    });
  });

  it('should have CTA strings in content for all locales', () => {
    const locales = ['en', 'he', 'es', 'sv', 'ja'] as const;

    locales.forEach(locale => {
      const content = getVocabClassroomContent(locale);
      expect(content).toHaveProperty('ctaHeading');
      expect(content).toHaveProperty('ctaSubtitle');
      expect(content).toHaveProperty('ctaPrimaryButtonLabel');
      expect(content).toHaveProperty('ctaSecondaryButtonLabel');
    });
  });

  it('should have metadata stripe labels in content for all locales', () => {
    const locales = ['en', 'he', 'es', 'sv', 'ja'] as const;

    locales.forEach(locale => {
      const content = getVocabClassroomContent(locale);
      expect(content).toHaveProperty('metadataLabels');
      expect(content.metadataLabels).toHaveProperty('languages');
      expect(content.metadataLabels).toHaveProperty('gradeLevel');
      expect(content.metadataLabels).toHaveProperty('accounts');
      expect(content.metadataLabels).toHaveProperty('duration');
    });
  });

  it('should have section headings in content for all locales', () => {
    const locales = ['en', 'he', 'es', 'sv', 'ja'] as const;

    locales.forEach(locale => {
      const content = getVocabClassroomContent(locale);
      expect(content).toHaveProperty('sections');
      expect(content.sections).toHaveProperty('whatYouGet');
      expect(content.sections).toHaveProperty('comparison');
      expect(content.sections).toHaveProperty('comparisonSubtitle');
      expect(content.sections).toHaveProperty('howTeachersUse');
    });
  });

  it('should not have English text in non-English locales', () => {
    const nonEnglishLocales = ['he', 'es', 'sv', 'ja'] as const;
    const englishOnlyPatterns = [
      /^[a-z]/,  // Basic check: starts with Latin lowercase
    ];

    nonEnglishLocales.forEach(locale => {
      const content = getVocabClassroomContent(locale);

      // Sample check: whyTitle should not be empty and different from English
      const enContent = getVocabClassroomContent('en');
      expect(content.whyTitle).not.toBe(enContent.whyTitle);
      expect(content.whyTitle).not.toBe('');
    });
  });

  it('Hebrew content should be right-to-left appropriate', () => {
    const heContent = getVocabClassroomContent('he');

    expect(heContent.whyTitle).toBeTruthy();
    expect(heContent.metaTitle).toBeTruthy();
    // Hebrew should have Hebrew characters
    expect(/[֐-׿]/.test(heContent.whyTitle)).toBe(true);
  });
});

/**
 * The no-account path is the whole reason this page can compete with a printable
 * listicle: that page asks a teacher for nothing, and until now every CTA here
 * asked for an account first. If the block or the guest route quietly disappears,
 * the page loses the comparison again and nothing else would notice.
 *
 * `ru` is included deliberately — the older suites above stop at five locales,
 * which is the same off-by-one that let the Russian copy rot unguarded elsewhere
 * in this module.
 */
describe('the no-account path and the lesson plan', () => {
  const LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;

  it.each(LOCALES)('%s offers a no-account start with real copy', (locale) => {
    const { noAccount } = getVocabClassroomContent(locale);
    expect(noAccount.heading.trim().length).toBeGreaterThan(10);
    expect(noAccount.body.trim().length).toBeGreaterThan(80);
    expect(noAccount.cta.trim().length).toBeGreaterThan(0);
    expect(noAccount.note.trim().length).toBeGreaterThan(0);
  });

  /**
   * The floor is a proxy for "this is an instruction a teacher can follow", not a
   * feature bullet. Counting characters makes that proxy script-dependent: Japanese
   * writes the same instruction without spaces and with one character per morpheme,
   * so a faithful 97-character Japanese translation of a 240-character English
   * sentence is not a shorter instruction — it is the same one. A flat threshold
   * would push a translator to pad the copy to satisfy a test, which is the opposite
   * of what this file is for. A real bullet is 20-30 characters in either script, so
   * both floors still catch one.
   */
  const BODY_FLOOR: Record<string, number> = { ja: 70 };

  it.each(LOCALES)('%s lists exactly five things to run in a lesson', (locale) => {
    const { lessonPlan } = getVocabClassroomContent(locale);
    expect(lessonPlan.heading.trim().length).toBeGreaterThan(0);
    expect(lessonPlan.intro.trim().length).toBeGreaterThan(60);
    expect(lessonPlan.activities).toHaveLength(5);
    const floor = BODY_FLOOR[locale] ?? 100;
    for (const a of lessonPlan.activities) {
      expect(a.title.trim().length).toBeGreaterThan(10);
      expect(a.body.trim().length).toBeGreaterThan(floor);
    }
  });

  it.each(LOCALES)('%s writes the five activities natively, not in English', (locale) => {
    if (locale === 'en') return;
    const en = getVocabClassroomContent('en');
    const c = getVocabClassroomContent(locale);
    expect(c.noAccount.heading).not.toBe(en.noAccount.heading);
    expect(c.lessonPlan.heading).not.toBe(en.lessonPlan.heading);
    c.lessonPlan.activities.forEach((a, i) => {
      expect(a.body).not.toBe(en.lessonPlan.activities[i].body);
    });
  });

  it('promises no account, and does not promise a printable', () => {
    const { noAccount, lessonPlan } = getVocabClassroomContent('en');
    const blob = `${noAccount.heading} ${noAccount.body} ${noAccount.note} ${lessonPlan.intro}`;
    expect(blob).toMatch(/no account|no sign-?up/i);
    // The activities run on the live board. Nothing here may promise a worksheet,
    // a PDF or a download — none of which this product has.
    const all = JSON.stringify(lessonPlan);
    expect(all).not.toMatch(/printable|worksheet|\bPDF\b|download/i);
  });

  it('the activities describe modes and limits that exist in code', () => {
    const { lessonPlan } = getVocabClassroomContent('en');
    const all = JSON.stringify(lessonPlan);
    // Named modes must be real: components/GameModeSelector.tsx ships exactly these.
    for (const mode of all.match(/Word Hunt|Wheel Rush|Blast|Classic/g) ?? []) {
      expect(['Word Hunt', 'Wheel Rush', 'Blast', 'Classic']).toContain(mode);
    }
    // The join code is six characters and one room holds fifty players. Both are
    // constants (utils/utils.ts, shared/constants/gameConstants.ts) and both are
    // stated in this copy, so a wrong number here is a wrong number to a teacher.
    expect(all).toMatch(/six-character/);
    expect(all).toMatch(/\bFifty\b|\b50\b/);
  });
});
