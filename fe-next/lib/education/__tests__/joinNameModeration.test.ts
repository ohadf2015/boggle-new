import { describe, it, expect, vi } from 'vitest';
import { isProfaneJoinName, joinNameLocale, moderateJoinName } from '../joinNameModeration';

describe('isProfaneJoinName', () => {
  it.each(['fuck', 'Shit head', 'fuck!', 'b.i.t.c.h', 'f u c k'])('Given %s, Then it is caught', (name) => {
    expect(isProfaneJoinName(name)).toBe(true);
  });

  it.each(['Dana', 'Cassandra', 'Scunthorpe', 'Glass Hero', 'דנה כהן', 'Маша Петрова', 'さくら', 'José Ñandú', 'Pixel Panda'])(
    'Given the ordinary name %s, Then it passes (no substring false positives, non-Latin safe)',
    (name) => {
      expect(isProfaneJoinName(name)).toBe(false);
    },
  );
});

describe('isProfaneJoinName in every class language', () => {
  it.each(['זונה', 'כוסאמק', 'pendejo', 'Puta madre', 'Jävla idiot', 'fitta', 'сука', 'Хуйло', 'ちんこマン', 'p.e.n.d.e.j.o'])(
    'Given %s, Then it is caught',
    (name) => {
      expect(isProfaneJoinName(name)).toBe(true);
    },
  );

  it.each(['Dickson', 'Analise', 'Shitaki', 'Kukuruza', 'Hassan', 'Употребляю', 'やくそく', 'Putin', 'Fittness', 'נועה זילברמן', 'José Puttanesca', 'Koko'])(
    'Given the ordinary name %s that contains a banned piece, Then it passes',
    (name) => {
      expect(isProfaneJoinName(name)).toBe(false);
    },
  );
});

describe('moderateJoinName', () => {
  it('Given a clean name, Then it is returned untouched', () => {
    const pick = vi.fn(() => 'Turbo Salmon');
    expect(moderateJoinName('Dana', 'en', pick)).toBe('Dana');
    expect(pick).not.toHaveBeenCalled();
  });

  it('Given a profane name, Then a generated name in the class language replaces it silently', () => {
    const pick = vi.fn(() => 'דוב רגזן');
    expect(moderateJoinName('fuck you', 'he', pick)).toBe('דוב רגזן');
    expect(pick).toHaveBeenCalledWith('he');
  });
});

describe('joinNameLocale', () => {
  it('reads the join page language from the referer, else English', () => {
    expect(joinNameLocale('https://x/sv/join/ABC123')).toBe('sv');
    expect(joinNameLocale('https://x/xx/join')).toBe('en');
    expect(joinNameLocale(null)).toBe('en');
    expect(joinNameLocale('not a url')).toBe('en');
  });
});
