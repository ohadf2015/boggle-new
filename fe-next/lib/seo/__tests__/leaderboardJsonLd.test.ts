import { describe, it, expect } from 'vitest';
import { buildLeaderboardFaqJsonLd, encodeJsonLd } from '../leaderboardJsonLd';

describe('leaderboardJsonLd', () => {
  describe('buildLeaderboardFaqJsonLd', () => {
    it('returns a FAQPage schema with mainEntity built from provided FAQs', () => {
      const faq = [
        { question: 'How is the leaderboard score calculated?', answer: 'Total score across games.' },
        { question: 'How often does it update?', answer: 'Real-time as games finish.' },
      ];
      const schema = buildLeaderboardFaqJsonLd('en', faq);
      expect(schema!['@context']).toBe('https://schema.org');
      expect(schema!['@type']).toBe('FAQPage');
      expect(schema!['@id']).toBe('https://www.lexiclash.live/en/leaderboard#faq');
      expect(schema!.mainEntity).toHaveLength(2);
      expect(schema!.mainEntity[0]).toMatchObject({
        '@type': 'Question',
        name: 'How is the leaderboard score calculated?',
        acceptedAnswer: { '@type': 'Answer', text: 'Total score across games.' },
      });
    });

    it('returns null when faq is empty', () => {
      expect(buildLeaderboardFaqJsonLd('en', [])).toBeNull();
    });

    it('uses locale in @id and falls back to en for unknown locale', () => {
      const he = buildLeaderboardFaqJsonLd('he', [{ question: 'q', answer: 'a' }]);
      expect(he!['@id']).toBe('https://www.lexiclash.live/he/leaderboard#faq');
      const xx = buildLeaderboardFaqJsonLd('zz', [{ question: 'q', answer: 'a' }]);
      expect(xx!['@id']).toBe('https://www.lexiclash.live/en/leaderboard#faq');
    });
  });

  describe('encodeJsonLd', () => {
    it('escapes < > & so a closing </script> tag in content cannot break out', () => {
      const out = encodeJsonLd({ x: '</script><img src=x onerror=alert(1)>' });
      expect(out).not.toContain('</script>');
      expect(out).not.toContain('<img');
      expect(out).toContain('\\u003c');
    });

    it('still produces valid JSON that round-trips', () => {
      const obj = { a: 1, b: 'hi <there>' };
      const decoded = JSON.parse(encodeJsonLd(obj));
      expect(decoded).toEqual(obj);
    });
  });

  describe('Russian (ru) locale support', () => {
    it('buildLeaderboardFaqJsonLd supports ru locale with ru URL', () => {
      const faq = [{ question: 'How is score calculated?', answer: 'By total wins.' }];
      const schema = buildLeaderboardFaqJsonLd('ru', faq);
      expect(schema!['@id']).toBe('https://www.lexiclash.live/ru/leaderboard#faq');
      expect(schema!.inLanguage).toBe('ru');
    });
  });
});
