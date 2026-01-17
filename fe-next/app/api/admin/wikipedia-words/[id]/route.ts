/**
 * Admin API: Wikipedia Word Candidate Management
 * PATCH /api/admin/wikipedia-words/[id] - Update word status
 * DELETE /api/admin/wikipedia-words/[id] - Delete word candidate
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import {
  adminUpdateWordStatus,
  adminDeleteWordCandidate
} from '@/backend/services/wikipediaWordPopulator';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: 'Missing candidate ID' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['valid', 'invalid', 'pending'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Use: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const success = await adminUpdateWordStatus(id, status);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update word status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Word status updated to "${status}"`
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Wikipedia] Error updating word:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to update word' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: 'Missing candidate ID' },
      { status: 400 }
    );
  }

  try {
    const success = await adminDeleteWordCandidate(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete word candidate' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Word candidate deleted'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Wikipedia] Error deleting word:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to delete word' },
      { status: 500 }
    );
  }
}
