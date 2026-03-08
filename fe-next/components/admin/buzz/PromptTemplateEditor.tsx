'use client';

/**
 * Prompt Template Editor Component
 * Orchestrates viewing, editing, and creating prompt templates for Daily Buzz generation
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react';
import { getSession } from '@/lib/supabase';
import { TEMPLATE_TYPE_LABELS, type PromptTemplate, type TemplateType } from './types';
import {
  TemplateForm,
  TemplateList,
  DEFAULT_PLACEHOLDERS,
  type TemplateFormData,
} from './prompt-templates';

interface Props {
  onClose?: () => void;
}

export default function PromptTemplateEditor({ onClose }: Props): React.ReactElement {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<TemplateType>>(
    new Set<TemplateType>(['riddle', 'image'])
  );
  const [saving, setSaving] = useState(false);
  const [fetchingDefault, setFetchingDefault] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    template_type: 'riddle',
    language: null,
    name: '',
    description: '',
    template_content: '',
    placeholders: [],
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: { session } } = await getSession();
    if (!session?.access_token) {
      setError('No active session');
      setLoading(false);
      return;
    }

    const response = await fetch('/api/admin/buzz/prompt-templates?active_only=false', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error || 'Failed to fetch templates');
      setLoading(false);
      return;
    }

    const data = await response.json();
    setTemplates(data.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);

    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        setError('No active session');
        return;
      }

      const url = createMode
        ? '/api/admin/buzz/prompt-templates'
        : `/api/admin/buzz/prompt-templates/${selectedTemplate?.id}`;

      const response = await fetch(url, {
        method: createMode ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ...formData, language: formData.language || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to save template');
        return;
      }

      showSuccess(createMode ? 'Template created successfully' : 'Template updated successfully');
      setEditMode(false);
      setCreateMode(false);
      setSelectedTemplate(null);
      await fetchTemplates();
    } catch (err) {
      console.error('Failed to save template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(templateId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this template?')) return;

    const { data: { session } } = await getSession();
    if (!session?.access_token) {
      setError('No active session');
      return;
    }

    const response = await fetch(`/api/admin/buzz/prompt-templates/${templateId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error || 'Failed to delete template');
      return;
    }

    showSuccess('Template deleted successfully');
    await fetchTemplates();
  }

  async function startCreate(type: TemplateType): Promise<void> {
    setFetchingDefault(true);
    setError(null);

    // Set initial form data with empty content (will be updated after fetch)
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

    // Fetch default template content
    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        setFetchingDefault(false);
        return;
      }

      const response = await fetch(`/api/admin/buzz/prompt-templates/default?type=${type}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.content) {
          setFormData((prev) => ({
            ...prev,
            template_content: data.data.content,
          }));
        }
      }
    } catch {
      // Silently fail - user can still create template with empty content
      console.warn('Failed to fetch default template content');
    } finally {
      setFetchingDefault(false);
    }
  }

  function startEdit(template: PromptTemplate): void {
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
  }

  function cancelEdit(): void {
    setEditMode(false);
    setCreateMode(false);
    setSelectedTemplate(null);
  }

  function showSuccess(message: string): void {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Copied to clipboard');
    } catch {
      setError('Failed to copy to clipboard');
    }
  }

  function toggleExpanded(type: TemplateType): void {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-neo-cyan" />
        <span className="ms-2 text-slate-400">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      <Header onRefresh={fetchTemplates} onClose={onClose} />

      <MessageBanner
        error={error}
        successMessage={successMessage}
        onDismissError={() => setError(null)}
      />

      {editMode && (
        <TemplateForm
          formData={formData}
          isCreateMode={createMode}
          isSaving={saving}
          isLoadingDefault={fetchingDefault}
          templateName={selectedTemplate?.name}
          onFormChange={setFormData}
          onSave={handleSave}
          onCancel={cancelEdit}
        />
      )}

      <TemplateList
        templates={templates}
        expandedTypes={expandedTypes}
        selectedTemplateId={selectedTemplate?.id ?? null}
        isEditing={editMode}
        onToggleExpand={toggleExpanded}
        onCreateTemplate={startCreate}
        onSelectTemplate={setSelectedTemplate}
        onEditTemplate={startEdit}
        onDeleteTemplate={handleDelete}
        onCopyTemplate={copyToClipboard}
      />
    </div>
  );
}

interface HeaderProps {
  onRefresh: () => void;
  onClose?: () => void;
}

function Header({ onRefresh, onClose }: HeaderProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-neo-yellow" />
        <h2 className="text-lg font-bold text-neo-white">Prompt Templates</h2>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
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
  );
}

interface MessageBannerProps {
  error: string | null;
  successMessage: string | null;
  onDismissError: () => void;
}

function MessageBanner({
  error,
  successMessage,
  onDismissError,
}: MessageBannerProps): React.ReactElement | null {
  if (!error && !successMessage) return null;

  return (
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
          <button onClick={onDismissError} className="ms-auto">
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
  );
}
