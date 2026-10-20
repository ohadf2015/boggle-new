/**
 * Aliases for the school-pricing URL people type or paste by hand.
 *
 * `/schools` (and `/en/schools`, `/he/schools`, `/for-schools`, ...) has never
 * been a route — the page lives at `/{locale}/education/for-schools`. Outreach
 * copy, digests and teachers reconstructing a link all reach for the short
 * shape, and every one of them 404'd (measured on production 2026-10-20).
 *
 * `permanent: false`, same reasoning as gameRouteAliases.mjs: these URLs never
 * existed, so a cached 301 would only block ever making `/schools` a real page.
 * Exact segments only, never a catch-all.
 *
 * Plain .mjs so next.config.mjs can import it at config-load time.
 */

/** @typedef {{ source: string, destination: string, permanent: boolean }} RedirectRule */

const LOCALE = ':locale(en|he|sv|ja|es|ru)';

/** @type {RedirectRule[]} */
export const SCHOOL_ROUTE_ALIASES = [
  ...['schools', 'for-schools'].flatMap((alias) => [
    {
      source: `/${LOCALE}/${alias}`,
      destination: '/:locale/education/for-schools',
      permanent: false,
    },
    {
      source: `/${alias}`,
      destination: '/en/education/for-schools',
      permanent: false,
    },
  ]),
];
