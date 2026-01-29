/**
 * Admin API: Preview Assembled Prompt
 * GET /api/admin/buzz/sections/preview - Returns fully assembled prompt with sample data
 *
 * Shows how all 11 sections combine into the final AI prompt,
 * with placeholders filled using sample data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';
import {
  getPromptTemplateLoader,
  SECTION_TO_TEMPLATE_TYPE,
} from '@/backend/services/buzz/promptTemplateLoader';
import { PromptSectionName, fillTemplate } from '@/backend/services/buzz/promptSections';
import type { SectionType, PromptPreviewData } from '@/components/admin/buzz/types';
import {
  SECTION_METADATA,
  SAMPLE_PREVIEW_DATA,
  getSortedSections,
} from '@/components/admin/buzz/section-editor/constants';

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;

// Language-specific sample data overrides
const LANGUAGE_SAMPLE_DATA: Record<string, Partial<typeof SAMPLE_PREVIEW_DATA>> = {
  he: {
    language: 'he',
    languageName: 'Hebrew',
    region: 'Israel',
    nationality: 'Israeli',
    languageToneGuide: `**Hebrew Tone Guide**:
- השתמש בעברית יומיומית ולא ספרותית
- אפשר להשתמש בסלנג מקובל
- הימנע ממילים לועזיות כשיש חלופה עברית טבעית`,
  },
  sv: {
    language: 'sv',
    languageName: 'Swedish',
    region: 'Sweden',
    nationality: 'Swedish',
    languageToneGuide: `**Swedish Tone Guide**:
- Keep it lagom - not too formal, not too casual
- Use common Swedish expressions
- Reference Swedish culture when relevant`,
  },
  ja: {
    language: 'ja',
    languageName: 'Japanese',
    region: 'Japan',
    nationality: 'Japanese',
    languageToneGuide: `**Japanese Tone Guide**:
- Use casual polite form (です/ます)
- Include appropriate emoji usage
- Reference Japanese pop culture when relevant`,
  },
  es: {
    language: 'es',
    languageName: 'Spanish',
    region: 'Spain',
    nationality: 'Spanish',
    languageToneGuide: `**Spanish Tone Guide**:
- Use neutral Spanish (understood across Latin America and Spain)
- Be playful but not overly colloquial
- Avoid region-specific slang`,
  },
};

/**
 * Convert database section type to backend section name
 */
function templateTypeToSectionName(templateType: SectionType): PromptSectionName {
  for (const [sectionName, dbType] of Object.entries(SECTION_TO_TEMPLATE_TYPE)) {
    if (dbType === templateType) {
      return sectionName as PromptSectionName;
    }
  }
  throw new Error(`Unknown template type: ${templateType}`);
}

/**
 * GET: Get full prompt preview with all sections assembled
 *
 * Query params:
 *   - language: Language for sample data (default: en)
 *
 * Response:
 *   - assembledPrompt: The complete prompt with sample data filled in
 *   - totalCharacters: Character count of the assembled prompt
 *   - sections: Breakdown of each section with its content
 *   - sampleData: The sample data used for filling placeholders
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'en';

    // Validate language
    if (!SUPPORTED_LANGUAGES.includes(language as (typeof SUPPORTED_LANGUAGES)[number])) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get sample data for the requested language
    const languageOverrides = LANGUAGE_SAMPLE_DATA[language] || {};
    const sampleData: Record<string, string> = {
      ...SAMPLE_PREVIEW_DATA,
      ...(Object.fromEntries(
        Object.entries(languageOverrides).filter(([_, v]) => v !== undefined)
      ) as Record<string, string>),
    };

    // Load all sections using the template loader
    const loader = getPromptTemplateLoader();
    const sortedMetadata = getSortedSections();

    // Build section details
    const sectionDetails: PromptPreviewData['sections'] = [];
    const assembledParts: string[] = [];

    for (const metadata of sortedMetadata) {
      const sectionName = templateTypeToSectionName(metadata.sectionType);
      const { content, fromDatabase, version } = await loader.getSection(sectionName, language);

      // Fill placeholders with sample data
      const filledContent = fillTemplate(content, sampleData);

      sectionDetails.push({
        name: metadata.sectionType,
        displayName: metadata.displayName,
        content: filledContent,
        fromDatabase,
      });

      assembledParts.push(filledContent);
    }

    // Assemble the full prompt with section separators
    const assembledPrompt = assembledParts.join('\n\n---\n\n');

    const responseData: PromptPreviewData = {
      assembledPrompt,
      totalCharacters: assembledPrompt.length,
      sections: sectionDetails,
      sampleData,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      language,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error generating preview:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/buzz/sections/preview',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
