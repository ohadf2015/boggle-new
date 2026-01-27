/**
 * Admin API: Get Default Prompt Template Content
 * GET /api/admin/buzz/prompt-templates/default
 *
 * Returns the current default template content for a given template type.
 * Checks database first, falls back to hardcoded defaults.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';
import {
  PROMPT_SECTIONS,
  type PromptSectionName,
} from '@/backend/services/buzz/promptSections';
import {
  SECTION_TO_TEMPLATE_TYPE,
  getPromptTemplateLoader,
} from '@/backend/services/buzz/promptTemplateLoader';

// Map from database template type back to section name
const TEMPLATE_TYPE_TO_SECTION: Record<string, PromptSectionName> = Object.fromEntries(
  Object.entries(SECTION_TO_TEMPLATE_TYPE).map(([section, type]) => [type, section as PromptSectionName])
);

// Default content for legacy template types (these don't map to PROMPT_SECTIONS)
const LEGACY_DEFAULT_TEMPLATES: Record<string, string> = {
  riddle: `You are creating a riddle challenge for LexiClash.

**Riddle Philosophy**: The best riddles work on MULTIPLE LEVELS simultaneously.

**Advanced Riddle Techniques**:
- **Paradox**: "I grow shorter as I grow older" (CANDLE)
- **Inversion**: "I have cities without houses, forests without trees" (MAP)
- **Personification**: "I have teeth but cannot bite" (COMB, ZIPPER)
- **Sensory confusion**: "I can be cracked, told, and made, but never touched" (JOKE)
- **Time paradox**: "The more you take, the more you leave behind" (STEPS)

**Input Variables**:
- Topic: {topic}
- Language: {language}
- Difficulty: {difficulty}
- Context: {context}

**Output**: Create a riddle that connects to the trending topic in an unexpected way.`,

  image: `Generate a neo-brutalist style image for LexiClash Daily Buzz.

**Style Guidelines**:
- Bold, high-contrast colors
- Geometric shapes
- Playful but edgy aesthetic
- Dark background with bright accents

**Input Variables**:
- Topic: {topic}
- Category: {category}
- Language: {language}
- Mood: {mood}

**Requirements**:
- Image should be visually striking
- Should hint at the trending topic without being too literal
- Avoid text in the image
- Target file size: under 200KB`,

  challenge_general: `You are a witty puzzle-crafter for LexiClash.

**Input Variables**:
- Trends: {trends}
- Language: {language}
- Region: {region}
- Date: {date}

**Task**: Generate 5-7 word mini-challenges using the trending topics.

**Challenge Types Available**:
1. anagram - Scrambled letters with a clue
2. fill_blank - Phrase with missing word
3. word_chain - WORD1 → ??? → WORD2
4. definition_match - Word with 4 options
5. riddle - Metaphorical clue
6. wordle_guess - 5-letter word with clue

**Output**: JSON array of challenges with type, prompt, answer, hint, difficulty.`,

  social_content: `Generate social media content for LexiClash Daily Buzz.

**Input Variables**:
- Trending Topic: {trending_topic}
- Language: {language}
- Challenge Summary: {challenge_summary}

**Platforms**:
1. X (Twitter) - Max 280 characters
2. Instagram - 150-300 chars + hashtags
3. TikTok - Max 150 chars + hashtags

**Requirements**:
- Hook readers with trending topic
- Tease challenges without spoilers
- Include call-to-action
- Write in target language`,
};

// All valid template types
const SECTION_TYPES = Object.keys(TEMPLATE_TYPE_TO_SECTION);
const LEGACY_TYPES = Object.keys(LEGACY_DEFAULT_TEMPLATES);
const ALL_TYPES = [...SECTION_TYPES, ...LEGACY_TYPES];

/**
 * GET: Get default template content for a template type
 * Query params:
 *   - type: The template type (required)
 *   - language: Optional language for language-specific defaults
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const { searchParams } = new URL(request.url);
  const templateType = searchParams.get('type');
  const language = searchParams.get('language') || undefined;

  // Validate required parameters
  if (!templateType) {
    return NextResponse.json(
      { error: 'Missing required parameter: type' },
      { status: 400 }
    );
  }

  // Validate template type
  if (!ALL_TYPES.includes(templateType)) {
    return NextResponse.json(
      { error: `Invalid template type: ${templateType}. Valid types: ${ALL_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    let content: string;
    let fromDatabase = false;

    // Check if this is a section-based template type
    if (SECTION_TYPES.includes(templateType)) {
      const sectionName = TEMPLATE_TYPE_TO_SECTION[templateType];
      const loader = getPromptTemplateLoader();
      const result = await loader.getSection(sectionName, language);
      content = result.content;
      fromDatabase = result.fromDatabase;
    } else {
      // Legacy template type - check database first, then use hardcoded default
      const loader = getPromptTemplateLoader();

      // Try to get from database (using the loader's internal method pattern)
      // For legacy types, we just return the hardcoded default
      content = LEGACY_DEFAULT_TEMPLATES[templateType] || '';
      fromDatabase = false;
    }

    return NextResponse.json({
      success: true,
      data: {
        templateType,
        content,
        fromDatabase,
        language: language || null,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error fetching default template:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/buzz/prompt-templates/default',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
