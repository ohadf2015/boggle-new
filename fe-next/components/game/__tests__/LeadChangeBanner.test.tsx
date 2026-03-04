import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LeadChangeBanner } from '../LeadChangeBanner';
import type { LeadChangeEvent } from '@/hooks/useLeadChangeDetection';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} data-testid={props['data-testid'] as string} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock translations
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'leadChange.tookLead': 'You took the lead!',
        'leadChange.lostLead': `${params?.username || ''} took the lead!`,
      };
      return translations[key] || key;
    },
    dir: 'ltr',
  }),
}));

describe('LeadChangeBanner', () => {
  it('should render nothing when event is null', () => {
    const { container } = render(<LeadChangeBanner event={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('should render took-lead banner with correct text', () => {
    const event: LeadChangeEvent = { type: 'took-lead', newLeader: 'player1' };
    render(<LeadChangeBanner event={event} />);
    expect(screen.getByText('You took the lead!')).toBeInTheDocument();
  });

  it('should render lost-lead banner with username', () => {
    const event: LeadChangeEvent = { type: 'lost-lead', newLeader: 'rival' };
    render(<LeadChangeBanner event={event} />);
    expect(screen.getByText('rival took the lead!')).toBeInTheDocument();
  });

  it('should use neo-yellow background for took-lead', () => {
    const event: LeadChangeEvent = { type: 'took-lead', newLeader: 'player1' };
    render(<LeadChangeBanner event={event} />);
    const banner = screen.getByTestId('lead-change-banner');
    expect(banner.className).toContain('bg-neo-yellow');
  });

  it('should use neo-orange background for lost-lead', () => {
    const event: LeadChangeEvent = { type: 'lost-lead', newLeader: 'rival' };
    render(<LeadChangeBanner event={event} />);
    const banner = screen.getByTestId('lead-change-banner');
    expect(banner.className).toContain('bg-neo-orange');
  });

  it('should have pointer-events-none to not block grid interaction', () => {
    const event: LeadChangeEvent = { type: 'took-lead', newLeader: 'player1' };
    render(<LeadChangeBanner event={event} />);
    const banner = screen.getByTestId('lead-change-banner');
    expect(banner.className).toContain('pointer-events-none');
  });

  it('should have neo-brutalist styling', () => {
    const event: LeadChangeEvent = { type: 'took-lead', newLeader: 'player1' };
    render(<LeadChangeBanner event={event} />);
    const banner = screen.getByTestId('lead-change-banner');
    expect(banner.className).toContain('border-3');
    expect(banner.className).toContain('border-neo-black');
    expect(banner.className).toContain('shadow-hard-sm');
  });
});
