import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { captureApiError } from '@/utils/sentry';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';

/**
 * CrazyGames token verification endpoint.
 *
 * Verifies JWT tokens issued by the CrazyGames SDK using their public JWKS.
 * Call this from the frontend after obtaining a token via getUserToken()
 * to establish a trusted CrazyGames identity on the server.
 *
 * POST /api/auth/verify-crazygames
 * Body: { token: string }
 * Returns: { valid: true, userId: string, username: string } or 401
 */

// Cache the JWKS fetcher — jose handles key rotation automatically
// CrazyGames documents their public key at https://sdk.crazygames.com/publicKey.json
// but jose's createRemoteJWKSet requires JWKS format — CG also exposes JWKS here:
const CRAZYGAMES_JWKS_URL = new URL('https://sdk.crazygames.com/.well-known/jwks.json');
const jwks = createRemoteJWKSet(CRAZYGAMES_JWKS_URL);

// Expected issuer for CrazyGames tokens
const EXPECTED_ISSUER = 'crazygames.com';
// Audience claim — prevents tokens issued for other CrazyGames titles from being accepted.
// Default to the LexiClash CG game domain; override with CRAZYGAMES_GAME_DOMAIN env var
// for staging or alternate slugs. Never undefined: jose's jwtVerify silently skips the
// audience check when audience is undefined, which would accept any signed CG token from
// any other game on the platform.
const DEFAULT_AUDIENCE = 'lexiclash';
const EXPECTED_AUDIENCE = process.env.CRAZYGAMES_GAME_DOMAIN || DEFAULT_AUDIENCE;
if (!process.env.CRAZYGAMES_GAME_DOMAIN && process.env.NODE_ENV === 'production') {
  console.warn(
    '[verify-crazygames] CRAZYGAMES_GAME_DOMAIN not set — falling back to default audience "%s"',
    DEFAULT_AUDIENCE,
  );
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per 60 seconds per IP
  const rateLimit = checkApiRateLimit(request, 'verify-crazygames', {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid token' },
        { status: 400 }
      );
    }

    // Verify the JWT against CrazyGames public keys
    const { payload } = await jwtVerify(token, jwks, {
      issuer: EXPECTED_ISSUER,
      // Always validate audience to prevent cross-game token reuse
      audience: EXPECTED_AUDIENCE,
      // CrazyGames tokens use RS256
      algorithms: ['RS256'],
    });

    // Extract user claims from the verified token
    const userId = payload.sub ?? payload.userId;
    const username = payload.username ?? payload.name;
    const profilePictureUrl = payload.profilePictureUrl ?? payload.picture;

    if (!userId) {
      return NextResponse.json(
        { error: 'Token missing user identifier' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      userId: String(userId),
      username: username ? String(username) : null,
      profilePictureUrl: profilePictureUrl ? String(profilePictureUrl) : null,
    });
  } catch (error) {
    // Distinguish between validation errors and server errors
    const isValidationError =
      error instanceof Error &&
      (error.message.includes('JWS') ||
        error.message.includes('JWT') ||
        error.message.includes('signature') ||
        error.message.includes('expired') ||
        error.message.includes('issuer'));

    if (isValidationError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/auth/verify-crazygames');
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 500 }
    );
  }
}
