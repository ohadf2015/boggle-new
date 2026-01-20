/**
 * Answer Validation Utilities for Daily Buzz Challenges
 *
 * Handles validation of user answers against correct answers and alternatives,
 * with support for case-insensitive matching and normalization.
 */

/**
 * Normalizes a string for comparison
 * - Converts to uppercase
 * - Trims whitespace
 * - Removes extra spaces
 */
export function normalizeAnswer(answer: string): string {
  return answer.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Validates if a user's answer matches the correct answer or any alternatives
 *
 * @param userAnswer - The answer provided by the user
 * @param correctAnswer - The correct answer
 * @param alternatives - Optional array of alternative correct answers
 * @returns true if the answer matches, false otherwise
 *
 * @example
 * validateAnswer('PITCH', 'PITCH', ['RAISE']) // true
 * validateAnswer('RAISE', 'PITCH', ['RAISE']) // true
 * validateAnswer('pitch', 'PITCH') // true (case-insensitive)
 * validateAnswer('wrong', 'PITCH', ['RAISE']) // false
 */
export function validateAnswer(
  userAnswer: string,
  correctAnswer: string,
  alternatives?: string[]
): boolean {
  const normalized = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  // Check main answer
  if (normalized === normalizedCorrect) {
    return true;
  }

  // Check alternatives if provided
  if (alternatives && alternatives.length > 0) {
    return alternatives.some(
      (alt) => normalizeAnswer(alt) === normalized
    );
  }

  return false;
}

/**
 * Gets all valid answers (correct answer + alternatives)
 * Returns a normalized array of all acceptable answers
 *
 * @param correctAnswer - The correct answer
 * @param alternatives - Optional array of alternative correct answers
 * @returns Array of all valid answers
 *
 * @example
 * getAllValidAnswers('PITCH', ['RAISE', 'ERECT'])
 * // Returns: ['PITCH', 'RAISE', 'ERECT']
 */
export function getAllValidAnswers(
  correctAnswer: string,
  alternatives?: string[]
): string[] {
  const validAnswers = [normalizeAnswer(correctAnswer)];

  if (alternatives && alternatives.length > 0) {
    validAnswers.push(...alternatives.map(normalizeAnswer));
  }

  return validAnswers;
}

/**
 * Formats valid answers for display to users
 * Shows the correct answer and alternatives in a user-friendly format
 *
 * @param correctAnswer - The correct answer
 * @param alternatives - Optional array of alternative correct answers
 * @returns Formatted string for display
 *
 * @example
 * formatValidAnswers('PITCH', ['RAISE', 'ERECT'])
 * // Returns: "PITCH (or RAISE, ERECT)"
 *
 * formatValidAnswers('PARK', ['STOP'])
 * // Returns: "PARK (or STOP)"
 *
 * formatValidAnswers('HELLO')
 * // Returns: "HELLO"
 */
export function formatValidAnswers(
  correctAnswer: string,
  alternatives?: string[]
): string {
  const normalized = normalizeAnswer(correctAnswer);

  if (!alternatives || alternatives.length === 0) {
    return normalized;
  }

  const normalizedAlternatives = alternatives.map(normalizeAnswer);
  return `${normalized} (or ${normalizedAlternatives.join(', ')})`;
}
