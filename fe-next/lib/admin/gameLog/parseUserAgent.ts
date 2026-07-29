/**
 * Pure user-agent parser for the admin game log.
 * Server records `metadata.user_agent` on analytics_events; we derive a coarse
 * device/browser/os for display. Intentionally lightweight (no ua-parser dep).
 */

export interface ParsedUserAgent {
  device_type: 'mobile' | 'tablet' | 'desktop' | null;
  browser: string | null;
  os: string | null;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) return { device_type: null, browser: null, os: null };

  const s = ua;

  // OS
  let os: string | null = null;
  if (/Android/i.test(s)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(s)) os = 'macOS';
  else if (/Windows/i.test(s)) os = 'Windows';
  else if (/Linux/i.test(s)) os = 'Linux';
  else if (/CrOS/i.test(s)) os = 'ChromeOS';

  // Device type
  let device_type: ParsedUserAgent['device_type'];
  const isTablet = /iPad/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s));
  const isMobile = /iPhone|iPod/i.test(s) || (/Android/i.test(s) && /Mobile/i.test(s)) || /Mobile/i.test(s);
  if (isTablet) device_type = 'tablet';
  else if (isMobile) device_type = 'mobile';
  else device_type = 'desktop';

  // Browser — order matters (Edge/Chrome contain "Safari"/"Chrome" tokens)
  let browser: string | null = null;
  if (/Edg\//i.test(s) || /EdgA\//i.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(s)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(s)) browser = 'Samsung Internet';
  else if (/Firefox\/|FxiOS/i.test(s)) browser = 'Firefox';
  else if (/Chrome\/|CriOS/i.test(s)) browser = 'Chrome';
  else if (/Safari\//i.test(s) && /Version\//i.test(s)) browser = 'Safari';
  else if (/Safari\//i.test(s)) browser = 'Safari';

  return { device_type, browser, os };
}
