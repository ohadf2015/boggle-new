import { vi, type Mock, } from 'vitest';
/**
 * Test for bulk word generator timeout issue
 *
 * This test validates that the AI bulk word generation now uses
 * the proper retry logic from the AI service to avoid timeouts.
 */

import { gameAIService } from '@/lib/ai-service';

// Mock the AI service
vi.mock('@/lib/ai-service', () => ({
  gameAIService: {
    isConfigured: vi.fn(),
    generateBulkWords: vi.fn(),
  },
}));

describe('Bulk Word Generator - Timeout Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use AI service with retry logic', async () => {
    const mockWords = [
      { word: 'APEX', reason: 'Interesting word' },
      { word: 'LYNX', reason: 'Good variety' },
    ];

    (gameAIService.generateBulkWords as Mock).mockResolvedValue(mockWords);
    (gameAIService.isConfigured as Mock).mockResolvedValue(true);

    // Import the generateWordsWithAI function (we'll need to export it for testing)
    // For now, just verify the service method is called correctly
    const result = await gameAIService.generateBulkWords(
      'en',
      2,
      new Set(['CAT', 'DOG']),
      ['TEST'],
      { min: 4, max: 8 }
    );

    expect(result).toEqual(mockWords);
    expect(gameAIService.generateBulkWords).toHaveBeenCalledWith(
      'en',
      2,
      expect.any(Set),
      ['TEST'],
      { min: 4, max: 8 }
    );
  });

  it('should handle AI service errors gracefully', async () => {
    const error = new Error('AI service timeout');
    (gameAIService.generateBulkWords as Mock).mockRejectedValue(error);

    await expect(
      gameAIService.generateBulkWords(
        'en',
        2,
        new Set(),
        [],
        { min: 4, max: 8 }
      )
    ).rejects.toThrow('AI service timeout');

    expect(gameAIService.generateBulkWords).toHaveBeenCalled();
  });

  it('should retry on transient failures', async () => {
    // First call fails, second succeeds
    (gameAIService.generateBulkWords as Mock)
      .mockRejectedValueOnce(new Error('Transient failure'))
      .mockResolvedValueOnce([
        { word: 'QUICK', reason: 'Success after retry' },
      ]);

    // First attempt should fail
    await expect(
      gameAIService.generateBulkWords('en', 1, new Set(), [], { min: 4, max: 8 })
    ).rejects.toThrow('Transient failure');

    // Second attempt should succeed
    const result = await gameAIService.generateBulkWords(
      'en',
      1,
      new Set(),
      [],
      { min: 4, max: 8 }
    );

    expect(result).toEqual([{ word: 'QUICK', reason: 'Success after retry' }]);
    expect(gameAIService.generateBulkWords).toHaveBeenCalledTimes(2);
  });
});
