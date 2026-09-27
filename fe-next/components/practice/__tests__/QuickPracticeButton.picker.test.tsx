/**
 * The practice picker must be what a student lands on.
 *
 * A critic never saw the skill tiles at all. The reason was not the picker: the
 * only route into a lesson is this button, and its primary action fired
 * `onPractice('flashcard')`, which the lesson page's `?mode=` deep link
 * consumes by auto-starting that mode. The picker was rendered by code no
 * student could reach.
 *
 * Primary action now opens the lesson with NO mode, so the tile grid is the
 * first thing they see. The per-mode menu keeps sending a mode, because
 * teacher deep links (`focusPracticeHref`, the assigned-focus button) depend on
 * `?mode=` continuing to work.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickPracticeButton from '../QuickPracticeButton';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

const onPractice = vi.fn();

beforeEach(() => onPractice.mockClear());

const renderIt = () =>
  render(<QuickPracticeButton lessonId="lesson-1" onPractice={onPractice} />);

describe('QuickPracticeButton', () => {
  it('opens the lesson with no mode, so the picker renders', () => {
    renderIt();
    fireEvent.click(screen.getByText('education.practice.quickPractice'));

    expect(onPractice).toHaveBeenCalledTimes(1);
    // No mode: the lesson page shows the tile grid rather than auto-starting.
    expect(onPractice).toHaveBeenCalledWith(undefined);
  });

  it('never auto-starts flashcards from the primary action', () => {
    renderIt();
    fireEvent.click(screen.getByText('education.practice.quickPractice'));
    expect(onPractice).not.toHaveBeenCalledWith('flashcard');
  });
});
