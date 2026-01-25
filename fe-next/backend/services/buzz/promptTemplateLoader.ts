/**
 * Prompt Template Loader for Daily Buzz
 *
 * Loads prompt templates from the database with fallback to hardcoded defaults.
 * This allows admins to edit prompts via the admin panel while ensuring
 * the system always has valid templates to use.
 *
 * Usage:
 *   const loader = new PromptTemplateLoader();
 *   const section = await loader.getSection('INTRO', 'en');
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PROMPT_SECTIONS, PromptSectionName, fillTemplate } from './promptSections';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Template types that map to our section names
export const SECTION_TO_TEMPLATE_TYPE: Record<PromptSectionName, string> = {
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

// All valid template types (sections + legacy types)
export const ALL_TEMPLATE_TYPES = [
  ...Object.values(SECTION_TO_TEMPLATE_TYPE),
  'riddle', // Legacy - kept for backward compatibility
  'image',
  'challenge_general',
  'social_content',
] as const;

export type TemplateType = typeof ALL_TEMPLATE_TYPES[number];

interface CachedTemplate {
  content: string;
  fetchedAt: number;
  fromDatabase: boolean;
  version?: number;
}

interface DatabaseTemplate {
  id: number;
  template_type: string;
  language: string | null;
  name: string;
  description: string | null;
  template_content: string;
  placeholders: Array<{ name: string; description: string }> | null;
  version: number;
  is_active: boolean;
}

/**
 * Loader for prompt templates with database support and fallback
 */
export class PromptTemplateLoader {
  private supabase: SupabaseClient | null = null;
  private cache: Map<string, CachedTemplate> = new Map();
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the Supabase client
   */
  private async init(): Promise<void> {
    if (this.supabase) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      }
    })();

    await this.initPromise;
  }

  /**
   * Generate cache key for a template
   */
  private getCacheKey(sectionName: PromptSectionName, language?: string): string {
    return `${sectionName}:${language || 'default'}`;
  }

  /**
   * Check if a cached template is still valid
   */
  private isCacheValid(cached: CachedTemplate): boolean {
    return Date.now() - cached.fetchedAt < CACHE_TTL_MS;
  }

  /**
   * Fetch a template from the database
   */
  private async fetchFromDatabase(
    sectionName: PromptSectionName,
    language?: string
  ): Promise<DatabaseTemplate | null> {
    await this.init();

    if (!this.supabase) {
      return null;
    }

    const templateType = SECTION_TO_TEMPLATE_TYPE[sectionName];

    try {
      // First try language-specific template
      if (language) {
        const { data, error } = await this.supabase
          .from('buzz_prompt_templates')
          .select('*')
          .eq('template_type', templateType)
          .eq('language', language)
          .eq('is_active', true)
          .single();

        if (!error && data) {
          return data as DatabaseTemplate;
        }
      }

      // Fall back to language-agnostic template
      const { data, error } = await this.supabase
        .from('buzz_prompt_templates')
        .select('*')
        .eq('template_type', templateType)
        .is('language', null)
        .eq('is_active', true)
        .single();

      if (!error && data) {
        return data as DatabaseTemplate;
      }

      return null;
    } catch (error) {
      console.warn(`[PromptLoader] Error fetching template ${sectionName}:`, error);
      return null;
    }
  }

  /**
   * Get a prompt section template
   *
   * @param sectionName - The section to load
   * @param language - Optional language for language-specific templates
   * @returns The template content (from DB or hardcoded fallback)
   */
  async getSection(
    sectionName: PromptSectionName,
    language?: string
  ): Promise<{ content: string; fromDatabase: boolean; version?: number }> {
    const cacheKey = this.getCacheKey(sectionName, language);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return {
        content: cached.content,
        fromDatabase: cached.fromDatabase,
        version: cached.version,
      };
    }

    // Try to fetch from database
    const dbTemplate = await this.fetchFromDatabase(sectionName, language);

    if (dbTemplate) {
      // Cache and return database template
      const result: CachedTemplate = {
        content: dbTemplate.template_content,
        fetchedAt: Date.now(),
        fromDatabase: true,
        version: dbTemplate.version,
      };
      this.cache.set(cacheKey, result);

      return {
        content: result.content,
        fromDatabase: true,
        version: dbTemplate.version,
      };
    }

    // Fall back to hardcoded template
    const hardcodedContent = PROMPT_SECTIONS[sectionName];
    const result: CachedTemplate = {
      content: hardcodedContent,
      fetchedAt: Date.now(),
      fromDatabase: false,
    };
    this.cache.set(cacheKey, result);

    return {
      content: hardcodedContent,
      fromDatabase: false,
    };
  }

  /**
   * Get a section with placeholders filled in
   */
  async getSectionFilled(
    sectionName: PromptSectionName,
    values: Record<string, string>,
    language?: string
  ): Promise<string> {
    const { content } = await this.getSection(sectionName, language);
    return fillTemplate(content, values);
  }

  /**
   * Get all sections for building a complete prompt
   * Returns sections with database overrides applied
   */
  async getAllSections(
    language?: string
  ): Promise<Record<PromptSectionName, { content: string; fromDatabase: boolean }>> {
    const sectionNames = Object.keys(PROMPT_SECTIONS) as PromptSectionName[];

    const results = await Promise.all(
      sectionNames.map(async (name) => {
        const section = await this.getSection(name, language);
        return [name, section] as const;
      })
    );

    return Object.fromEntries(results) as Record<
      PromptSectionName,
      { content: string; fromDatabase: boolean }
    >;
  }

  /**
   * Clear the cache (useful after admin updates)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific section
   */
  clearSectionCache(sectionName: PromptSectionName, language?: string): void {
    const cacheKey = this.getCacheKey(sectionName, language);
    this.cache.delete(cacheKey);

    // Also clear the default cache if we cleared a language-specific one
    if (language) {
      this.cache.delete(this.getCacheKey(sectionName));
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance for application-wide use
let loaderInstance: PromptTemplateLoader | null = null;

/**
 * Get the singleton PromptTemplateLoader instance
 */
export function getPromptTemplateLoader(): PromptTemplateLoader {
  if (!loaderInstance) {
    loaderInstance = new PromptTemplateLoader();
  }
  return loaderInstance;
}

/**
 * Clear the loader cache (call this after admin updates templates)
 */
export function clearPromptTemplateCache(): void {
  loaderInstance?.clearCache();
}
