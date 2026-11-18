import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(join(__dirname, '../../TeacherDashboard.tsx'), 'utf8');

describe('Teacher Home next-lesson card position', () => {
  it('Given the class desk, When it lists its blocks, Then the next-lesson card comes after the hero, the desk board and the week challenge', () => {
    const at = (needle: string) => src.indexOf(needle);
    expect(at('<HomeNextLesson')).toBeGreaterThan(at('<HomeWeekChallenge'));
    expect(at('<HomeWeekChallenge')).toBeGreaterThan(at('<HomeDeskBoard'));
    expect(at('<HomeDeskBoard')).toBeGreaterThan(at('<HomeHero'));
  });

  it('Given the next-lesson card, When it mounts on Home, Then it does not reserve space while the plan loads', () => {
    const card = readFileSync(join(__dirname, '../HomeNextLesson.tsx'), 'utf8');
    expect(card).not.toContain('reserveSpace');
  });
});
