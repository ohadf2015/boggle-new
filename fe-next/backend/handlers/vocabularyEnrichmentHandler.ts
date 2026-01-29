/**
 * Vocabulary Enrichment Handler
 * WebSocket handler for enriching vocabulary with Daily Buzz context
 *
 * TDD: GREEN phase - Implementation to make tests pass
 */

import type { Socket } from 'socket.io';
import { z } from 'zod';
import { enrichVocabularyWithContext } from '../../lib/services/dailyBuzzContextService';
import logger from '../utils/logger.js';

/**
 * Zod schema for vocabulary enrichment request
 */
const VocabularyEnrichmentSchema = z.object({
  words: z.array(
    z.object({
      word: z.string(),
      definition: z.string(),
    }).passthrough() // Allow additional properties
  ),
  language: z.string(),
  date: z.string().optional(),
});

type VocabularyEnrichmentPayload = z.infer<typeof VocabularyEnrichmentSchema>;

/**
 * Handle vocabulary enrichment request
 * Enriches vocabulary words with contextual examples from Daily Buzz
 *
 * @param socket - Socket making the request
 * @param payload - Words to enrich, language, and optional date
 */
export async function vocabularyEnrichmentHandler(
  socket: Socket,
  payload: unknown
): Promise<void> {
  try {
    // Validate payload with Zod
    const validatedPayload = VocabularyEnrichmentSchema.safeParse(payload);

    if (!validatedPayload.success) {
      const errorMessage = validatedPayload.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');

      socket.emit('error', {
        error: 'VALIDATION_ERROR',
        message: errorMessage,
      });

      logger.warn('VOCAB_ENRICHMENT', `Validation failed: ${errorMessage}`);
      return;
    }

    const { words, language, date } = validatedPayload.data;

    // Handle empty array
    if (words.length === 0) {
      socket.emit('vocabularyEnriched', { enrichedWords: [] });
      return;
    }

    // Enrich each word with contextual examples
    const enrichedWords = await Promise.all(
      words.map((word) => enrichVocabularyWithContext(word, language, date))
    );

    // Emit enriched vocabulary
    socket.emit('vocabularyEnriched', { enrichedWords });

    logger.info(
      'VOCAB_ENRICHMENT',
      `Enriched ${words.length} words for language ${language}`
    );
  } catch (error) {
    const err = error as Error;
    logger.error('VOCAB_ENRICHMENT', `Error enriching vocabulary: ${err.message}`);

    socket.emit('error', {
      error: 'ENRICHMENT_ERROR',
      message: 'Failed to enrich vocabulary',
    });
  }
}
