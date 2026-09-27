import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AlmostFoundWords from '../AlmostFoundWords';
import type { AlmostFoundWord } from '@/shared/utils/nearMissCalculator';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => {
    const translations: Record<string, string> = {
      'almostFound.title': 'You Almost Found...',
      'almostFound.matchPercent': '{percent}% match',
      'almostFound.wouldHaveScored': '+{score} pts',
    };
    return {
      t: (key: string) => translations[key] || key,
      language: 'en',
      dir: 'ltr',
    };
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockWords: AlmostFoundWord[] = [
  {
    word: 'QUANTUM',
    score: 8,
    matchPercentage: 85.71,
    wordPath: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 }, { row: 2, col: 0 }],
    playerTracePath: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 }],
  },
  {
    word: 'PUZZLE',
    score: 5,
    matchPercentage: 66.67,
    wordPath: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 }],
    playerTracePath: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }],
  },
];

describe('AlmostFoundWords', () => {
  it('should render nothing when words array is empty', () => {
    const { container } = render(<AlmostFoundWords words={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render title', () => {
    render(<AlmostFoundWords words={mockWords} />);
    expect(screen.getByText('You Almost Found...')).toBeInTheDocument();
  });

  it('should render word chips for each almost-found word', () => {
    render(<AlmostFoundWords words={mockWords} />);
    expect(screen.getByText('QUANTUM')).toBeInTheDocument();
    expect(screen.getByText('PUZZLE')).toBeInTheDocument();
  });

  it('should show match percentage for each word', () => {
    render(<AlmostFoundWords words={mockWords} />);
    expect(screen.getByText('86%')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('should show score for each word', () => {
    render(<AlmostFoundWords words={mockWords} />);
    expect(screen.getByText('+8')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('should call onWordSelect when a word is clicked', () => {
    const onWordSelect = vi.fn();
    render(<AlmostFoundWords words={mockWords} onWordSelect={onWordSelect} />);
    fireEvent.click(screen.getByText('QUANTUM'));
    expect(onWordSelect).toHaveBeenCalledWith('QUANTUM', mockWords[0].wordPath);
  });

  it('should apply className prop', () => {
    const { container } = render(
      <AlmostFoundWords words={mockWords} className="test-class" />
    );
    expect(container.firstChild).toHaveClass('test-class');
  });
});
