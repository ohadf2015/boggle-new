/**
 * Constants for Prompt Template Editor components
 */

import type { TemplateType, TemplatePlaceholder } from '../types';

export const SUPPORTED_LANGUAGES = [
  { code: null, label: 'All Languages (Default)' },
  { code: 'en', label: 'English' },
  { code: 'he', label: 'Hebrew' },
  { code: 'sv', label: 'Swedish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'es', label: 'Spanish' },
] as const;

export const DEFAULT_PLACEHOLDERS: Record<TemplateType, TemplatePlaceholder[]> = {
  riddle: [
    { name: 'topic', description: 'The trending topic to create a riddle about' },
    { name: 'language', description: 'Target language code (en, he, sv, ja, es)' },
    { name: 'difficulty', description: 'Desired difficulty level (easy, medium, hard)' },
    { name: 'context', description: 'Additional context about the trend' },
  ],
  image: [
    { name: 'topic', description: 'The trending topic to visualize' },
    { name: 'category', description: 'Category of the topic (sports, tech, etc.)' },
    { name: 'language', description: 'Target language code' },
    { name: 'mood', description: 'Desired mood/atmosphere' },
  ],
  challenge_general: [
    { name: 'trends', description: 'Array of trending topics with context' },
    { name: 'language', description: 'Target language code' },
    { name: 'region', description: 'Geographic region code' },
    { name: 'date', description: 'Target date for the challenge' },
  ],
  social_content: [
    { name: 'trending_topic', description: 'The main trending topic' },
    { name: 'language', description: 'Target language code' },
    { name: 'challenge_summary', description: "Brief summary of today's challenges" },
  ],
};

export const TEMPLATE_TYPE_ICONS: Record<TemplateType, string> = {
  riddle: '&#x1F9E9;',
  image: '&#x1F5BC;&#xFE0F;',
  challenge_general: '&#x26A1;',
  social_content: '&#x1F4F1;',
};

export function getTemplateTypeIcon(type: TemplateType): string {
  switch (type) {
    case 'riddle':
      return '\uD83E\uDDE9';
    case 'image':
      return '\uD83D\uDDBC\uFE0F';
    case 'social_content':
      return '\uD83D\uDCF1';
    default:
      return '\u26A1';
  }
}
