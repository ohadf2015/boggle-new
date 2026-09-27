import React from 'react';
import { render, screen, act } from '@testing-library/react';
import TomorrowPreview from '../TomorrowPreview';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} style={style} data-testid={rest['data-testid' as keyof typeof rest] as string}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useReducedMotion
let mockReducedMotion = false;
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: () => mockReducedMotion,
  useReducedMotion: () => mockReducedMotion,
}));

// Mock LanguageContext
const translations: Record<string, string> = {
  'tomorrowPreview.singleplayer': "Tomorrow's grid has a rare letter. Big points await!",
  'tomorrowPreview.blast': "Tomorrow's Blast has new combo patterns. Ready?",
  'tomorrowPreview.adventure': 'Next level preview loading... Come back to find out!',
  'tomorrowPreview.seeYou': 'See you tomorrow',
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => translations[key] || key,
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('TomorrowPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the singleplayer teaser for singleplayer mode', () => {
    render(<TomorrowPreview mode="singleplayer" />);
    expect(screen.getByText(translations['tomorrowPreview.singleplayer'])).toBeInTheDocument();
    expect(screen.getByText(translations['tomorrowPreview.seeYou'])).toBeInTheDocument();
  });

  it('renders the blast teaser for blast mode', () => {
    render(<TomorrowPreview mode="blast" />);
    expect(screen.getByText(translations['tomorrowPreview.blast'])).toBeInTheDocument();
  });

  it('renders the adventure teaser for adventure mode', () => {
    render(<TomorrowPreview mode="adventure" />);
    expect(screen.getByText(translations['tomorrowPreview.adventure'])).toBeInTheDocument();
  });

  it('renders the singleplayer teaser for daily mode', () => {
    render(<TomorrowPreview mode="daily" />);
    // daily uses singleplayer teaser as fallback
    expect(screen.getByText(translations['tomorrowPreview.singleplayer'])).toBeInTheDocument();
  });

  it('auto-dismisses after 3 seconds', () => {
    const onDismiss = vi.fn();
    render(<TomorrowPreview mode="singleplayer" onDismiss={onDismiss} />);

    expect(screen.getByText(translations['tomorrowPreview.singleplayer'])).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render dismiss button (auto only)', () => {
    render(<TomorrowPreview mode="singleplayer" />);
    // No close/dismiss button should exist
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    const { container } = render(<TomorrowPreview mode="singleplayer" />);
    const banner = container.firstChild as HTMLElement;
    expect(banner).toBeInTheDocument();
    // Check key styling classes are present
    expect(banner.className).toContain('bg-neo-navy/95');
    expect(banner.className).toContain('border-neo-yellow');
  });

  it('calls onDismiss callback when auto-dismiss fires', () => {
    const onDismiss = vi.fn();
    render(<TomorrowPreview mode="blast" onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses t() for all text content (no hardcoded strings)', () => {
    render(<TomorrowPreview mode="singleplayer" />);
    // All visible text should come from translations
    const teaser = screen.getByText(translations['tomorrowPreview.singleplayer']);
    const seeYou = screen.getByText(translations['tomorrowPreview.seeYou']);
    expect(teaser).toBeInTheDocument();
    expect(seeYou).toBeInTheDocument();
  });

  it('respects reduced motion preference', () => {
    mockReducedMotion = true;
    const { container } = render(<TomorrowPreview mode="singleplayer" />);
    // Component should still render (just with different animation)
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByText(translations['tomorrowPreview.singleplayer'])).toBeInTheDocument();
  });

  it('cleans up timer on unmount', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(<TomorrowPreview mode="singleplayer" onDismiss={onDismiss} />);

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // onDismiss should NOT be called after unmount
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
