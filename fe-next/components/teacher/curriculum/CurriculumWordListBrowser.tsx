/**
 * CurriculumWordListBrowser Component
 *
 * Displays pre-built curriculum word lists aligned with Israeli educational standards.
 * Allows teachers to browse, filter, preview, and import word lists to their lessons.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, Eye, EyeOff, Filter, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import logger from '@/utils/logger';
import {
  getCurriculumWordLists,
  importCurriculumToLesson,
  CurriculumWordList,
  CurriculumWordListFilters,
  GradeLevel,
  CurriculumSubject,
  VocabularyLesson,
} from '@/lib/supabase/education';

interface CurriculumWordListBrowserProps {
  /** Teacher ID for importing lists */
  teacherId?: string;
  /** Optional classroom ID to associate imported lesson */
  classroomId?: string;
  /** Callback when import succeeds */
  onImportSuccess?: (lesson: VocabularyLesson) => void;
}

const GRADE_LEVELS: GradeLevel[] = [
  'grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'grade_6',
  'grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12',
];

const SUBJECTS: CurriculumSubject[] = [
  'english', 'hebrew', 'science', 'math', 'history', 'geography', 'general',
];

export function CurriculumWordListBrowser({
  teacherId,
  classroomId,
  onImportSuccess,
}: CurriculumWordListBrowserProps) {
  const { t } = useLanguage();

  // State
  const [lists, setLists] = useState<CurriculumWordList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CurriculumWordListFilters>({});
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [importingListId, setImportingListId] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Fetch curriculum lists
  const fetchLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await getCurriculumWordLists(filters);
      if (fetchError) {
        setError(t('common.error'));
        logger.error('Failed to fetch curriculum lists:', fetchError.message);
      } else {
        setLists(data);
      }
    } catch (err) {
      setError(t('common.error'));
      logger.error('Failed to fetch curriculum lists:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // Handle filter changes
  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      gradeLevel: value ? (value as GradeLevel) : undefined,
    }));
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      subject: value ? (value as CurriculumSubject) : undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  // Toggle preview
  const togglePreview = (listId: string) => {
    setExpandedListId((prev) => (prev === listId ? null : listId));
  };

  // Handle import
  const handleImport = async (list: CurriculumWordList) => {
    if (!teacherId) return;

    setImportingListId(list.id);
    setImportSuccess(null);
    setImportError(null);

    try {
      const { data: lesson, error: importErr } = await importCurriculumToLesson(list.id, teacherId, classroomId);
      if (importErr || !lesson) {
        setImportError(list.id);
        logger.error('Failed to import curriculum list:', importErr?.message);
      } else {
        setImportSuccess(list.id);
        if (onImportSuccess) {
          onImportSuccess(lesson);
        }
      }
    } catch (err) {
      setImportError(list.id);
      logger.error('Failed to import curriculum list:', err);
    } finally {
      setImportingListId(null);
    }
  };

  // Get grade group label
  const getGradeGroup = (grade: GradeLevel): string => {
    const gradeNum = parseInt(grade.replace('grade_', ''));
    if (gradeNum <= 6) return t('teacher.curriculum.gradeGroups.elementary');
    if (gradeNum <= 9) return t('teacher.curriculum.gradeGroups.middle');
    return t('teacher.curriculum.gradeGroups.high');
  };

  // Check if any filters are active
  const hasActiveFilters = filters.gradeLevel || filters.subject || filters.language;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-neo-white font-neo-display">
          {t('teacher.curriculum.title')}
        </h1>
        <p className="text-neo-gray mt-2">{t('teacher.curriculum.description')}</p>
      </div>

      {/* Filters */}
      <div className="bg-neo-navy/50 border-neo border-black rounded-neo p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-neo-lime" />
          <h2 className="text-lg font-semibold text-neo-white">
            {t('teacher.curriculum.filters.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Grade Level Filter */}
          <div>
            <label
              htmlFor="grade-filter"
              className="block text-sm font-medium text-neo-gray mb-1"
            >
              {t('teacher.curriculum.filters.grade')}
            </label>
            <select
              id="grade-filter"
              aria-label={t('teacher.curriculum.filters.grade')}
              value={filters.gradeLevel || ''}
              onChange={handleGradeChange}
              className="w-full bg-neo-navy border-neo border-black rounded-neo p-2 text-neo-white focus:ring-2 focus:ring-neo-lime focus:outline-hidden"
            >
              <option value="">{t('teacher.curriculum.allGrades')}</option>
              {GRADE_LEVELS.map((grade) => (
                <option key={grade} value={grade}>
                  {t(`teacher.curriculum.grades.${grade}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label
              htmlFor="subject-filter"
              className="block text-sm font-medium text-neo-gray mb-1"
            >
              {t('teacher.curriculum.filters.subject')}
            </label>
            <select
              id="subject-filter"
              aria-label={t('teacher.curriculum.filters.subject')}
              value={filters.subject || ''}
              onChange={handleSubjectChange}
              className="w-full bg-neo-navy border-neo border-black rounded-neo p-2 text-neo-white focus:ring-2 focus:ring-neo-lime focus:outline-hidden"
            >
              <option value="">{t('teacher.curriculum.allSubjects')}</option>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {t(`teacher.curriculum.subjects.${subject}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-neo-navy border-neo border-black rounded-neo text-neo-gray hover:text-neo-white hover:bg-neo-navy/80 transition-colors"
              >
                <X className="w-4 h-4" />
                {t('teacher.curriculum.filters.clear')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-neo-gray animate-pulse">
          {t('common.loading')}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8 text-neo-orange">
          {error}
        </div>
      )}

      {/* No Results */}
      {!loading && !error && lists.length === 0 && (
        <div className="text-center py-8 text-neo-gray">
          {t('teacher.curriculum.noResults')}
        </div>
      )}

      {/* Curriculum Lists */}
      {!loading && !error && lists.length > 0 && (
        <div className="space-y-4">
          {lists.map((list) => (
            <div
              key={list.id}
              className="bg-neo-navy border-neo border-black rounded-neo shadow-hard overflow-hidden"
            >
              {/* List Header */}
              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neo-white">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="text-sm text-neo-gray mt-1">{list.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-neo-lime/20 text-neo-lime rounded">
                        {getGradeGroup(list.grade_level)} - {t(`teacher.curriculum.grades.${list.grade_level}`)}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-neo-cyan/20 text-neo-cyan rounded">
                        {t(`teacher.curriculum.subjects.${list.subject}`)}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-neo-gray/20 text-neo-gray rounded">
                        {t('teacher.curriculum.wordCount', { count: list.word_count })}
                      </span>
                    </div>
                    {list.curriculum_standard && (
                      <p className="text-xs text-neo-gray mt-2">
                        {list.curriculum_standard}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {/* Preview Button */}
                    <button
                      onClick={() => togglePreview(list.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-neo-navy border-neo border-black rounded-neo text-neo-gray hover:text-neo-white hover:bg-neo-navy/80 transition-colors"
                      aria-label={t('teacher.curriculum.preview')}
                    >
                      {expandedListId === list.id ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {t('teacher.curriculum.preview')}
                      </span>
                    </button>

                    {/* Import Button */}
                    <button
                      onClick={() => handleImport(list)}
                      disabled={!teacherId || importingListId === list.id}
                      className="flex items-center gap-2 px-3 py-2 bg-neo-lime text-black border-neo border-black rounded-neo shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={t('teacher.curriculum.import')}
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        {importingListId === list.id
                          ? t('teacher.curriculum.importing')
                          : t('teacher.curriculum.import')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Success/Error Messages */}
                {importSuccess === list.id && (
                  <div className="mt-2 text-sm text-green-400">
                    {t('teacher.curriculum.imported')}
                  </div>
                )}
                {importError === list.id && (
                  <div className="mt-2 text-sm text-neo-orange">
                    {t('teacher.curriculum.importError')}
                  </div>
                )}
              </div>

              {/* Word Preview (Expandable) */}
              {expandedListId === list.id && (
                <div className="border-t border-black/20 bg-neo-navy/30 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.words.map((word, index) => (
                      <div
                        key={`word-${index}-${word.word}`}
                        className="bg-neo-navy/50 border border-black/20 rounded p-3"
                      >
                        <span className="font-medium text-neo-white">{word.word}</span>
                        {word.definition && (
                          <p className="text-sm text-neo-gray mt-1">{word.definition}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CurriculumWordListBrowser;
