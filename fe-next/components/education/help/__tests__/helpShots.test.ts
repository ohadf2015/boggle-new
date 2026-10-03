import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HELP_SHOTS, helpShot, type HelpShotId } from '../shots';

const srcOf = (id: HelpShotId, locale: string) => {
  const { src } = helpShot(id, locale);
  return typeof src === 'string' ? src : src.src;
};

const HE_CAPTURED: HelpShotId[] = [
  'assign-focus',
  'assign-type',
  'class-tools',
  'classes-actions',
  'create-class',
  'hq-get-students-in',
  'hq-overview',
  'hq-paste-words',
  'hq-start-game',
  'library-discover',
  'reports-class',
  'student-join',
  'teacher-signup',
  'word-list-editor',
];

const LIVE_GAME_ONLY: HelpShotId[] = ['lobby', 'lobby-controls', 'lobby-switch-game', 'live-host', 'results'];

const ALL_IDS = Object.keys(HELP_SHOTS) as HelpShotId[];

describe('helpShot', () => {
  it('covers every shot id in exactly one of the two lists', () => {
    expect([...HE_CAPTURED, ...LIVE_GAME_ONLY].sort()).toEqual([...ALL_IDS].sort());
  });

  it.each(HE_CAPTURED)('returns the Hebrew capture of %s for he', (id) => {
    expect(srcOf(id, 'he')).toMatch(new RegExp(`/he/${id}\\.webp`));
    expect(existsSync(join(__dirname, '..', 'shots', 'he', `${id}.webp`))).toBe(true);
    expect(helpShot(id, 'he').width).toBeGreaterThan(0);
    expect(helpShot(id, 'he').height).toBeGreaterThan(0);
  });

  it.each(LIVE_GAME_ONLY)('falls back to the English %s for he (needs a live game)', (id) => {
    expect(helpShot(id, 'he')).toBe(HELP_SHOTS[id]);
  });

  it.each(['en', 'sv', 'ja', 'es', 'ru', 'xx'])('falls back to English for every shot in %s', (locale) => {
    for (const id of ALL_IDS) expect(helpShot(id, locale)).toBe(HELP_SHOTS[id]);
  });
});
