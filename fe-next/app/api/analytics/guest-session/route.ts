/**
 * API Route: /api/analytics/guest-session
 * Manages guest sessions for anonymous player tracking
 * GET: Retrieve existing session
 * POST: Create or update guest session
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';

// Cap at 5s — prevents orphaned requests when Supabase is slow
export const maxDuration = 5;

// Import backend services (dynamic to avoid server/client issues)
let getOrCreateGuestSession: any;
let updateGuestSession: any;
let getGuestSession: any;
let linkGuestSessionToUser: any;

async function getTrackers() {
  if (!getOrCreateGuestSession || !updateGuestSession || !getGuestSession || !linkGuestSessionToUser) {
    const guestModule = await import('@/backend/modules/guestTracker');
    getOrCreateGuestSession = guestModule.getOrCreateGuestSession;
    updateGuestSession = guestModule.updateGuestSession;
    getGuestSession = guestModule.getGuestSession;
    linkGuestSessionToUser = guestModule.linkGuestSessionToUser;
  }
  return { getOrCreateGuestSession, updateGuestSession, getGuestSession, linkGuestSessionToUser };
}

// Rate limit: 30 requests per minute per IP
const RATE_LIMIT_CONFIG = {
  maxRequests: 30,
  windowMs: 60000,
  blockDurationMs: 300000,
};

/**
 * GET - Retrieve guest session by session ID
 */
export async function GET(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'guest-session-get', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (sessionId.length < 16 || sessionId.length > 256 || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid sessionId format' },
        { status: 400 }
      );
    }

    // Get the trackers first to catch any import errors early
    const trackers = await getTrackers();
    const session = await trackers.getGuestSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[guest-session GET] Error:', msg);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create or update guest session
 */
export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'guest-session-post', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    // Get the trackers first to catch any import errors early
    const trackers = await getTrackers();

    const body = await request.json();
    const {
      action, // 'create' or 'update' or 'link'
      sessionId,
      userId: _userId, // For linking (unused — auth user.id is used instead)
      deviceType,
      browser,
      language,
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
      country,
    } = body;

    // Validate sessionId format if provided
    if (sessionId && (
      typeof sessionId !== 'string' ||
      sessionId.length < 16 ||
      sessionId.length > 256 ||
      !/^[a-zA-Z0-9_-]+$/.test(sessionId)
    )) {
      return NextResponse.json(
        { error: 'Invalid sessionId format' },
        { status: 400 }
      );
    }

    // Create or get existing session
    if (action === 'create' || !action) {
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required' },
          { status: 400 }
        );
      }

      const session = await trackers.getOrCreateGuestSession({
        sessionId,
        deviceType: deviceType || null,
        browser: browser || null,
        language: language || null,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        referrer: referrer || null,
        country: country || null,
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Failed to create guest session' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        session,
      });
    }

    // Update existing session
    if (action === 'update') {
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required for updates' },
          { status: 400 }
        );
      }

      const updates: any = {};
      if (deviceType !== undefined) updates.deviceType = deviceType;
      if (browser !== undefined) updates.browser = browser;
      if (language !== undefined) updates.language = language;
      if (utmSource !== undefined) updates.utmSource = utmSource;
      if (utmMedium !== undefined) updates.utmMedium = utmMedium;
      if (utmCampaign !== undefined) updates.utmCampaign = utmCampaign;
      if (referrer !== undefined) updates.referrer = referrer;
      if (country !== undefined) updates.country = country;
      updates.lastVisitAt = new Date();

      const success = await trackers.updateGuestSession(sessionId, updates);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update guest session' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    // Link guest session to user
    if (action === 'link') {
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required for linking' },
          { status: 400 }
        );
      }

      // Auth check: only authenticated users can link sessions
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required to link sessions' },
          { status: 401 }
        );
      }

      const success = await trackers.linkGuestSessionToUser(sessionId, user.id);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to link guest session to user' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Must be "create", "update", or "link"' },
      { status: 400 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[guest-session POST] Error:', msg);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
