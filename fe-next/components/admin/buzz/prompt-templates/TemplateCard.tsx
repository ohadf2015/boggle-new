'use client';

/**
 * TemplateCard - Displays a single prompt template with actions
 */

import { Copy, Eye, Edit3, Trash2 } from 'lucide-react';
import type { PromptTemplate } from '../types';

interface TemplateCardProps {
  template: PromptTemplate;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

export function TemplateCard({
  template,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
}: TemplateCardProps): React.ReactElement {
  return (
    <div
      className={`mx-4 mb-2 p-3 rounded-lg border ${
        template.is_active
          ? 'border-green-500/30 bg-green-900/10'
          : 'border-slate-600 bg-slate-800/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-neo-white">{template.name}</span>
          {template.is_active && (
            <span className="text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">
              Active
            </span>
          )}
          {template.language && (
            <span className="text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">
              {template.language.toUpperCase()}
            </span>
          )}
          <span className="text-xs text-slate-500">v{template.version}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onCopy}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Copy template"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={onSelect}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Preview template"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Edit template"
          >
            <Edit3 className="w-3.5 h-3.5 text-neo-cyan" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            title="Delete template"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {template.description && (
        <p className="text-xs text-slate-500 mb-2">{template.description}</p>
      )}

      {isSelected && !isEditing && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <pre className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
            {template.template_content}
          </pre>
        </div>
      )}
    </div>
  );
}
