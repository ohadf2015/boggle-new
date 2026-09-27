/**
 * Tests for Wikipedia Word Fetcher
 */

import {
  extractWordsFromFeaturedContent,
  extractWordsFromText,
  isStopword,
  WikipediaFeaturedContent
} from '../wikipediaWordFetcher';

describe('WikipediaWordFetcher', () => {
  describe('extractWordsFromFeaturedContent', () => {
    it('should extract words from Today\'s Featured Article', () => {
      const content: WikipediaFeaturedContent = {
        tfa: {
          title: 'Mount Everest',
          displaytitle: 'Mount Everest',
          content_urls: {
            desktop: { page: 'https://en.wikipedia.org/wiki/Mount_Everest' }
          }
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'en');

      expect(words.length).toBeGreaterThan(0);
      expect(words.some(w => w.word === 'MOUNT' || w.word === 'EVEREST')).toBe(true);
      // Source now includes specificity (tfa_title, tfa_extract, etc.)
      expect(words[0].source.startsWith('tfa')).toBe(true);
    });

    it('should extract words from Most Read articles', () => {
      const content: WikipediaFeaturedContent = {
        mostread: {
          articles: [
            { title: 'Artificial Intelligence', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/AI' } } },
            { title: 'Climate Change', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Climate' } } }
          ]
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'en');

      expect(words.length).toBeGreaterThan(0);
      // Source now includes specificity (mostread_title, mostread_extract, etc.)
      expect(words.some(w => w.source.startsWith('mostread'))).toBe(true);
    });

    it('should filter out short words for English', () => {
      const content: WikipediaFeaturedContent = {
        tfa: {
          title: 'The Art of War'
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'en');

      // 'The', 'Art', 'of', 'War' - only 'none' should pass (all < 4 letters or too common)
      const shortWords = words.filter(w => w.word.length < 4);
      expect(shortWords.length).toBe(0);
    });

    it('should handle Japanese words correctly', () => {
      const content: WikipediaFeaturedContent = {
        tfa: {
          title: '東京'
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'ja');

      expect(words.length).toBe(1);
      expect(words[0].word).toBe('東京');
    });

    it('should handle Hebrew words correctly', () => {
      const content: WikipediaFeaturedContent = {
        tfa: {
          title: 'ירושלים'
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'he');

      expect(words.length).toBe(1);
      expect(words[0].word).toBe('ירושלים');
    });

    it('should remove parenthetical content from titles', () => {
      const content: WikipediaFeaturedContent = {
        tfa: {
          title: 'Avatar (2009 film)'
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'en');

      // Should not include "(2009", "film)", "2009", etc.
      const hasYear = words.some(w => /\d/.test(w.word));
      expect(hasYear).toBe(false);
      expect(words.some(w => w.word === 'AVATAR')).toBe(true);
    });

    it('should handle empty content gracefully', () => {
      const content: WikipediaFeaturedContent = {};

      const words = extractWordsFromFeaturedContent(content, 'en');

      expect(words).toEqual([]);
    });

    it('should extract from On This Day events', () => {
      const content: WikipediaFeaturedContent = {
        onthisday: [
          {
            text: 'Historical event',
            pages: [
              { title: 'Napoleon Bonaparte' }
            ]
          }
        ]
      };

      const words = extractWordsFromFeaturedContent(content, 'en');

      expect(words.length).toBeGreaterThan(0);
      // Source now includes specificity (onthisday_title, onthisday_extract, etc.)
      expect(words.some(w => w.source.startsWith('onthisday'))).toBe(true);
    });

    it('should convert words to uppercase for Latin languages', () => {
      const content: WikipediaFeaturedContent = {
        tfa: {
          title: 'quantum mechanics'
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'en');

      words.forEach(w => {
        expect(w.word).toBe(w.word.toUpperCase());
      });
    });

    it('should extract words from article extracts (summaries)', () => {
      const content: WikipediaFeaturedContent = {
        tfa: {
          title: 'Jarrett_Stidham',
          extract: 'Jarrett Ryan Stidham is an American professional football quarterback for the Denver Broncos of the National Football League.',
          content_urls: {
            desktop: { page: 'https://en.wikipedia.org/wiki/Jarrett_Stidham' }
          }
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'en');

      // Should extract words like FOOTBALL, DENVER, BRONCOS from the extract
      expect(words.length).toBeGreaterThan(0);
      expect(words.some(w => w.word === 'FOOTBALL' || w.word === 'DENVER' || w.word === 'BRONCOS')).toBe(true);
      expect(words.some(w => w.source.includes('extract'))).toBe(true);
    });

    it('should extract words from article descriptions', () => {
      const content: WikipediaFeaturedContent = {
        mostread: {
          articles: [
            {
              title: 'Greenland',
              description: 'Island country in North America',
              content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Greenland' } }
            }
          ]
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'en');

      expect(words.length).toBeGreaterThan(0);
      // Should extract ISLAND, COUNTRY, or NORTH from description
      expect(words.some(w => w.word === 'ISLAND' || w.word === 'COUNTRY' || w.word === 'NORTH')).toBe(true);
    });

    it('should use normalized title when available', () => {
      const content: WikipediaFeaturedContent = {
        tfa: {
          title: 'Mount_Everest',  // URL format with underscores
          titles: {
            normalized: 'Mount Everest',
            canonical: 'Mount_Everest'
          },
          content_urls: {
            desktop: { page: 'https://en.wikipedia.org/wiki/Mount_Everest' }
          }
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'en');

      // Should correctly extract MOUNT and EVEREST
      expect(words.some(w => w.word === 'MOUNT' || w.word === 'EVEREST')).toBe(true);
    });

    it('should handle titles with underscores (URL format)', () => {
      const content: WikipediaFeaturedContent = {
        tfa: {
          title: 'Climate_Change'  // Using shorter words (6 chars each)
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'en');

      // Should correctly parse despite underscores
      // Note: "Climate" and "Change" are each 6-7 chars, within 4-8 limit
      expect(words.some(w => w.word === 'CLIMATE' || w.word === 'CHANGE')).toBe(true);
    });

    it('should deduplicate words across sources', () => {
      const content: WikipediaFeaturedContent = {
        tfa: {
          title: 'Football',
          extract: 'Football is a family of team sports.'
        }
      };

      const words = extractWordsFromFeaturedContent(content, 'en');

      // FOOTBALL should appear only once even though it's in title and extract
      const footballWords = words.filter(w => w.word === 'FOOTBALL');
      expect(footballWords.length).toBe(1);
    });
  });

  describe('extractWordsFromText', () => {
    it('should extract valid words from text', () => {
      const text = 'The quick brown foxes jumps over the lazy dogs';
      const words = extractWordsFromText(text, 'en');

      expect(words.length).toBeGreaterThan(0);
      expect(words).toContain('QUICK');
      expect(words).toContain('BROWN');
      expect(words).toContain('FOXES');
      expect(words).toContain('JUMPS');
      expect(words).toContain('LAZY');
      expect(words).toContain('DOGS');
    });

    it('should filter out stopwords', () => {
      const text = 'The quick and the brown foxes with their lazy dogs';
      const words = extractWordsFromText(text, 'en');

      // Should not contain stopwords like THE, AND, WITH, THEIR
      expect(words).not.toContain('THE');
      expect(words).not.toContain('AND');
      expect(words).not.toContain('WITH');
      expect(words).not.toContain('THEIR');
    });

    it('should respect maxWords limit', () => {
      const text = 'Alpha beta gamma delta epsilon zeta theta iota kappa lambda';
      const words = extractWordsFromText(text, 'en', 3);

      expect(words.length).toBeLessThanOrEqual(3);
    });

    it('should filter out words shorter than 4 characters', () => {
      const text = 'The big cat ran far';
      const words = extractWordsFromText(text, 'en');

      // No short words should be included
      words.forEach(w => {
        expect(w.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('should filter out words longer than 8 characters', () => {
      const text = 'Understanding international relationships';
      const words = extractWordsFromText(text, 'en');

      // No long words should be included (all > 8 chars)
      expect(words.length).toBe(0);
    });

    it('should handle empty text', () => {
      const words = extractWordsFromText('', 'en');
      expect(words).toEqual([]);
    });

    it('should handle text with punctuation', () => {
      const text = 'Hello, testing! Playing games... music?';
      const words = extractWordsFromText(text, 'en');

      // Words should be cleaned of punctuation
      // Note: 'world' is in stopwords list, so using other valid words
      expect(words).toContain('HELLO');
      expect(words).toContain('TESTING');
      expect(words).toContain('PLAYING');
      expect(words).toContain('GAMES');
      expect(words).toContain('MUSIC');
    });

    it('should deduplicate words', () => {
      const text = 'Football football FOOTBALL Football';
      const words = extractWordsFromText(text, 'en');

      // Should have only one instance of FOOTBALL
      expect(words.filter(w => w === 'FOOTBALL').length).toBe(1);
    });
  });

  describe('isStopword', () => {
    it('should identify English stopwords', () => {
      expect(isStopword('THE', 'en')).toBe(true);
      expect(isStopword('AND', 'en')).toBe(true);
      expect(isStopword('FOR', 'en')).toBe(true);
      expect(isStopword('THEIR', 'en')).toBe(true);
    });

    it('should not flag non-stopwords', () => {
      expect(isStopword('FOOTBALL', 'en')).toBe(false);
      expect(isStopword('MOUNTAIN', 'en')).toBe(false);
      expect(isStopword('SCIENCE', 'en')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isStopword('the', 'en')).toBe(true);
      expect(isStopword('The', 'en')).toBe(true);
      expect(isStopword('THE', 'en')).toBe(true);
    });

    it('should identify German stopwords', () => {
      expect(isStopword('UND', 'de')).toBe(true);
      expect(isStopword('DER', 'de')).toBe(true);
    });

    it('should identify Swedish stopwords', () => {
      expect(isStopword('OCH', 'sv')).toBe(true);
      expect(isStopword('ATT', 'sv')).toBe(true);
    });

    it('should identify Spanish stopwords', () => {
      expect(isStopword('QUE', 'es')).toBe(true);
      expect(isStopword('PARA', 'es')).toBe(true);
    });

    it('should identify French stopwords', () => {
      expect(isStopword('QUE', 'fr')).toBe(true);
      expect(isStopword('LES', 'fr')).toBe(true);
    });
  });
});
