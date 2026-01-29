/**
 * Vocabulary Enrichment Handler Tests
 * Tests for enriching vocabulary with Daily Buzz context
 *
 * TDD: RED phase - These tests MUST fail initially
 */

import type { Socket } from 'socket.io';
import { vocabularyEnrichmentHandler } from '../vocabularyEnrichmentHandler';
import * as dailyBuzzContextService from '../../../lib/services/dailyBuzzContextService';

// Mock the Daily Buzz context service
jest.mock('../../../lib/services/dailyBuzzContextService');

const mockEnrichVocabularyWithContext =
  dailyBuzzContextService.enrichVocabularyWithContext as jest.MockedFunction<
    typeof dailyBuzzContextService.enrichVocabularyWithContext
  >;

describe('vocabularyEnrichmentHandler', () => {
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(() => {
    // Create mock socket
    mockSocket = {
      emit: jest.fn(),
      on: jest.fn(),
    } as unknown as jest.Mocked<Socket>;

    jest.clearAllMocks();
  });

  it('should enrich single vocabulary word with context', async () => {
    // GIVEN: A vocabulary word
    const payload = {
      words: [
        {
          word: 'technology',
          definition: 'The application of scientific knowledge',
        },
      ],
      language: 'en',
    };

    const enrichedWord = {
      word: 'technology',
      definition: 'The application of scientific knowledge',
      contextualExamples: ['Technology is advancing rapidly.'],
    };

    mockEnrichVocabularyWithContext.mockResolvedValueOnce(enrichedWord);

    // WHEN: Handler called
    await vocabularyEnrichmentHandler(mockSocket, payload);

    // THEN: Service called with word and language
    expect(mockEnrichVocabularyWithContext).toHaveBeenCalledWith(payload.words[0], 'en', undefined);

    // AND: Socket emits enriched vocabulary
    expect(mockSocket.emit).toHaveBeenCalledWith('vocabularyEnriched', {
      enrichedWords: [enrichedWord],
    });
  });

  it('should enrich multiple vocabulary words', async () => {
    // GIVEN: Multiple vocabulary words
    const payload = {
      words: [
        { word: 'climate', definition: 'Weather conditions' },
        { word: 'space', definition: 'The universe' },
      ],
      language: 'en',
    };

    mockEnrichVocabularyWithContext
      .mockResolvedValueOnce({
        word: 'climate',
        definition: 'Weather conditions',
        contextualExamples: ['Climate change is urgent.'],
      })
      .mockResolvedValueOnce({
        word: 'space',
        definition: 'The universe',
        contextualExamples: ['Space exploration continues.'],
      });

    // WHEN: Handler called
    await vocabularyEnrichmentHandler(mockSocket, payload);

    // THEN: Service called for each word
    expect(mockEnrichVocabularyWithContext).toHaveBeenCalledTimes(2);

    // AND: Socket emits all enriched words
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'vocabularyEnriched',
      expect.objectContaining({
        enrichedWords: expect.arrayContaining([
          expect.objectContaining({ word: 'climate' }),
          expect.objectContaining({ word: 'space' }),
        ]),
      })
    );
  });

  it('should use provided date parameter', async () => {
    // GIVEN: Vocabulary word with custom date
    const payload = {
      words: [{ word: 'test', definition: 'A test' }],
      language: 'en',
      date: '2026-01-20',
    };

    mockEnrichVocabularyWithContext.mockResolvedValueOnce({
      word: 'test',
      definition: 'A test',
      contextualExamples: [],
    });

    // WHEN: Handler called with date
    await vocabularyEnrichmentHandler(mockSocket, payload);

    // THEN: Service called with date
    expect(mockEnrichVocabularyWithContext).toHaveBeenCalledWith(
      payload.words[0],
      'en',
      '2026-01-20'
    );
  });

  it('should handle empty vocabulary array', async () => {
    // GIVEN: Empty words array
    const payload = {
      words: [],
      language: 'en',
    };

    // WHEN: Handler called
    await vocabularyEnrichmentHandler(mockSocket, payload);

    // THEN: Service not called
    expect(mockEnrichVocabularyWithContext).not.toHaveBeenCalled();

    // AND: Socket emits empty array
    expect(mockSocket.emit).toHaveBeenCalledWith('vocabularyEnriched', {
      enrichedWords: [],
    });
  });

  it('should reject invalid payload (missing words)', async () => {
    // GIVEN: Invalid payload (no words)
    const payload = {
      language: 'en',
    } as any;

    // WHEN: Handler called
    await vocabularyEnrichmentHandler(mockSocket, payload);

    // THEN: Socket emits validation error
    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      error: 'VALIDATION_ERROR',
      message: expect.stringContaining('words'),
    });
  });

  it('should reject invalid payload (missing language)', async () => {
    // GIVEN: Invalid payload (no language)
    const payload = {
      words: [{ word: 'test', definition: 'A test' }],
    } as any;

    // WHEN: Handler called
    await vocabularyEnrichmentHandler(mockSocket, payload);

    // THEN: Socket emits validation error
    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      error: 'VALIDATION_ERROR',
      message: expect.stringContaining('language'),
    });
  });

  it('should reject invalid payload (words not an array)', async () => {
    // GIVEN: Invalid payload (words not array)
    const payload = {
      words: 'not-an-array',
      language: 'en',
    } as any;

    // WHEN: Handler called
    await vocabularyEnrichmentHandler(mockSocket, payload);

    // THEN: Socket emits validation error
    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      error: 'VALIDATION_ERROR',
      message: expect.stringContaining('array'),
    });
  });

  it('should handle service errors gracefully', async () => {
    // GIVEN: Service throws error
    const payload = {
      words: [{ word: 'test', definition: 'A test' }],
      language: 'en',
    };

    mockEnrichVocabularyWithContext.mockRejectedValueOnce(new Error('Database error'));

    // WHEN: Handler called
    await vocabularyEnrichmentHandler(mockSocket, payload);

    // THEN: Socket emits error
    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      error: 'ENRICHMENT_ERROR',
      message: 'Failed to enrich vocabulary',
    });
  });

  it('should preserve word properties during enrichment', async () => {
    // GIVEN: Word with custom properties
    const payload = {
      words: [
        {
          word: 'quantum',
          definition: 'The smallest amount',
          partOfSpeech: 'noun',
          difficulty: 5,
          customProp: 'test',
        },
      ],
      language: 'en',
    };

    mockEnrichVocabularyWithContext.mockResolvedValueOnce({
      word: 'quantum',
      definition: 'The smallest amount',
      partOfSpeech: 'noun',
      difficulty: 5,
      customProp: 'test',
      contextualExamples: [],
    });

    // WHEN: Handler called
    await vocabularyEnrichmentHandler(mockSocket, payload);

    // THEN: All properties preserved
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'vocabularyEnriched',
      expect.objectContaining({
        enrichedWords: expect.arrayContaining([
          expect.objectContaining({
            word: 'quantum',
            definition: 'The smallest amount',
            partOfSpeech: 'noun',
            difficulty: 5,
            customProp: 'test',
            contextualExamples: [],
          }),
        ]),
      })
    );
  });
});
