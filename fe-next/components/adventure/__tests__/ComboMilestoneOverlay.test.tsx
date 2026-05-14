import { render, screen } from '@testing-library/react';
import { ComboMilestoneOverlay } from '../ComboMilestoneOverlay';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: object; animate?: object; exit?: object; transition?: object
    }) => (
      <div className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'adventure.combo.incredible': 'INCREDIBLE!',
        'adventure.combo.unstoppable': 'UNSTOPPABLE!',
        'adventure.combo.legendary': 'LEGENDARY!',
      };
      return translations[key] || key;
    },
  }),
}));

describe('ComboMilestoneOverlay', () => {
  it('renders nothing when no milestone', () => {
    render(<ComboMilestoneOverlay milestone={null} />);
    expect(screen.queryByTestId('combo-milestone-overlay')).not.toBeInTheDocument();
  });

  it('renders milestone text when active', () => {
    const milestone = {
      threshold: 10,
      labelKey: 'adventure.combo.incredible',
      duration: 2000,
      particleBudget: 0.6,
    };

    render(<ComboMilestoneOverlay milestone={milestone} />);
    expect(screen.getByText('INCREDIBLE!')).toBeInTheDocument();
  });

  it('renders UNSTOPPABLE for 15-combo milestone', () => {
    const milestone = {
      threshold: 15,
      labelKey: 'adventure.combo.unstoppable',
      duration: 2500,
      particleBudget: 0.8,
    };

    render(<ComboMilestoneOverlay milestone={milestone} />);
    expect(screen.getByText('UNSTOPPABLE!')).toBeInTheDocument();
  });

  it('renders LEGENDARY for 20-combo milestone', () => {
    const milestone = {
      threshold: 20,
      labelKey: 'adventure.combo.legendary',
      duration: 3000,
      particleBudget: 1.0,
    };

    render(<ComboMilestoneOverlay milestone={milestone} />);
    expect(screen.getByText('LEGENDARY!')).toBeInTheDocument();
  });

  it('has correct overlay styling', () => {
    const milestone = {
      threshold: 10,
      labelKey: 'adventure.combo.incredible',
      duration: 2000,
      particleBudget: 0.6,
    };

    render(<ComboMilestoneOverlay milestone={milestone} />);
    const overlay = screen.getByTestId('combo-milestone-overlay');
    expect(overlay).toHaveClass('fixed', 'inset-0', 'pointer-events-none');
  });

  it('applies neo-brutalist text styling', () => {
    const milestone = {
      threshold: 10,
      labelKey: 'adventure.combo.incredible',
      duration: 2000,
      particleBudget: 0.6,
    };

    render(<ComboMilestoneOverlay milestone={milestone} />);
    const text = screen.getByText('INCREDIBLE!');
    expect(text).toHaveClass('font-neo-display', 'text-neo-yellow');
  });
});
