/**
 * Admin API: Get Status of All Prompt Sections
 * GET /api/admin/buzz/sections/status - Returns status of all 11 sections
 *
 * For each section, indicates whether it uses a custom DB template
 * or falls back to the hardcoded default.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';
import { createClient } from '@supabase/supabase-js';
import type { SectionType, SectionStatus } from '@/components/admin/buzz/types';
import {
  SECTION_METADATA,
  getSortedSections,
} from '@/components/admin/buzz/section-editor/constants';

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;

interface DatabaseTemplate {
  id: number;
  template_type: string;
  language: string | null;
  version: number;
  is_active: boolean;
  updated_at: string;
}

async function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET: Get status of all 11 prompt sections
 *
 * Query params:
 *   - language: Optional language filter (returns status for that language)
 *
 * Response:
 *   - sections: Array of SectionStatus objects with customization info
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
    const languageFilter = searchParams.get('language');

    // Validate language if provided
    if (
      languageFilter &&
      !SUPPORTED_LANGUAGES.includes(languageFilter as (typeof SUPPORTED_LANGUAGES)[number])
    ) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch all active section templates from database
    let query = supabase
      .from('buzz_prompt_templates')
      .select('id, template_type, language, version, is_active, updated_at')
      .like('template_type', 'section_%')
      .eq('is_active', true);

    // If language filter is provided, get both language-specific and default templates
    // Otherwise just get default templates
    if (languageFilter) {
      query = query.or(`language.eq.${languageFilter},language.is.null`);
    }

    const { data: dbTemplates, error } = await query;

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('[Admin Buzz] Error fetching section status:', errorMessage);
      return NextResponse.json(
        { error: 'Failed to fetch section status' },
        { status: 500 }
      );
    }

    // Create a map of template_type -> DatabaseTemplate for quick lookup
    const templateMap = new Map<string, DatabaseTemplate>();
    for (const template of (dbTemplates || []) as DatabaseTemplate[]) {
      const key = languageFilter
        ? `${template.template_type}:${template.language || 'default'}`
        : template.template_type;

      // Prefer language-specific template over default
      const existing = templateMap.get(template.template_type);
      if (!existing || (languageFilter && template.language === languageFilter)) {
        templateMap.set(template.template_type, template);
      }
    }

    // Build status for each section
    const sortedSections = getSortedSections();
    const sections: SectionStatus[] = sortedSections.map((metadata) => {
      const dbTemplate = templateMap.get(metadata.sectionType);

      return {
        sectionType: metadata.sectionType,
        displayName: metadata.displayName,
        description: metadata.description,
        icon: metadata.icon,
        isCustomized: !!dbTemplate,
        version: dbTemplate?.version,
        lastUpdated: dbTemplate?.updated_at,
        placeholders: metadata.placeholders,
      };
    });

    // Count customized vs default
    const customizedCount = sections.filter((s) => s.isCustomized).length;
    const defaultCount = sections.filter((s) => !s.isCustomized).length;

    return NextResponse.json({
      success: true,
      data: {
        sections,
        summary: {
          total: sections.length,
          customized: customizedCount,
          default: defaultCount,
        },
        language: languageFilter || null,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/buzz/sections/status',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
