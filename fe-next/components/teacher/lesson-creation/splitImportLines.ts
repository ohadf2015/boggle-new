/**
 * Turning pasted text into rows, on its own so both surfaces share one parser:
 * the paste box in the create dialog and the bulk importer behind it.
 *
 * It used to live inside BulkImportEnhanced, which a dialog cannot import
 * without dragging in the whole importer (and its dictionary lookups) with it.
 */

// Delimiter pattern: requires spaces around - – — or : to avoid splitting hyphenated words
export const DEFINITION_DELIMITER = /^(.+?)\s+[-–—:]\s+(.+)$/;

/**
 * A row carries structure — pipe segments, or a `word - definition` pair —
 * rather than being one bare word in a list.
 */
const isStructuredRow = (text: string): boolean =>
  text.includes('|') || DEFINITION_DELIMITER.test(text);

/**
 * Turn pasted text into rows.
 *
 * Newlines win when present. Otherwise a SINGLE structured row is kept whole:
 * splitting it on commas cuts it apart at `syn: a, b`, which silently
 * truncated the synonyms and stranded the later segments on a wordless row.
 * Only a plain list of bare words is split on commas or whitespace.
 */
export function splitImportLines(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  let rows: string[];
  if (trimmed.includes('\n')) rows = trimmed.split('\n');
  else if (isStructuredRow(trimmed)) rows = [trimmed];
  else if (trimmed.includes(',')) rows = trimmed.split(',');
  else rows = trimmed.split(/\s+/);

  return rows.map((row) => row.trim()).filter((row) => row.length > 0);
}
