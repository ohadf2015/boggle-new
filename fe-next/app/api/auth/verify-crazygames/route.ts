import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { captureApiError } from '@/utils/sentry';

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
const CRAZYGAMES_JWKS_URL = new URL('https://crazygames.com/.well-known/jwks.json');
const jwks = createRemoteJWKSet(CRAZYGAMES_JWKS_URL);

// Expected issuer and audience for CrazyGames tokens
const EXPECTED_ISSUER = 'crazygames.com';

export async function POST(request: NextRequest) {
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
