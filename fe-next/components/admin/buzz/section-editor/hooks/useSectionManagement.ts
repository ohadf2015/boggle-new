/**
 * useSectionManagement Hook
 *
 * Provides state and actions for managing prompt sections in the admin UI.
 * Handles fetching section status, updating sections, and previewing the prompt.
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  SectionType,
  SectionStatus,
  SectionContent,
  PromptPreviewData,
} from '../../types';

interface UseSectionManagementOptions {
  authToken: string;
  language?: string;
  autoFetch?: boolean;
}

interface SectionStatusResponse {
  success: boolean;
  data: {
    sections: SectionStatus[];
    summary: {
      total: number;
      customized: number;
      default: number;
    };
    language: string | null;
  };
}

interface SectionContentResponse {
  success: boolean;
  data: {
    sectionType: SectionType;
    displayName: string;
    description: string;
    icon: string;
    placeholders: Array<{ name: string; description: string }>;
    content: string;
    defaultContent: string;
    fromDatabase: boolean;
    version?: number;
    lastUpdated?: string;
    language: string | null;
  };
}

interface PromptPreviewResponse {
  success: boolean;
  data: PromptPreviewData;
  language: string;
}

interface UseSectionManagementReturn {
  // State
  sections: SectionStatus[];
  summary: { total: number; customized: number; default: number } | null;
  isLoading: boolean;
  error: string | null;

  // Section content (when editing)
  selectedSection: SectionContent | null;
  defaultContent: string | null;
  isLoadingSection: boolean;

  // Preview
  preview: PromptPreviewData | null;
  isLoadingPreview: boolean;

  // Actions
  fetchSections: () => Promise<void>;
  fetchSectionContent: (sectionType: SectionType) => Promise<void>;
  updateSection: (sectionType: SectionType, content: string) => Promise<boolean>;
  resetSection: (sectionType: SectionType) => Promise<boolean>;
  fetchPreview: () => Promise<void>;
  clearSelectedSection: () => void;
}

export function useSectionManagement({
  authToken,
  language,
  autoFetch = true,
}: UseSectionManagementOptions): UseSectionManagementReturn {
  // Status state
  const [sections, setSections] = useState<SectionStatus[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    customized: number;
    default: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected section state
  const [selectedSection, setSelectedSection] = useState<SectionContent | null>(null);
  const [defaultContent, setDefaultContent] = useState<string | null>(null);
  const [isLoadingSection, setIsLoadingSection] = useState(false);

  // Preview state
  const [preview, setPreview] = useState<PromptPreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  /**
   * Fetch all section statuses
   */
  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (language) {
        params.set('language', language);
      }

      const response = await fetch(`/api/admin/buzz/sections/status?${params}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch sections');
      }

      const data: SectionStatusResponse = await response.json();
      setSections(data.data.sections);
      setSummary(data.data.summary);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useSectionManagement] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, language]);

  /**
   * Fetch content for a specific section
   */
  const fetchSectionContent = useCallback(
    async (sectionType: SectionType) => {
      setIsLoadingSection(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (language) {
          params.set('language', language);
        }

        const response = await fetch(
          `/api/admin/buzz/sections/${sectionType}?${params}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch section content');
        }

        const data: SectionContentResponse = await response.json();
        setSelectedSection({
          sectionType: data.data.sectionType,
          content: data.data.content,
          fromDatabase: data.data.fromDatabase,
          version: data.data.version,
          language: data.data.language,
        });
        setDefaultContent(data.data.defaultContent);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[useSectionManagement] Fetch section error:', err);
      } finally {
        setIsLoadingSection(false);
      }
    },
    [authToken, language]
  );

  /**
   * Update a section's content
   */
  const updateSection = useCallback(
    async (sectionType: SectionType, content: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(`/api/admin/buzz/sections/${sectionType}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            language: language || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update section');
        }

        // Refresh sections to show updated status
        await fetchSections();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[useSectionManagement] Update error:', err);
        return false;
      }
    },
    [authToken, language, fetchSections]
  );

  /**
   * Reset a section to default
   */
  const resetSection = useCallback(
    async (sectionType: SectionType): Promise<boolean> => {
      setError(null);

      try {
        const params = new URLSearchParams();
        if (language) {
          params.set('language', language);
        }

        const response = await fetch(
          `/api/admin/buzz/sections/${sectionType}?${params}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to reset section');
        }

        // Refresh sections to show updated status
        await fetchSections();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[useSectionManagement] Reset error:', err);
        return false;
      }
    },
    [authToken, language, fetchSections]
  );

  /**
   * Fetch full prompt preview
   */
  const fetchPreview = useCallback(async () => {
    setIsLoadingPreview(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (language) {
        params.set('language', language);
      }

      const response = await fetch(`/api/admin/buzz/sections/preview?${params}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch preview');
      }

      const data: PromptPreviewResponse = await response.json();
      setPreview(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useSectionManagement] Preview error:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [authToken, language]);

  /**
   * Clear selected section
   */
  const clearSelectedSection = useCallback(() => {
    setSelectedSection(null);
    setDefaultContent(null);
  }, []);

  // Auto-fetch sections on mount
  useEffect(() => {
    if (autoFetch && authToken) {
      fetchSections();
    }
  }, [autoFetch, authToken, fetchSections]);

  return {
    // State
    sections,
    summary,
    isLoading,
    error,

    // Section content
    selectedSection,
    defaultContent,
    isLoadingSection,

    // Preview
    preview,
    isLoadingPreview,

    // Actions
    fetchSections,
    fetchSectionContent,
    updateSection,
    resetSection,
    fetchPreview,
    clearSelectedSection,
  };
}
