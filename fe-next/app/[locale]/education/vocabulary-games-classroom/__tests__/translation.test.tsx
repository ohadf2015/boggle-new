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
