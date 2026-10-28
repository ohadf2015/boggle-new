/**
 * Cookieless aggregate click for education landers.
 *
 * Same legal footing as page_cold_start: no consent gate, no cookie, no stored
 * person id. The distinct_id is a throwaway per click so PostHog will accept
 * the capture without stitching a profile.
 */

export const LANDER_CTA_EVENT = 'lander_cta_clicked';

/** Locale prefix optional. Matches /education and /he/education/.... */
export const EDUCATION_LANDER_RE_SOURCE = '^\\/(?:[a-z]{2}\\/)?education(?:\\/|$)';

const EDUCATION_LANDER = new RegExp(EDUCATION_LANDER_RE_SOURCE, 'i');

export function isEducationLanderPath(pathname: string): boolean {
  return EDUCATION_LANDER.test(pathname || '');
}

function clip(value: string | null): string {
  return (value || '').trim().slice(0, 200);
}

export function readCampaignUtms(search: string): {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
} {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const q = new URLSearchParams(raw);
  return {
    utm_source: clip(q.get('utm_source')),
    utm_medium: clip(q.get('utm_medium')),
    utm_campaign: clip(q.get('utm_campaign')),
  };
}

export function landerCtaCaptureBody(args: {
  apiKey: string;
  distinctId: string;
  path: string;
  ctaId: string;
  search: string;
}): string {
  const utm = readCampaignUtms(args.search);
  return JSON.stringify({
    api_key: args.apiKey,
    distinct_id: args.distinctId,
    event: LANDER_CTA_EVENT,
    properties: {
      path: args.path,
      cta_id: (args.ctaId || '').slice(0, 64),
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      $lib: 'rum-inline',
      $lib_version: '1.2.0',
    },
  });
}
