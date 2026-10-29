import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown, b?: Record<string, unknown>) => {
      const text = typeof a === 'string' ? a : k;
      const params = (typeof a === 'object' ? a : b) as Record<string, unknown> | undefined;
      return params ? text.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? '')) : text;
    },
    language: 'en',
  }),
}));
import { LobbyLessonStep } from '../LobbyLessonStep';

const lesson = (id: string, language: string) =>
  ({ id, name: `List ${id}`, language, description: null, words: [{ word: 'cat' }] }) as never;

const stepProps = {
  lessons: [lesson('en1', 'en'), lesson('he1', 'he')],
  classLanguage: 'en',
  createHref: '/en/teacher/curriculum',
  wordCount: 1,
  activePreset: null,
};

describe('board language in the lobby', () => {
  it('Given a board language, Then the closed word-list row shows its flag and name', () => {
    render(<LobbyLessonStep {...stepProps} selectedLessonIds={['he1']} onChange={vi.fn()} boardLanguage="he" />);
    expect(screen.getByTestId('lobby-lesson-toggle')).toHaveAttribute('aria-expanded', 'false');
    const chip = within(screen.getByTestId('lobby-lesson-toggle')).getByTestId('board-language-chip');
    expect(chip).toHaveTextContent('עברית');
    expect(chip).toHaveTextContent('🇮🇱');
  });

  it('Given no list yet, Then the picker is open, the row says what is missing, and no board chip is shown', () => {
    render(<LobbyLessonStep {...stepProps} selectedLessonIds={[]} wordCount={0} onChange={vi.fn()} boardLanguage={null} />);
    expect(screen.getByTestId('mode-picker-blocked')).toHaveTextContent('education.modePicker.needsLesson');
    expect(screen.getByTestId('lobby-lesson-body')).toBeInTheDocument();
    expect(screen.queryByTestId('board-language-chip')).toBeNull();
  });

  it('Given the open picker, Then the class language lists come first', () => {
    render(<LobbyLessonStep {...stepProps} selectedLessonIds={['en1']} onChange={vi.fn()} boardLanguage="en" />);
    fireEvent.click(screen.getByTestId('lobby-lesson-toggle'));
    expect(screen.getAllByRole('checkbox')[0]).toHaveAccessibleName(/List en1/);
  });

  it('Given a Hebrew list in a class whose default is English, Then the board chip says Hebrew and nothing warns', () => {
    render(<LobbyLessonStep {...stepProps} selectedLessonIds={['he1']} onChange={vi.fn()} boardLanguage="he" />);
    fireEvent.click(screen.getByTestId('lobby-lesson-toggle'));
    expect(screen.getByTestId('board-language-chip')).toHaveTextContent(/עברית/);
    expect(screen.queryByTestId('lesson-class-mismatch')).toBeNull();
  });

  it('When a list in another language is tapped, Then the selection switches instead of mixing', () => {
    const onChange = vi.fn();
    render(<LobbyLessonStep {...stepProps} selectedLessonIds={['en1']} onChange={onChange} boardLanguage="en" />);
    fireEvent.click(screen.getByTestId('lobby-lesson-toggle'));
    fireEvent.click(screen.getByRole('checkbox', { name: /List he1/ }));
    expect(onChange).toHaveBeenCalledWith(['he1']);
  });
});
