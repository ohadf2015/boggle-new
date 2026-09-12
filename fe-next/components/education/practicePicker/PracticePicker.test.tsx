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

/** Reveal everything behind the "more games" disclosure. */
const expandAll = () => {
  const more = screen.queryByTestId('practice-picker-more');
  if (more) fireEvent.click(more);
};

describe('PracticePicker', () => {
  it('renders a tile for every practice type, games and skills alike', () => {
    renderIt();
    expandAll();
    expect(screen.getByTestId('practice-tile-solo_board')).toBeInTheDocument();
    expect(screen.getByTestId('practice-tile-word_list')).toBeInTheDocument();
    expect(screen.getByTestId('practice-tile-vocab_focus:definition')).toBeInTheDocument();
    expect(screen.getByTestId('practice-tile-vocab_focus:multiple_meaning')).toBeInTheDocument();
    expect(screen.getByTestId('practice-tile-vocab_focus:roots_affixes')).toBeInTheDocument();
  });

  it('starts the plain mode when a game tile is tapped', () => {
    renderIt();
    expandAll();
    fireEvent.click(screen.getByTestId('practice-tile-solo_board'));
    expect(onSelectMode).toHaveBeenCalledWith('solo_board', undefined);
  });

  it('carries the skill through when a vocabulary tile is tapped', () => {
    renderIt();
    expandAll();
    fireEvent.click(screen.getByTestId('practice-tile-vocab_focus:definition'));
    expect(onSelectMode).toHaveBeenCalledWith('vocab_focus', { focus: 'definition' });
  });

  it('disables a skill the lesson has no data for and says what to add', () => {
    renderIt();
    expandAll();
    const locked = screen.getByTestId('practice-tile-vocab_focus:synonym');
    expect(locked).toBeDisabled();
    fireEvent.click(locked);
    expect(onSelectMode).not.toHaveBeenCalled();
    expect(locked).toHaveTextContent('education.vocabFocus.unlock.synonym');
  });

  it('shows a question count on a ready skill tile, not a word count', () => {
    renderIt();
    expandAll();
    const tile = screen.getByTestId('practice-tile-vocab_focus:definition');
    expect(tile).toHaveTextContent('education.practicePicker.questions(4)');
  });

  it('locks every tile and explains itself for a lesson with no words', () => {
    renderIt([]);
    expandAll();
    expect(screen.getByTestId('practice-tile-solo_board')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('education.practicePicker.nothingReady');
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
    expandAll();
    expect(screen.getByTestId('practice-tile-plays-flashcard')).toHaveTextContent(
      'education.practicePicker.played(3)'
    );
    expect(screen.queryByTestId('practice-tile-plays-solo_board')).not.toBeInTheDocument();
  });
});

describe('PracticePicker poster grid', () => {
  it('shows what each game pays, so the tiles are not interchangeable', () => {
    renderIt();
    expandAll();
    // Spelling pays 20/word against Blitz's 10 — the reason to pick one.
    // Blitz leads the ranking, so its rate rides on the hero poster.
    expect(screen.getByTestId('practice-tile-xp-spelling')).toHaveTextContent('20');
    expect(screen.getByTestId('practice-hero-xp-blitz')).toHaveTextContent('10');
  });

  it('does not advertise XP on the read-only word list', () => {
    renderIt();
    expandAll();
    expect(screen.queryByTestId('practice-tile-xp-word_list')).not.toBeInTheDocument();
  });

  it('gives every tile mascot art, poster or fallback', () => {
    renderIt();
    expandAll();
    for (const id of ['flashcard', 'spelling', 'matching', 'solo_board']) {
      const art = screen.getByTestId(`practice-tile-art-${id}`);
      expect(art).toHaveAttribute('src', expect.stringMatching(/\.webp$/));
    }
    expect(screen.getByTestId('practice-hero-art-blitz')).toHaveAttribute(
      'src',
      expect.stringMatching(/-nobg\.webp$/)
    );
  });

  it('uses the full-bleed poster where one has been drawn', () => {
    renderIt();
    expandAll();
    // The bespoke posters live on the tiles; the hero floats a transparent
    // mascot on its accent instead (a navy poster plate on a pink fill reads as
    // a failed image load).
    expect(screen.getByTestId('practice-tile-art-spelling')).toHaveAttribute(
      'src',
      '/mascot/teacher/practice-spelling.webp'
    );
  });

  it('keeps every tile to a single line of copy so the grid fits a phone', () => {
    renderIt();
    expandAll();
    // The old tile stacked title + skill sentence + badges (4 rows). The poster
    // tile carries the name and one meta row and nothing else.
    const tile = screen.getByTestId('practice-tile-spelling');
    expect(tile.querySelectorAll('[data-tile-line]')).toHaveLength(1);
  });

  it('scrolls the grid, never the page', () => {
    renderIt();
    expect(screen.getByTestId('practice-picker-grid').className).toContain('overflow-y-auto');
  });
});

describe('PracticePicker decision load', () => {
  it('GIVEN a lesson WHEN the picker opens THEN exactly one practice is recommended', () => {
    renderIt();
    expect(screen.getAllByTestId('practice-picker-hero')).toHaveLength(1);
  });

  it('GIVEN the picker WHEN it opens THEN one tap on the hero starts that practice', () => {
    renderIt();
    fireEvent.click(screen.getByTestId('practice-picker-hero-play'));
    expect(onSelectMode).toHaveBeenCalledTimes(1);
  });

  it('GIVEN fourteen tiles WHEN the picker opens THEN at most four are on screen', () => {
    renderIt();
    // Hero + the shortlist row. Everything else waits behind one disclosure.
    expect(screen.getByTestId('practice-picker-shortlist').children).toHaveLength(3);
    expect(screen.queryByTestId('practice-picker-rest')).not.toBeInTheDocument();
  });

  it('GIVEN locked skills WHEN the picker opens THEN none of them are shown yet', () => {
    renderIt();
    expect(screen.queryByTestId('practice-tile-vocab_focus:synonym')).not.toBeInTheDocument();
  });

  it('GIVEN the more disclosure WHEN it is opened THEN the rest of the board appears', () => {
    renderIt();
    const more = screen.getByTestId('practice-picker-more');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('practice-tile-vocab_focus:synonym')).toBeInTheDocument();
  });

  it('GIVEN an unplayed game WHEN a played one exists THEN the unplayed one is recommended', () => {
    render(
      <PracticePicker
        lessonName="Unit 3 vocabulary"
        words={lesson}
        language="en"
        sessions={{
          flashcard_sessions: 0,
          solo_board_sessions: 0,
          warmup_sessions: 0,
          word_list_views: 0,
          matching_sessions: 0,
          spelling_sessions: 0,
          blitz_sessions: 4,
        }}
        onSelectMode={onSelectMode}
        onBack={onBack}
      />
    );
    // Blitz would lead on priority, but it has been played and spelling has not.
    expect(screen.getByTestId('practice-picker-hero')).toHaveAttribute('data-tile', 'spelling');
  });
});

describe('PracticePicker hero routing', () => {
  it('GIVEN Word Tower is recommended WHEN the hero is tapped THEN the tower opens, not the plain board', () => {
    // Word Tower is the one tile that routes by VARIANT inside `solo_board`:
    // drop the variant and the screen's single big PLAY silently opens the
    // letter grid instead of the tower.
    render(
      <PracticePicker
        lessonName="Unit 3 vocabulary"
        words={lesson}
        language="en"
        sessions={{
          flashcard_sessions: 2,
          solo_board_sessions: 2,
          warmup_sessions: 2,
          word_list_views: 2,
          matching_sessions: 2,
          spelling_sessions: 2,
          blitz_sessions: 2,
        }}
        onSelectMode={onSelectMode}
        onBack={onBack}
      />
    );

    const hero = screen.getByTestId('practice-picker-hero');
    if (hero.getAttribute('data-tile') === 'word_tower') {
      fireEvent.click(screen.getByTestId('practice-picker-hero-play'));
      expect(onSelectMode).toHaveBeenCalledWith('solo_board', { variant: 'word_tower' });
      return;
    }
    // Wherever it lands in the shortlist, the variant has to travel with it.
    expandAll();
    fireEvent.click(screen.getByTestId('practice-tile-word_tower'));
    expect(onSelectMode).toHaveBeenCalledWith('solo_board', { variant: 'word_tower' });
  });
});

/*
 * Declutter (design addendum: every screen loses an element before it gains
 * one). The picker drew its own back arrow directly beneath the shell header's
 * back arrow — two identical controls, 60px apart, doing the same thing. The
 * r2 phone capture shows both. The shell's one stays; this one goes.
 */
describe('PracticePicker chrome', () => {
  it('draws no back control of its own — the shell header already has one', () => {
    renderIt();
    expect(screen.queryByRole('button', { name: 'common.back' })).toBeNull();
  });
});
