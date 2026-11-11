import { vi } from 'vitest';

vi.mock('@/utils/onboardingNameSuggestions', () => ({ suggestPlayerName: (lang: string) => `Fun ${lang}` }));

import { cleanClassroomSeatName } from '../classroomSeatName';

describe('cleanClassroomSeatName', () => {
  it('Given an ordinary name, When a student is seated, Then the name is kept', () => {
    expect(cleanClassroomSeatName({}, 'Dickson', { authUserId: 'u1' }, 'en')).toBe('Dickson');
  });

  it('Given a profane name from a guest socket that skipped the join form, When seated, Then a fun name in the room language is used instead', () => {
    expect(cleanClassroomSeatName({}, 'pendejo', { guestTokenHash: 'g1' }, 'es')).toBe('Fun es');
  });

  it('Given a profane name and a student who already holds a seat, When she rejoins, Then she gets her own seat back', () => {
    const users = { 'Fun he': { authUserId: 'u1' }, Dana: { authUserId: 'u2' } };
    expect(cleanClassroomSeatName(users, 'זונה', { authUserId: 'u1' }, 'he')).toBe('Fun he');
    expect(cleanClassroomSeatName({ Pixel: { guestTokenHash: 'g1' } }, 'сука', { guestTokenHash: 'g1' }, 'ru')).toBe('Pixel');
  });

  it('Given the replacement is already taken in the room, When seated, Then a free variant is used', () => {
    const name = cleanClassroomSeatName({ 'Fun en': { authUserId: 'u9' } }, 'fuck', { authUserId: 'u1' }, 'en');
    expect(name).not.toBe('Fun en');
    expect(name.startsWith('Fun en')).toBe(true);
  });
});
