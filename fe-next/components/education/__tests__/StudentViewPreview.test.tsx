import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentViewPreview } from '../StudentViewPreview';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

const classroom = { id: 'c1', name: 'Period 3', join_code: 'ABC123', language: 'en' } as any;
const lessons = [
  {
    id: 'l1',
    name: 'Unit 1',
    language: 'en',
    words: [
      { word: 'apple', canIntegrate: true },
      { word: 'grape', canIntegrate: true },
      { word: 'ice cream', canIntegrate: false },
      { word: 'zzzzq', canIntegrate: false },
      { word: 'extraordinarily', canIntegrate: false },
    ],
  },
] as any[];

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  classroom,
  lessons,
  gameMode: 'classic' as const,
  timerMinutes: 3,
  boardSize: 'small' as const,
  minWordLength: 3,
};

describe('StudentViewPreview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when closed', () => {
    render(<StudentViewPreview {...baseProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a labelled dialog on the Join step showing the real class join code', () => {
    render(<StudentViewPreview {...baseProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).toHaveTextContent('education.studentPreview.title');
    expect(screen.getByTestId('student-preview-join-code')).toHaveTextContent('ABC123');
    expect(screen.getByTestId('student-preview-step')).toHaveTextContent('education.studentPreview.steps.join');
  });

  it('walks Next/Back through Join → Waiting room → Game', () => {
    render(<StudentViewPreview {...baseProps} />);
    const next = screen.getByRole('button', { name: 'education.studentPreview.next' });
    const back = screen.getByRole('button', { name: 'education.studentPreview.back' });
    expect(back).toBeDisabled();

    fireEvent.click(next);
    expect(screen.getByTestId('student-preview-step')).toHaveTextContent('education.studentPreview.steps.waiting');
    expect(screen.getByText('education.studentPreview.waiting.title')).toBeInTheDocument();
    // Settings summarised as the student sees them
    expect(screen.getByText('teacher.classroom.gameModes.classic')).toBeInTheDocument();
    expect(screen.getByText('teacher.classroom.board.small')).toBeInTheDocument();

    fireEvent.click(next);
    expect(screen.getByTestId('student-preview-step')).toHaveTextContent('education.studentPreview.steps.game');
    expect(screen.getByTestId('student-preview-board')).toBeInTheDocument();

    fireEvent.click(back);
    expect(screen.getByTestId('student-preview-step')).toHaveTextContent('education.studentPreview.steps.waiting');
  });

  it('on the Game step shows a board of the chosen size, hidden words, and skipped words with reasons', () => {
    render(<StudentViewPreview {...baseProps} />);
    const next = screen.getByRole('button', { name: 'education.studentPreview.next' });
    fireEvent.click(next);
    fireEvent.click(next);

    const board = screen.getByTestId('student-preview-board');
    expect(within(board).getAllByTestId('student-preview-tile')).toHaveLength(25);

    const hidden = screen.getByTestId('student-preview-hidden-words');
    expect(within(hidden).getByText('apple')).toBeInTheDocument();
    expect(within(hidden).getByText('grape')).toBeInTheDocument();

    const skipped = screen.getByTestId('student-preview-skipped-words');
    expect(within(skipped).getByText('ice cream')).toBeInTheDocument();
    expect(within(skipped).getByText('education.studentPreview.skipped.reason.multiWord')).toBeInTheDocument();
    expect(within(skipped).getByText('zzzzq')).toBeInTheDocument();
    expect(within(skipped).getByText('education.studentPreview.skipped.reason.notInDictionary')).toBeInTheDocument();
    expect(within(skipped).getByText('extraordinarily')).toBeInTheDocument();
    expect(within(skipped).getByText('education.studentPreview.skipped.reason.tooLong')).toBeInTheDocument();

    expect(screen.getByText('education.studentPreview.freshBoardNote')).toBeInTheDocument();
  });

  it('flags an integrable word that is too long for the chosen board size', () => {
    const longLessons = [
      { ...lessons[0], words: [{ word: 'cat', canIntegrate: true }, { word: 'elephant', canIntegrate: true }] },
    ];
    render(<StudentViewPreview {...baseProps} lessons={longLessons} boardSize="small" />);
    const next = screen.getByRole('button', { name: 'education.studentPreview.next' });
    fireEvent.click(next);
    fireEvent.click(next);
    const skipped = screen.getByTestId('student-preview-skipped-words');
    expect(within(skipped).getByText('elephant')).toBeInTheDocument();
    expect(within(skipped).getByText('education.studentPreview.skipped.reason.tooLongForBoard')).toBeInTheDocument();
  });

  it('reshuffles the sample board without changing which lesson words are offered', () => {
    render(<StudentViewPreview {...baseProps} />);
    const next = screen.getByRole('button', { name: 'education.studentPreview.next' });
    fireEvent.click(next);
    fireEvent.click(next);
    const readBoard = () =>
      within(screen.getByTestId('student-preview-board'))
        .getAllByTestId('student-preview-tile')
        .map((tile) => tile.textContent)
        .join('');
    const before = readBoard();
    fireEvent.click(screen.getByRole('button', { name: 'education.studentPreview.shuffle' }));
    expect(readBoard()).not.toEqual(before);
    expect(within(screen.getByTestId('student-preview-hidden-words')).getByText('apple')).toBeInTheDocument();
  });

  it('closes on Escape and via the close button', () => {
    const onClose = vi.fn();
    render(<StudentViewPreview {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'education.studentPreview.close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
