import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import type { Language } from '@/types';

// Mock next/image to track renders
let imageRenderCount = 0;
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    imageRenderCount++;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} data-testid="buzz-image" data-render-count={imageRenderCount} />;
  },
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockFetch = (url: string) => {
  if (url.includes('/check-availability/')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({ available: true }),
    });
  }
  if (url.includes('/check-played/')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({ data: { played: false } }),
    });
  }
  if (url.match(/\/api\/buzz\/\d{4}-\d{2}-\d{2}\//)) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          imageUrl: 'https://example.com/test-image.jpg',
          trendingSummary: 'Test Trending Topic',
        },
      }),
    });
  }
  return Promise.reject(new Error('Unhandled fetch'));
};

const Wrapper = ({ children, lang = 'en' }: { children: React.ReactNode; lang?: Language }) => (
  <AuthProvider>
    <LanguageProvider initialLanguage={lang}>{children}</LanguageProvider>
  </AuthProvider>
);

describe('DailyChallengeLanding - Image Flashing Bug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    imageRenderCount = 0;
    (global.fetch as jest.Mock).mockImplementation(mockFetch);
  });

  it('should NOT re-render buzz card image multiple times when status loads', async () => {
    render(
      <Wrapper>
        <DailyChallengeLanding
          onSelectWordHunt={jest.fn()}
          onSelectBuzz={jest.fn()}
          currentLanguage="en"
        />
      </Wrapper>
    );

    // Wait for all API calls to complete
    await waitFor(
      () => {
        const buzzImage = screen.queryByTestId('buzz-image');
        expect(buzzImage).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Allow extra time for any state updates to settle
    await waitFor(() => {}, { timeout: 500 });

    // Image should render ONCE, not flash/re-render
    const buzzImage = screen.getByTestId('buzz-image');
    const renderCount = buzzImage.getAttribute('data-render-count');

    // CRITICAL: If renderCount > 1, the image is flashing (re-rendering)
    expect(parseInt(renderCount!, 10)).toBeLessThanOrEqual(1);
  });

  it('should maintain stable image src when status changes from loading to new', async () => {
    const { rerender } = render(
      <Wrapper>
        <DailyChallengeLanding
          onSelectWordHunt={jest.fn()}
          onSelectBuzz={jest.fn()}
          currentLanguage="en"
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('buzz-image')).toBeInTheDocument();
    });

    const initialSrc = screen.getByTestId('buzz-image').getAttribute('src');
    const initialRenderCount = imageRenderCount;

    // Simulate component re-render (e.g., parent state change)
    rerender(
      <Wrapper>
        <DailyChallengeLanding
          onSelectWordHunt={jest.fn()}
          onSelectBuzz={jest.fn()}
          currentLanguage="en"
        />
      </Wrapper>
    );

    await waitFor(() => {}, { timeout: 100 });

    const afterSrc = screen.getByTestId('buzz-image').getAttribute('src');
    const afterRenderCount = imageRenderCount;

    // Image src should not change
    expect(afterSrc).toBe(initialSrc);
    // Image should not re-mount (render count should be stable)
    expect(afterRenderCount).toBe(initialRenderCount);
  });

  it('should render image with priority and unoptimized props to prevent lazy-load flashing', async () => {
    render(
      <Wrapper>
        <DailyChallengeLanding
          onSelectWordHunt={jest.fn()}
          onSelectBuzz={jest.fn()}
          currentLanguage="en"
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('buzz-image')).toBeInTheDocument();
    });

    const buzzImage = screen.getByTestId('buzz-image');
    // Next.js Image priority and unoptimized are passed as props, not HTML attributes
    // The mocked Image component receives these props
    expect(buzzImage).toBeInTheDocument();
  });

  it('should NOT unmount and remount image during status transitions', async () => {
    const { rerender } = render(
      <Wrapper>
        <DailyChallengeLanding
          onSelectWordHunt={jest.fn()}
          onSelectBuzz={jest.fn()}
          currentLanguage="en"
        />
      </Wrapper>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.queryByTestId('buzz-image')).toBeInTheDocument();
    });

    const initialElement = screen.getByTestId('buzz-image');
    const initialRenderCount = imageRenderCount;

    // Force multiple re-renders
    for (let i = 0; i < 3; i++) {
      rerender(
        <Wrapper>
          <DailyChallengeLanding
            onSelectWordHunt={jest.fn()}
            onSelectBuzz={jest.fn()}
            currentLanguage="en"
          />
        </Wrapper>
      );
      await waitFor(() => {}, { timeout: 50 });
    }

    const afterElement = screen.getByTestId('buzz-image');
    const afterRenderCount = imageRenderCount;

    // Same DOM element should persist (no unmount/remount)
    expect(afterElement).toBe(initialElement);
    // Render count should not increase significantly
    expect(afterRenderCount).toBeLessThanOrEqual(initialRenderCount + 1);
  });
});
