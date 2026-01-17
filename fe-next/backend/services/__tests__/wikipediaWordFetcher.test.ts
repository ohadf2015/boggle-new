/**
 * Tests for Wikipedia Word Fetcher
 */

import {
  extractWordsFromFeaturedContent,
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
      expect(words[0].source).toBe('tfa');
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
      expect(words.some(w => w.source === 'mostread')).toBe(true);
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
      expect(words.some(w => w.source === 'onthisday')).toBe(true);
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
  });
});
