/**
 * Tests for ChallengeViewer image removal functionality
 * Verifies that image removal properly calls onRemoveImage and closes dialog
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useChallengeData } from '../../hooks/useChallengeData';

// Mock the supabase session
jest.mock('@/lib/supabase', () => ({
  getSession: jest.fn().mockResolvedValue({
    data: { session: { access_token: 'test-token' } },
  }),
}));

describe('useChallengeData - handleRemoveImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should update challengeData and return true after successful image removal', async () => {
    // Setup mock response for successful removal
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            puzzle_date: '2026-01-29',
            language: 'en',
            trending_summary: 'Test Summary',
            challenges: [],
            image_url: 'http://example.com/image.jpg',
            image_prompt: 'Test prompt',
            image_category: 'test',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const { result } = renderHook(() => useChallengeData());

    // First, fetch challenges to set up challengeData
    await act(async () => {
      await result.current.fetchChallenges('2026-01-29', 'en');
    });

    expect(result.current.challengeData?.image_url).toBe('http://example.com/image.jpg');

    // Now remove the image
    let removeResult: boolean = false;
    await act(async () => {
      removeResult = await result.current.handleRemoveImage();
    });

    // Should return true on success
    expect(removeResult).toBe(true);
    // After removal, image_url should be null
    expect(result.current.challengeData?.image_url).toBeNull();
    expect(result.current.challengeData?.image_prompt).toBeNull();
    expect(result.current.isRemovingImage).toBe(false);
    expect(result.current.removeImageError).toBeNull();
  });

  it('should set error state and return false when removal fails', async () => {
    // Setup mock response for failed removal
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            puzzle_date: '2026-01-29',
            language: 'en',
            trending_summary: 'Test Summary',
            challenges: [],
            image_url: 'http://example.com/image.jpg',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to remove image' }),
      });

    const { result } = renderHook(() => useChallengeData());

    // First, fetch challenges
    await act(async () => {
      await result.current.fetchChallenges('2026-01-29', 'en');
    });

    // Now try to remove the image (will fail)
    let removeResult: boolean = true;
    await act(async () => {
      removeResult = await result.current.handleRemoveImage();
    });

    // Should return false on failure
    expect(removeResult).toBe(false);
    // Error should be set, image should still exist
    expect(result.current.removeImageError).toBe('Failed to remove image');
    expect(result.current.challengeData?.image_url).toBe('http://example.com/image.jpg');
    expect(result.current.isRemovingImage).toBe(false);
  });

  it('should properly clear image errors', async () => {
    // Setup mock response
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            puzzle_date: '2026-01-29',
            language: 'en',
            trending_summary: 'Test Summary',
            challenges: [],
            image_url: 'http://example.com/image.jpg',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Some error' }),
      });

    const { result } = renderHook(() => useChallengeData());

    await act(async () => {
      await result.current.fetchChallenges('2026-01-29', 'en');
    });

    await act(async () => {
      await result.current.handleRemoveImage();
    });

    expect(result.current.removeImageError).toBe('Some error');

    // Clear errors
    act(() => {
      result.current.clearImageErrors();
    });

    expect(result.current.removeImageError).toBeNull();
  });
});
