import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { z } from 'zod';
import logger from '@/utils/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

// ==================== RBAC Helper ====================

/**
 * Verify the authenticated user has teacher or admin role.
 * Returns null if authorized, or a NextResponse (403) if not.
 * Uses the user_role column (enum: student | teacher | admin) plus
 * the legacy is_admin boolean as a fallback for existing admins.
 */
async function requireTeacherRole(
  supabase: SupabaseClient,
  userId: string
): Promise<NextResponse | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('user_role, is_admin')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    // If we can't read the profile, deny access
    logger.error('Education templates: failed to read profile for RBAC', error);
    return NextResponse.json(
      { error: 'TEACHER_ROLE_REQUIRED', message: 'Teacher or admin role required' },
      { status: 403 }
    );
  }

  const isTeacherOrAdmin =
    profile.is_admin === true ||
    profile.user_role === 'teacher' ||
    profile.user_role === 'admin';

  if (!isTeacherOrAdmin) {
    return NextResponse.json(
      { error: 'TEACHER_ROLE_REQUIRED', message: 'Teacher or admin role required to manage templates' },
      { status: 403 }
    );
  }

  return null; // authorized
}

// Validation schemas
const createTemplateSchema = z.object({
  lessonId: z.string().uuid(),
  name: z.string().min(1).max(100),
  timerSeconds: z.number().min(30).max(600).default(180),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  minWordLength: z.number().min(2).max(5).default(2),
  allowLateJoin: z.boolean().default(true),
  boardRows: z.number().min(4).max(8).optional(),
  boardCols: z.number().min(4).max(8).optional(),
  isDefault: z.boolean().default(false),
});

const updateTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  timerSeconds: z.number().min(30).max(600).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  minWordLength: z.number().min(2).max(5).optional(),
  allowLateJoin: z.boolean().optional(),
  boardRows: z.number().min(4).max(8).nullable().optional(),
  boardCols: z.number().min(4).max(8).nullable().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/education/templates
 * Get all templates for a lesson or a specific template
 * Query params: lessonId (required) or id (for single template)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');
    const lessonId = searchParams.get('lessonId');

    // Get single template by ID
    if (templateId) {
      const { data: template, error } = await supabase
        .from('lesson_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        logger.error('Error fetching template:', error);
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      return NextResponse.json({ template });
    }

    // Get all templates for a lesson
    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }

    const { data: templates, error } = await supabase
      .from('lesson_templates')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    logger.error('GET templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/education/templates
 * Create a new lesson template
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify teacher/admin role before processing
    const roleError = await requireTeacherRole(supabase, user.id);
    if (roleError) return roleError;

    const body = await request.json();
    const parseResult = createTemplateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Verify user owns the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('vocabulary_lessons')
      .select('id, teacher_id')
      .eq('id', data.lessonId)
      .eq('teacher_id', user.id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found or not authorized' },
        { status: 403 }
      );
    }

    // If setting as default, unset other defaults for this lesson
    if (data.isDefault) {
      await supabase
        .from('lesson_templates')
        .update({ is_default: false })
        .eq('lesson_id', data.lessonId)
        .eq('is_default', true);
    }

    // Create template
    const { data: template, error } = await supabase
      .from('lesson_templates')
      .insert({
        lesson_id: data.lessonId,
        teacher_id: user.id,
        name: data.name,
        timer_seconds: data.timerSeconds,
        difficulty: data.difficulty,
        min_word_length: data.minWordLength,
        allow_late_join: data.allowLateJoin,
        board_rows: data.boardRows ?? null,
        board_cols: data.boardCols ?? null,
        is_default: data.isDefault,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    logger.error('POST templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/education/templates
 * Update an existing lesson template
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify teacher/admin role before processing
    const roleError = await requireTeacherRole(supabase, user.id);
    if (roleError) return roleError;

    const body = await request.json();
    const parseResult = updateTemplateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parseResult.data;

    // Verify user owns the template
    const { data: existing, error: existingError } = await supabase
      .from('lesson_templates')
      .select('id, lesson_id, teacher_id')
      .eq('id', id)
      .eq('teacher_id', user.id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Template not found or not authorized' },
        { status: 403 }
      );
    }

    // If setting as default, unset other defaults for this lesson
    if (updateData.isDefault) {
      await supabase
        .from('lesson_templates')
        .update({ is_default: false })
        .eq('lesson_id', existing.lesson_id)
        .eq('is_default', true)
        .neq('id', id);
    }

    // Build update object with snake_case keys
    const updateObj: Record<string, unknown> = {};
    if (updateData.name !== undefined) updateObj.name = updateData.name;
    if (updateData.timerSeconds !== undefined) updateObj.timer_seconds = updateData.timerSeconds;
    if (updateData.difficulty !== undefined) updateObj.difficulty = updateData.difficulty;
    if (updateData.minWordLength !== undefined) updateObj.min_word_length = updateData.minWordLength;
    if (updateData.allowLateJoin !== undefined) updateObj.allow_late_join = updateData.allowLateJoin;
    if (updateData.boardRows !== undefined) updateObj.board_rows = updateData.boardRows;
    if (updateData.boardCols !== undefined) updateObj.board_cols = updateData.boardCols;
    if (updateData.isDefault !== undefined) updateObj.is_default = updateData.isDefault;

    // Update template
    const { data: template, error } = await supabase
      .from('lesson_templates')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    logger.error('PATCH templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/education/templates
 * Delete a lesson template
 * Query param: id (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify teacher/admin role before processing
    const roleError = await requireTeacherRole(supabase, user.id);
    if (roleError) return roleError;

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Verify user owns the template
    const { data: existing, error: existingError } = await supabase
      .from('lesson_templates')
      .select('id, teacher_id')
      .eq('id', templateId)
      .eq('teacher_id', user.id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: 'Template not found or not authorized' },
        { status: 403 }
      );
    }

    // Delete template
    const { error } = await supabase
      .from('lesson_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      logger.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('DELETE templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
