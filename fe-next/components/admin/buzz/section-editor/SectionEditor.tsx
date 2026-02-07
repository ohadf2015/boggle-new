'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, Eye, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import type { SectionType } from '../types';
import { useSectionManagement } from './hooks/useSectionManagement';
import { SectionCard } from './SectionCard';
import { SectionForm } from './SectionForm';
import { PromptPreviewDialog } from './PromptPreviewDialog';
import { SECTION_METADATA } from './constants';
import { Loader } from '@/components/ui/Loader';

export interface SectionEditorProps {
  authToken: string;
  language?: string;
  onSuccess?: (message: string) => void;
}

/**
 * Main section editor component that displays all 11 prompt sections
 * and allows editing and previewing.
 */
export function SectionEditor({
  authToken,
  language = 'en',
  onSuccess,
}: SectionEditorProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSection, setExpandedSection] = useState<SectionType | null>(null);
  const [editingSection, setEditingSection] = useState<SectionType | null>(null);
  const [resettingSection, setResettingSection] = useState<SectionType | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    sections,
    summary,
    isLoading,
    error,
    selectedSection,
    defaultContent,
    isLoadingSection,
    preview,
    isLoadingPreview,
    fetchSections,
    fetchSectionContent,
    updateSection,
    resetSection,
    fetchPreview,
    clearSelectedSection,
  } = useSectionManagement({ authToken, language });

  // Handle section expansion toggle
  const handleToggleSection = useCallback((sectionType: SectionType) => {
    setExpandedSection((current) =>
      current === sectionType ? null : sectionType
    );
  }, []);

  // Handle edit action
  const handleEdit = useCallback(
    async (sectionType: SectionType) => {
      await fetchSectionContent(sectionType);
      setEditingSection(sectionType);
    },
    [fetchSectionContent]
  );

  // Handle save
  const handleSave = useCallback(
    async (content: string): Promise<boolean> => {
      if (!editingSection) return false;
      setIsSaving(true);
      const success = await updateSection(editingSection, content);
      setIsSaving(false);
      if (success) {
        onSuccess?.(`Section "${SECTION_METADATA[editingSection].displayName}" updated`);
        setEditingSection(null);
        clearSelectedSection();
      }
      return success;
    },
    [editingSection, updateSection, onSuccess, clearSelectedSection]
  );

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
    clearSelectedSection();
  }, [clearSelectedSection]);

  // Handle reset
  const handleReset = useCallback(
    async (sectionType: SectionType) => {
      setResettingSection(sectionType);
      const success = await resetSection(sectionType);
      setResettingSection(null);
      if (success) {
        onSuccess?.(`Section "${SECTION_METADATA[sectionType].displayName}" reset to default`);
      }
    },
    [resetSection, onSuccess]
  );

  // Handle preview
  const handleShowPreview = useCallback(async () => {
    await fetchPreview();
    setShowPreview(true);
  }, [fetchPreview]);

  return (
    <div className="bg-slate-800/50 rounded-neo border-neo border-black">
      {/* Header - Always visible */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧩</span>
          <div>
            <h2 className="text-lg font-semibold text-white">Prompt Sections</h2>
            <p className="text-xs text-slate-500">
              {summary
                ? `${summary.customized} customized, ${summary.default} using defaults`
                : 'Manage the 11 modular prompt sections'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShowPreview();
            }}
            disabled={isLoadingPreview}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            <Eye className={`w-4 h-4 ${isLoadingPreview ? 'animate-pulse' : ''}`} />
            Preview
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchSections();
            }}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <div className="border-t border-slate-700">
            {/* Error display */}
            {error && (
              <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Loading state */}
            {isLoading && sections.length === 0 && (
              <div className="p-8 flex justify-center">
                <Loader size="md" text="Loading sections..." />
              </div>
            )}

            {/* Section list or edit form */}
            <div className="p-4 space-y-3">
              {editingSection && selectedSection && defaultContent ? (
                <SectionForm
                  section={selectedSection}
                  defaultContent={defaultContent}
                  placeholders={SECTION_METADATA[editingSection].placeholders}
                  onSave={handleSave}
                  onCancel={handleCancelEdit}
                  isSaving={isSaving}
                />
              ) : isLoadingSection ? (
                <div className="p-8 flex justify-center">
                  <Loader size="md" text="Loading section..." />
                </div>
              ) : (
                sections.map((section) => (
                  <SectionCard
                    key={section.sectionType}
                    section={section}
                    isExpanded={expandedSection === section.sectionType}
                    onToggle={() => handleToggleSection(section.sectionType)}
                    onEdit={() => handleEdit(section.sectionType)}
                    onReset={() => handleReset(section.sectionType)}
                    isResetting={resettingSection === section.sectionType}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Dialog */}
      <PromptPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        preview={preview}
        isLoading={isLoadingPreview}
        language={language}
      />
    </div>
  );
}
