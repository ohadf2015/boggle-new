// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareButton } from '../ShareButton';
import type { ShareParams } from '@/shared/utils/shareResultGenerator';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MotionButton = React.forwardRef(function MotionButton({ children, ...props }: any, ref: any) {
    return <button ref={ref} {...props}>{children}</button>;
  });
  return { m: { button: MotionButton } };
});

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

describe('ShareButton', () => {
  const mockT = (key: string) => {
    const map: Record<string, string> = {
      'results.share': 'Share',
      'share.copied': 'Copied!',
      'shareResult.singleplayer': 'LexiClash Solo',
      'shareResult.score': 'Score',
      'shareResult.words': 'Words',
    };
    return map[key] || key;
  };

  const defaultParams: ShareParams = {
    gameMode: 'singleplayer',
    score: 100,
    wordsFound: 8,
  };

  it('should render share button with translated text', () => {
    render(<ShareButton params={defaultParams} t={mockT} />);
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('should show copied feedback after clicking', async () => {
    render(<ShareButton params={defaultParams} t={mockT} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should have neo-brutalist styling', () => {
    render(<ShareButton params={defaultParams} t={mockT} />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('border-3');
    expect(button.className).toContain('rounded-neo');
    expect(button.className).toContain('shadow-hard');
  });
});
