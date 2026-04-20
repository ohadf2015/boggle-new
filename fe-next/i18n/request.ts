/**
 * next-intl server-side request configuration.
 *
 * Provides messages to Server Components via getRequestConfig().
 * This runs on every request and loads the appropriate locale messages.
 *
 * Currently loads from the existing JS translation modules for backwards compatibility.
 * Once messages are converted to JSON, switch to: import messages from `../messages/${locale}.json`
 */
import { getRequestConfig } from 'next-intl/server';
import { locales, type Locale } from './config';
import { normalizeMessages } from './normalizeMessages';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale: string = 'en';
  try {
    const resolved = await requestLocale;
    if (resolved && locales.includes(resolved as Locale)) {
      locale = resolved;
    }
  } catch {
    // No request context during prerender (e.g. /_global-error) — fall back to default
    locale = 'en';
  }

  // Load from existing JS translation modules (backwards compatible)
  const { default: rawMessages } = await import(`../translations/${locale}.js`);

  // Normalize ${var} and {{var}} to {var} for ICU MessageFormat
  const messages = normalizeMessages(rawMessages);

  return {
    locale,
    messages,
  };
});
