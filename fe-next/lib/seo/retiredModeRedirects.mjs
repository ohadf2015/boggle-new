/**
 * Game modes that were removed; their old URLs land on the mode that replaced them.
 * Plain .mjs so next.config.mjs can import it at config-load time.
 */

/** @typedef {{ source: string, destination: string, permanent: boolean, missing?: { type: 'query', key: string, value?: string }[] }} RedirectRule */

const LOCALE = ':locale(en|he|sv|ja|es|ru)';

// Solo deep links Quick Play has no equivalent for yet; they keep the old route.
const SOLO_FEATURE_LINKS = [
  { type: 'query', key: 'boardCode' },
  { type: 'query', key: 'preset' },
  { type: 'query', key: 'practice' },
  { type: 'query', key: 'mpHandoff' },
  { type: 'query', key: 'mastery' },
  { type: 'query', key: 'autoStart', value: 'challenge' },
];

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
  {
    source: `/${LOCALE}/singleplayer/:path*`,
    destination: '/:locale/quick-play',
    permanent: true,
    missing: SOLO_FEATURE_LINKS,
  },
  {
    source: '/singleplayer/:path*',
    destination: '/en/quick-play',
    permanent: true,
    missing: SOLO_FEATURE_LINKS,
  },
];
