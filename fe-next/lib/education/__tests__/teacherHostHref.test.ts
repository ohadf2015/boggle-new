import { describe, it, expect } from 'vitest';
import { teacherHostHref, parseHostMode, parseHostMinutes } from '../teacherHostHref';

describe('teacherHostHref', () => {
  it('Given a class, Then it opens the host flow with that class chosen', () => {
    expect(teacherHostHref('he', { classroomId: 'c 1' })).toBe('/he/education/classroom-game?classroomId=c+1');
  });

  it('Given a featured mode, Then the mode rides along so the picker opens on it', () => {
    expect(teacherHostHref('en', { classroomId: 'c1', mode: 'word-hunt' })).toBe(
      '/en/education/classroom-game?classroomId=c1&mode=word-hunt',
    );
  });

  it('Given the onboarding demo, Then it asks for a 2-minute round', () => {
    expect(teacherHostHref('en', { classroomId: 'c1', minutes: 2 })).toBe('/en/education/classroom-game?classroomId=c1&minutes=2');
  });

  it('Given no class, Then it is the bare host flow', () => {
    expect(teacherHostHref('sv', {})).toBe('/sv/education/classroom-game');
  });
});

describe('parseHostMode / parseHostMinutes', () => {
  it('Given a known catalogue id, Then it is accepted; anything else is ignored', () => {
    expect(parseHostMode('wheel-rush')).toBe('wheel-rush');
    expect(parseHostMode('boss-battle')).toBe('boss-battle');
    expect(parseHostMode('nope')).toBeNull();
    expect(parseHostMode(null)).toBeNull();
  });

  it('Given minutes, Then only the lobby timer choices are accepted', () => {
    expect(parseHostMinutes('2')).toBe(2);
    expect(parseHostMinutes('99')).toBeNull();
    expect(parseHostMinutes('x')).toBeNull();
  });
});
