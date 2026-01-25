/**
 * Admin API: Manage Single Buzz Prompt Template
 * GET /api/admin/buzz/prompt-templates/[id] - Get template by ID
 * PUT /api/admin/buzz/prompt-templates/[id] - Update template
 * DELETE /api/admin/buzz/prompt-templates/[id] - Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { createClient } from '@supabase/supabase-js';
import { clearPromptTemplateCache } from '@/backend/services/buzz/promptTemplateLoader';

interface UpdateTemplateBody {
  name?: string;
  description?: string;
  template_content?: string;
  placeholders?: Array<{ name: string; description: string }>;
  is_active?: boolean;
}

async function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET: Get a single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json(
      { error: 'Invalid template ID' },
      { status: 400 }
    );
  }

  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('buzz_prompt_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update a template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json(
      { error: 'Invalid template ID' },
      { status: 400 }
    );
  }

  let body: UpdateTemplateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { name, description, template_content, placeholders, is_active } = body;

  // At least one field must be provided
  if (!name && description === undefined && !template_content && !placeholders && is_active === undefined) {
    return NextResponse.json(
      { error: 'No fields to update' },
      { status: 400 }
    );
  }

  try {
    const supabase = await getSupabaseClient();

    // Check if template exists
    const { data: existing, error: fetchError } = await supabase
      .from('buzz_prompt_templates')
      .select('id, template_type, language, version')
      .eq('id', templateId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // If activating this template, deactivate others of same type/language
    if (is_active === true) {
      await supabase
        .from('buzz_prompt_templates')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('template_type', existing.template_type)
        .is('language', existing.language)
        .neq('id', templateId)
        .eq('is_active', true);
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: authResult.user?.id,
      version: existing.version + 1,
    };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (template_content) updateData.template_content = template_content;
    if (placeholders) updateData.placeholders = placeholders;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update template
    const { data, error } = await supabase
      .from('buzz_prompt_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('[Admin Buzz] Error updating template:', error);
      return NextResponse.json(
        { error: `Failed to update template: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[Admin Buzz] Updated template ${templateId} to version ${data.version}`);

    // Clear prompt template cache so changes take effect immediately
    clearPromptTemplateCache();

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      data,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json(
      { error: 'Invalid template ID' },
      { status: 400 }
    );
  }

  try {
    const supabase = await getSupabaseClient();

    // Check if template exists
    const { data: existing, error: fetchError } = await supabase
      .from('buzz_prompt_templates')
      .select('id, name')
      .eq('id', templateId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Delete template
    const { error } = await supabase
      .from('buzz_prompt_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('[Admin Buzz] Error deleting template:', error);
      return NextResponse.json(
        { error: `Failed to delete template: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[Admin Buzz] Deleted template ${templateId}: ${existing.name}`);

    // Clear prompt template cache so deletion takes effect immediately
    clearPromptTemplateCache();

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
