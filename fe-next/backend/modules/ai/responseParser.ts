/**
 * Response Parser
 *
 * Handles parsing and validating AI responses from Vertex AI.
 */

import {
  AI_CONFIG,
  type ParsedValidation,
  type BatchValidationItem,
  type ValidationResult,
} from './types';

import logger from '../../utils/logger';

/**
 * Parse and validate AI response for single word validation
 */
export function parseValidationResponse(
  text: string,
  word: string
): ParsedValidation {
  // Detect HTML error pages early
  if (
    text.trimStart().startsWith('<!DOCTYPE') ||
    text.trimStart().startsWith('<html')
  ) {
    logger.debug(
      'AI_SERVICE',
      `Received HTML error page instead of JSON for "${word}". This indicates a network issue, authentication failure, or service unavailability.`
    );
    const error = new Error(
      'HTML error page received from Vertex AI - network, authentication, or service issue'
    );
    error.name = 'HTMLResponseError';
    throw error;
  }

  // Strip markdown code blocks if present
  let cleanText = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleanText = codeBlockMatch[1].trim();
  }

  // Try to extract JSON object
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Try to handle truncated responses
    const partialMatch = cleanText.match(/\{\s*"isValid"\s*:\s*(true|false)/);
    if (partialMatch) {
      const isValid = partialMatch[1] === 'true';
      logger.debug(
        'AI_SERVICE',
        `Extracted partial response for "${word}": isValid=${isValid}`
      );
      return { isValid, reason: 'Partial AI response', confidence: 50 };
    }
    logger.debug(
      'AI_SERVICE',
      `Could not extract JSON for "${word}": ${text.substring(0, 200)}`
    );
    return {
      isValid: false,
      reason: 'Failed to parse AI response',
      confidence: 0,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      isValid?: boolean;
      reason?: string;
      confidence?: number;
    };

    // Validate schema
    if (
      typeof parsed.isValid !== 'boolean' ||
      typeof parsed.reason !== 'string'
    ) {
      logger.debug(
        'AI_SERVICE',
        `Invalid response schema for "${word}": ${JSON.stringify(parsed)}`
      );
      return {
        isValid: false,
        reason: 'Invalid AI response format',
        confidence: 0,
      };
    }

    // Ensure confidence is a number
    const confidence =
      typeof parsed.confidence === 'number' ? parsed.confidence : 50;

    // Apply confidence threshold
    if (parsed.isValid && confidence < AI_CONFIG.MIN_CONFIDENCE_THRESHOLD) {
      logger.info(
        'AI_SERVICE',
        `Word "${word}" rejected: confidence ${confidence}% < threshold ${AI_CONFIG.MIN_CONFIDENCE_THRESHOLD}%`
      );
      return {
        isValid: false,
        reason: `Low confidence (${confidence}%)`,
        confidence,
      };
    }

    return { isValid: parsed.isValid, reason: parsed.reason, confidence };
  } catch (parseError) {
    const errorMessage =
      parseError instanceof Error ? parseError.message : String(parseError);
    logger.debug(
      'AI_SERVICE',
      `JSON parse error for "${word}": ${errorMessage}`
    );
    return {
      isValid: false,
      reason: 'Failed to parse AI response',
      confidence: 0,
    };
  }
}

/**
 * Extract complete JSON objects from potentially truncated batch response
 */
export function extractPartialJsonResults(
  jsonContent: string,
  expectedWords: string[]
): BatchValidationItem[] {
  const results: BatchValidationItem[] = [];
  const objectPattern =
    /\{\s*"word"\s*:\s*"([^"]+)"\s*,\s*"isValid"\s*:\s*(true|false)(?:\s*,\s*"reason"\s*:\s*"([^"]*)")?(?:\s*,\s*"confidence"\s*:\s*(\d+))?\s*\}/g;

  let match;
  while ((match = objectPattern.exec(jsonContent)) !== null) {
    const word = match[1];
    const isValid = match[2] === 'true';
    const reason = match[3] || (isValid ? 'Valid word' : 'Invalid word');
    const confidence = match[4] ? parseInt(match[4], 10) : 50;

    // Apply confidence threshold
    let finalIsValid = isValid;
    let finalReason = reason;
    if (isValid && confidence < AI_CONFIG.MIN_CONFIDENCE_THRESHOLD) {
      finalIsValid = false;
      finalReason = `Low confidence (${confidence}%)`;
    }

    results.push({
      word,
      isValid: finalIsValid,
      reason: finalReason,
      confidence,
    });
  }

  return results;
}

/**
 * Map AI results back to original word order
 */
export function mapResultsToWords(
  parsed: BatchValidationItem[],
  words: string[]
): ValidationResult[] {
  const resultMap = new Map<string, ValidationResult>();

  for (const item of parsed) {
    if (item && typeof item.word === 'string') {
      const normalizedWord = item.word.toLowerCase().trim();
      const confidence =
        typeof item.confidence === 'number' ? item.confidence : 50;

      let isValid = item.isValid === true;
      let reason = item.reason || (isValid ? 'Valid word' : 'Invalid word');

      // Apply confidence threshold
      if (isValid && confidence < AI_CONFIG.MIN_CONFIDENCE_THRESHOLD) {
        isValid = false;
        reason = `Low confidence (${confidence}%)`;
      }

      resultMap.set(normalizedWord, { isValid, reason, confidence });
    }
  }

  return words.map((word) => {
    const result = resultMap.get(word.toLowerCase().trim());
    return result || {
      isValid: false,
      reason: 'Word not in AI response',
      confidence: 0,
    };
  });
}

/**
 * Parse batch validation response
 */
export function parseBatchResponse(
  text: string,
  words: string[]
): ValidationResult[] {
  let cleanText = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleanText = codeBlockMatch[1].trim();
  }

  const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    // Try to salvage partial results
    const partialMatch = cleanText.match(/\[\s*([\s\S]*)/);
    if (partialMatch) {
      const partialResults = extractPartialJsonResults(partialMatch[1], words);
      if (partialResults.length > 0) {
        logger.debug(
          'AI_SERVICE',
          `Extracted ${partialResults.length}/${words.length} from truncated response`
        );
        return mapResultsToWords(partialResults, words);
      }
    }
    logger.debug(
      'AI_SERVICE',
      `Could not extract JSON array. Full response: ${text}`
    );
    return words.map(() => ({
      isValid: false,
      reason: 'Failed to parse AI response',
      confidence: 0,
    }));
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as BatchValidationItem[];

    if (!Array.isArray(parsed)) {
      logger.info('AI_SERVICE', 'Batch response is not an array');
      return words.map(() => ({
        isValid: false,
        reason: 'Invalid AI response format',
        confidence: 0,
      }));
    }

    return mapResultsToWords(parsed, words);
  } catch (parseError) {
    // Try partial extraction
    const partialResults = extractPartialJsonResults(jsonMatch[0], words);
    if (partialResults.length > 0) {
      logger.debug(
        'AI_SERVICE',
        `Extracted ${partialResults.length}/${words.length} from malformed JSON`
      );
      return mapResultsToWords(partialResults, words);
    }

    const errorMessage =
      parseError instanceof Error ? parseError.message : String(parseError);
    logger.info('AI_SERVICE', `JSON parse error: ${errorMessage}`);
    return words.map(() => ({
      isValid: false,
      reason: 'Failed to parse AI response',
      confidence: 0,
    }));
  }
}

/**
 * Parse themed board generation response
 */
export function parseThemedBoardResponse(text: string, theme: string): string[] {
  let cleanText = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleanText = codeBlockMatch[1].trim();
  }

  const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    logger.debug(
      'AI_SERVICE',
      `Could not extract JSON array for theme "${theme}"`
    );
    return [];
  }

  const parsed = JSON.parse(jsonMatch[0]) as unknown[];

  if (!Array.isArray(parsed)) {
    logger.info('AI_SERVICE', 'Themed words response is not an array');
    return [];
  }

  // Filter and validate words
  return parsed
    .filter((w): w is string => typeof w === 'string')
    .map((w) => w.toLowerCase().trim())
    .filter(
      (w) =>
        w.length >= 2 &&
        w.length <= 10 &&
        /^[a-zA-Z\u00C0-\u024F\u0590-\u05FF]+$/.test(w)
    );
}
