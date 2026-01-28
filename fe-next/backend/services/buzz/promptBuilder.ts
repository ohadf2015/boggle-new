/**
 * Prompt Builder for Daily Buzz
 * Constructs AI prompts for challenge generation
 *
 * EDITING PROMPTS:
 * ================
 * To edit specific sections of the AI prompt, modify the templates in:
 *   ./promptSections.ts
 *
 * Each section is a named constant (e.g., INTRO_TEMPLATE, TONE_GUIDE_TEMPLATE)
 * that can be edited independently without affecting other parts.
 *
 * Available sections:
 *   - INTRO: Opening personality/mission
 *   - TONE_GUIDE: How the AI should sound
 *   - TRENDS_CONTEXT: Today's trending topics
 *   - PRIORITY_KEYWORDS: Extracted keywords from trends
 *   - CREATIVE_PHILOSOPHY: How to create surprising connections
 *   - CHALLENGE_REQUIREMENTS: Word selection rules
 *   - CHALLENGE_TYPES: Instructions for each challenge type
 *   - OUTPUT_FORMAT: JSON structure for response
 *   - TRENDING_SUMMARY_EXAMPLES: Language-specific examples
 *   - SOCIAL_MEDIA_INSTRUCTIONS: How to create social posts
 *   - FINAL_CHECKLIST: Quality verification
 */

import { TrendingTopic } from '../serpApiClient';
import type { BuzzChallenge, PromptExample, RegenerableField } from './types';
import { getLanguageToneGuide, getLanguageWordExamples, getLanguageName, getNationality } from './languageToneGuide';
import {
  PROMPT_SECTIONS,
  fillTemplate,
  getSection,
  getSectionNames,
  type PromptSectionName,
} from './promptSections';
import { selectTrendsForChallenge, extractKeywordsFromBreakdowns } from './trendsService';
import { getPromptTemplateLoader, clearPromptTemplateCache } from './promptTemplateLoader';

/**
 * Build the improvement examples section for the AI prompt
 */
export function buildImprovementExamplesSection(examples: PromptExample[]): string {
  const formattedExamples = examples.slice(0, 15).map((ex, i) => {
    let example = `
**Example ${i + 1}** (${ex.challenge_type}):
- REJECTED: "${ex.original_prompt}" → "${ex.original_answer}"
- ISSUE: ${ex.feedback}`;

    if (ex.improved_prompt && ex.improved_answer) {
      example += `
- BETTER: "${ex.improved_prompt}" → "${ex.improved_answer}"`;
    }

    return example;
  }).join('\n');

  return `

---

## 🚫 IMPROVEMENT EXAMPLES (Learn from past mistakes)

These challenges were rejected by admins. Study the feedback and AVOID similar issues:

${formattedExamples}

**Key Takeaways**: Review the patterns above. Common issues include:
- Words that are too obscure or literary (use everyday vocabulary)
- Clues that give away the answer too easily
- Cultural references that don't translate well
- Answers that are too predictable or too obscure
- Prompts that sound robotic instead of conversational
`;
}

/**
 * Build the main AI prompt for challenge generation
 *
 * This function composes the full prompt from modular sections defined in ./promptSections.ts
 * To edit individual sections, modify the templates in that file.
 */
export function buildAIPrompt(
  trends: TrendingTopic[],
  language: string,
  region: string,
  examples: PromptExample[] = []
): string {
  // Prepare dynamic data
  const selectedTrends = selectTrendsForChallenge(trends);
  const extractedKeywords = extractKeywordsFromBreakdowns(selectedTrends, language);
  const date = new Date().toISOString().split('T')[0];

  // Format trends context
  const trendsContext = formatTrendsContext(selectedTrends);

  // Format keywords section (only if keywords exist)
  const keywordsSection = extractedKeywords.length > 0
    ? '\n---\n\n' + fillTemplate(PROMPT_SECTIONS.PRIORITY_KEYWORDS, {
        keywordsList: extractedKeywords.map(kw => `- **${kw.toUpperCase()}** (trending today)`).join('\n'),
      })
    : '';

  // Get language-specific content
  const langExamples = getLanguageWordExamples(language);
  const languageToneGuide = getLanguageToneGuide(language);
  const languageName = getLanguageName(language);
  const nationality = getNationality(language);

  // Common template values
  const templateValues = { language, region, date, languageName, nationality };

  // Build the prompt by composing sections
  const sections = [
    // Section 1: Intro
    fillTemplate(PROMPT_SECTIONS.INTRO, templateValues),

    // Section 2: Tone Guide
    fillTemplate(PROMPT_SECTIONS.TONE_GUIDE, { languageToneGuide }),

    // Section 3: Trends Context
    fillTemplate(PROMPT_SECTIONS.TRENDS_CONTEXT, { trendsContext }),

    // Section 4: Priority Keywords (conditional)
    keywordsSection,

    // Section 5: Creative Philosophy
    PROMPT_SECTIONS.CREATIVE_PHILOSOPHY,

    // Section 6: Challenge Requirements
    fillTemplate(PROMPT_SECTIONS.CHALLENGE_REQUIREMENTS, { langExamples }),

    // Section 7: Challenge Types
    PROMPT_SECTIONS.CHALLENGE_TYPES,

    // Section 8: Output Format
    fillTemplate(PROMPT_SECTIONS.OUTPUT_FORMAT, templateValues),

    // Section 9: Trending Summary Examples
    PROMPT_SECTIONS.TRENDING_SUMMARY_EXAMPLES,

    // Section 10: Social Media Instructions
    fillTemplate(PROMPT_SECTIONS.SOCIAL_MEDIA_INSTRUCTIONS, templateValues),

    // Section 11: Final Checklist
    fillTemplate(PROMPT_SECTIONS.FINAL_CHECKLIST, templateValues),
  ];

  // Join sections with dividers
  const basePrompt = sections
    .filter(section => section.trim().length > 0) // Remove empty sections
    .join('\n\n---\n\n');

  // Add improvement examples if provided
  if (examples.length > 0) {
    return basePrompt + buildImprovementExamplesSection(examples);
  }

  return basePrompt;
}

/**
 * Format trends into display context
 * Enhanced to showcase breakdown words as potential answer candidates
 */
function formatTrendsContext(trends: TrendingTopic[]): string {
  return trends
    .map((trend, idx) => {
      const breakdownItems = trend.trend_breakdown ?? [];
      const categoryInfo = trend.categories?.map(c => c.name).join(', ') || 'General';
      const volumeDisplay = trend.search_volume
        ? `${(trend.search_volume / 1000).toFixed(0)}K+`
        : 'prominent';
      const riseIndicator = trend.increase_percentage
        ? ` 🔥 RISING +${trend.increase_percentage}%`
        : '';

      // Build breakdown section with emphasis on usable words
      let breakdownSection = '';
      if (breakdownItems.length > 0) {
        breakdownSection = `\n   **Related words (USE as answers!)**: ${breakdownItems.slice(0, 8).join(', ')}`;
      }

      return `${idx + 1}. "${trend.query}" - ${volumeDisplay} searches${riseIndicator}
   Category: ${categoryInfo}${breakdownSection}`;
    })
    .join('\n\n');
}

// Re-export prompt section utilities for external use
export { PROMPT_SECTIONS, getSection, getSectionNames, fillTemplate };
export type { PromptSectionName };

// Re-export template loader utilities
export { getPromptTemplateLoader, clearPromptTemplateCache };

/**
 * Build the main AI prompt with database template support
 *
 * This async version loads templates from the database, allowing admins to
 * edit prompts without code changes. Falls back to hardcoded templates if
 * database templates are not available.
 *
 * @param trends - Trending topics to include
 * @param language - Target language code
 * @param region - Target region code
 * @param examples - Optional improvement examples from past rejections
 * @returns Object with prompt string and metadata about which sections came from database
 */
export async function buildAIPromptAsync(
  trends: TrendingTopic[],
  language: string,
  region: string,
  examples: PromptExample[] = []
): Promise<{ prompt: string; sectionsFromDatabase: string[] }> {
  const loader = getPromptTemplateLoader();
  const sectionsFromDatabase: string[] = [];

  // Prepare dynamic data
  const selectedTrends = selectTrendsForChallenge(trends);
  const extractedKeywords = extractKeywordsFromBreakdowns(selectedTrends, language);
  const date = new Date().toISOString().split('T')[0];

  // Format trends context
  const trendsContext = formatTrendsContext(selectedTrends);

  // Get language-specific content
  const langExamples = getLanguageWordExamples(language);
  const languageToneGuide = getLanguageToneGuide(language);
  const languageName = getLanguageName(language);
  const nationality = getNationality(language);

  // Common template values
  const templateValues = { language, region, date, languageName, nationality };

  // Helper to get section with tracking
  const getSectionWithTracking = async (
    name: PromptSectionName,
    values: Record<string, string>
  ): Promise<string> => {
    const result = await loader.getSection(name, language);
    if (result.fromDatabase) {
      sectionsFromDatabase.push(name);
    }
    return fillTemplate(result.content, values);
  };

  // Build sections in parallel for performance
  const [
    introSection,
    toneGuideSection,
    trendsContextSection,
    creativePhilosophySection,
    challengeRequirementsSection,
    challengeTypesSection,
    outputFormatSection,
    trendingSummaryExamplesSection,
    socialMediaInstructionsSection,
    finalChecklistSection,
  ] = await Promise.all([
    getSectionWithTracking('INTRO', templateValues),
    getSectionWithTracking('TONE_GUIDE', { languageToneGuide }),
    getSectionWithTracking('TRENDS_CONTEXT', { trendsContext }),
    getSectionWithTracking('CREATIVE_PHILOSOPHY', {}),
    getSectionWithTracking('CHALLENGE_REQUIREMENTS', { langExamples }),
    getSectionWithTracking('CHALLENGE_TYPES', {}),
    getSectionWithTracking('OUTPUT_FORMAT', templateValues),
    getSectionWithTracking('TRENDING_SUMMARY_EXAMPLES', {}),
    getSectionWithTracking('SOCIAL_MEDIA_INSTRUCTIONS', templateValues),
    getSectionWithTracking('FINAL_CHECKLIST', templateValues),
  ]);

  // Log OUTPUT_FORMAT section for debugging
  console.log(`[BUZZ] OUTPUT_FORMAT section length: ${outputFormatSection.length} chars`);
  if (!outputFormatSection.includes('"challenges"') || !outputFormatSection.includes('"trending_context"')) {
    console.error('[BUZZ] WARNING: OUTPUT_FORMAT may be missing required fields!');
    console.error('[BUZZ] OUTPUT_FORMAT preview:', outputFormatSection.substring(0, 500));
  }

  // Handle priority keywords section (conditional)
  let priorityKeywordsSection = '';
  if (extractedKeywords.length > 0) {
    const keywordsResult = await loader.getSection('PRIORITY_KEYWORDS', language);
    if (keywordsResult.fromDatabase) {
      sectionsFromDatabase.push('PRIORITY_KEYWORDS');
    }
    priorityKeywordsSection = '\n---\n\n' + fillTemplate(keywordsResult.content, {
      keywordsList: extractedKeywords.map(kw => `- **${kw.toUpperCase()}** (trending today)`).join('\n'),
    });
  }

  // Build the prompt by composing sections
  const sections = [
    introSection,
    toneGuideSection,
    trendsContextSection,
    priorityKeywordsSection,
    creativePhilosophySection,
    challengeRequirementsSection,
    challengeTypesSection,
    outputFormatSection,
    trendingSummaryExamplesSection,
    socialMediaInstructionsSection,
    finalChecklistSection,
  ];

  // Join sections with dividers
  const basePrompt = sections
    .filter(section => section.trim().length > 0)
    .join('\n\n---\n\n');

  // Add improvement examples if provided
  const finalPrompt = examples.length > 0
    ? basePrompt + buildImprovementExamplesSection(examples)
    : basePrompt;

  return {
    prompt: finalPrompt,
    sectionsFromDatabase,
  };
}

/**
 * Build a focused prompt for regenerating a single challenge
 */
export function buildSingleChallengePrompt(
  original: BuzzChallenge,
  feedback: string,
  language: string,
  trends: TrendingTopic[]
): string {
  const trendContext = trends
    .slice(0, 5)
    .map(t => `- ${t.query}`)
    .join('\n');

  const languageToneGuide = getLanguageToneGuide(language);

  return `You need to create a REPLACEMENT ${original.type} challenge for LexiClash, a word game.

**Language**: ${language}
**Challenge Type**: ${original.type}

---

## TONE GUIDE
${languageToneGuide}

---

## ORIGINAL CHALLENGE (REJECTED)
- Type: ${original.type}
- Trend: ${original.trend_topic}
- Prompt: "${original.prompt}"
- Answer: "${original.answer}"
- Hint: "${original.hint || 'None'}"
- Difficulty: ${original.difficulty}

---

## ADMIN FEEDBACK (WHAT WAS WRONG)
${feedback}

---

## AVAILABLE TRENDS
${trendContext}

---

## YOUR TASK
Generate ONE replacement challenge that:
1. **Addresses the feedback** - Fix the specific issue mentioned above
2. **Same type** - Must be "${original.type}"
3. **Can use same or different trend** - Pick whichever makes a better challenge
4. **Common dictionary word** - 3-12 letters (5 for wordle_guess), known by 90% of people
5. **Natural language** - Sound human, not robotic

---

## OUTPUT FORMAT (JSON only, no markdown)
{
  "type": "${original.type}",
  "trend_topic": "the trend you're using",
  "prompt": "the creative clue",
  "answer": "WORD_IN_CAPS",
  "hint": "a helpful nudge",
  "difficulty": "easy|medium|hard",
  "trending_context": "1 sentence: why this matters today"
}

Return ONLY the JSON object.`;
}

/**
 * Build a specialized prompt for partial regeneration
 */
export function buildPartialChallengePrompt(
  original: BuzzChallenge,
  feedback: string,
  language: string,
  fieldsToRegenerate: RegenerableField[],
  trends: TrendingTopic[],
  examples: PromptExample[]
): string {
  const isFullRegeneration = fieldsToRegenerate.includes('all');
  const trendContext = trends
    .slice(0, 5)
    .map(t => `- ${t.query}`)
    .join('\n');

  const languageToneGuide = getLanguageToneGuide(language);

  const examplesSection = examples.length > 0
    ? `
---

## LEARN FROM PAST MISTAKES (Do NOT repeat these)
${examples.slice(0, 10).map((ex, i) => `
### Bad Example ${i + 1} (${ex.challenge_type})
- Prompt: "${ex.original_prompt}"
- Answer: "${ex.original_answer}"
- Problem: ${ex.feedback}${ex.improved_prompt ? `\n- Better prompt: "${ex.improved_prompt}"` : ''}${ex.improved_answer ? `\n- Better answer: "${ex.improved_answer}"` : ''}
`).join('')}
`
    : '';

  let fieldInstructions: string;
  let preserveInstructions: string;

  if (isFullRegeneration) {
    fieldInstructions = `Generate a completely NEW replacement challenge that addresses the feedback.`;
    preserveInstructions = '';
  } else {
    const fieldsToChange = fieldsToRegenerate.join(', ');

    fieldInstructions = `Generate ONLY new values for: **${fieldsToChange}**`;
    preserveInstructions = `
**IMPORTANT - PRESERVE EXACTLY (copy verbatim):**
${!fieldsToRegenerate.includes('prompt') ? `- prompt: "${original.prompt}"` : ''}
${!fieldsToRegenerate.includes('answer') ? `- answer: "${original.answer}"` : ''}
${!fieldsToRegenerate.includes('hint') && original.hint ? `- hint: "${original.hint}"` : ''}
${original.options && !fieldsToRegenerate.includes('options') ? `- options: ${JSON.stringify(original.options)}` : ''}
- type: "${original.type}" (always keep)
- trend_topic: "${original.trend_topic}" (always keep)
- difficulty: "${original.difficulty}" (always keep)
- trending_context: "${original.trending_context}" (always keep)
`;
  }

  return `You need to ${isFullRegeneration ? 'create a REPLACEMENT' : 'PARTIALLY UPDATE a'} ${original.type} challenge for LexiClash, a word game.

**Language**: ${language}
**Challenge Type**: ${original.type}

---

## TONE GUIDE
${languageToneGuide}

---

## CURRENT CHALLENGE${isFullRegeneration ? ' (REJECTED - replace entirely)' : ' (update specific fields only)'}
- Type: ${original.type}
- Trend: ${original.trend_topic}
- Prompt: "${original.prompt}"
- Answer: "${original.answer}"
- Hint: "${original.hint || 'None'}"
- Difficulty: ${original.difficulty}
- Trending Context: "${original.trending_context}"
${original.options ? `- Options: ${JSON.stringify(original.options)}` : ''}

---

## ADMIN FEEDBACK
${feedback}
${preserveInstructions}
---

## AVAILABLE TRENDS
${trendContext}
${examplesSection}
---

## YOUR TASK
${fieldInstructions}

**Requirements:**
1. **Address the feedback** - Fix the specific issue mentioned above
2. **Same type** - Must be "${original.type}"
3. **Common dictionary word** - 3-12 letters (5 for wordle_guess), known by 90% of people
4. **Natural language** - Sound human, not robotic

---

## OUTPUT FORMAT (JSON only, no markdown)
{
  "type": "${original.type}",
  "trend_topic": "${original.trend_topic}",
  "prompt": "${isFullRegeneration || fieldsToRegenerate.includes('prompt') ? 'your new creative clue' : original.prompt}",
  "answer": "${isFullRegeneration || fieldsToRegenerate.includes('answer') ? 'NEW_ANSWER_IN_CAPS' : original.answer}",
  "hint": "${isFullRegeneration || fieldsToRegenerate.includes('hint') ? 'your new helpful nudge' : (original.hint || '')}",
  "difficulty": "${original.difficulty}",
  "trending_context": "${original.trending_context}"${original.options ? `,
  "options": ${isFullRegeneration || fieldsToRegenerate.includes('options') ? '["new", "options", "array"]' : JSON.stringify(original.options)}` : ''}
}

Return ONLY the JSON object.`;
}
