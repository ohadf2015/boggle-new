'use client';

import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SectionContent, TemplatePlaceholder } from '../types';
import { SECTION_METADATA } from './constants';

export interface SectionFormProps {
  section: SectionContent;
  defaultContent: string;
  placeholders: TemplatePlaceholder[];
  onSave: (content: string) => Promise<boolean>;
  onCancel: () => void;
  isSaving?: boolean;
}

/**
 * Form for editing a section's template content.
 */
export function SectionForm({
  section,
  defaultContent,
  placeholders,
  onSave,
  onCancel,
  isSaving = false,
}: SectionFormProps): React.ReactElement {
  const [content, setContent] = useState(section.content);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const metadata = SECTION_METADATA[section.sectionType];

  // Track changes
  useEffect(() => {
    setHasChanges(content !== section.content);
  }, [content, section.content]);

  // Handle save
  async function handleSave(): Promise<void> {
    const success = await onSave(content);
    if (success) {
      onCancel(); // Close form on success
    }
  }

  // Handle reset to default
  function handleResetToDefault(): void {
    setContent(defaultContent);
    setShowResetConfirm(false);
  }

  // Insert placeholder at cursor
  function insertPlaceholder(placeholder: string): void {
    const textarea = document.getElementById('section-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + `{{${placeholder}}}` + content.slice(end);
      setContent(newContent);
      // Restore focus and cursor position
      setTimeout(() => {
        textarea.focus();
        const newPos = start + placeholder.length + 4;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-slate-800 border border-slate-700 rounded-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{metadata.icon}</span>
          <div>
            <h3 className="font-semibold text-white">
              Edit: {metadata.displayName}
            </h3>
            <p className="text-xs text-slate-500">{metadata.description}</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Placeholders help */}
      {placeholders.length > 0 && (
        <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700">
          <p className="text-xs text-slate-500 mb-2">
            Click to insert placeholders:
          </p>
          <div className="flex flex-wrap gap-2">
            {placeholders.map((p) => (
              <button
                key={p.name}
                onClick={() => insertPlaceholder(p.name)}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-neo-cyan rounded transition-colors"
                title={p.description}
              >
                {`{{${p.name}}}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="p-4">
        <textarea
          id="section-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-80 p-3 bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 font-mono resize-y focus:outline-none focus:border-neo-yellow"
          placeholder="Enter template content..."
        />

        {/* Character count */}
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>{content.length} characters</span>
          {section.fromDatabase && (
            <span className="text-neo-yellow">Custom template (v{section.version})</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-t border-slate-700">
        <div>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={content === defaultContent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-neo-orange" />
              <span className="text-slate-300">Reset all changes?</span>
              <button
                onClick={handleResetToDefault}
                className="px-2 py-1 bg-neo-orange text-black rounded hover:bg-neo-orange/80 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
              >
                No
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-neo-yellow text-black rounded hover:bg-neo-yellow/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
