import { describe, it, expect } from 'vitest';
import { buildClassWinShare, CLASS_WIN_UTM } from '@/lib/education/classWinShare';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

const summary = {
  teacherName: 'Ms Cohen',
  lessonNames: ['4B Animals'],
  lessonIds: ['l1'],
  totalWords: 10,
  classFoundCount: 8,
  coverage: [],
  missedWords: [],
  masteryByPlayer: { Noa: { found: 5, total: 10 }, Ido: { found: 3, total: 10 } },
  podium: [{ username: 'Noa', score: 30, rank: 1 }],
  gameMode: 'word-hunt',
  classroomId: 'class-xyz',
} as unknown as ClassroomSummary;
const players = [
  { username: 'Noa', score: 30, wordsFoundCount: 6 },
  { username: 'Ido', score: 10, wordsFoundCount: 2 },
  { username: 'Ms Cohen', score: 0, wordsFoundCount: 0, isHost: true },
] as never;

const build = () => buildClassWinShare({ summary, players, gameCode: 'JU35M6', locale: 'he', t });

describe('buildClassWinShare', () => {
  it('given a finished round, when the share is built, then the text counts the class words and names the mode', () => {
    const share = build();
    expect(share).not.toBeNull();
    expect(share!.text).toContain('brag2.classWin.text');
    expect(share!.text).toContain('"words":8');
    expect(share!.text).toContain('"students":2');
    expect(share!.text).toContain('teacher.classroom.gameModes.wordHunt');
  });

  it('given student names, a teacher name, a lesson name, a class id and a room code, when the share is built, then none appear in text, title or url', () => {
    const share = build()!;
    const blob = `${share.title} ${share.text} ${share.url}`;
    for (const leak of ['Noa', 'Ido', 'Cohen', '4B', 'Animals', 'JU35M6', 'class-xyz']) expect(blob).not.toContain(leak);
  });

  it('given a finished round, when the url is built, then it lands on the teacher class-win card with utm params and no join path', () => {
    const url = new URL(build()!.url);
    expect(url.origin).toBe('https://www.lexiclash.live');
    expect(url.pathname).toBe('/he/education/class-win');
    expect(url.pathname).not.toContain('join');
    expect(url.searchParams.get('utm_source')).toBe(CLASS_WIN_UTM.utm_source);
    expect(url.searchParams.get('utm_medium')).toBe(CLASS_WIN_UTM.utm_medium);
    expect(url.searchParams.get('utm_campaign')).toBe(CLASS_WIN_UTM.utm_campaign);
    expect(url.searchParams.get('words')).toBe('8');
    expect(url.searchParams.get('mode')).toBe('word-hunt');
    expect(url.searchParams.get('found')).toBe('8');
    expect(url.searchParams.get('total')).toBe('10');
  });

  it('given a round where nobody found a word, when the share is built, then there is nothing to brag about', () => {
    const empty = players.map((p: { username: string }) => ({ ...p, wordsFoundCount: 0, score: 0 })) as never;
    expect(buildClassWinShare({ summary, players: empty, gameCode: null, locale: 'en', t })).toBeNull();
  });

  it('given an unknown mode and locale, when the share is built, then the mode is left out and the locale falls back to en', () => {
    const share = buildClassWinShare({ summary: { ...summary, gameMode: 'evil-mode' }, players, gameCode: null, locale: 'xx', t })!;
    expect(share.text).toContain('brag2.classWin.textNoMode');
    expect(share.text).not.toContain('evil-mode');
    expect(new URL(share.url).pathname).toBe('/en/education/class-win');
    expect(new URL(share.url).searchParams.get('mode')).toBeNull();
  });
});
