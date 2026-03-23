import { render, screen, fireEvent } from '@testing-library/react';
import { QuickPlayButton } from '../QuickPlayButton';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: jest.fn(),
  })),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: jest.fn(() => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    language: 'en',
  })),
}));

describe('QuickPlayButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
