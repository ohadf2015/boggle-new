/**
 * The student's practice tile grid: every practice type the lesson can drive,
 * with an honest readiness badge on each tile.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import PracticePicker from './PracticePicker';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    // Echo the key plus any params so a missing key is impossible to miss.
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.values(params).join(',')})` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));

const w = (word: string, extra: Partial<VocabularyWord> = {}): VocabularyWord => ({
  word,
  canIntegrate: true,
  ...extra,
});

const lesson: VocabularyWord[] = [
  w('happy', { definition: 'feeling joy', meanings: ['feeling joy', 'pleased with a result'] }),
  w('brave', { definition: 'not afraid', meanings: ['not afraid', 'facing something hard'] }),
  w('quick', { definition: 'moving fast' }),
  w('tiny', { definition: 'very small' }),
];

const onSelectMode = vi.fn();
const onBack = vi.fn();

const renderIt = (words = lesson) =>
  render(
    <PracticePicker
      lessonName="Unit 3 vocabulary"
      words={words}
      language="en"
      onSelectMode={onSelectMode}
      onBack={onBack}
    />
  );

beforeEach(() => {
  onSelectMode.mockClear();
  onBack.mockClear();
});

describe('PracticePicker', () => {
  it('renders a tile for every practice type, games and skills alike', () => {
    renderIt();
    expect(screen.getByTestId('practice-tile-solo_board')).toBeInTheDocument();
    expect(screen.getByTestId('practice-tile-word_list')).toBeInTheDocument();
    expect(screen.getByTestId('practice-tile-vocab_focus:definition')).toBeInTheDocument();
    expect(screen.getByTestId('practice-tile-vocab_focus:multiple_meaning')).toBeInTheDocument();
    expect(screen.getByTestId('practice-tile-vocab_focus:roots_affixes')).toBeInTheDocument();
  });

  it('starts the plain mode when a game tile is tapped', () => {
    renderIt();
    fireEvent.click(screen.getByTestId('practice-tile-solo_board'));
    expect(onSelectMode).toHaveBeenCalledWith('solo_board', undefined);
  });

  it('carries the skill through when a vocabulary tile is tapped', () => {
    renderIt();
    fireEvent.click(screen.getByTestId('practice-tile-vocab_focus:definition'));
    expect(onSelectMode).toHaveBeenCalledWith('vocab_focus', { focus: 'definition' });
  });

  it('disables a skill the lesson has no data for and says what to add', () => {
    renderIt();
    const locked = screen.getByTestId('practice-tile-vocab_focus:synonym');
    expect(locked).toBeDisabled();
    fireEvent.click(locked);
    expect(onSelectMode).not.toHaveBeenCalled();
    expect(locked).toHaveTextContent('education.vocabFocus.unlock.synonym');
  });

  it('shows a question count on a ready skill tile, not a word count', () => {
    renderIt();
    const tile = screen.getByTestId('practice-tile-vocab_focus:definition');
    expect(tile).toHaveTextContent('education.practicePicker.questions(4)');
  });

  it('locks every tile and explains itself for a lesson with no words', () => {
    renderIt([]);
    expect(screen.getByTestId('practice-tile-solo_board')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('education.practicePicker.nothingReady');
  });

  it('reports how many tiles are playable', () => {
    renderIt();
    expect(screen.getByTestId('practice-picker-readiness')).toHaveTextContent(
      'education.practicePicker.readyCount('
    );
  });

  it('shows the mastery badge the mode selector used to show', () => {
    render(
      <PracticePicker
        lessonName="Unit 3 vocabulary"
        words={lesson}
        language="en"
        mastery="practicing"
        onSelectMode={onSelectMode}
        onBack={onBack}
      />
    );
    expect(screen.getByTestId('practice-picker-mastery')).toHaveTextContent(
      'education.practice.mastery.practicing'
    );
  });

  it('hides the mastery badge before the student has started', () => {
    render(
      <PracticePicker
        lessonName="Unit 3 vocabulary"
        words={lesson}
        language="en"
        mastery="not_started"
        onSelectMode={onSelectMode}
        onBack={onBack}
      />
    );
    expect(screen.queryByTestId('practice-picker-mastery')).not.toBeInTheDocument();
  });

  it('shows a play count on a mode the student has already practised', () => {
    render(
      <PracticePicker
        lessonName="Unit 3 vocabulary"
        words={lesson}
        language="en"
        sessions={{
          flashcard_sessions: 3,
          solo_board_sessions: 0,
          warmup_sessions: 0,
          word_list_views: 0,
          matching_sessions: 0,
          spelling_sessions: 0,
          blitz_sessions: 0,
        }}
        onSelectMode={onSelectMode}
        onBack={onBack}
      />
    );
    expect(screen.getByTestId('practice-tile-plays-flashcard')).toHaveTextContent(
      'education.practicePicker.played(3)'
    );
    expect(screen.queryByTestId('practice-tile-plays-solo_board')).not.toBeInTheDocument();
  });
});
