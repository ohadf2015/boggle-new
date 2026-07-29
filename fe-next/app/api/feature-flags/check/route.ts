import { NextRequest, NextResponse } from 'next/server';
import { canAccessFeature } from '@/backend/utils/featureFlags';

/**
 * POST /api/feature-flags/check
 * Check if user can access a specific feature
 *
 * Body:
 * {
 *   flagName: string,
 *   userId: string | null (null for guest users)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flagName, userId } = body;

    // Validate required fields
    if (!flagName) {
      return NextResponse.json(
        { error: 'flagName is required' },
        { status: 400 }
      );
    }

    // Check if user can access feature (supports null userId for guest users)
    const enabled = await canAccessFeature(userId || null, flagName);

    return NextResponse.json({
      success: true,
      enabled,
      flagName,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in POST /api/feature-flags/check:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
