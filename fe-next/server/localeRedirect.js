/**
 * Locale Redirect Handler
 * Handles automatic locale detection and redirection for the root path
 */

// Country-to-locale mapping
const COUNTRY_TO_LOCALE = {
  IL: 'he', US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en',
  IE: 'en', ZA: 'en', IN: 'en', PH: 'en', SG: 'en',
  SE: 'sv', FI: 'sv', JP: 'ja'
};

const SUPPORTED_LOCALES = ['he', 'en', 'sv', 'ja'];
const DEFAULT_LOCALE = 'he';

// Social media crawler user agents
const SOCIAL_CRAWLERS = [
  'whatsapp', 'facebookexternalhit', 'facebot', 'twitterbot',
  'linkedinbot', 'slackbot', 'telegrambot', 'discordbot',
  'pinterest', 'redditbot', 'embedly', 'quora link preview',
  'outbrain', 'vkshare', 'w3c_validator'
];

/**
 * Detect if request is from a social media crawler
 * @param {string} userAgent - User agent string
 * @returns {boolean}
 */
function isSocialCrawler(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  return SOCIAL_CRAWLERS.some(bot => ua.includes(bot));
}

/**
 * Determine locale from request
 * Priority: cookie > IP geolocation > x-country-code header > Accept-Language
 * @param {Request} req - Express request object
 * @returns {string} Locale code
 */
function determineLocale(req) {
  // Priority 1: Cookie preference
  const cookies = req.headers.cookie;
  const cookieLocale = cookies?.split(';')
    .find(c => c.trim().startsWith('boggle_language='))
    ?.split('=')[1];

  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  // Priority 2: IP Geolocation
  if (req.geoData?.countryCode && COUNTRY_TO_LOCALE[req.geoData.countryCode]) {
    return COUNTRY_TO_LOCALE[req.geoData.countryCode];
  }

  // Priority 3: x-country-code header
  const countryHeader = req.headers['x-country-code'];
  if (countryHeader && COUNTRY_TO_LOCALE[countryHeader]) {
    return COUNTRY_TO_LOCALE[countryHeader];
  }

  // Priority 4: Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    const browserLang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(browserLang)) {
      return browserLang;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Handle locale redirect for root path requests
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Object} parsedUrl - Parsed URL object
 * @returns {boolean} True if request was handled (redirected), false to continue
 */
function handleLocaleRedirect(req, res, parsedUrl) {
  const userAgent = req.headers['user-agent'] || '';
  const locale = determineLocale(req);
  const queryString = parsedUrl.search || '';

  // For social crawlers: rewrite internally (don't redirect)
  if (isSocialCrawler(userAgent)) {
    console.log(`[Crawler] Social crawler detected -> rewriting to /${locale}${queryString}`);
    parsedUrl.pathname = `/${locale}`;
    req.url = `/${locale}${queryString}`;
    return false; // Continue to Next.js handler
  }

  // For regular users: redirect
  console.log(`[Redirect] Root path redirect: ${req.url} -> /${locale}${queryString}`);
  res.writeHead(307, { Location: `/${locale}${queryString}` });
  res.end();
  return true; // Request handled
}

module.exports = {
  handleLocaleRedirect,
  determineLocale,
  isSocialCrawler,
  COUNTRY_TO_LOCALE,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
};
