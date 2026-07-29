/**
 * Shared HTML sanitization utility (Q-7)
 * Extracted from chatHandler.ts and friendMessagingHandler.ts to eliminate duplication.
 */

/**
 * Sanitize HTML entities to prevent XSS attacks.
 * Replaces <, >, &, ", ' with their HTML entity equivalents.
 */
export function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
