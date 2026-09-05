/**
 * Classroom-aware results.
 *
 * The old results screen showed a lesson card built from the TEACHER's
 * sessionStorage, so a room of 25 students saw nothing. This card renders from
 * the server-built summary in the shared results payload, and shows the teacher
 * a class-wide view while each student sees their own.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassroomResultsCard } from '../ClassroomResultsCard';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { shareWithFallback } from '@/utils/shareWithFallback';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    // Support t(key), t(key, params), and t(key, fallback, params) — same as ClassroomManager.
    t: (
      key: string,
      second?: string | Record<string, string | number>,
      third?: Record<string, string | number>,
    ) => {
      const fallback = typeof second === 'string' ? second : undefined;
      const params = typeof second === 'object' && second !== null ? second : third;
      let out = fallback ?? key;
      for (const [k, v] of Object.entries(params ?? {})) {
        out = out.split(`{{${k}}}`).join(String(v)).split(`{${k}}`).join(String(v));
      }
      // Keep prior test assertions that match on key:JSON when no fallback was passed.
      if (!fallback && params) return `${key}:${JSON.stringify(params)}`;
      return out;
    },
  }),
}));

vi.mock('@/utils/shareWithFallback', () => ({
  shareWithFallback: vi.fn().mockResolvedValue('copied'),
}));

const summary: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Physics 101'],
  lessonIds: ['lesson-1'],
  totalWords: 3,
  coverage: [
    { word: 'photon', foundBy: ['Maya'] },
    { word: 'atom', foundBy: ['Maya', 'Noa'] },
    { word: 'neutron', foundBy: [] },
  ],
  missedWords: ['neutron'],
  classFoundCount: 2,
  masteryByPlayer: {
    Maya: { found: 2, total: 3 },
    Noa: { found: 1, total: 3 },
  },
};

describe('ClassroomResultsCard', () => {
  beforeEach(() => {
    vi.mocked(shareWithFallback).mockClear();
    vi.mocked(shareWithFallback).mockResolvedValue('copied');
  });

  it('names the lesson and teacher so a student knows whose class this was', () => {
    render(<ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} />);
    expect(screen.getByText(/Physics 101/)).toBeInTheDocument();
    expect(screen.getByText(/Ms\. Cohen/)).toBeInTheDocument();
  });

  it('shows a student their own mastery, not the class total', () => {
    render(<ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} />);
    expect(screen.getByText(/yourMastery.*"found":1.*"total":3/)).toBeInTheDocument();
  });

  it('marks which lesson words the student personally found and missed', () => {
    render(<ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} />);
    expect(screen.getByTestId('lesson-word-atom')).toHaveAttribute('data-found', 'true');
    expect(screen.getByTestId('lesson-word-photon')).toHaveAttribute('data-found', 'false');
    expect(screen.getByTestId('lesson-word-neutron')).toHaveAttribute('data-found', 'false');
  });

  it('does not show a student the per-word roster of who found what', () => {
    render(<ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} />);
    expect(screen.queryByText(/Maya/)).not.toBeInTheDocument();
  });

  it('gives the teacher the class-wide coverage count', () => {
    render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher />);
    expect(screen.getByText(/classCoverage.*"found":2.*"total":3/)).toBeInTheDocument();
  });

  it('gives the teacher the reteach list — the words nobody found', () => {
    render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher />);
    expect(screen.getByTestId('reteach-list')).toHaveTextContent('neutron');
  });

  it('tells the teacher how many students found each word', () => {
    render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher />);
    expect(screen.getByTestId('lesson-word-atom')).toHaveTextContent('2');
  });

  it('congratulates instead of showing an empty reteach list', () => {
    const clean = { ...summary, missedWords: [], classFoundCount: 3 };
    render(<ClassroomResultsCard summary={clean} username="Ms. Cohen" isTeacher />);
    expect(screen.queryByTestId('reteach-list')).not.toBeInTheDocument();
    expect(screen.getByText(/allFound/)).toBeInTheDocument();
  });

  it('handles a student who found nothing without crashing on a missing mastery row', () => {
    render(<ClassroomResultsCard summary={summary} username="LateJoiner" isTeacher={false} />);
    expect(screen.getByText(/yourMastery.*"found":0.*"total":3/)).toBeInTheDocument();
  });

  it('offers the teacher a reteach round on exactly the missed words', () => {
    const onReteach = vi.fn();
    render(
      <ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher onReteach={onReteach} />
    );
    const button = screen.getByTestId('play-reteach-round');
    fireEvent.click(button);
    expect(onReteach).toHaveBeenCalledTimes(1);
  });

  it('never offers a student the reteach round — only the teacher drives the class', () => {
    render(
      <ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} onReteach={vi.fn()} />
    );
    expect(screen.queryByTestId('play-reteach-round')).not.toBeInTheDocument();
  });

  it('offers no reteach round when the class found every word', () => {
    const clean = { ...summary, missedWords: [], classFoundCount: 3 };
    render(
      <ClassroomResultsCard summary={clean} username="Ms. Cohen" isTeacher onReteach={vi.fn()} />
    );
    expect(screen.queryByTestId('play-reteach-round')).not.toBeInTheDocument();
  });

  it('renders no reteach button without a handler, e.g. for a non-host viewer', () => {
    render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher />);
    expect(screen.queryByTestId('play-reteach-round')).not.toBeInTheDocument();
  });

  it('lets a teacher share the class gap with parents/Slack', async () => {
    render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher />);
    fireEvent.click(screen.getByTestId('share-class-gap'));
    await waitFor(() => {
      expect(shareWithFallback).toHaveBeenCalledTimes(1);
    });
    const arg = vi.mocked(shareWithFallback).mock.calls[0][0];
    expect(arg.url).toContain('https://www.lexiclash.live/en/education/class-gap');
    expect(arg.url).toContain('neutron');
    expect(arg.url).not.toContain('Maya');
    expect(arg.url).not.toContain('Noa');
    expect(arg.url).not.toContain('lexiclash.com');
  });

  it('lets a student send the same class-level gap to a parent', async () => {
    render(<ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} />);
    expect(screen.getByTestId('share-class-gap')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('share-class-gap'));
    await waitFor(() => {
      expect(shareWithFallback).toHaveBeenCalled();
    });
    const arg = vi.mocked(shareWithFallback).mock.calls[0][0];
    expect(arg.url).toContain('neutron');
    expect(arg.url).not.toContain('Maya');
  });

  it('confirms when the gap link was copied for Slack/parent chat', async () => {
    render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher />);
    fireEvent.click(screen.getByTestId('share-class-gap'));
    await waitFor(() => {
      expect(screen.getByText('education.results.shareGapCopied')).toBeInTheDocument();
    });
  });

  it('offers the teacher a real Google Classroom link for a 3-min reteach Live', () => {
    render(<ClassroomResultsCard summary={summary} username="Ms. Cohen" isTeacher />);
    const a = screen.getByTestId('post-reteach-live-google-classroom') as HTMLAnchorElement;
    expect(a.tagName).toBe('A');
    expect(a.target).toBe('_blank');
    expect(a.rel).toContain('noopener');
    const u = new URL(a.href);
    expect(u.origin + u.pathname).toBe('https://classroom.google.com/share');
    expect(u.searchParams.get('itemtype')).toBe('announcement');
    const shared = new URL(u.searchParams.get('url')!);
    expect(shared.origin).toBe('https://www.lexiclash.live');
    expect(shared.pathname).toBe('/en/education/class-gap');
    expect(shared.searchParams.get('missed')).toBe('neutron');
    expect(shared.href).not.toContain('lexiclash.com');
    expect(shared.href).not.toContain('Maya');
  });

  it('never offers a student the Google Classroom reteach Live post', () => {
    render(<ClassroomResultsCard summary={summary} username="Noa" isTeacher={false} />);
    expect(screen.queryByTestId('post-reteach-live-google-classroom')).not.toBeInTheDocument();
  });

  it('hides the Google Classroom reteach post when every word was found', () => {
    const clean = { ...summary, missedWords: [], classFoundCount: 3 };
    render(<ClassroomResultsCard summary={clean} username="Ms. Cohen" isTeacher />);
    expect(screen.queryByTestId('post-reteach-live-google-classroom')).not.toBeInTheDocument();
  });

});
