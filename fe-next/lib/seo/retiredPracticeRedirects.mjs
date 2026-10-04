/**
 * Redirects for the retired practice routes.
 *
 * Practice is gone as a destination: over 90 days, 299 people started it and 151
 * (50.5%) never played a real game at all, so FTUE and the landing hub now send
 * players straight into the actual engine. Nothing in the app links to
 * `/practice` any more.
 *
 * The URLs still have to answer, though. They were live for months and sit in
 * browser histories, bookmarks and shared links — 404ing them would strand the
 * exact people we are trying to get INTO a game. Both pages were already
 * `robots: noindex, follow`, so this is for humans holding an old link, not for
 * search.
 *
 * Per-mode destinations, not one blanket bounce: each practice mode wrapped a
 * specific real game, and dumping someone who wanted the word wheel onto the
 * classic board is a worse landing than the 404 it replaces.
 *
 * Order matters — Next takes the FIRST matching rule. Specific modes first, then
 * the hub, then the catch-all. Use `:rest+` (one or more) — not `:rest*` — so the
 * catch-all cannot also match the bare hub even if order slips. (`:rest*` is an
 * optional catch-all and matches `/[locale]/practice` with zero segments.)
 *
 * Plain .mjs, not .ts: next.config.mjs has to import this at config-load time,
 * where Node cannot load TypeScript. One list, shared by the config and its test.
 */

/** @typedef {{ source: string, destination: string, permanent: boolean }} RedirectRule */

/** Locales the app serves; mirrors the pattern used by the legal-page aliases. */
const LOCALE = ':locale(en|he|sv|ja|es|ru)';

/** @type {RedirectRule[]} */
export const RETIRED_PRACTICE_REDIRECTS = [
  // Word Hunt practice was the daily word-hunt board without the once-a-day gate.
  {
    source: `/${LOCALE}/practice/wordHunt`,
    destination: '/:locale/daily/word-hunt',
    permanent: true,
  },
  // Wheel Rush practice was the daily word wheel, likewise.
  {
    source: `/${LOCALE}/practice/wheelRush`,
    destination: '/:locale/daily/word-wheel',
    permanent: true,
  },
  // Classic practice was the single-player grid. Land on one coached round,
  // not a bot match (bare /singleplayer is treated as autoStart=bots).
  {
    source: `/${LOCALE}/practice/classic`,
    destination: '/:locale/singleplayer?autoStart=coach',
    permanent: true,
  },
  // The hub itself — must precede the catch-all. Coach, not bare singleplayer
  // (bots), so old /practice bookmarks land the same place as /practice/classic.
  {
    source: `/${LOCALE}/practice`,
    destination: '/:locale/singleplayer?autoStart=coach',
    permanent: true,
  },
  // Anything else under /practice — including `/practice/brain`, which
  // SixModeTour still links and which was never a valid practice mode to begin
  // with, so it 404s today. `:rest+` requires ≥1 segment so it cannot swallow
  // the hub above.
  {
    source: `/${LOCALE}/practice/:rest+`,
    destination: '/:locale/singleplayer',
    permanent: true,
  },
];
