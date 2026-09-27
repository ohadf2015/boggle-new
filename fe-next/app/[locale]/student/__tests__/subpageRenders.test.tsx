/**
 * /student/lessons and /student/achievements must RENDER once auth resolves.
 *
 * The capture harness saw both screens sit on "Checking…" at most sizes. The
 * guard itself was not stuck (measured: content lands ~4s after hydration), but
 * two things made that frame the one everybody saw:
 *  - `/student/lessons` was a server `redirect()` to the hub, so it inherited the
 *    hub's extra wait on the PROFILE row, and the dock's "Lessons" button
 *    bounced the student straight back to the map it was opened from;
 *  - every pending branch painted a generic loader in the old shell, so any slow
 *    hydration (a contended dev server, a phone on school wifi) showed an
 *    off-brand spinner instead of the page.
 *
 * Contract asserted here, for BOTH pages:
 *  - session resolved + user present → content (awards even before the profile
 *    lands; lessons wait for lists fetched AFTER it, never a false "no lessons");
 *  - session resolved + no user → `/{locale}/student/join` (never '/' or '/{locale}');
 *  - session still loading → the Academy frame with a skeleton, no redirect.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const knobs = vi.hoisted(() => ({
  push: vi.fn(),
  auth: vi.fn(),
  lessons: [] as unknown[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: knobs.push, replace: knobs.push }),
  usePathname: () => '/en/student/lessons',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => knobs.auth() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/lib/supabase', () => ({ supabase: null }));
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _f, priority: _p, unoptimized: _u, ...p }: Record<string, unknown>) =>
    React.createElement('img', p as never),
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/hooks/useStudentProgress', () => ({
  useStudentProgress: () => ({ lessons: knobs.lessons, isLoading: false }),
}));
vi.mock('@/hooks/usePracticeLessons', () => ({
  usePracticeLessons: () => ({ lessons: [], isLoading: false, error: null }),
}));
vi.mock('@/hooks/useStudentClassroom', () => ({
  useStudentClassroom: () => ({ classroomId: 'c1', classroom: { id: 'c1', name: 'ELA' }, level: 'core', isLoading: false }),
}));

import StudentLessonsPageClient from '../lessons/PageClient';
import StudentAchievementsPageClient from '../achievements/PageClient';

const PAGES = [
  ['lessons', StudentLessonsPageClient, 'student-lessons-content'],
  ['achievements', StudentAchievementsPageClient, 'student-awards-content'],
] as const;

describe.each(PAGES)('/student/%s renders once auth resolves', (_name, Page, contentId) => {
  beforeEach(() => {
    knobs.push.mockReset();
    knobs.lessons = [];
  });

  it('renders the page content once the session and profile have resolved', async () => {
    knobs.auth.mockReturnValue({ user: { id: 's1' }, profile: { id: 's1' }, loading: false });
    render(<Page />);
    expect(await screen.findByTestId(contentId)).toBeInTheDocument();
    expect(screen.queryByTestId('academy-page-pending')).toBeNull();
    expect(knobs.push).not.toHaveBeenCalled();
  });

  it('sends a visitor with no session to the student join entry — never home', async () => {
    knobs.auth.mockReturnValue({ user: null, profile: null, loading: false });
    render(<Page />);
    await waitFor(() => expect(knobs.push).toHaveBeenCalledWith('/en/student/join'));
    for (const [href] of knobs.push.mock.calls) {
      expect(href).not.toBe('/');
      expect(href).not.toBe('/en');
    }
    expect(screen.queryByTestId(contentId)).toBeNull();
  });

  it('while the session is loading, paints the Academy frame (not a bare loader) and does not redirect', async () => {
    knobs.auth.mockReturnValue({ user: null, profile: null, loading: true });
    render(<Page />);
    expect(screen.getByTestId('academy-page-pending')).toBeInTheDocument();
    // The frame is the real page chrome: the way back to the map is already there.
    expect(screen.getByTestId('academy-page-back')).toHaveAttribute('href', '/en/student');
    expect(screen.queryByTestId(contentId)).toBeNull();
    await waitFor(() => expect(knobs.push).not.toHaveBeenCalled());
  });
});

describe('the profile lands after the session', () => {
  beforeEach(() => {
    knobs.push.mockReset();
    knobs.lessons = [];
  });

  it('awards render for a signed-in student whose profile has not landed yet', async () => {
    knobs.auth.mockReturnValue({ user: { id: 's1' }, profile: null, loading: false });
    render(<StudentAchievementsPageClient />);
    expect(await screen.findByTestId('student-awards-content')).toBeInTheDocument();
    expect(knobs.push).not.toHaveBeenCalled();
  });

  it('lessons: no redirect and the real frame, but NO "no lessons" state from lists that were read before the profile existed', async () => {
    // The lesson hooks gate on user AND profile, so before the profile lands
    // they report [] with isLoading:false. That is not "this student has no lessons".
    knobs.auth.mockReturnValue({ user: { id: 's1' }, profile: null, loading: false });
    render(<StudentLessonsPageClient />);
    expect(screen.getByTestId('academy-page')).toBeInTheDocument();
    expect(screen.queryByTestId('academy-page-pending')).toBeNull();
    expect(screen.queryByText('academy.pages.noLessonsTitle')).toBeNull();
    expect(screen.queryByTestId('student-lessons-content')).toBeNull();
    await waitFor(() => expect(knobs.push).not.toHaveBeenCalled());
  });

  it('lessons: with the profile resolved and truly nothing assigned, says so and points back to the map', async () => {
    knobs.auth.mockReturnValue({ user: { id: 's1' }, profile: { id: 's1' }, loading: false });
    render(<StudentLessonsPageClient />);
    expect(await screen.findByText('academy.pages.noLessonsTitle')).toBeInTheDocument();
    expect(screen.getByTestId('student-lessons-to-map')).toHaveAttribute('href', '/en/student');
  });
});

describe('/student/lessons lists the student lessons', () => {
  it('shows one card per lesson, linking into the lesson', async () => {
    knobs.push.mockReset();
    knobs.lessons = [
      { lessonId: 'l1', status: 'started', lesson: { id: 'l1', name: 'Space words', words: [{ word: 'orbit' }, { word: 'comet' }] } },
      { lessonId: 'l2', status: 'completed', lesson: { id: 'l2', name: 'Ocean words', words: [{ word: 'tide' }] } },
    ];
    knobs.auth.mockReturnValue({ user: { id: 's1' }, profile: { id: 's1' }, loading: false });
    render(<StudentLessonsPageClient />);
    const cards = await screen.findAllByTestId('student-lesson-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute('href', '/en/student/lessons/l1');
    expect(screen.getByText('Space words')).toBeInTheDocument();
  });
});
