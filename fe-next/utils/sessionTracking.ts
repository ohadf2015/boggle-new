/**
 * Session Tracking Utility
 * Manages guest session tracking and device/browser information
 */

const GUEST_SESSION_KEY = 'boggle_guest_session_id';
const SESSION_CREATED_KEY = 'boggle_session_created';

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get or create guest session ID
 */
export function getGuestSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = localStorage.getItem(GUEST_SESSION_KEY);

  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(GUEST_SESSION_KEY, sessionId);
    localStorage.setItem(SESSION_CREATED_KEY, new Date().toISOString());
  }

  return sessionId;
}

/**
 * Clear guest session (when user signs up or logs out)
 */
export function clearGuestSession(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(GUEST_SESSION_KEY);
  localStorage.removeItem(SESSION_CREATED_KEY);
}

/**
 * Get device type (mobile, tablet, desktop)
 */
export function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /tablet|ipad|playbook|silk/i.test(userAgent) ||
    (isMobile && !/mobile/i.test(userAgent));

  if (isTablet) return 'tablet';
  if (isMobile) return 'mobile';
  return 'desktop';
}

/**
 * Get browser name
 */
export function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
  if (userAgent.includes('edg')) return 'edge';
  if (userAgent.includes('opera') || userAgent.includes('opr')) return 'opera';

  return 'other';
}

/**
 * Parse UTM parameters from URL
 */
export function getUTMParams(): {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
} {
  if (typeof window === 'undefined') {
    return { source: null, medium: null, campaign: null, referrer: null };
  }

  const urlParams = new URLSearchParams(window.location.search);

  return {
    source: urlParams.get('utm_source'),
    medium: urlParams.get('utm_medium'),
    campaign: urlParams.get('utm_campaign'),
    referrer: document.referrer || null,
  };
}

/**
 * Get device information
 */
export function getDeviceInfo(): {
  deviceType: string;
  browser: string;
  language: string;
} {
  return {
    deviceType: getDeviceType(),
    browser: getBrowser(),
    language: typeof navigator !== 'undefined' ? navigator.language : 'en',
  };
}

/**
 * Initialize session tracking
 * Creates or updates guest session in the backend
 */
export async function initSessionTracking(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const sessionId = getGuestSessionId();
    const deviceInfo = getDeviceInfo();
    const utmParams = getUTMParams();

    // Call API to create/update guest session
    const response = await fetch('/api/analytics/guest-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create',
        sessionId,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        language: deviceInfo.language,
        utmSource: utmParams.source,
        utmMedium: utmParams.medium,
        utmCampaign: utmParams.campaign,
        referrer: utmParams.referrer,
      }),
    });

    if (!response.ok) {
      console.error('Failed to initialize session tracking');
    }
  } catch (error) {
    console.error('Error initializing session tracking:', error);
  }
}

/**
 * Link guest session to user account
 * Should be called after successful signup/login
 */
export async function linkSessionToUser(userId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const sessionId = getGuestSessionId();

    if (!sessionId) return;

    // Call API to link session
    const response = await fetch('/api/analytics/guest-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'link',
        sessionId,
        userId,
      }),
    });

    if (!response.ok) {
      console.error('Failed to link session to user');
    } else {
      // Clear guest session after successful linking
      clearGuestSession();
    }
  } catch (error) {
    console.error('Error linking session to user:', error);
  }
}

/**
 * Check if this is a first-time visitor
 */
export function isFirstVisit(): boolean {
  if (typeof window === 'undefined') return false;

  const sessionCreated = localStorage.getItem(SESSION_CREATED_KEY);

  if (!sessionCreated) return true;

  // Consider first visit if session was created in the last 5 minutes
  const createdTime = new Date(sessionCreated).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  return now - createdTime < fiveMinutes;
}

/**
 * Get session creation time
 */
export function getSessionCreatedAt(): Date | null {
  if (typeof window === 'undefined') return null;

  const sessionCreated = localStorage.getItem(SESSION_CREATED_KEY);

  if (!sessionCreated) return null;

  return new Date(sessionCreated);
}
