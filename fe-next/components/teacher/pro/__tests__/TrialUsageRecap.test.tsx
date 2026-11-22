import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TrialUsageRecap } from '../TrialUsageRecap';

const lang = vi.hoisted(() => ({ current: 'en' }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    language: lang.current,
  }),
}));
const warn = vi.hoisted(() => vi.fn());
vi.mock('@/utils/logger', () => ({ default: { warn, error: vi.fn(), info: vi.fn() } }));

const EXPIRES = '2026-12-06T00:00:00.000Z';
function mockFetch(impl: () => Promise<unknown>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(impl as never);
}

describe('TrialUsageRecap', () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    warn.mockReset();
    lang.current = 'en';
  });

  it.each([
    ['ru', 5, 'teacher.trialUsage.games_many'],
    ['ru', 3, 'teacher.trialUsage.games_few'],
    ['he', 20, 'teacher.trialUsage.games_other'],
  ])('Given %s and %i games, When loaded, Then it picks a key that exists (%s)', async (language, games, key) => {
    lang.current = language;
    mockFetch(async () => ({ ok: true, json: async () => ({ ok: true, usage: { games, students: 0, practice: 0 } }) }));
    render(<TrialUsageRecap trialExpires={EXPIRES} />);
    expect(await screen.findByTestId('trial-usage-recap')).toHaveTextContent(`${key}:`);
  });

  it('Given trial usage, When loaded, Then it names each non-zero count and omits zeros', async () => {
    const spy = mockFetch(async () => ({ ok: true, json: async () => ({ ok: true, usage: { games: 7, students: 42, practice: 0 } }) }));
    render(<TrialUsageRecap trialExpires={EXPIRES} />);
    const line = await screen.findByTestId('trial-usage-recap');
    expect(line).toHaveTextContent('teacher.trialUsage.lead');
    expect(line).toHaveTextContent('teacher.trialUsage.games_other:{"count":7}');
    expect(line).toHaveTextContent('teacher.trialUsage.students_other:{"count":42}');
    expect(line).not.toHaveTextContent('practice');
    expect(String(spy.mock.calls[0][0])).toBe(`/api/teacher/trial-usage?since=${encodeURIComponent('2026-11-22T00:00:00.000Z')}`);
  });

  it('Given one game, When loaded, Then it uses the singular key', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ ok: true, usage: { games: 1, students: 0, practice: 0 } }) }));
    render(<TrialUsageRecap trialExpires={EXPIRES} />);
    expect(await screen.findByTestId('trial-usage-recap')).toHaveTextContent('teacher.trialUsage.games_one:{"count":1}');
  });

  it('Given all zero, When loaded, Then nothing renders', async () => {
    const spy = mockFetch(async () => ({ ok: true, json: async () => ({ ok: true, usage: { games: 0, students: 0, practice: 0 } }) }));
    render(<TrialUsageRecap trialExpires={EXPIRES} />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.queryByTestId('trial-usage-recap')).toBeNull();
  });

  it('Given the read fails, When loaded, Then nothing renders and the failure is logged', async () => {
    mockFetch(async () => ({ ok: false, status: 500, json: async () => ({ ok: false }) }));
    render(<TrialUsageRecap trialExpires={EXPIRES} />);
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(screen.queryByTestId('trial-usage-recap')).toBeNull();
  });

  it('Given no trial end, When rendered, Then it does not fetch', () => {
    const spy = mockFetch(async () => ({ ok: true, json: async () => ({}) }));
    render(<TrialUsageRecap trialExpires={null} />);
    expect(spy).not.toHaveBeenCalled();
  });
});
