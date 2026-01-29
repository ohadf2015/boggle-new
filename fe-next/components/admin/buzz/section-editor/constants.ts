/**
 * Section Editor Constants
 *
 * Metadata for all 11 prompt sections including display names,
 * descriptions, icons, and placeholder definitions.
 */

import type { SectionType, TemplatePlaceholder } from '../types';

export interface SectionMetadata {
  sectionType: SectionType;
  displayName: string;
  description: string;
  icon: string;
  /** Order in which sections appear in the assembled prompt */
  order: number;
  /** Placeholders used in this section's template */
  placeholders: TemplatePlaceholder[];
  /** Whether this section is critical for prompt quality */
  isCritical: boolean;
}

/**
 * Metadata for all 11 prompt sections
 *
 * Each section can be customized independently in the admin panel.
 * The order determines how sections are assembled in the final prompt.
 */
export const SECTION_METADATA: Record<SectionType, SectionMetadata> = {
  section_intro: {
    sectionType: 'section_intro',
    displayName: 'Introduction',
    description: 'Sets the AI persona and mission. Defines the witty, clever puzzle-crafter personality.',
    icon: '🎭',
    order: 1,
    isCritical: true,
    placeholders: [
      { name: 'language', description: 'Target language code (en, he, sv, ja)' },
      { name: 'region', description: 'Geographic region for the content' },
      { name: 'date', description: 'Date for the daily buzz (YYYY-MM-DD)' },
    ],
  },

  section_tone_guide: {
    sectionType: 'section_tone_guide',
    displayName: 'Tone & Voice',
    description: 'Anti-robotic rules and voice guidelines. Ensures natural, human-like output.',
    icon: '🗣️',
    order: 2,
    isCritical: true,
    placeholders: [
      { name: 'languageToneGuide', description: 'Language-specific tone instructions' },
    ],
  },

  section_trends_context: {
    sectionType: 'section_trends_context',
    displayName: 'Trending Topics',
    description: 'Today\'s trending topics with rise velocity indicators.',
    icon: '📈',
    order: 3,
    isCritical: true,
    placeholders: [
      { name: 'trendsContext', description: 'Formatted list of trending topics with metadata' },
    ],
  },

  section_priority_keywords: {
    sectionType: 'section_priority_keywords',
    displayName: 'Priority Keywords',
    description: 'Keywords extracted from trends that should be prioritized as answers.',
    icon: '🔑',
    order: 4,
    isCritical: false,
    placeholders: [
      { name: 'keywordsList', description: 'List of priority keywords from trend breakdowns' },
    ],
  },

  section_creative_philosophy: {
    sectionType: 'section_creative_philosophy',
    displayName: 'Creative Philosophy',
    description: 'Guidelines for creating surprising connections. Teaches lateral thinking techniques.',
    icon: '💡',
    order: 5,
    isCritical: true,
    placeholders: [],
  },

  section_challenge_requirements: {
    sectionType: 'section_challenge_requirements',
    displayName: 'Challenge Requirements',
    description: 'Word selection rules and constraints. Defines what makes a valid answer.',
    icon: '📋',
    order: 6,
    isCritical: true,
    placeholders: [
      { name: 'langExamples', description: 'Language-specific word examples' },
    ],
  },

  section_challenge_types: {
    sectionType: 'section_challenge_types',
    displayName: 'Challenge Types',
    description: 'Detailed instructions for each challenge type (anagram, riddle, wordle, etc.).',
    icon: '🎮',
    order: 7,
    isCritical: true,
    placeholders: [],
  },

  section_output_format: {
    sectionType: 'section_output_format',
    displayName: 'Output Format',
    description: 'JSON structure specification for the AI response.',
    icon: '📤',
    order: 8,
    isCritical: true,
    placeholders: [
      { name: 'date', description: 'Date for the daily buzz (YYYY-MM-DD)' },
      { name: 'language', description: 'Target language code' },
    ],
  },

  section_trending_summary_examples: {
    sectionType: 'section_trending_summary_examples',
    displayName: 'Summary Examples',
    description: 'Language-specific examples for the trending_summary field.',
    icon: '📝',
    order: 9,
    isCritical: false,
    placeholders: [],
  },

  section_social_media_instructions: {
    sectionType: 'section_social_media_instructions',
    displayName: 'Social Media',
    description: 'Instructions for generating social media posts (X, Instagram, TikTok).',
    icon: '📱',
    order: 10,
    isCritical: false,
    placeholders: [
      { name: 'language', description: 'Target language code' },
      { name: 'languageName', description: 'Full language name (e.g., "English")' },
    ],
  },

  section_final_checklist: {
    sectionType: 'section_final_checklist',
    displayName: 'Final Checklist',
    description: 'Quality verification checklist before output. Ensures all requirements are met.',
    icon: '✅',
    order: 11,
    isCritical: true,
    placeholders: [
      { name: 'nationality', description: 'Nationality for native speaker test' },
      { name: 'language', description: 'Target language code' },
    ],
  },
};

/**
 * Get sections sorted by their order
 */
export function getSortedSections(): SectionMetadata[] {
  return Object.values(SECTION_METADATA).sort((a, b) => a.order - b.order);
}

/**
 * Get only critical sections
 */
export function getCriticalSections(): SectionMetadata[] {
  return getSortedSections().filter((s) => s.isCritical);
}

/**
 * Map from backend section name to database template type
 * (mirrors the mapping in promptTemplateLoader.ts)
 */
export const SECTION_TO_TEMPLATE_TYPE: Record<string, SectionType> = {
  INTRO: 'section_intro',
  TONE_GUIDE: 'section_tone_guide',
  TRENDS_CONTEXT: 'section_trends_context',
  PRIORITY_KEYWORDS: 'section_priority_keywords',
  CREATIVE_PHILOSOPHY: 'section_creative_philosophy',
  CHALLENGE_REQUIREMENTS: 'section_challenge_requirements',
  CHALLENGE_TYPES: 'section_challenge_types',
  OUTPUT_FORMAT: 'section_output_format',
  TRENDING_SUMMARY_EXAMPLES: 'section_trending_summary_examples',
  SOCIAL_MEDIA_INSTRUCTIONS: 'section_social_media_instructions',
  FINAL_CHECKLIST: 'section_final_checklist',
};

/**
 * Reverse mapping from database type to backend section name
 */
export const TEMPLATE_TYPE_TO_SECTION: Record<SectionType, string> = {
  section_intro: 'INTRO',
  section_tone_guide: 'TONE_GUIDE',
  section_trends_context: 'TRENDS_CONTEXT',
  section_priority_keywords: 'PRIORITY_KEYWORDS',
  section_creative_philosophy: 'CREATIVE_PHILOSOPHY',
  section_challenge_requirements: 'CHALLENGE_REQUIREMENTS',
  section_challenge_types: 'CHALLENGE_TYPES',
  section_output_format: 'OUTPUT_FORMAT',
  section_trending_summary_examples: 'TRENDING_SUMMARY_EXAMPLES',
  section_social_media_instructions: 'SOCIAL_MEDIA_INSTRUCTIONS',
  section_final_checklist: 'FINAL_CHECKLIST',
};

/**
 * Sample data for prompt preview
 * These values are used to fill placeholders when previewing the assembled prompt
 */
export const SAMPLE_PREVIEW_DATA: Record<string, string> = {
  language: 'en',
  languageName: 'English',
  region: 'United States',
  date: new Date().toISOString().split('T')[0],
  nationality: 'American',
  languageToneGuide: `**English Tone Guide**:
- Keep it casual and conversational
- Use wordplay that works in American English
- Reference pop culture that Americans would recognize
- Avoid British spellings (use "color" not "colour")`,
  trendsContext: `🔥 **Super Bowl LVIII** - Rise: +450%
   The big game is this weekend. Everyone's talking about halftime performances and commercials.

📈 **AI Regulation** - Rise: +120%
   New legislation being debated in Congress about AI safety.

📈 **Grammy Awards** - Rise: +95%
   Music's biggest night approaches with surprise nominations.`,
  keywordsList: `- SNACK, COUCH, WINGS (Super Bowl context)
- ROBOT, SAFETY, RULES (AI Regulation context)
- MUSIC, AWARD, SONG (Grammy context)`,
  langExamples: `**English Examples**:
- Good: BEACH, DREAM, LIGHT, STORM, DANCE
- Avoid: SERENDIPITY, EPHEMERAL, OBFUSCATE`,
};
