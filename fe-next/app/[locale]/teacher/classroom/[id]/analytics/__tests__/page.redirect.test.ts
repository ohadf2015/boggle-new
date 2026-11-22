import { describe, it, expect, vi, beforeEach } from 'vitest';

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
const notFound = vi.fn(() => {
  throw new Error('NOT_FOUND');
});
vi.mock('next/navigation', () => ({ redirect: (u: string) => redirect(u), notFound: () => notFound() }));

import AnalyticsPage from '../page';

const ID = '3f2b8c4e-1a2b-4c3d-8e9f-0a1b2c3d4e5f';
const run = (id: string, search: Record<string, string> = {}) =>
  AnalyticsPage({ params: Promise.resolve({ locale: 'he', id }), searchParams: Promise.resolve(search) });

describe('the old class analytics page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given a class id, Then it sends the teacher to that class in Reports', async () => {
    await expect(run(ID)).rejects.toThrow(`REDIRECT /he/teacher/reports?classroomId=${ID}`);
  });

  it('Given a tab that still exists, Then Reports opens on it', async () => {
    await expect(run(ID, { section: 'pulse' })).rejects.toThrow(`REDIRECT /he/teacher/reports?classroomId=${ID}&section=words`);
    await expect(run(ID, { tab: 'homework' })).rejects.toThrow(`section=homework`);
  });

  it('Given an unknown tab, Then the class opens on its default tab', async () => {
    await expect(run(ID, { section: 'bogus' })).rejects.toThrow(`REDIRECT /he/teacher/reports?classroomId=${ID}`);
    expect(redirect).toHaveBeenCalledWith(`/he/teacher/reports?classroomId=${ID}`);
  });

  it('Given an id that is not a class id, Then it is a 404', async () => {
    await expect(run('null')).rejects.toThrow('NOT_FOUND');
    expect(redirect).not.toHaveBeenCalled();
  });
});
