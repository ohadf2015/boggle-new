import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonalRecords } from '../PersonalRecords';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock useLanguage
const mockT = (key: string) => key;
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, locale: 'en' }),
}));

// Mock usePersonalRecords
vi.mock('@/hooks/usePersonalRecords', () => ({
  usePersonalRecords: () => ({
    longestWord: 'EXTRAORDINARY',
    highestCombo: 12,
    bestScorePerMode: { ranked: 450, casual: 380 },
    fastestWord: 1.2,
    totalUniqueWords: 543,
    isLoading: false,
    records: [
      { label: 'profile.records.longestWord', value: 'EXTRAORDINARY', icon: 'text' },
      { label: 'profile.records.highestCombo', value: 12, icon: 'flame' },
      { label: 'profile.records.fastestWord', value: '1.2s', icon: 'zap' },
      { label: 'profile.records.uniqueWords', value: 543, icon: 'book' },
      { label: 'profile.records.bestRanked', value: 450, mode: 'ranked', icon: 'trophy' },
      { label: 'profile.records.bestCasual', value: 380, mode: 'casual', icon: 'gamepad' },
    ],
  }),
}));

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

describe('PersonalRecords', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
  });

  it('renders all record cards', () => {
    render(<PersonalRecords />);
    expect(screen.getByText('EXTRAORDINARY')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('1.2s')).toBeInTheDocument();
    expect(screen.getByText('543')).toBeInTheDocument();
    expect(screen.getByText('450')).toBeInTheDocument();
    expect(screen.getByText('380')).toBeInTheDocument();
  });

  it('renders record labels using translation keys', () => {
    render(<PersonalRecords />);
    expect(screen.getByText('profile.records.longestWord')).toBeInTheDocument();
    expect(screen.getByText('profile.records.highestCombo')).toBeInTheDocument();
  });

  it('renders share buttons for each record', () => {
    render(<PersonalRecords />);
    const shareButtons = screen.getAllByRole('button', { name: /profile.records.share/i });
    expect(shareButtons.length).toBe(6);
  });

  it('share buttons are clickable', async () => {
    const user = userEvent.setup();
    render(<PersonalRecords />);
    const shareButtons = screen.getAllByRole('button', { name: /profile.records.share/i });
    // Verify share button exists and can be clicked without error
    await expect(user.click(shareButtons[0])).resolves.not.toThrow();
  });

  it('uses responsive grid layout', () => {
    const { container } = render(<PersonalRecords />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid?.className).toContain('grid-cols-2');
  });
});
