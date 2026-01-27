/**
 * Admin API: Manage Buzz Prompt Templates
 * GET /api/admin/buzz/prompt-templates - List all templates
 * POST /api/admin/buzz/prompt-templates - Create new template
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';
import { createClient } from '@supabase/supabase-js';
import { clearPromptTemplateCache } from '@/backend/services/buzz/promptTemplateLoader';

// Section-based template types (new modular system)
const SECTION_TEMPLATE_TYPES = [
  'section_intro',
  'section_tone_guide',
  'section_trends_context',
  'section_priority_keywords',
  'section_creative_philosophy',
  'section_challenge_requirements',
  'section_challenge_types',
  'section_output_format',
  'section_trending_summary_examples',
  'section_social_media_instructions',
  'section_final_checklist',
] as const;

// Legacy template types (kept for backward compatibility)
const LEGACY_TEMPLATE_TYPES = ['riddle', 'image', 'challenge_general', 'social_content'] as const;

// All valid template types
const TEMPLATE_TYPES = [...SECTION_TEMPLATE_TYPES, ...LEGACY_TEMPLATE_TYPES] as const;
const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;

type TemplateType = typeof TEMPLATE_TYPES[number];
type Language = typeof SUPPORTED_LANGUAGES[number] | null;

interface PromptTemplate {
  id: number;
  template_type: TemplateType;
  language: Language;
  name: string;
  description: string | null;
  template_content: string;
  placeholders: Array<{ name: string; description: string }> | null;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateTemplateBody {
  template_type: TemplateType;
  language?: Language;
  name: string;
  description?: string;
  template_content: string;
  placeholders?: Array<{ name: string; description: string }>;
}

async function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET: List all prompt templates
 * Query params:
 *   - type: Filter by template type
 *   - language: Filter by language
 *   - active_only: Only return active templates (default: true)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const supabase = await getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const languageFilter = searchParams.get('language');
    const activeOnly = searchParams.get('active_only') !== 'false';

    let query = supabase
      .from('buzz_prompt_templates')
      .select('*')
      .order('template_type')
      .order('language', { nullsFirst: true })
      .order('created_at', { ascending: false });

    if (typeFilter) {
      query = query.eq('template_type', typeFilter);
    }

    if (languageFilter) {
      if (languageFilter === 'null' || languageFilter === '') {
        query = query.is('language', null);
      } else {
        query = query.eq('language', languageFilter);
      }
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('[Admin Buzz] Error fetching templates:', errorMessage);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as PromptTemplate[],
      count: data?.length ?? 0,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/buzz/prompt-templates',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new prompt template
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  let body: CreateTemplateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Validate required fields
  const { template_type, language, name, description, template_content, placeholders } = body;

  if (!template_type || !name || !template_content) {
    return NextResponse.json(
      { error: 'Missing required fields: template_type, name, template_content' },
      { status: 400 }
    );
  }

  // Validate template_type
  if (!TEMPLATE_TYPES.includes(template_type)) {
    return NextResponse.json(
      { error: `Invalid template_type. Must be one of: ${TEMPLATE_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  // Validate language if provided
  if (language && !SUPPORTED_LANGUAGES.includes(language as typeof SUPPORTED_LANGUAGES[number])) {
    return NextResponse.json(
      { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')} or null` },
      { status: 400 }
    );
  }

  try {
    const supabase = await getSupabaseClient();

    // Deactivate existing active template of same type/language
    await supabase
      .from('buzz_prompt_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('template_type', template_type)
      .is('language', language ?? null)
      .eq('is_active', true);

    // Get the user ID from the auth result
    const userId = authResult.user?.id;

    // Insert new template
    const { data, error } = await supabase
      .from('buzz_prompt_templates')
      .insert({
        template_type,
        language: language ?? null,
        name,
        description: description ?? null,
        template_content,
        placeholders: placeholders ?? null,
        is_active: true,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('[Admin Buzz] Error creating template:', errorMessage);
      return NextResponse.json(
        { error: `Failed to create template: ${errorMessage}` },
        { status: 500 }
      );
    }

    console.log(`[Admin Buzz] Created new ${template_type} template: ${name}`);

    // Clear prompt template cache so new template is available immediately
    clearPromptTemplateCache();

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      data,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/buzz/prompt-templates',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
