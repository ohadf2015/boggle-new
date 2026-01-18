'use client';

/**
 * Prompt Template Editor Component
 * Allows admins to view, edit, and create prompt templates for Daily Buzz generation
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit3,
  Copy,
  X,
} from 'lucide-react';
import { getSession } from '@/lib/supabase';
import {
  PromptTemplate,
  TemplateType,
  TEMPLATE_TYPES,
  TEMPLATE_TYPE_LABELS,
  TemplatePlaceholder,
} from './types';

const SUPPORTED_LANGUAGES = [
  { code: null, label: 'All Languages (Default)' },
  { code: 'en', label: 'English' },
  { code: 'he', label: 'Hebrew' },
  { code: 'sv', label: 'Swedish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'es', label: 'Spanish' },
];

// Default placeholders for each template type
const DEFAULT_PLACEHOLDERS: Record<TemplateType, TemplatePlaceholder[]> = {
  riddle: [
    { name: 'topic', description: 'The trending topic to create a riddle about' },
    { name: 'language', description: 'Target language code (en, he, sv, ja, es)' },
    { name: 'difficulty', description: 'Desired difficulty level (easy, medium, hard)' },
    { name: 'context', description: 'Additional context about the trend' },
  ],
  image: [
    { name: 'topic', description: 'The trending topic to visualize' },
    { name: 'category', description: 'Category of the topic (sports, tech, etc.)' },
    { name: 'language', description: 'Target language code' },
    { name: 'mood', description: 'Desired mood/atmosphere' },
  ],
  challenge_general: [
    { name: 'trends', description: 'Array of trending topics with context' },
    { name: 'language', description: 'Target language code' },
    { name: 'region', description: 'Geographic region code' },
    { name: 'date', description: 'Target date for the challenge' },
  ],
  social_content: [
    { name: 'trending_topic', description: 'The main trending topic' },
    { name: 'language', description: 'Target language code' },
    { name: 'challenge_summary', description: 'Brief summary of today\'s challenges' },
  ],
};

interface Props {
  onClose?: () => void;
}

export default function PromptTemplateEditor({ onClose }: Props) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<TemplateType>>(new Set(['riddle', 'image']));
  const [saving, setSaving] = useState(false);

  // Form state for editing/creating
  const [formData, setFormData] = useState({
    template_type: 'riddle' as TemplateType,
    language: null as string | null,
    name: '',
    description: '',
    template_content: '',
    placeholders: [] as TemplatePlaceholder[],
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/buzz/prompt-templates?active_only=false', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const url = createMode
        ? '/api/admin/buzz/prompt-templates'
        : `/api/admin/buzz/prompt-templates/${selectedTemplate?.id}`;

      const method = createMode ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...formData,
          language: formData.language || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save template');
      }

      setSuccessMessage(createMode ? 'Template created successfully' : 'Template updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Reset state and refresh
      setEditMode(false);
      setCreateMode(false);
      setSelectedTemplate(null);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch(`/api/admin/buzz/prompt-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete template');
      }

      setSuccessMessage('Template deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const startCreate = (type: TemplateType) => {
    setFormData({
      template_type: type,
      language: null,
      name: `New ${TEMPLATE_TYPE_LABELS[type]} Template`,
      description: '',
      template_content: '',
      placeholders: DEFAULT_PLACEHOLDERS[type],
    });
    setCreateMode(true);
    setEditMode(true);
    setSelectedTemplate(null);
  };

  const startEdit = (template: PromptTemplate) => {
    setFormData({
      template_type: template.template_type,
      language: template.language,
      name: template.name,
      description: template.description || '',
      template_content: template.template_content,
      placeholders: template.placeholders || DEFAULT_PLACEHOLDERS[template.template_type],
    });
    setSelectedTemplate(template);
    setEditMode(true);
    setCreateMode(false);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setCreateMode(false);
    setSelectedTemplate(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessMessage('Copied to clipboard');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const toggleExpanded = (type: TemplateType) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Group templates by type
  const templatesByType = TEMPLATE_TYPES.reduce((acc, type) => {
    acc[type] = templates.filter(t => t.template_type === type);
    return acc;
  }, {} as Record<TemplateType, PromptTemplate[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-neo-cyan" />
        <span className="ml-2 text-slate-400">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-neo-yellow" />
          <h2 className="text-lg font-bold text-neo-white">Prompt Templates</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTemplates}
            className="p-2 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors"
            title="Refresh templates"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="m-4 p-3 bg-red-900/30 border border-red-500 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="m-4 p-3 bg-green-900/30 border border-green-500 rounded-lg flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit/Create Form */}
      {editMode && (
        <div className="p-4 border-b border-slate-700 bg-slate-800/30">
          <h3 className="text-sm font-medium text-neo-white mb-4">
            {createMode ? 'Create New Template' : `Edit: ${selectedTemplate?.name}`}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-neo-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Language</label>
                <select
                  value={formData.language || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value || null }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-neo-white"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code ?? 'null'} value={lang.code || ''}>
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
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-neo-white"
                placeholder="Optional description of what this template is for"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Template Content</label>
                <div className="text-xs text-slate-500">
                  Available placeholders: {formData.placeholders.map(p => `{${p.name}}`).join(', ')}
                </div>
              </div>
              <textarea
                value={formData.template_content}
                onChange={(e) => setFormData(prev => ({ ...prev, template_content: e.target.value }))}
                className="w-full h-64 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-neo-white font-mono resize-y"
                placeholder="Enter your prompt template here. Use {placeholder} syntax for dynamic values."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.template_content}
                className="px-4 py-2 rounded-lg bg-neo-cyan text-slate-900 font-medium text-sm hover:bg-neo-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {createMode ? 'Create Template' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template List */}
      <div className="divide-y divide-slate-700">
        {TEMPLATE_TYPES.map(type => (
          <div key={type}>
            {/* Type Header */}
            <button
              onClick={() => toggleExpanded(type)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {type === 'riddle' ? '🧩' : type === 'image' ? '🖼️' : type === 'social_content' ? '📱' : '⚡'}
                </span>
                <span className="font-medium text-neo-white">{TEMPLATE_TYPE_LABELS[type]}</span>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                  {templatesByType[type].length} template{templatesByType[type].length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startCreate(type);
                  }}
                  className="p-1.5 rounded-lg border border-neo-cyan/30 text-neo-cyan hover:bg-neo-cyan/10 transition-colors"
                  title="Create new template"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {expandedTypes.has(type) ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Templates for this type */}
            <AnimatePresence>
              {expandedTypes.has(type) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {templatesByType[type].length === 0 ? (
                    <div className="px-4 pb-4 text-sm text-slate-500 italic">
                      No templates yet. Click + to create one.
                    </div>
                  ) : (
                    <div className="pb-2">
                      {templatesByType[type].map(template => (
                        <div
                          key={template.id}
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
                                onClick={() => copyToClipboard(template.template_content)}
                                className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                                title="Copy template"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                              <button
                                onClick={() => setSelectedTemplate(template === selectedTemplate ? null : template)}
                                className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                                title="Preview template"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                              <button
                                onClick={() => startEdit(template)}
                                className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                                title="Edit template"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-neo-cyan" />
                              </button>
                              <button
                                onClick={() => handleDelete(template.id)}
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

                          {/* Preview */}
                          {selectedTemplate?.id === template.id && !editMode && (
                            <div className="mt-2 pt-2 border-t border-slate-700">
                              <pre className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                                {template.template_content}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
