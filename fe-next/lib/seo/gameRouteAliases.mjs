/**
 * Aliases for the game URLs people type by hand (or an old nav linked).
 *
 * None has ever been a working route. `/play` falls into `app/[locale]` as a
 * locale segment and renders the word-validation 404 ("404 — Word Not Found!");
 * `/room` and `/ranks` land on the generic one. For a multiplayer word game
 * these are the most guessable paths there are, and each is a dead end at the
 * very top of the funnel. Same class of fix as the `/privacy` and `/join?code=`
 * aliases already in next.config.mjs: nothing in the app emits these shapes
 * anymore, but a person reconstructing a half-remembered link does — and
 * deploys from before the nav relabel still point every page's "Ranks" tab at
 * /[locale]/ranks (QA 2026-11-05: live /en/ranks → 404, dead-ending the
 * competitive loop the leaderboard is the retention hook for).
 *
 * `permanent: false`. The legal and word-tower rules are 301s because those
 * URLs existed and moved; these never existed, so a 301 would only cache a
 * guess in every browser that probed it and block ever making `/play` or
 * `/ranks` real.
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
  // /ranks → the leaderboard. The nav label IS "Ranks" (translations
  // nav.leaderboard), so users type /ranks, and older deploys' global nav
  // linked here on every page while never resolving (live /en/ranks → 404,
  // QA 2026-11-05). Alias both shapes to the canonical /leaderboard.
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
