/**
 * Admin API: Individual Section CRUD
 * GET /api/admin/buzz/sections/[sectionType] - Get section content
 * PUT /api/admin/buzz/sections/[sectionType] - Update section (create new version)
 * DELETE /api/admin/buzz/sections/[sectionType] - Reset to default (deactivate custom)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';
import { createClient } from '@supabase/supabase-js';
import { clearPromptTemplateCache } from '@/backend/services/buzz/promptTemplateLoader';
import { PROMPT_SECTIONS, PromptSectionName } from '@/backend/services/buzz/promptSections';
import { SECTION_TYPES, type SectionType, type SectionUpdateRequest } from '@/components/admin/buzz/types';
import {
  SECTION_METADATA,
  TEMPLATE_TYPE_TO_SECTION,
} from '@/components/admin/buzz/section-editor/constants';

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;

interface RouteContext {
  params: Promise<{ sectionType: string }>;
}

async function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Validate section type
 */
function isValidSectionType(sectionType: string): sectionType is SectionType {
  return SECTION_TYPES.includes(sectionType as SectionType);
}

/**
 * GET: Get section content (DB custom or hardcoded default)
 *
 * Query params:
 *   - language: Optional language filter
 *
 * Response:
 *   - content: The template content
 *   - fromDatabase: Whether this is a custom template
 *   - defaultContent: The hardcoded default for comparison
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const params = await context.params;
    const { sectionType } = params;

    // Validate section type
    if (!isValidSectionType(sectionType)) {
      return NextResponse.json(
        { error: `Invalid section type: ${sectionType}` },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language');

    // Validate language if provided
    if (
      language &&
      !SUPPORTED_LANGUAGES.includes(language as (typeof SUPPORTED_LANGUAGES)[number])
    ) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();
    const metadata = SECTION_METADATA[sectionType];
    const backendSectionName = TEMPLATE_TYPE_TO_SECTION[sectionType] as PromptSectionName;
    const defaultContent = PROMPT_SECTIONS[backendSectionName];

    // Try to fetch from database
    let query = supabase
      .from('buzz_prompt_templates')
      .select('*')
      .eq('template_type', sectionType)
      .eq('is_active', true);

    // If language specified, get that specific one
    if (language) {
      query = query.eq('language', language);
    } else {
      query = query.is('language', null);
    }

    const { data: dbTemplate, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('[Admin Buzz] Error fetching section:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        sectionType,
        displayName: metadata.displayName,
        description: metadata.description,
        icon: metadata.icon,
        placeholders: metadata.placeholders,
        content: dbTemplate?.template_content || defaultContent,
        defaultContent,
        fromDatabase: !!dbTemplate,
        version: dbTemplate?.version,
        lastUpdated: dbTemplate?.updated_at,
        language: language || null,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/buzz/sections/[sectionType]',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * PUT: Update section content (creates new version, deactivates old)
 *
 * Body:
 *   - content: New template content
 *   - language: Optional language (null for default)
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const params = await context.params;
    const { sectionType } = params;

    // Validate section type
    if (!isValidSectionType(sectionType)) {
      return NextResponse.json(
        { error: `Invalid section type: ${sectionType}` },
        { status: 400 }
      );
    }

    let body: SectionUpdateRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { content, language } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: content' },
        { status: 400 }
      );
    }

    // Validate language if provided
    if (
      language &&
      !SUPPORTED_LANGUAGES.includes(language as (typeof SUPPORTED_LANGUAGES)[number])
    ) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();
    const metadata = SECTION_METADATA[sectionType];
    const userId = authResult.user?.id;

    // Get current version number
    const { data: currentTemplate } = await supabase
      .from('buzz_prompt_templates')
      .select('version')
      .eq('template_type', sectionType)
      .is('language', language ?? null)
      .eq('is_active', true)
      .single();

    const nextVersion = (currentTemplate?.version || 0) + 1;

    // Deactivate existing active template
    await supabase
      .from('buzz_prompt_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('template_type', sectionType)
      .is('language', language ?? null)
      .eq('is_active', true);

    // Insert new template version
    const { data: newTemplate, error } = await supabase
      .from('buzz_prompt_templates')
      .insert({
        template_type: sectionType,
        language: language ?? null,
        name: `${metadata.displayName} v${nextVersion}`,
        description: metadata.description,
        template_content: content,
        placeholders: metadata.placeholders,
        version: nextVersion,
        is_active: true,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[Admin Buzz] Error updating section:', error);
      return NextResponse.json(
        { error: `Failed to update section: ${error.message}` },
        { status: 500 }
      );
    }

    // Clear cache so changes take effect immediately
    clearPromptTemplateCache();

    console.log(
      `[Admin Buzz] Updated section ${sectionType} to v${nextVersion}` +
        (language ? ` (${language})` : '')
    );

    return NextResponse.json({
      success: true,
      message: 'Section updated successfully',
      data: {
        sectionType,
        version: nextVersion,
        language: language ?? null,
        updatedAt: newTemplate.updated_at,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/buzz/sections/[sectionType]',
      { method: 'PUT', statusCode: 500 }
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE: Reset section to default (deactivates custom template)
 *
 * Query params:
 *   - language: Optional language filter
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const params = await context.params;
    const { sectionType } = params;

    // Validate section type
    if (!isValidSectionType(sectionType)) {
      return NextResponse.json(
        { error: `Invalid section type: ${sectionType}` },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language');

    // Validate language if provided
    if (
      language &&
      !SUPPORTED_LANGUAGES.includes(language as (typeof SUPPORTED_LANGUAGES)[number])
    ) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseClient();

    // Deactivate custom template (will fall back to hardcoded default)
    let query = supabase
      .from('buzz_prompt_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('template_type', sectionType)
      .eq('is_active', true);

    if (language) {
      query = query.eq('language', language);
    } else {
      query = query.is('language', null);
    }

    const { error, count } = await query;

    if (error) {
      console.error('[Admin Buzz] Error resetting section:', error);
      return NextResponse.json(
        { error: `Failed to reset section: ${error.message}` },
        { status: 500 }
      );
    }

    // Clear cache so default takes effect immediately
    clearPromptTemplateCache();

    console.log(
      `[Admin Buzz] Reset section ${sectionType} to default` +
        (language ? ` (${language})` : '')
    );

    return NextResponse.json({
      success: true,
      message:
        count && count > 0
          ? 'Section reset to default successfully'
          : 'Section was already using default',
      data: {
        sectionType,
        language: language ?? null,
        deactivatedCount: count ?? 0,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/buzz/sections/[sectionType]',
      { method: 'DELETE', statusCode: 500 }
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
