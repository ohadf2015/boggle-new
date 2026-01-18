/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the dependencies before importing the component
jest.mock('@/lib/supabase', () => ({
  getSession: jest.fn(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="hero-image" {...props} />
  ),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { getSession } from '@/lib/supabase';
import DailyBuzzAdminPanel from '../DailyBuzzAdminPanel';
import type { DailyBuzzDataAdmin } from '../buzz/types';

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;

describe('DailyBuzzAdminPanel Image Regeneration', () => {
  const mockChallengeData: DailyBuzzDataAdmin = {
    puzzle_date: '2025-01-18',
    language: 'en',
    region: 'US',
    trending_summary: 'Tech & Politics',
    challenges: [
      {
        type: 'riddle',
        trend_topic: 'AI Summit',
        prompt: 'I have no brain but can think',
        answer: 'COMPUTER',
        hint: 'Think artificial',
        difficulty: 'medium',
        trending_context: 'AI Summit happening today',
      },
    ],
    image_url: 'https://storage.example.com/old-image-12345.webp',
    image_prompt: 'Old prompt',
    image_category: 'technology',
    social_content: null,
  };

  const mockSession = {
    data: {
      session: {
        access_token: 'test-token',
        user: { id: 'test-user', email: 'admin@test.com' },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue(mockSession as unknown as ReturnType<typeof getSession>);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when regenerating image', () => {
    it('should update the displayed image URL after successful regeneration', async () => {
      const newImageUrl = 'https://storage.example.com/new-image-67890.webp';
      const newPrompt = 'New regenerated prompt';

      // Mock fetch for challenges API
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockChallengeData,
          }),
        })
        // Mock fetch for regenerate-image API
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              image_url: newImageUrl,
              image_prompt: newPrompt,
              image_category: 'technology',
              cost: 0.04,
            },
          }),
        });

      render(<DailyBuzzAdminPanel />);

      // Open the challenges section
      const viewEditButton = screen.getByText(/View & Edit Challenges/i);
      await act(async () => {
        fireEvent.click(viewEditButton);
      });

      // Wait for challenges to load
      await waitFor(() => {
        expect(screen.getByTestId('hero-image')).toBeInTheDocument();
      });

      // Verify the old image URL is displayed
      const heroImage = screen.getByTestId('hero-image') as HTMLImageElement;
      expect(heroImage.src).toBe(mockChallengeData.image_url);

      // Click the image regenerate button (not "Regenerate by Type")
      const regenerateImageButton = screen.getByTitle('Regenerate image');
      await act(async () => {
        fireEvent.click(regenerateImageButton);
      });

      // Wait for the image to be updated
      await waitFor(() => {
        const updatedImage = screen.getByTestId('hero-image') as HTMLImageElement;
        expect(updatedImage.src).toBe(newImageUrl);
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/Image regenerated for EN/i)).toBeInTheDocument();
      });
    });

    it('should display error message when regeneration fails', async () => {
      const errorMessage = 'Imagen API rate limit exceeded';

      // Mock fetch for challenges API
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockChallengeData,
          }),
        })
        // Mock fetch for regenerate-image API (failure)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: errorMessage,
          }),
        });

      render(<DailyBuzzAdminPanel />);

      // Open the challenges section
      const viewEditButton = screen.getByText(/View & Edit Challenges/i);
      await act(async () => {
        fireEvent.click(viewEditButton);
      });

      // Wait for challenges to load
      await waitFor(() => {
        expect(screen.getByTestId('hero-image')).toBeInTheDocument();
      });

      // Click the image regenerate button (not "Regenerate by Type")
      const regenerateImageButton = screen.getByTitle('Regenerate image');
      await act(async () => {
        fireEvent.click(regenerateImageButton);
      });

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Verify the old image URL is still displayed (no change on error)
      const heroImage = screen.getByTestId('hero-image') as HTMLImageElement;
      expect(heroImage.src).toBe(mockChallengeData.image_url);
    });

    it('should force image refresh by using URL as key (cache busting)', async () => {
      const newImageUrl = 'https://storage.example.com/new-image-99999.webp';

      // Mock fetch for challenges API
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: mockChallengeData,
          }),
        })
        // Mock fetch for regenerate-image API
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              image_url: newImageUrl,
              image_prompt: 'New prompt',
              image_category: 'technology',
            },
          }),
        });

      render(<DailyBuzzAdminPanel />);

      // Open the challenges section
      const viewEditButton = screen.getByText(/View & Edit Challenges/i);
      await act(async () => {
        fireEvent.click(viewEditButton);
      });

      // Wait for challenges to load
      await waitFor(() => {
        expect(screen.getByTestId('hero-image')).toBeInTheDocument();
      });

      // Store reference to old image element
      const oldImageElement = screen.getByTestId('hero-image');
      const oldSrc = (oldImageElement as HTMLImageElement).src;

      // Click the image regenerate button (not "Regenerate by Type")
      const regenerateImageButton = screen.getByTitle('Regenerate image');
      await act(async () => {
        fireEvent.click(regenerateImageButton);
      });

      // Wait for the image to be updated
      await waitFor(() => {
        const newImageElement = screen.getByTestId('hero-image');
        // The src should have changed
        expect((newImageElement as HTMLImageElement).src).not.toBe(oldSrc);
        expect((newImageElement as HTMLImageElement).src).toBe(newImageUrl);
      });
    });
  });
});
