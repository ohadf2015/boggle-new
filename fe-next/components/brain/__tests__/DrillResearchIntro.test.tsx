/**
 * DrillResearchIntro Tests
 *
 * Verifies the research-grounded intro card surfaces the correct
 * cognitive domain + research basis per drill, dismisses to
 * sessionStorage, and respects locale.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, className, role, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} role={role} {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

const langMock = vi.fn(() => ({ language: 'en' }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => langMock(),
}));

import DrillResearchIntro from '../DrillResearchIntro';

describe('DrillResearchIntro', () => {
  beforeEach(() => {
    sessionStorage.clear();
    langMock.mockReturnValue({ language: 'en' });
  });

  it('renders the EN cognitive domain + blurb for lightning-round', () => {
    render(<DrillResearchIntro drillType="lightning-round" />);
    expect(screen.getByText('Processing Speed')).toBeInTheDocument();
    expect(screen.getByText(/retrieves and validates words/i)).toBeInTheDocument();
  });

  it('renders different copy per drill type', () => {
    const { rerender } = render(<DrillResearchIntro drillType="memory-hunt" />);
    expect(screen.getByText('Working Memory')).toBeInTheDocument();
    rerender(<DrillResearchIntro drillType="pattern-switcher" />);
    expect(screen.getByText('Cognitive Flexibility')).toBeInTheDocument();
  });

  it('renders Hebrew copy for he locale', () => {
    langMock.mockReturnValue({ language: 'he' });
    render(<DrillResearchIntro drillType="rare-gems" />);
    expect(screen.getByText('עומק אוצר מילים')).toBeInTheDocument();
  });

  it('dismisses on close click and persists to sessionStorage', () => {
    render(<DrillResearchIntro drillType="combo-master" />);
    expect(screen.getByText('Sustained Attention')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText('Sustained Attention')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('lex_drill_intro_seen_combo-master')).toBe('1');
  });

  it('does not render if already dismissed in same session', () => {
    sessionStorage.setItem('lex_drill_intro_seen_lightning-round', '1');
    render(<DrillResearchIntro drillType="lightning-round" />);
    expect(screen.queryByText('Processing Speed')).not.toBeInTheDocument();
  });

  it('falls back to EN copy for unsupported locale', () => {
    langMock.mockReturnValue({ language: 'fr' });
    render(<DrillResearchIntro drillType="lightning-round" />);
    expect(screen.getByText('Processing Speed')).toBeInTheDocument();
  });
});
