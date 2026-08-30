/**
 * Sanitize and parse classroom code from various input formats.
 * Handles: plain codes, pasted URLs, and forgiving typos (spaces, dashes).
 */

/**
 * Extract 6-character alphanumeric classroom code from raw input.
 * Supports:
 * - Plain codes: "abc123", "ABC-123", "abc 123"
 * - Query params: "https://lexiclash.com/join?code=abc123"
 * - Path segments: "https://lexiclash.com/join/abc123"
 *
 * Returns empty string if no valid code is found.
 * Result is always UPPERCASE.
 */
export function sanitizeClassroomCode(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Try to parse as a URL (pasted join links)
  if (trimmed.includes('://') || trimmed.includes('/join')) {
    // Extract query param ?code=...
    const queryMatch = trimmed.match(/[?&]code=([A-Za-z0-9]+)/);
    if (queryMatch && queryMatch[1]) {
      const codeFromQuery = queryMatch[1].toUpperCase();
      if (codeFromQuery.length === 6 && /^[A-Z0-9]{6}$/.test(codeFromQuery)) {
        return codeFromQuery;
      }
    }

    // Try last path segment: /join/abc123 or /abc123
    // Remove query string first, then split by / and take the last non-empty segment
    const urlWithoutQuery = trimmed.split('?')[0];
    const segments = urlWithoutQuery.split('/').filter(s => s.length > 0);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1].toUpperCase();
      if (lastSegment.length === 6 && /^[A-Z0-9]{6}$/.test(lastSegment)) {
        return lastSegment;
      }
    }
  }

  // Plain code: remove whitespace and dashes, validate length
  const cleaned = trimmed.replace(/[\s-]/g, '').toUpperCase();

  // Only return if it's exactly 6 valid alphanumeric characters
  if (cleaned.length === 6 && /^[A-Z0-9]{6}$/.test(cleaned)) {
    return cleaned;
  }

  return '';
}
