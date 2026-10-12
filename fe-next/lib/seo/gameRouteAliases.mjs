/**
 * Aliases for the two game URLs people type by hand.
 *
 * Neither has ever been a route. `/play` falls into `app/[locale]` as a locale
 * segment and renders the word-validation 404 ("404 — Word Not Found!");
 * `/room` lands on the generic one. For a multiplayer word game those are the
 * two most guessable paths there are, and both are dead ends at the very top of
 * the funnel. Same class of fix as the `/privacy` and `/join?code=` aliases
 * already in next.config.mjs: nothing in the app emits these shapes, but a
 * person reconstructing a half-remembered link does.
 *
 * `permanent: false`. The legal and word-tower rules are 301s because those
 * URLs existed and moved; these never existed, so a 301 would only cache a
 * guess in every browser that probed it and block ever making `/play` real.
 *
 * Exact two-segment sources, never a catch-all: `/[locale]/connections/play`
 * and `/[locale]/play-boggle-online-free` are real pages.
 *
 * Plain .mjs, not .ts: next.config.mjs imports this at config-load time, where
 * Node cannot load TypeScript. One list, shared by the config and its test.
 */

/** @typedef {{ source: string, destination: string, permanent: boolean }} RedirectRule */

const LOCALE = ':locale(en|he|sv|ja|es|ru)';

/** @type {RedirectRule[]} */
export const GAME_ROUTE_ALIASES = [
  // /play → a solo bot round, which is what "play" with no further intent
  // means. Explicit ?autoStart=bots, not bare /singleplayer: bare is handled
  // client-side as bots, and redirectLogic.ts asks entry points to carry the
  // param so the player skips that client hop.
  {
    source: `/${LOCALE}/play`,
    destination: '/:locale/singleplayer?autoStart=bots',
    permanent: false,
  },
  {
    source: '/play',
    destination: '/en/singleplayer?autoStart=bots',
    permanent: false,
  },
  // /room → the multiplayer lobby. Next carries the query string through, so a
  // typed /room?room=CODE still auto-joins via useMultiplayerSession.
  {
    source: `/${LOCALE}/room`,
    destination: '/:locale/multiplayer',
    permanent: false,
  },
  {
    source: '/room',
    destination: '/en/multiplayer',
    permanent: false,
  },
];
