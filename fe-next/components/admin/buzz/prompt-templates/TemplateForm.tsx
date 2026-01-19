'use client';

/**
 * TemplateForm - Form for creating/editing prompt templates
 */

import { RefreshCw, Save } from 'lucide-react';
import type { TemplateType, TemplatePlaceholder } from '../types';
import { SUPPORTED_LANGUAGES } from './constants';

export interface TemplateFormData {
  template_type: TemplateType;
  language: string | null;
  name: string;
  description: string;
  template_content: string;
  placeholders: TemplatePlaceholder[];
}

interface TemplateFormProps {
  formData: TemplateFormData;
  isCreateMode: boolean;
  isSaving: boolean;
  templateName?: string;
  onFormChange: (data: TemplateFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TemplateForm({
  formData,
  isCreateMode,
  isSaving,
  templateName,
  onFormChange,
  onSave,
  onCancel,
}: TemplateFormProps): React.ReactElement {
  function handleFieldChange<K extends keyof TemplateFormData>(
    field: K,
    value: TemplateFormData[K]
  ): void {
    onFormChange({ ...formData, [field]: value });
  }

  const placeholderHints = formData.placeholders.map((p) => `{${p.name}}`).join(', ');
  const isValid = formData.name.trim() !== '' && formData.template_content.trim() !== '';

  return (
    <div className="p-4 border-b border-slate-700 bg-slate-800/30">
      <h3 className="text-sm font-medium text-neo-white mb-4">
        {isCreateMode ? 'Create New Template' : `Edit: ${templateName}`}
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-neo-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Language</label>
            <select
              value={formData.language ?? ''}
              onChange={(e) => handleFieldChange('language', e.target.value || null)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-neo-white"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code ?? 'null'} value={lang.code ?? ''}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-neo-white"
            placeholder="Optional description of what this template is for"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400">Template Content</label>
            <div className="text-xs text-slate-500">Available placeholders: {placeholderHints}</div>
          </div>
          <textarea
            value={formData.template_content}
            onChange={(e) => handleFieldChange('template_content', e.target.value)}
            className="w-full h-64 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-neo-white font-mono resize-y"
            placeholder="Enter your prompt template here. Use {placeholder} syntax for dynamic values."
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving || !isValid}
            className="px-4 py-2 rounded-lg bg-neo-cyan text-slate-900 font-medium text-sm hover:bg-neo-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isCreateMode ? 'Create Template' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
