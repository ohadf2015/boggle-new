/**
 * Tests for Content Moderation Service
 * Verifies child-friendly and politics-free filtering of trends
 */

import { quickPoliticalFilter } from '../buzz/contentModerationService';
import { POLITICAL_KEYWORDS_BY_LANGUAGE } from '../buzz/constants';

describe('contentModerationService', () => {
  describe('quickPoliticalFilter', () => {
    describe('English political content', () => {
      const politicalTrends = [
        'Trump election rally',
        'Biden campaign speech',
        'Congress votes on bill',
        'Senate impeachment hearing',
        'Republican convention',
        'Democrat primary results',
        'NATO summit discussion',
        'War in Ukraine update',
        'Military invasion news',
        'Immigration border policy',
        'Gun control debate',
        'Abortion rights protest',
      ];

      test.each(politicalTrends)('should detect political content: "%s"', (trend) => {
        expect(quickPoliticalFilter(trend, 'en')).toBe(true);
      });
    });

    describe('Hebrew political content', () => {
      const hebrewPoliticalTrends = [
        'בחירות לכנסת',
        'נתניהו נאום',
        'הפגנה בתל אביב',
        'מלחמה בעזה',
        'צה"ל תקיפה',
        'חמאס התקפה',
        'ממשלה חדשה',
      ];

      test.each(hebrewPoliticalTrends)('should detect Hebrew political content: "%s"', (trend) => {
        expect(quickPoliticalFilter(trend, 'he')).toBe(true);
      });
    });

    describe('Non-political content', () => {
      const safeTrends = [
        'Taylor Swift concert',
        'iPhone 16 release',
        'World Cup soccer match',
        'New movie trailer',
        'Recipe for chocolate cake',
        'Dog training tips',
        'Weather forecast sunny',
        'Video game announcement',
        'Best vacation spots',
        'Music festival lineup',
      ];

      test.each(safeTrends)('should NOT flag safe content: "%s"', (trend) => {
        expect(quickPoliticalFilter(trend, 'en')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should be case-insensitive', () => {
        expect(quickPoliticalFilter('ELECTION NEWS', 'en')).toBe(true);
        expect(quickPoliticalFilter('Election News', 'en')).toBe(true);
        expect(quickPoliticalFilter('election news', 'en')).toBe(true);
      });

      it('should detect partial matches', () => {
        expect(quickPoliticalFilter('presidential campaign trail', 'en')).toBe(true);
        expect(quickPoliticalFilter('voting rights issue', 'en')).toBe(true);
      });

      it('should use English keywords as fallback for unsupported languages', () => {
        // French is not in our language list, should fall back to English keywords
        expect(quickPoliticalFilter('Trump rally', 'fr')).toBe(true);
        expect(quickPoliticalFilter('election day', 'fr')).toBe(true);
      });
    });
  });

  describe('POLITICAL_KEYWORDS_BY_LANGUAGE', () => {
    it('should have keywords for all supported languages', () => {
      const supportedLanguages = ['en', 'he', 'sv', 'ja', 'es'];
      supportedLanguages.forEach(lang => {
        expect(POLITICAL_KEYWORDS_BY_LANGUAGE[lang]).toBeDefined();
        expect(POLITICAL_KEYWORDS_BY_LANGUAGE[lang].length).toBeGreaterThan(10);
      });
    });

    it('should contain common political terms in English', () => {
      const englishKeywords = POLITICAL_KEYWORDS_BY_LANGUAGE.en;
      expect(englishKeywords).toContain('election');
      expect(englishKeywords).toContain('president');
      expect(englishKeywords).toContain('war');
      expect(englishKeywords).toContain('military');
    });

    it('should contain common political terms in Hebrew', () => {
      const hebrewKeywords = POLITICAL_KEYWORDS_BY_LANGUAGE.he;
      expect(hebrewKeywords).toContain('בחירות');
      expect(hebrewKeywords).toContain('מלחמה');
      expect(hebrewKeywords).toContain('כנסת');
    });
  });
});

describe('Child-friendly content guidelines', () => {
  describe('Content categories that should be approved', () => {
    const childFriendlyTopics = [
      'Disney movie release',
      'Pokemon new game',
      'Science experiment for kids',
      'Animal rescue story',
      'Space exploration discovery',
      'Olympic swimming record',
      'New roller coaster opens',
      'Minecraft update features',
      'Funny cat video viral',
      'Ice cream new flavor',
    ];

    test.each(childFriendlyTopics)('"%s" should be child-friendly', (topic) => {
      // These should NOT be flagged by quick political filter
      expect(quickPoliticalFilter(topic, 'en')).toBe(false);
    });
  });

  describe('Content that should be rejected for children', () => {
    const adultTopics = [
      'Election fraud allegations',
      'War casualties reported',
      'Terrorism attack news',
      'Political scandal revealed',
      'Military strike launched',
      'Protest violence erupts',
      'Border crisis update',
      'Impeachment vote results',
    ];

    test.each(adultTopics)('"%s" should be flagged', (topic) => {
      expect(quickPoliticalFilter(topic, 'en')).toBe(true);
    });
  });
});
