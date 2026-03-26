/**
 * Centralized AdSense slot configuration.
 *
 * After Google approves your AdSense account, replace the placeholder IDs
 * below with real slot IDs from the AdSense dashboard.
 *
 * Each slot maps to a specific placement zone in the app.
 * Create separate ad units in AdSense for each slot to get per-zone reporting.
 */

/** Placeholder until real slot IDs are assigned */
const PENDING = 'PENDING_APPROVAL';

export const AD_SLOTS = {
  /** Content pages: blog, guides, FAQ, glossary, how-to-play */
  contentPage: PENDING,
  /** Programmatic SEO word pages: /words/*, /words/starting-with/*, etc. */
  wordPage: PENDING,
  /** Post-game results screen (between rounds) */
  postGame: PENDING,
  /** Game lobby / waiting room */
  lobby: PENDING,
  /** Between rounds interstitial zone */
  betweenRounds: PENDING,
  /** Main menu / navigation areas */
  menu: PENDING,
  /** Landing page */
  landing: PENDING,
} as const;

export type AdSlotKey = keyof typeof AD_SLOTS;
