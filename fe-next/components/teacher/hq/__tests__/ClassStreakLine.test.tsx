import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '../../../../translations/en.js';
import { he } from '../../../../translations/he.js';
import { sv } from '../../../../translations/sv.js';
import { ja } from '../../../../translations/ja.js';
import { es } from '../../../../translations/es.js';
import { ru } from '../../../../translations/ru.js';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
  }),
}));

import { ClassStreakLine } from '../ClassStreakLine';

const fetchMock = vi.fn();
const answer = (body: unknown, ok = true) => fetchMock.mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => body });

describe('<ClassStreakLine>', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('Given a class that played today, Then the teacher sees the kept streak from the teacher endpoint', async () => {
    answer({ streak: 4, playedToday: true });
    render(<ClassStreakLine classroomId="c1" />);
    const line = await screen.findByTestId('hq-class-streak');
    expect(fetchMock).toHaveBeenCalledWith('/api/education/classroom/c1/streak');
    expect(line).toHaveAttribute('data-state', 'kept');
    expect(line).toHaveTextContent('teacher.classStreak.kept:{"count":4}');
  });

  it('Given no game yet today, Then the at-risk prompt asks the teacher to play today', async () => {
    answer({ streak: 3, playedToday: false });
    render(<ClassStreakLine classroomId="c1" />);
    const line = await screen.findByTestId('hq-class-streak');
    expect(line).toHaveAttribute('data-state', 'atRisk');
    expect(line).toHaveTextContent('teacher.classStreak.atRisk:{"count":3}');
  });

  it('Given a one-day streak, Then the singular copy is used', async () => {
    answer({ streak: 1, playedToday: false });
    render(<ClassStreakLine classroomId="c1" />);
    expect(await screen.findByTestId('hq-class-streak')).toHaveTextContent('teacher.classStreak.atRiskOne');
  });

  it('Given no streak, Then nothing renders', async () => {
    answer({ streak: 0, playedToday: false });
    render(<ClassStreakLine classroomId="c1" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByTestId('hq-class-streak')).toBeNull();
  });

  it('Given the read fails, Then nothing renders (no optimistic streak)', async () => {
    answer({}, false);
    render(<ClassStreakLine classroomId="c1" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByTestId('hq-class-streak')).toBeNull();
  });
});

describe('ClassStreakLine i18n', () => {
  const src = readFileSync(join(process.cwd(), 'components/teacher/hq/ClassStreakLine.tsx'), 'utf8');
  const keys = [...new Set([...src.matchAll(/["'](teacher\.classStreak\.[A-Za-z]+)["']/g)].map((m) => m[1]))];
  const resolve = (d: unknown, path: string) =>
    path.split('.').reduce<unknown>((a, k) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[k] : undefined), d);

  it('renders four keys', () => expect(keys.sort()).toEqual(['teacher.classStreak.atRisk', 'teacher.classStreak.atRiskOne', 'teacher.classStreak.kept', 'teacher.classStreak.keptOne']));

  it.each(Object.entries({ en, he, sv, ja, es, ru }))('every key resolves in %s', (_l, dict) => {
    expect(keys.filter((k) => typeof resolve(dict, k) !== 'string')).toEqual([]);
  });
});
