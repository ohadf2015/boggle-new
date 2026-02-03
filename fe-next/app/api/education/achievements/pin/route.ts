/**
 * Achievement Pin API Route
 *
 * POST /api/education/achievements/pin
 * - Toggle pin status for an achievement
 * - Max 3 pins per student
 *
 * GET /api/education/achievements/pin
 * - Get all pinned achievements for a student
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const pinToggleSchema = z.object({
  studentId: z.string().uuid(),
  achievementKey: z.string().min(1),
  isPinned: z.boolean(),
});

const getPinsSchema = z.object({
  studentId: z.string().uuid(),
});

// ============================================
// ERROR HANDLER
// ============================================

function handleError(error: unknown): NextResponse {
  console.error('Achievement pin API error:', error);

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Invalid request data', details: error.issues },
      { status: 400 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

// ============================================
// POST - Toggle Pin Status
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { studentId, achievementKey, isPinned } = pinToggleSchema.parse(body);

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the achievement_id from the key
    const { data: achievementDef, error: lookupError } = await supabase
      .from('achievement_definitions')
      .select('id')
      .eq('key', achievementKey)
      .single();

    if (lookupError || !achievementDef) {
      return NextResponse.json(
        { error: `Achievement not found: ${achievementKey}` },
        { status: 404 }
      );
    }

    const achievementId = achievementDef.id;

    // If pinning, check if already at max pins (3)
    if (isPinned) {
      const { data: existingPins, error: countError } = await supabase
        .from('student_achievements')
        .select('id')
        .eq('student_id', studentId)
        .eq('is_pinned', true);

      if (countError) {
        throw new Error(`Failed to count pins: ${countError.message}`);
      }

      if (existingPins && existingPins.length >= 3) {
        return NextResponse.json(
          { error: 'Maximum 3 pins allowed. Unpin another achievement first.' },
          { status: 400 }
        );
      }
    }

    // Update the pin status for existing achievement record
    const { data, error } = await supabase
      .from('student_achievements')
      .update({ is_pinned: isPinned })
      .eq('student_id', studentId)
      .eq('achievement_id', achievementId)
      .select()
      .single();

    if (error) {
      // If no record exists, the student hasn't earned this achievement yet
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Cannot pin an achievement you have not earned yet' },
          { status: 400 }
        );
      }
      throw new Error(`Failed to update pin: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        achievementKey: achievementKey,
        isPinned: data.is_pinned,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// ============================================
// GET - Get Pinned Achievements
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    const { studentId: validStudentId } = getPinsSchema.parse({ studentId });

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Join with achievement_definitions to get the key
    const { data, error } = await supabase
      .from('student_achievements')
      .select(`
        is_pinned,
        achievement_definitions!inner (
          key
        )
      `)
      .eq('student_id', validStudentId)
      .eq('is_pinned', true);

    if (error) {
      throw new Error(`Failed to fetch pins: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: data?.map((pin) => ({
        // Supabase inner join returns a single object, not an array
        achievementKey: (pin.achievement_definitions as unknown as { key: string }).key,
        isPinned: pin.is_pinned,
      })) || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
