/**
 * Tests for HintMessage Component
 *
 * Verifies hint message rendering using translation keys
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { HintMessage } from '../HintMessage';
import type { HintData } from '@/lib/adaptiveDifficulty';

// Mock LanguageContext
const mockT = vi.fn((key: string, params?: Record<string, string | number>) => {
  if (key === 'difficulty.hint.length') {
    return `The word is ${params?.length} letters long`;
  }
  if (key === 'difficulty.hint.lengthAndStart') {
    return `The word is ${params?.length} letters starting with ${params?.letter}`;
  }
  if (key === 'difficulty.hint.fullReveal') {
    return `The word is: ${params?.word}`;
  }
  return key;
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
  }),
}));

describe('HintMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when hintData.level is none', () => {
    const hintData: HintData = {
      level: 'none',
    };

    const { container } = render(<HintMessage hintData={hintData} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders hint message for length level', () => {
    const hintData: HintData = {
      level: 'length',
      message: 'difficulty.hint.length',
      wordLength: 5,
    };

    render(<HintMessage hintData={hintData} />);

    expect(mockT).toHaveBeenCalledWith('difficulty.hint.length', { length: 5 });
    expect(screen.getByText('The word is 5 letters long')).toBeInTheDocument();
  });

  it('renders hint message for lengthAndStart level', () => {
    const hintData: HintData = {
      level: 'lengthAndStart',
      message: 'difficulty.hint.lengthAndStart',
      wordLength: 6,
      startLetter: 'A',
      highlightTiles: [{ row: 0, col: 0 }],
    };

    render(<HintMessage hintData={hintData} />);

    expect(mockT).toHaveBeenCalledWith('difficulty.hint.lengthAndStart', {
      length: 6,
      letter: 'A'
    });
    expect(screen.getByText('The word is 6 letters starting with A')).toBeInTheDocument();
  });

  it('renders hint message for fullReveal level', () => {
    const hintData: HintData = {
      level: 'fullReveal',
      message: 'difficulty.hint.fullReveal',
      wordLength: 4,
      targetWord: 'TEST',
      highlightTiles: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
      ],
    };

    render(<HintMessage hintData={hintData} />);

    expect(mockT).toHaveBeenCalledWith('difficulty.hint.fullReveal', { word: 'TEST' });
    expect(screen.getByText('The word is: TEST')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const hintData: HintData = {
      level: 'length',
      message: 'difficulty.hint.length',
      wordLength: 5,
    };

    const { container } = render(<HintMessage hintData={hintData} className="custom-class" />);
    const element = container.querySelector('.custom-class');
    expect(element).toBeInTheDocument();
  });

  it('uses correct translation keys', () => {
    const testCases: Array<{ hintData: HintData; expectedKey: string }> = [
      {
        hintData: {
          level: 'length',
          message: 'difficulty.hint.length',
          wordLength: 5,
        },
        expectedKey: 'difficulty.hint.length',
      },
      {
        hintData: {
          level: 'lengthAndStart',
          message: 'difficulty.hint.lengthAndStart',
          wordLength: 6,
          startLetter: 'B',
        },
        expectedKey: 'difficulty.hint.lengthAndStart',
      },
      {
        hintData: {
          level: 'fullReveal',
          message: 'difficulty.hint.fullReveal',
          targetWord: 'WORD',
        },
        expectedKey: 'difficulty.hint.fullReveal',
      },
    ];

    testCases.forEach(({ hintData, expectedKey }) => {
      mockT.mockClear();
      render(<HintMessage hintData={hintData} />);
      expect(mockT).toHaveBeenCalledWith(expectedKey, expect.any(Object));
    });
  });
});
