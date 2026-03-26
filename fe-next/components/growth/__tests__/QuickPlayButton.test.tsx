import { render, screen, fireEvent } from '@testing-library/react';
import { QuickPlayButton } from '../QuickPlayButton';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
  })),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    language: 'en',
  })),
}));

describe('QuickPlayButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders button with correct text', () => {
    render(<QuickPlayButton />);

    const btn = screen.getByTestId('quick-play-button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('quickPlay.play');
  });

  it('navigates to quickest mode on click', () => {
    render(<QuickPlayButton />);

    fireEvent.click(screen.getByTestId('quick-play-button'));
    // daily has priority 1, so route should be /en/daily
    expect(mockPush).toHaveBeenCalledWith('/en/daily');
  });

  it('has correct aria-label', () => {
    render(<QuickPlayButton />);

    const btn = screen.getByTestId('quick-play-button');
    expect(btn).toHaveAttribute('aria-label', 'quickPlay.ariaLabel');
  });
});
