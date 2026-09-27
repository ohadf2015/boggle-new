/**
 * The bar: a tired teacher lands on the dashboard and has a live game with a
 * join code on the projector in ONE tap, without owning a classroom or a lesson.
 *
 * So this panel must be armed on arrival — a source chosen and an item already
 * selected — and the only thing standing between the teacher and a room is the
 * one dominant button. Everything else on the panel is a way to change the
 * words, never a step you must pass through.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockLessons = vi.fn();
const mockRecent = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, vars?: Record<string, unknown>) =>
      vars ? `${k}:${JSON.stringify(vars)}` : k,
    language: 'en',
  }),
}));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => mockLessons() }));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => mockRecent() }));

import { PlayNowLauncher } from '../PlayNowLauncher';

const lesson = (id: string, name: string, words = 6) => ({
  id,
  name,
  language: 'en',
  words: Array.from({ length: words }, (_, i) => ({ word: `w${i}`, definition: `d${i}` })),
});

describe('<PlayNowLauncher>', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockLessons.mockReturnValue({ lessons: [], isLoading: false, error: null });
    mockRecent.mockReturnValue({ recentConfigs: [], hasRecentConfig: false });
  });

  it('is armed on arrival for a returning teacher: one tap launches the last list', () => {
    mockLessons.mockReturnValue({
      lessons: [lesson('l-new', 'Unit 5'), lesson('l-old', 'Unit 4')],
      isLoading: false,
      error: null,
    });
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);

    fireEvent.click(screen.getByTestId('play-now-go'));

    expect(onLaunch).toHaveBeenCalledTimes(1);
    expect(onLaunch.mock.calls[0][0]).toMatchObject({ source: 'lesson', lessonId: 'l-new' });
  });

  it('is armed on arrival for a teacher with nothing: one tap launches a starter pack', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);

    fireEvent.click(screen.getByTestId('play-now-go'));

    expect(onLaunch).toHaveBeenCalledTimes(1);
    expect(onLaunch.mock.calls[0][0]).toMatchObject({ source: 'pack' });
    expect(onLaunch.mock.calls[0][0].packKey).toBeTruthy();
  });

  it('never offers a classroom or a roster step', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    expect(screen.queryByText(/classroom/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('uses no tab bar — the dashboard contract forbids one', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('launches pasted words as their own round, in a mode a bare list can carry', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);

    fireEvent.click(screen.getByTestId('play-now-source-paste'));
    fireEvent.change(screen.getByTestId('play-now-paste-input'), {
      target: { value: 'photosynthesis, mitosis\nosmosis' },
    });
    fireEvent.click(screen.getByTestId('play-now-go'));

    expect(onLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'paste', words: ['photosynthesis', 'mitosis', 'osmosis'] })
    );
  });

  it('refuses to launch a paste too short to make a round, and says why', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);

    fireEvent.click(screen.getByTestId('play-now-source-paste'));
    fireEvent.change(screen.getByTestId('play-now-paste-input'), { target: { value: 'cat' } });

    expect(screen.getByTestId('play-now-go')).toBeDisabled();
    expect(screen.getByTestId('play-now-paste-hint')).toHaveTextContent('teacher.playNow.pasteTooFew');
  });

  it('switching source re-arms the button instead of clearing it', () => {
    mockLessons.mockReturnValue({ lessons: [lesson('l1', 'Unit 5')], isLoading: false, error: null });
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);

    fireEvent.click(screen.getByTestId('play-now-source-packs'));
    fireEvent.click(screen.getByTestId('play-now-go'));

    expect(onLaunch.mock.calls[0][0]).toMatchObject({ source: 'pack' });
  });

  it('holds the button until the lessons read settles, so it cannot arm the wrong list', () => {
    mockLessons.mockReturnValue({ lessons: [], isLoading: true, error: null });
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    expect(screen.getByTestId('play-now-go')).toBeDisabled();
  });
});
