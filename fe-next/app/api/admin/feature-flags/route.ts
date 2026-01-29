import { NextRequest, NextResponse } from 'next/server';
import {
  listFeatureFlags,
  getFeatureFlag,
  setFeatureFlag,
  deleteFeatureFlag,
} from '@/backend/utils/featureFlags';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';

/**
 * GET /api/admin/feature-flags
 * List all feature flags
 *
 * Query params:
 * - flagName: (optional) Get specific flag
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization using JWT-based auth (consistent with other admin endpoints)
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { searchParams } = new URL(request.url);
    const flagName = searchParams.get('flagName');

    if (flagName) {
      // Get specific flag
      const flag = await getFeatureFlag(flagName);

      if (!flag) {
        return NextResponse.json(
          { error: 'Feature flag not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: flag,
      });
    }

    // List all flags
    const flags = await listFeatureFlags();

    return NextResponse.json({
      success: true,
      data: flags,
      count: flags.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in GET /api/admin/feature-flags:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/feature-flags
 * Create or update a feature flag
 *
 * Body:
 * {
 *   flagName: string,
 *   enabled?: boolean,
 *   admin_only?: boolean,
 *   rollout_percentage?: number (0-100)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization using JWT-based auth (consistent with other admin endpoints)
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const body = await request.json();
    const { flagName, enabled, admin_only, rollout_percentage } = body;

    // Validate required fields
    if (!flagName) {
      return NextResponse.json(
        { error: 'flagName is required' },
        { status: 400 }
      );
    }

    // Validate rollout_percentage if provided
    if (
      rollout_percentage !== undefined &&
      (rollout_percentage < 0 || rollout_percentage > 100)
    ) {
      return NextResponse.json(
        { error: 'rollout_percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Create or update flag
    const success = await setFeatureFlag(flagName, {
      enabled,
      admin_only,
      rollout_percentage,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to create/update feature flag' },
        { status: 500 }
      );
    }

    // Get the updated flag
    const flag = await getFeatureFlag(flagName);

    return NextResponse.json({
      success: true,
      data: flag,
      message: 'Feature flag created/updated successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in POST /api/admin/feature-flags:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/feature-flags
 * Delete a feature flag
 *
 * Query params:
 * - flagName: Feature flag name to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authorization using JWT-based auth (consistent with other admin endpoints)
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { searchParams } = new URL(request.url);
    const flagName = searchParams.get('flagName');

    if (!flagName) {
      return NextResponse.json(
        { error: 'flagName is required' },
        { status: 400 }
      );
    }

    // Check if flag exists
    const existingFlag = await getFeatureFlag(flagName);
    if (!existingFlag) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      );
    }

    // Delete flag
    const success = await deleteFeatureFlag(flagName);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete feature flag' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Feature flag '${flagName}' deleted successfully`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in DELETE /api/admin/feature-flags:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
