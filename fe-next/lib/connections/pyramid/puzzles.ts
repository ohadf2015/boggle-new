import type { PyramidPuzzle } from './types';
import { EN_PYRAMIDS } from '../puzzles/generated/pyramid.en.generated';
import { HE_PYRAMIDS } from '../puzzles/generated/pyramid.he.generated';

/**
 * Materialized pyramid pools (scripts/connections/materialize-pyramids.mjs).
 * A locale with no native pool returns [] — the Pyramid mode hides rather than
 * falling back to English (a meta word-riddle in the wrong language is noise).
 */
const PYRAMIDS_BY_LOCALE: Partial<Record<string, PyramidPuzzle[]>> = {
  en: EN_PYRAMIDS,
  he: HE_PYRAMIDS,
};

export function getPyramidsForLocale(locale: string): PyramidPuzzle[] {
  return PYRAMIDS_BY_LOCALE[locale] ?? [];
}
