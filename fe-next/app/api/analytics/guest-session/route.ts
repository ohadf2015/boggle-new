/**
 * API Route: /api/analytics/guest-session
 * Manages guest sessions for anonymous player tracking
 * GET: Retrieve existing session
 * POST: Create or update guest session
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import type { GuestSessionUpdateData } from '@/backend/modules/guestTracker';
import { withRouteTimeout, type PhaseRef } from '@/lib/server/routeTimeout';

// Hard wall-clock cap. Express custom server (Railway) ignores Next's `maxDuration`,
// so we enforce here — without it, hanging Supabase fetches let the request sit until
// the 30s Express timeout. See server/middleware.ts ROUTES_WITH_CUSTOM_TIMEOUT.
const ROUTE_TIMEOUT_MS = 4000;

// Phase tracker — captured by closure in each handler. When the wall-clock cap wins
// we log which await we were sitting on, so the *real* hang point surfaces on the next
// production occurrence instead of getting masked by the 504.
type Phase =
  | 'init'
  | 'parse-body'
  | 'load-trackers'
  | 'create-or-get'
  | 'update'
  | 'auth-get-user'
  | 'link'
  | 'fetch-session';

type GuestTrackerModule = typeof import('@/backend/modules/guestTracker');

let getOrCreateGuestSession: GuestTrackerModule['getOrCreateGuestSession'] | undefined;
let updateGuestSession: GuestTrackerModule['updateGuestSession'] | undefined;
let getGuestSession: GuestTrackerModule['getGuestSession'] | undefined;
let linkGuestSessionToUser: GuestTrackerModule['linkGuestSessionToUser'] | undefined;

async function getTrackers() {
  if (!getOrCreateGuestSession || !updateGuestSession || !getGuestSession || !linkGuestSessionToUser) {
    const guestModule = await import('@/backend/modules/guestTracker');
    getOrCreateGuestSession = guestModule.getOrCreateGuestSession;
    updateGuestSession = guestModule.updateGuestSession;
    getGuestSession = guestModule.getGuestSession;
    linkGuestSessionToUser = guestModule.linkGuestSessionToUser;
  }
  return {
    getOrCreateGuestSession: getOrCreateGuestSession!,
    updateGuestSession: updateGuestSession!,
    getGuestSession: getGuestSession!,
    linkGuestSessionToUser: linkGuestSessionToUser!,
  };
}

// Rate limit: 30 requests per minute per IP
const RATE_LIMIT_CONFIG = {
  maxRequests: 30,
  windowMs: 60000,
  blockDurationMs: 300000,
};

export function GET(request: NextRequest) {
  const phaseRef: PhaseRef<Phase> = { current: 'init', method: 'GET' };
  return withRouteTimeout({ label: 'guest-session', ms: ROUTE_TIMEOUT_MS, phaseRef }, handleGet(request, phaseRef));
}

export function POST(request: NextRequest) {
  const phaseRef: PhaseRef<Phase> = { current: 'init', method: 'POST' };
  return withRouteTimeout({ label: 'guest-session', ms: ROUTE_TIMEOUT_MS, phaseRef }, handlePost(request, phaseRef));
}

/**
 * GET - Retrieve guest session by session ID
 */
async function handleGet(request: NextRequest, phaseRef: { current: Phase; action?: string }) {
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
    phaseRef.current = 'load-trackers';
    const trackers = await getTrackers();
    phaseRef.current = 'fetch-session';
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
async function handlePost(request: NextRequest, phaseRef: { current: Phase; action?: string }) {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'guest-session-post', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    // Get the trackers first to catch any import errors early
    phaseRef.current = 'load-trackers';
    const trackers = await getTrackers();

    phaseRef.current = 'parse-body';
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

    phaseRef.action = String(action ?? 'create');

    // Create or get existing session
    if (action === 'create' || !action) {
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required' },
          { status: 400 }
        );
      }

      phaseRef.current = 'create-or-get';
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

      const updates: GuestSessionUpdateData = {};
      if (deviceType !== undefined) updates.deviceType = deviceType;
      if (browser !== undefined) updates.browser = browser;
      if (language !== undefined) updates.language = language;
      if (utmSource !== undefined) updates.utmSource = utmSource;
      if (utmMedium !== undefined) updates.utmMedium = utmMedium;
      if (utmCampaign !== undefined) updates.utmCampaign = utmCampaign;
      if (referrer !== undefined) updates.referrer = referrer;
      if (country !== undefined) updates.country = country;
      updates.lastVisitAt = new Date();

      phaseRef.current = 'update';
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
      phaseRef.current = 'auth-get-user';
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required to link sessions' },
          { status: 401 }
        );
      }

      phaseRef.current = 'link';
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
