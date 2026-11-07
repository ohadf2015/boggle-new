/**
 * Aliases for the URLs people type by hand that were never routes.
 *
 * `/play` and `/room` fall into `app/[locale]` as a locale segment and render
 * the word-validation 404 ("404 — Word Not Found!"); `/room` lands on the
 * generic one. `/ranks` is the nav label for the leaderboard, whose route has
 * always been `/leaderboard`. For a multiplayer word game these are among the
 * most guessable paths there are, and all are dead ends at the very top of the
 * funnel. Same class of fix as the `/privacy` and `/join?code=` aliases
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
  // /play → a random Quick Play round, which is what "play" with no further intent means.
  {
    source: `/${LOCALE}/play`,
    destination: '/:locale/quick-play?mode=random',
    permanent: false,
  },
  {
    source: '/play',
    destination: '/en/quick-play?mode=random',
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
  // /room/CODE is the shareable invite shape the apps open (DeepLinkHandler maps
  // it to /join/CODE, and the AASA/assetlinks claim it). A recipient without the
  // app lands on the web, where only /[locale]/join/[code] exists, so mirror the
  // app's mapping instead of 404ing the invite.
  {
    source: `/${LOCALE}/room/:code`,
    destination: '/:locale/join/:code',
    permanent: false,
  },
  {
    source: '/room/:code',
    destination: '/en/join/:code',
    permanent: false,
  },
  // /ranks — the global nav labels the leaderboard "Ranks", but the route has
  // always been /leaderboard, so /ranks 404s on every locale. Same alias class
  // as /play and /room: a guessed path, never a real route.
  {
    source: `/${LOCALE}/ranks`,
    destination: '/:locale/leaderboard',
    permanent: false,
  },
  {
    source: '/ranks',
    destination: '/en/leaderboard',
    permanent: false,
  },
];
