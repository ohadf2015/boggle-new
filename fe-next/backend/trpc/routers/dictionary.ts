import { z } from 'zod';
import { router, loggedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import logger from '../../utils/logger';
import { getCachedWordValidation, setCachedWordValidation } from '../../cache/wordCache';

const { isDictionaryWord, dictionary, ensureLanguageLoaded } = require('../../dictionary');
const { isWordCommunityValid, isWordValidForScoring } = require('../../modules/communityWordManager');

const languageEnum = z.enum(['en', 'he', 'sv', 'ja', 'es']);
type ValidationSource = 'dictionary' | 'community' | 'community_positive' | 'too_short' | 'not_loaded' | 'unknown';

export const dictionaryRouter = router({
  validate: loggedProcedure
    .input(z.object({
      word: z.string().min(1).max(100),
      language: languageEnum.default('en'),
    }))
    .query(async ({ input }): Promise<{ isValid: boolean; source: ValidationSource }> => {
      const normalizedWord = input.word.toLowerCase().trim();

      if (normalizedWord.length < 2) {
        return { isValid: false, source: 'too_short' };
      }

      if (!dictionary.loaded) {
        logger.warn('TRPC', `Dictionary not loaded, returning unknown for: ${normalizedWord}`);
        return { isValid: false, source: 'not_loaded' };
      }

      try {
        // Check Redis cache first
        const cached = await getCachedWordValidation(input.language, normalizedWord);
        if (cached !== null) {
          return { isValid: cached, source: cached ? 'dictionary' : 'unknown' };
        }

        // Non-English dictionaries lazy-load on demand; this endpoint has no game-start
        // to trigger that, so trigger it here.
        await ensureLanguageLoaded(input.language);

        // Check dictionary
        const isInDictionary = isDictionaryWord(normalizedWord, input.language);
        if (isInDictionary === true) {
          setCachedWordValidation(input.language, normalizedWord, true).catch(() => {});
          return { isValid: true, source: 'dictionary' };
        }

        // Check community validated
        const isCommunityValidated = isWordCommunityValid(normalizedWord, input.language);
        if (isCommunityValidated) {
          setCachedWordValidation(input.language, normalizedWord, true).catch(() => {});
          return { isValid: true, source: 'community' };
        }

        // Check positive community score
        const hasPositiveScore = isWordValidForScoring(normalizedWord, input.language);
        if (hasPositiveScore) {
          setCachedWordValidation(input.language, normalizedWord, true).catch(() => {});
          return { isValid: true, source: 'community_positive' };
        }

        setCachedWordValidation(input.language, normalizedWord, false).catch(() => {});
        return { isValid: false, source: 'unknown' };
      } catch (error) {
        const err = error as Error;
        logger.error('TRPC', `Dictionary validate error: ${err.message}`);
        return { isValid: false, source: 'unknown' };
      }
    }),

  getDefinition: loggedProcedure
    .input(z.object({
      word: z.string().min(1).max(100),
      language: languageEnum.default('en'),
    }))
    .query(async ({ input }) => {
      const normalizedWord = input.word.toLowerCase().trim();

      if (normalizedWord.length < 2) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Word must be at least 2 characters' });
      }

      // Check word exists in dictionary first
      await ensureLanguageLoaded(input.language);
      const isValid = isDictionaryWord(normalizedWord, input.language);
      if (!isValid) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Word not found in dictionary' });
      }

      // Definition lookup is best-effort; return word validity info
      return {
        word: normalizedWord,
        language: input.language,
        isValid: true,
        definition: null as string | null,
      };
    }),
});
