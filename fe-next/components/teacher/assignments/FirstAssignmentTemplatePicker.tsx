'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { FirstAssignmentTemplate } from '@/lib/education/firstAssignmentTemplates';

export function FirstAssignmentTemplatePicker({
  packs,
  isSubmitting,
  onAssign,
  onClose,
  onBrowseTemplates,
}: {
  packs: FirstAssignmentTemplate[];
  isSubmitting: boolean;
  onAssign: (pack: FirstAssignmentTemplate) => void;
  onClose: () => void;
  /** Optional escape to the full template gallery (grade band + subject). */
  onBrowseTemplates?: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div data-testid="first-assignment-templates" className="space-y-4">
      <p className="font-neo-body text-sm font-bold text-neo-white">
        {t('teacher.assignment.starterPacksTitle')}
      </p>
      <p className="font-neo-body text-xs text-neo-white/70 text-pretty">
        {t('teacher.assignment.starterPacksHint')}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {packs.map((pack) => (
          <button
            key={pack.id}
            type="button"
            data-testid={`first-assignment-template-${pack.id}`}
            disabled={isSubmitting}
            onClick={() => onAssign(pack)}
            className={cn(
              'min-h-11 rounded-neo border-3 border-neo-cream bg-neo-navy-light p-4 text-start',
              'hover:-translate-y-0.5 hover:shadow-hard-sm',
              'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            <span className="block font-neo-display text-sm font-black uppercase text-neo-white">
              {t(pack.nameKey)}
            </span>
            <span className="mt-1 block font-neo-body text-xs text-neo-white/70 text-pretty">
              {t(pack.descriptionKey)}
            </span>
            <span className="mt-2 block font-neo-body text-xs font-bold text-neo-cyan">
              {pack.words.length} {t('teacher.assignment.words')} · {t('teacher.assignment.starterPackDue')}
            </span>
          </button>
        ))}
      </div>
      <Button
        variant="outline"
        onClick={onClose}
        disabled={isSubmitting}
        className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
      >
        {t('common.cancel')}
      </Button>
      {onBrowseTemplates && (
        <button
          type="button"
          data-testid="first-assignment-browse-gallery"
          onClick={onBrowseTemplates}
          disabled={isSubmitting}
          className="ms-2 font-neo-body text-xs font-bold text-neo-cyan underline-offset-2 hover:underline disabled:opacity-60"
        >
          {t('teacher.assignment.templateGallery.browseAll')}
        </button>
      )}
    </div>
  );
}
