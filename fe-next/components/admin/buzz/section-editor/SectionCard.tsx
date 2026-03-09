'use client';

import { ChevronDown, ChevronUp, Edit2, RotateCcw, Check, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SectionStatus } from '../types';
import { SECTION_METADATA } from './constants';

export interface SectionCardProps {
  section: SectionStatus;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onReset: () => void;
  isResetting?: boolean;
  previewContent?: string;
}

/**
 * Individual section display card showing status and allowing expansion.
 */
export function SectionCard({
  section,
  isExpanded,
  onToggle,
  onEdit,
  onReset,
  isResetting = false,
  previewContent,
}: SectionCardProps): React.ReactElement {
  const metadata = SECTION_METADATA[section.sectionType];

  return (
    <div
      className={`
        bg-slate-900/50 border rounded-lg overflow-hidden transition-colors
        ${section.isCustomized ? 'border-neo-yellow/50' : 'border-slate-700'}
      `}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{metadata.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">
                {section.displayName}
              </span>
              {section.isCustomized ? (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-neo-yellow/20 text-neo-yellow rounded">
                  <Database className="w-3 h-3" />
                  Customized
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                  <Check className="w-3 h-3" />
                  Default
                </span>
              )}
              {metadata.isCritical && (
                <span className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 rounded">
                  Critical
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {section.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {section.version && (
            <span className="text-xs text-slate-600">v{section.version}</span>
          )}
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
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Placeholders */}
              {section.placeholders.length > 0 && (
                <div className="text-xs">
                  <span className="text-slate-500">Placeholders: </span>
                  {section.placeholders.map((p, i) => (
                    <span key={p.name}>
                      <code className="text-neo-cyan bg-slate-800 px-1 rounded">
                        {`{{${p.name}}}`}
                      </code>
                      {i < section.placeholders.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              )}

              {/* Preview (truncated) */}
              {previewContent && (
                <div className="bg-slate-800 rounded p-3 max-h-32 overflow-y-auto">
                  <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono">
                    {previewContent.length > 500
                      ? `${previewContent.slice(0, 500)}...`
                      : previewContent}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-neo-yellow text-black rounded hover:bg-neo-yellow/80 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>

                {section.isCustomized && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReset();
                    }}
                    disabled={isResetting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                    Reset to Default
                  </button>
                )}

                {section.lastUpdated && (
                  <span className="text-xs text-slate-600 ms-auto">
                    Updated: {new Date(section.lastUpdated).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
