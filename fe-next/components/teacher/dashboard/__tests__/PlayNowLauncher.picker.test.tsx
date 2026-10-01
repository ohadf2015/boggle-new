/**
 * The host picker on HQ: illustrated mode tiles with a facts card, the lists
 * one tap away on the deck, and a designed launch — list → mode → GO LIVE is
 * three taps from HQ.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { hqModeFacts } from '../../hq/hqModes';

const mockLessons = vi.fn();
const mockRecent = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, vars?: Record<string, unknown>) => (vars ? `${k}:${JSON.stringify(vars)}` : k),
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

describe('<PlayNowLauncher> — host picker', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockLessons.mockReturnValue({ lessons: [], isLoading: false, error: null });
    mockRecent.mockReturnValue({ recentConfigs: [], hasRecentConfig: false });
  });

  it('Given the five modes, Then every tile wears its own catalog poster', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    for (const id of ['vocab-quiz', 'classic', 'blast', 'word-hunt', 'wordcraft'] as const) {
      const img = screen.getByTestId(`hq-mode-${id}`).querySelector('img');
      expect(img?.getAttribute('src')).toContain(hqModeFacts(id).poster.split('/').pop()!.replace('.webp', ''));
    }
  });

  it('Given a selected mode, Then the facts card names its time, player cap, skill and pitch — and follows the selection', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    const card = () => screen.getByTestId('hq-mode-facts');
    const quiz = hqModeFacts('vocab-quiz');
    expect(card()).toHaveTextContent(quiz.pitchKey);
    expect(card()).toHaveTextContent(quiz.skillKey);
    expect(card()).toHaveTextContent(`"minutes":${quiz.minutes}`);
    expect(card()).toHaveTextContent(`"count":${quiz.maxPlayers}`);

    fireEvent.click(screen.getByTestId('hq-mode-blast'));
    expect(card()).toHaveTextContent(hqModeFacts('blast').pitchKey);
    expect(card()).toHaveTextContent(hqModeFacts('blast').skillKey);
  });

  it('Given saved lists, Then up to three sit on the deck above GO LIVE and one tap arms another', () => {
    mockLessons.mockReturnValue({
      lessons: [lesson('l1', 'Unit 4 verbs'), lesson('l2', 'Fruits'), lesson('l3', 'Space'), lesson('l4', 'Hidden')],
      isLoading: false,
      error: null,
    });
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    const row = screen.getByTestId('play-now-list-chips');
    const chips = within(row).getAllByRole('button');
    expect(chips).toHaveLength(3);
    expect(row.compareDocumentPosition(screen.getByTestId('play-now-go')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(within(row).getByText('Fruits'));
    expect(screen.getByTestId('play-now-armed')).toHaveTextContent('Fruits');
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ source: 'lesson', lessonId: 'l2' }));
  });

  it('Given no saved lists, Then the deck chips offer starter packs instead', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    const chips = within(screen.getByTestId('play-now-list-chips')).getAllByRole('button');
    expect(chips.length).toBeGreaterThanOrEqual(2);
    expect(chips[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('Given a different list and a different mode, Then HQ reaches the lobby hand-off in three taps', () => {
    mockLessons.mockReturnValue({
      lessons: [lesson('l1', 'Unit 4 verbs'), lesson('l2', 'Fruits')],
      isLoading: false,
      error: null,
    });
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    fireEvent.click(within(screen.getByTestId('play-now-list-chips')).getByText('Fruits'));
    fireEvent.click(screen.getByTestId('hq-mode-blast'));
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledWith(expect.objectContaining({ lessonId: 'l2', mode: 'blast' }));
  });

  it('When a list is picked in the change-words sheet, Then the sheet closes with that list armed', () => {
    mockLessons.mockReturnValue({
      lessons: [lesson('l1', 'Unit 4 verbs'), lesson('l2', 'Fruits')],
      isLoading: false,
      error: null,
    });
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    const details = screen.getByTestId('play-now-change-disclosure') as HTMLDetailsElement;
    fireEvent.click(screen.getByTestId('play-now-change-summary'));
    expect(details.open).toBe(true);
    fireEvent.click(screen.getByTestId('play-now-lesson-l2'));
    expect(details.open).toBe(false);
    expect(screen.getByTestId('play-now-armed')).toHaveTextContent('Fruits');
  });

  it('When GO LIVE is pressed, Then a designed launch stage names the game instead of a bare splash', () => {
    const onLaunch = vi.fn();
    render(<PlayNowLauncher onLaunch={onLaunch} />);
    expect(screen.queryByTestId('hq-launch-stage')).toBeNull();
    fireEvent.click(screen.getByTestId('hq-mode-blast'));
    fireEvent.click(screen.getByTestId('play-now-go'));
    expect(onLaunch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('hq-launch-stage')).toHaveTextContent('eduHq.launch.titleMode');
    expect(screen.getByTestId('hq-launch-stage')).toHaveTextContent('academy.hq.modes.blast');
  });
});
