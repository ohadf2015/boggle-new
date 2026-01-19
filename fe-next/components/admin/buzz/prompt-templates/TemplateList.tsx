'use client';

/**
 * TemplateList - Displays grouped templates by type with expand/collapse
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { TEMPLATE_TYPES, TEMPLATE_TYPE_LABELS, type PromptTemplate, type TemplateType } from '../types';
import { TemplateCard } from './TemplateCard';
import { getTemplateTypeIcon } from './constants';

interface TemplateListProps {
  templates: PromptTemplate[];
  expandedTypes: Set<TemplateType>;
  selectedTemplateId: number | null;
  isEditing: boolean;
  onToggleExpand: (type: TemplateType) => void;
  onCreateTemplate: (type: TemplateType) => void;
  onSelectTemplate: (template: PromptTemplate | null) => void;
  onEditTemplate: (template: PromptTemplate) => void;
  onDeleteTemplate: (templateId: number) => void;
  onCopyTemplate: (content: string) => void;
}

function groupTemplatesByType(
  templates: PromptTemplate[]
): Record<TemplateType, PromptTemplate[]> {
  return TEMPLATE_TYPES.reduce(
    (acc, type) => {
      acc[type] = templates.filter((t) => t.template_type === type);
      return acc;
    },
    {} as Record<TemplateType, PromptTemplate[]>
  );
}

export function TemplateList({
  templates,
  expandedTypes,
  selectedTemplateId,
  isEditing,
  onToggleExpand,
  onCreateTemplate,
  onSelectTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onCopyTemplate,
}: TemplateListProps): React.ReactElement {
  const templatesByType = groupTemplatesByType(templates);

  return (
    <div className="divide-y divide-slate-700">
      {TEMPLATE_TYPES.map((type) => (
        <TemplateTypeSection
          key={type}
          type={type}
          templates={templatesByType[type]}
          isExpanded={expandedTypes.has(type)}
          selectedTemplateId={selectedTemplateId}
          isEditing={isEditing}
          onToggleExpand={() => onToggleExpand(type)}
          onCreateTemplate={() => onCreateTemplate(type)}
          onSelectTemplate={onSelectTemplate}
          onEditTemplate={onEditTemplate}
          onDeleteTemplate={onDeleteTemplate}
          onCopyTemplate={onCopyTemplate}
        />
      ))}
    </div>
  );
}

interface TemplateTypeSectionProps {
  type: TemplateType;
  templates: PromptTemplate[];
  isExpanded: boolean;
  selectedTemplateId: number | null;
  isEditing: boolean;
  onToggleExpand: () => void;
  onCreateTemplate: () => void;
  onSelectTemplate: (template: PromptTemplate | null) => void;
  onEditTemplate: (template: PromptTemplate) => void;
  onDeleteTemplate: (templateId: number) => void;
  onCopyTemplate: (content: string) => void;
}

function TemplateTypeSection({
  type,
  templates,
  isExpanded,
  selectedTemplateId,
  isEditing,
  onToggleExpand,
  onCreateTemplate,
  onSelectTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onCopyTemplate,
}: TemplateTypeSectionProps): React.ReactElement {
  const templateCount = templates.length;
  const countLabel = templateCount === 1 ? 'template' : 'templates';

  return (
    <div>
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{getTemplateTypeIcon(type)}</span>
          <span className="font-medium text-neo-white">{TEMPLATE_TYPE_LABELS[type]}</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
            {templateCount} {countLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateTemplate();
            }}
            className="p-1.5 rounded-lg border border-neo-cyan/30 text-neo-cyan hover:bg-neo-cyan/10 transition-colors"
            title="Create new template"
          >
            <Plus className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {templates.length === 0 ? (
              <div className="px-4 pb-4 text-sm text-slate-500 italic">
                No templates yet. Click + to create one.
              </div>
            ) : (
              <div className="pb-2">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplateId === template.id}
                    isEditing={isEditing}
                    onSelect={() =>
                      onSelectTemplate(selectedTemplateId === template.id ? null : template)
                    }
                    onEdit={() => onEditTemplate(template)}
                    onDelete={() => onDeleteTemplate(template.id)}
                    onCopy={() => onCopyTemplate(template.template_content)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
