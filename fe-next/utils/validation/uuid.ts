/**
 * UUID validation utilities
 */

/**
 * Standard UUID v4 regex pattern
 * Matches: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hex digit and y is 8, 9, a, or b
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * General UUID format regex (any version)
 * Matches: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const UUID_GENERAL_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID format
 *
 * @param value - The string to check
 * @param strict - If true, only matches UUID v4 format. If false, matches any UUID format.
 * @returns true if the string is a valid UUID format
 */
export function isValidUUID(value: string | undefined | null, strict = false): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return strict ? UUID_REGEX.test(value) : UUID_GENERAL_REGEX.test(value);
}

/**
 * Returns the value if it's a valid UUID, otherwise returns undefined
 *
 * @param value - The string to check
 * @returns The value if it's a valid UUID, otherwise undefined
 */
export function getValidUUIDOrUndefined(value: string | undefined | null): string | undefined {
  if (!value || !isValidUUID(value)) {
    return undefined;
  }
  return value;
}
