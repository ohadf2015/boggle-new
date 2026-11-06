/**
 * Game modes that were removed; their old URLs land on the mode that replaced them.
 * Plain .mjs so next.config.mjs can import it at config-load time.
 */

/** @typedef {{ source: string, destination: string, permanent: boolean }} RedirectRule */

const LOCALE = ':locale(en|he|sv|ja|es|ru)';

/** @type {RedirectRule[]} */
export const RETIRED_MODE_REDIRECTS = [
  {
    source: `/${LOCALE}/blast/v2/:path*`,
    destination: '/:locale/blast',
    permanent: true,
  },
  {
    source: '/blast/v2/:path*',
    destination: '/en/blast',
    permanent: true,
  },
];
