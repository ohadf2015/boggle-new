'use client';

import { useState } from 'react';
import { Copy, Check, Database, Code, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { Loader } from '@/components/ui/Loader';
import type { PromptPreviewData, SectionType } from '../types';
import { SECTION_METADATA } from './constants';

export interface PromptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: PromptPreviewData | null;
  isLoading: boolean;
  language: string;
}

/**
 * Dialog showing the fully assembled prompt with section breakdown.
 */
export function PromptPreviewDialog({
  open,
  onOpenChange,
  preview,
  isLoading,
  language,
}: PromptPreviewDialogProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'assembled' | 'sections'>('assembled');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Copy to clipboard
  async function handleCopy(): Promise<void> {
    if (!preview) return;
    await navigator.clipboard.writeText(preview.assembledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Toggle section expansion
  function toggleSection(sectionName: string): void {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-5 h-5 text-neo-cyan" />
            Full Prompt Preview
            <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded ms-2">
              {language.toUpperCase()}
            </span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader size="md" text="Assembling prompt..." />
            </div>
          ) : preview ? (
            <>
              {/* Stats bar */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-slate-400">
                  <span>
                    <strong className="text-white">{preview.sections.length}</strong> sections
                  </span>
                  <span>
                    <strong className="text-white">
                      {preview.totalCharacters.toLocaleString()}
                    </strong>{' '}
                    characters
                  </span>
                  <span>
                    <strong className="text-white">
                      {preview.sections.filter((s) => s.fromDatabase).length}
                    </strong>{' '}
                    customized
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* View mode toggle */}
                  <div className="flex rounded overflow-hidden border border-slate-600">
                    <button
                      onClick={() => setViewMode('assembled')}
                      className={`px-3 py-1 text-xs ${
                        viewMode === 'assembled'
                          ? 'bg-neo-yellow text-black'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      Assembled
                    </button>
                    <button
                      onClick={() => setViewMode('sections')}
                      className={`px-3 py-1 text-xs ${
                        viewMode === 'sections'
                          ? 'bg-neo-yellow text-black'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      By Section
                    </button>
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Content */}
              {viewMode === 'assembled' ? (
                <div className="bg-slate-900 border border-slate-700 rounded p-4 max-h-[60vh] overflow-y-auto">
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {preview.assembledPrompt}
                  </pre>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {preview.sections.map((section) => {
                    const metadata = SECTION_METADATA[section.name as SectionType];
                    const isExpanded = expandedSections.has(section.name);

                    return (
                      <div
                        key={section.name}
                        className={`border rounded overflow-hidden ${
                          section.fromDatabase
                            ? 'border-neo-yellow/50'
                            : 'border-slate-700'
                        }`}
                      >
                        <button
                          onClick={() => toggleSection(section.name)}
                          className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span>{metadata?.icon || '📄'}</span>
                            <span className="font-medium text-white">
                              {section.displayName}
                            </span>
                            {section.fromDatabase && (
                              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-neo-yellow/20 text-neo-yellow rounded">
                                <Database className="w-3 h-3" />
                                Custom
                              </span>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="p-3 bg-slate-900">
                            <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono">
                              {section.content}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sample data used */}
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-500 hover:text-slate-300">
                  Sample data used for placeholders
                </summary>
                <div className="mt-2 p-3 bg-slate-900 border border-slate-700 rounded">
                  <pre className="text-xs text-slate-400 font-mono">
                    {JSON.stringify(preview.sampleData, null, 2)}
                  </pre>
                </div>
              </details>
            </>
          ) : (
            <div className="py-12 text-center text-slate-500">
              No preview data available
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
