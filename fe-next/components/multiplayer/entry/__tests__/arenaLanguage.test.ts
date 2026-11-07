import { describe, it, expect } from 'vitest';
import type { ActiveRoom, Language } from '@/shared/types/game';
import { arenaLanguages, countByLanguage, languageDisplayName, roomsInLanguage } from '../arenaLanguage';

const room = (gameCode: string, language: Language): ActiveRoom => ({
  gameCode, language, roomName: gameCode, playerCount: 1, gameState: 'waiting', isRanked: false, createdAt: 1,
});

const rooms = [room('E1', 'en'), room('H1', 'he'), room('E2', 'en'), room('R1', 'ru')];

describe('arena language filter helpers', () => {
  it('Given mixed rooms, When filtered to a language, Then only that language stays, in server order', () => {
    expect(roomsInLanguage(rooms, 'en').map((r) => r.gameCode)).toEqual(['E1', 'E2']);
    expect(roomsInLanguage(rooms, 'sv')).toEqual([]);
  });

  it('Given mixed rooms, When counted, Then each language has its open-room count', () => {
    expect(countByLanguage(rooms)).toEqual({ en: 2, he: 1, ru: 1 });
  });

  it('Given an English viewer, When choices are built, Then the viewer language leads, board languages follow, and room-only languages append', () => {
    expect(arenaLanguages(rooms, 'en')).toEqual(['en', 'he', 'sv', 'ja', 'es', 'ru']);
  });

  it('Given a Russian viewer and no Russian rooms, When choices are built, Then Russian still leads (quick play opens rooms in it)', () => {
    expect(arenaLanguages([], 'ru')).toEqual(['ru', 'en', 'he', 'sv', 'ja', 'es']);
  });

  it('Given a UI locale, When a language is named, Then it reads in the viewer\'s language', () => {
    expect(languageDisplayName('he', 'en')).toBe('Hebrew');
    expect(languageDisplayName('en', 'he')).toBe('אנגלית');
  });
});
