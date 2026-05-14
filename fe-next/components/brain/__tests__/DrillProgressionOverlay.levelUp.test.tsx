/**
 * DrillProgressionOverlay level-up banner tests
 *
 * Verifies the level-up celebration banner renders only when a drill
 * promoted the player to a higher level, and surfaces the new level
 * via the localized brain.drills.levelUp key.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, className, role, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} role={role} {...props}>{children}</div>
    ),
    p: ({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className={className} {...props}>{children}</p>
    ),
    h2: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className={className} {...props}>{children}</h2>
    ),
  },
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'brain.drills.levelUp' && params) return `Level Up! Now Level ${params.level}`;
      if (key === 'brain.drills.brainTraining') return 'Brain Training';
      if (key === 'brain.domains.processingSpeed') return 'Processing Speed';
      if (key === 'common.close') return 'Close';
      return key;
    },
  }),
}));

import DrillProgressionOverlay from '../DrillProgressionOverlay';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  targetDomain: 'processingSpeed' as const,
  newDomainScore: 72,
  scoreDelta: 8,
  overallScore: 65,
  tier: 'advanced' as const,
};

describe('DrillProgressionOverlay level-up', () => {
  it('renders the level-up banner when player promoted', () => {
    render(<DrillProgressionOverlay {...baseProps} levelUp={{ newLevel: 3, previousLevel: 2 }} />);
    expect(screen.getByText('Level Up! Now Level 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Level up to 3')).toBeInTheDocument();
  });

  it('does not render the banner when level unchanged', () => {
    render(<DrillProgressionOverlay {...baseProps} levelUp={{ newLevel: 2, previousLevel: 2 }} />);
    expect(screen.queryByText(/Level Up!/i)).not.toBeInTheDocument();
  });

  it('does not render the banner when levelUp prop is omitted', () => {
    render(<DrillProgressionOverlay {...baseProps} />);
    expect(screen.queryByText(/Level Up!/i)).not.toBeInTheDocument();
  });

  it('does not render banner when newLevel is lower than previousLevel (defensive)', () => {
    render(<DrillProgressionOverlay {...baseProps} levelUp={{ newLevel: 1, previousLevel: 2 }} />);
    expect(screen.queryByText(/Level Up!/i)).not.toBeInTheDocument();
  });
});
