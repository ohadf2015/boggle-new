import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock dependencies
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'wordHuntAnnouncement.badge': 'New in Multiplayer',
        'wordHuntAnnouncement.title': 'Try Word Hunt Mode!',
        'wordHuntAnnouncement.subtitle': 'Race to find the hidden target word',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

jest.mock('@/utils/session', () => ({
  clearSessionPreservingUsername: jest.fn(),
}));

jest.mock('framer-motion', () => ({
  motion: {
    button: React.forwardRef(({ children, onMouseEnter, onMouseLeave, ...props }: any, ref: any) => (
      <button ref={ref} onClick={props.onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className={props.className}>{children}</button>
    )),
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} className={props.className}>{children}</div>
    )),
    span: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <span ref={ref} className={props.className}>{children}</span>
    )),
  },
}));

import WordHuntAnnouncementBanner from '../WordHuntAnnouncementBanner';
import { clearSessionPreservingUsername } from '@/utils/session';

describe('WordHuntAnnouncementBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the announcement text', () => {
    render(<WordHuntAnnouncementBanner />);

    expect(screen.getByText('New in Multiplayer')).toBeInTheDocument();
    expect(screen.getByText('Try Word Hunt Mode!')).toBeInTheDocument();
    expect(screen.getByText('Race to find the hidden target word')).toBeInTheDocument();
  });

  it('navigates to multiplayer with mode=word-hunt on click', () => {
    render(<WordHuntAnnouncementBanner />);

    fireEvent.click(screen.getByText('Try Word Hunt Mode!'));

    expect(clearSessionPreservingUsername).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?mode=word-hunt');
  });

  it('applies custom className', () => {
    const { container } = render(<WordHuntAnnouncementBanner className="mt-4" />);

    const button = container.querySelector('button');
    expect(button?.className).toContain('mt-4');
  });

  it('respects reduced motion preferences', () => {
    // Override to prefer reduced motion
    jest.spyOn(require('@/hooks/useDevicePerformance'), 'useDevicePerformance').mockReturnValue({
      enableComplexAnimations: false,
      prefersReducedMotion: true,
    });

    const { container } = render(<WordHuntAnnouncementBanner />);

    // Sparkle elements should not render when reduced motion is preferred
    // The Sparkles and Zap icons are only rendered when canAnimate is true
    const svgs = container.querySelectorAll('svg');
    // Should only have Target and ChevronRight icons, not Sparkles/Zap
    expect(svgs.length).toBeLessThanOrEqual(3);
  });
});
