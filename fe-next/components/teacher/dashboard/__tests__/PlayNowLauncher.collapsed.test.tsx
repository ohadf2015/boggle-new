import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HQ_LAST_LAUNCH_KEY } from '../hqLastLaunch';

const mockLessons = vi.fn();
const mockRecent = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown) => (typeof a === 'string' ? a : a ? `${k}:${JSON.stringify(a)}` : k),
    language: 'en',
  }),
}));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => mockLessons() }));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => mockRecent() }));

import { PlayNowLauncher } from '../PlayNowLauncher';

const lesson = (id: string, name: string, words = 6, defined = true) => ({
  id,
  name,
  language: 'en',
  words: Array.from({ length: words }, (_, i) => ({ word: `w${i}`, definition: defined ? `d${i}` : null })),
});

const remember = (value: unknown) => localStorage.setItem(HQ_LAST_LAUNCH_KEY, JSON.stringify(value));

describe('<PlayNowLauncher> — collapsed next-game row', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    mockLessons.mockReturnValue({ lessons: [], isLoading: false, error: null });
    mockRecent.mockReturnValue({ recentConfigs: [], hasRecentConfig: false });
  });

  it('Given a first visit, When HQ renders, Then one row names the mode and list with its word count, plus Change and GO LIVE — no mode grid', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    const row = screen.getByTestId('play-now-next');
    expect(screen.getByTestId('play-now-next-mode')).toHaveTextContent('Vocab Quiz');
    expect(screen.getByTestId('play-now-next-list').textContent).toContain('education.starterPacks.commonEnglish.name');
    expect(row.textContent).toContain('teacher.lesson.words');
    expect(screen.getByTestId('play-now-change')).toBeInTheDocument();
    expect(screen.getByTestId('play-now-go')).toBeEnabled();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.queryByTestId('hq-mode-facts')).toBeNull();
    expect(screen.queryByTestId('play-now-list-chips')).toBeNull();
    expect(screen.queryByTestId('play-now-change-disclosure')).toBeNull();
  });

  it('When the teacher taps Change, Then the five modes, the facts cell and the list chips appear, and Done folds them away', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    fireEvent.click(screen.getByTestId('play-now-change'));
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByTestId('hq-mode-facts')).toBeInTheDocument();
    expect(screen.getByTestId('play-now-list-chips')).toBeInTheDocument();
    expect(screen.getByTestId('play-now-change')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByTestId('play-now-change'));
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('When the teacher picks a mode in the expanded picker, Then the row reflects it', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    fireEvent.click(screen.getByTestId('play-now-change'));
    fireEvent.click(screen.getByTestId('hq-mode-blast'));
    fireEvent.click(screen.getByTestId('play-now-change'));
    expect(screen.getByTestId('play-now-next-mode')).toHaveTextContent('Blast');
  });

  it('Given a GO LIVE, Then the mode and list are remembered for next time', () => {
    mockLessons.mockReturnValue({ lessons: [lesson('l1', 'Unit 1'), lesson('l2', 'Unit 2')], isLoading: false, error: null });
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    fireEvent.click(screen.getByTestId('play-now-change'));
    fireEvent.click(screen.getByTestId('hq-mode-word-hunt'));
    fireEvent.click(screen.getByTestId('play-now-chip-l2'));
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(JSON.parse(localStorage.getItem(HQ_LAST_LAUNCH_KEY) as string)).toEqual({
      mode: 'word-hunt',
      source: 'lesson',
      lessonId: 'l2',
    });
  });

  it('Given a remembered lesson and mode, When HQ renders, Then the row and the launch use them', () => {
    remember({ mode: 'blast', source: 'lesson', lessonId: 'l2' });
    mockLessons.mockReturnValue({ lessons: [lesson('l1', 'Unit 1'), lesson('l2', 'Unit 2', 9)], isLoading: false, error: null });
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    expect(screen.getByTestId('play-now-next-mode')).toHaveTextContent('Blast');
    expect(screen.getByTestId('play-now-next-list')).toHaveTextContent('Unit 2');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch.mock.calls[0][0]).toMatchObject({ source: 'lesson', lessonId: 'l2', mode: 'blast' });
  });

  it('Given a remembered lesson that was later deleted, Then it falls back to the default list', () => {
    remember({ mode: 'classic', source: 'lesson', lessonId: 'gone' });
    mockLessons.mockReturnValue({ lessons: [lesson('l1', 'Unit 1')], isLoading: false, error: null });
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    expect(screen.getByTestId('play-now-next-list')).toHaveTextContent('Unit 1');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch.mock.calls[0][0]).toMatchObject({ lessonId: 'l1', mode: 'classic' });
  });

  it('Given a remembered pack, Then that pack is armed', () => {
    remember({ mode: 'vocab-quiz', source: 'pack', packKey: 'education.starterPacks.academicVocab.name' });
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    expect(screen.getByTestId('play-now-next-list').textContent).toContain('education.starterPacks.academicVocab.name');
  });

  it('Given a remembered pack key that no longer exists, Then the default pack is armed', () => {
    remember({ mode: 'vocab-quiz', source: 'pack', packKey: 'nope' });
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    expect(screen.getByTestId('play-now-next-list').textContent).toContain('education.starterPacks.commonEnglish.name');
  });

  it('Given a remembered quiz on a list without definitions, Then the row shows the mode the launch will really run', () => {
    remember({ mode: 'vocab-quiz', source: 'lesson', lessonId: 'bare' });
    mockLessons.mockReturnValue({ lessons: [lesson('bare', 'Bare words', 8, false)], isLoading: false, error: null });
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    expect(screen.getByTestId('play-now-next-mode')).toHaveTextContent('Word Arena');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch.mock.calls[0][0]).toMatchObject({ lessonId: 'bare', mode: 'classic' });
  });

  it('Given garbage in storage, Then the launcher still arms the default', () => {
    localStorage.setItem(HQ_LAST_LAUNCH_KEY, '{not json');
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    expect(screen.getByTestId('play-now-go')).toBeEnabled();
    expect(screen.getByTestId('play-now-next-mode')).toHaveTextContent('Vocab Quiz');
  });

  it('Given lessons still loading, Then GO LIVE stays disabled and the row names no list yet', () => {
    remember({ mode: 'blast', source: 'lesson', lessonId: 'l1' });
    mockLessons.mockReturnValue({ lessons: [], isLoading: true, error: null });
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    expect(screen.getByTestId('play-now-go')).toBeDisabled();
    expect(screen.queryByTestId('play-now-next-list')).toBeNull();
  });

  it('Given a pasted round, Then only the mode is remembered — never the words', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    fireEvent.click(screen.getByTestId('play-now-change'));
    fireEvent.click(screen.getByTestId('play-now-more-lists'));
    fireEvent.click(screen.getByTestId('play-now-source-paste'));
    fireEvent.change(screen.getByTestId('play-now-paste-input'), { target: { value: 'cat, dog, bird, fish' } });
    fireEvent.click(screen.getByTestId('play-now-go'));
    const saved = JSON.parse(localStorage.getItem(HQ_LAST_LAUNCH_KEY) as string);
    expect(saved).toEqual({ mode: 'classic' });
  });
});
