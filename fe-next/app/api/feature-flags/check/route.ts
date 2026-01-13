import { NextRequest, NextResponse } from 'next/server';
import { canAccessFeature } from '@/backend/utils/featureFlags';

/**
 * POST /api/feature-flags/check
 * Check if user can access a specific feature
 *
 * Body:
 * {
 *   flagName: string,
 *   userId: string
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

    if (!userId) {
      return NextResponse.json(
        { enabled: false },
        { status: 200 }
      );
    }

    // Check if user can access feature
    const enabled = await canAccessFeature(userId, flagName);

    return NextResponse.json({
      success: true,
      enabled,
      flagName,
    });
  } catch (error) {
    console.error('Error in POST /api/feature-flags/check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
