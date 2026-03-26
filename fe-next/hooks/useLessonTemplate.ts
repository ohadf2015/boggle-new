'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import logger from '@/utils/logger';

// Types
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface LessonTemplate {
  id: string;
  lesson_id: string;
  teacher_id: string;
  name: string;
  timer_seconds: number;
  difficulty: Difficulty;
  min_word_length: number;
  allow_late_join: boolean;
  board_rows: number | null;
  board_cols: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  lessonId: string;
  name: string;
  timerSeconds?: number;
  difficulty?: Difficulty;
  minWordLength?: number;
  allowLateJoin?: boolean;
  boardRows?: number;
  boardCols?: number;
  isDefault?: boolean;
}

export interface UpdateTemplateData {
  name?: string;
  timerSeconds?: number;
  difficulty?: Difficulty;
  minWordLength?: number;
  allowLateJoin?: boolean;
  boardRows?: number | null;
  boardCols?: number | null;
  isDefault?: boolean;
}

// API functions
async function fetchTemplatesAPI(lessonId: string): Promise<{ templates: LessonTemplate[]; error?: string }> {
  try {
    const response = await fetch(`/api/education/templates?lessonId=${lessonId}`);
    const data = await response.json();

    if (!response.ok) {
      return { templates: [], error: data.error || 'Failed to fetch templates' };
    }

    return { templates: data.templates || [] };
  } catch (err) {
    logger.error('Error fetching templates:', err);
    return { templates: [], error: 'Failed to fetch templates' };
  }
}

async function fetchTemplateAPI(templateId: string): Promise<{ template: LessonTemplate | null; error?: string }> {
  try {
    const response = await fetch(`/api/education/templates?id=${templateId}`);
    const data = await response.json();

    if (!response.ok) {
      return { template: null, error: data.error || 'Template not found' };
    }

    return { template: data.template };
  } catch (err) {
    logger.error('Error fetching template:', err);
    return { template: null, error: 'Failed to fetch template' };
  }
}

async function createTemplateAPI(data: CreateTemplateData): Promise<{ template: LessonTemplate | null; error?: string }> {
  try {
    const response = await fetch('/api/education/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (!response.ok) {
      return { template: null, error: result.error || 'Failed to create template' };
    }

    return { template: result.template };
  } catch (err) {
    logger.error('Error creating template:', err);
    return { template: null, error: 'Failed to create template' };
  }
}

async function updateTemplateAPI(id: string, data: UpdateTemplateData): Promise<{ template: LessonTemplate | null; error?: string }> {
  try {
    const response = await fetch('/api/education/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    const result = await response.json();

    if (!response.ok) {
      return { template: null, error: result.error || 'Failed to update template' };
    }

    return { template: result.template };
  } catch (err) {
    logger.error('Error updating template:', err);
    return { template: null, error: 'Failed to update template' };
  }
}

async function deleteTemplateAPI(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/education/templates?id=${id}`, {
      method: 'DELETE',
    });
    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to delete template' };
    }

    return { success: true };
  } catch (err) {
    logger.error('Error deleting template:', err);
    return { success: false, error: 'Failed to delete template' };
  }
}

// =============================================
// TEMPLATES LIST HOOK
// =============================================

interface UseTemplatesState {
  templates: LessonTemplate[];
  isLoading: boolean;
  error: string | null;
}

interface UseTemplatesActions {
  refresh: () => Promise<void>;
  createTemplate: (data: CreateTemplateData) => Promise<{ success: boolean; data?: LessonTemplate; error?: string }>;
  updateTemplate: (id: string, updates: UpdateTemplateData) => Promise<{ success: boolean; error?: string }>;
  deleteTemplate: (id: string) => Promise<{ success: boolean; error?: string }>;
  getDefaultTemplate: () => LessonTemplate | undefined;
}

export type UseTemplatesReturn = UseTemplatesState & UseTemplatesActions;

/**
 * Hook for managing lesson templates
 *
 * Provides:
 * - List of templates for a lesson
 * - Create/update/delete operations
 * - Get default template
 */
export function useTemplates(lessonId: string | undefined): UseTemplatesReturn {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => queryKeys.education.templates(lessonId), [lessonId]);

  const { data: templates = [], isLoading, error: queryError, refetch } = useQuery<LessonTemplate[], Error>({
    queryKey,
    queryFn: async () => {
      const { templates, error } = await fetchTemplatesAPI(lessonId!);
      if (error) throw new Error(error);
      return templates;
    },
    enabled: !!isAuthenticated && !!lessonId,
    staleTime: 2 * 60_000,
  });

  const error = queryError?.message ?? null;

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const createTemplate = useCallback(async (
    data: CreateTemplateData
  ): Promise<{ success: boolean; data?: LessonTemplate; error?: string }> => {
    try {
      const { template, error } = await createTemplateAPI(data);
      if (error || !template) {
        return { success: false, error: error || 'Failed to create template' };
      }
      queryClient.invalidateQueries({ queryKey });
      return { success: true, data: template };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create template';
      logger.error('Exception in createTemplate:', error);
      return { success: false, error };
    }
  }, [queryClient, queryKey]);

  const updateTemplate = useCallback(async (
    id: string,
    updates: UpdateTemplateData
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { template, error } = await updateTemplateAPI(id, updates);
      if (error) return { success: false, error };
      queryClient.invalidateQueries({ queryKey });
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update template';
      logger.error('Exception in updateTemplate:', error);
      return { success: false, error };
    }
  }, [queryClient, queryKey]);

  const deleteTemplate = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { success, error } = await deleteTemplateAPI(id);
      if (!success) return { success: false, error };
      queryClient.invalidateQueries({ queryKey });
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete template';
      logger.error('Exception in deleteTemplate:', error);
      return { success: false, error };
    }
  }, [queryClient, queryKey]);

  const getDefaultTemplate = useCallback(() => {
    return templates.find(t => t.is_default);
  }, [templates]);

  return {
    templates,
    isLoading,
    error,
    refresh,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getDefaultTemplate,
  };
}

// =============================================
// SINGLE TEMPLATE HOOK
// =============================================

interface UseTemplateState {
  template: LessonTemplate | null;
  isLoading: boolean;
  error: string | null;
}

interface UseTemplateActions {
  refresh: () => Promise<void>;
  update: (updates: UpdateTemplateData) => Promise<{ success: boolean; error?: string }>;
  deleteTemplate: () => Promise<{ success: boolean; error?: string }>;
}

export type UseTemplateReturn = UseTemplateState & UseTemplateActions;

/**
 * Hook for managing a single lesson template
 *
 * Provides:
 * - Template details
 * - Update/delete operations
 */
export function useTemplate(templateId: string | undefined): UseTemplateReturn {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => queryKeys.education.template(templateId), [templateId]);

  const { data: template = null, isLoading, error: queryError, refetch } = useQuery<LessonTemplate | null, Error>({
    queryKey,
    queryFn: async () => {
      const { template, error } = await fetchTemplateAPI(templateId!);
      if (error) throw new Error(error);
      return template;
    },
    enabled: !!templateId,
    staleTime: 2 * 60_000,
  });

  const error = queryError?.message ?? null;

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const update = useCallback(async (
    updates: UpdateTemplateData
  ): Promise<{ success: boolean; error?: string }> => {
    if (!templateId) return { success: false, error: 'No template ID' };
    try {
      const { template, error } = await updateTemplateAPI(templateId, updates);
      if (error) return { success: false, error };
      queryClient.invalidateQueries({ queryKey });
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update template';
      logger.error('Exception in update:', error);
      return { success: false, error };
    }
  }, [templateId, queryClient, queryKey]);

  const deleteTemplate = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!templateId) return { success: false, error: 'No template ID' };
    try {
      const { success, error } = await deleteTemplateAPI(templateId);
      if (!success) return { success: false, error };
      queryClient.invalidateQueries({ queryKey });
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete template';
      logger.error('Exception in deleteTemplate:', error);
      return { success: false, error };
    }
  }, [templateId, queryClient, queryKey]);

  return {
    template,
    isLoading,
    error,
    refresh,
    update,
    deleteTemplate,
  };
}
