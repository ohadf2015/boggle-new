'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import type { Language } from '@/lib/supabase/education/types';
import { LanguagePicker } from '@/components/education/pickers/LanguagePicker';

interface ClassroomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialName?: string;
  initialLanguage?: Language;
  isSaving?: boolean;
  onSubmit: (name: string, language: Language) => void;
}

/**
 * Create / edit classroom form, extracted from ClassroomManager so that file
 * stays under the 500-line cap and both modes share one skinned dialog.
 *
 * Built on components/ui/dialog (neo-brutalist skin, entrance animation,
 * modal-open signal for the native ad banner) instead of the raw Radix pair
 * the manager used to hand-roll.
 */
export function ClassroomFormDialog({
  open,
  onOpenChange,
  mode,
  initialName = '',
  initialLanguage,
  isSaving = false,
  onSubmit,
}: ClassroomFormDialogProps) {
  const { t, language } = useLanguage();
  const [name, setName] = useState(initialName);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    initialLanguage ?? (language as Language)
  );

  // Re-seed every time the dialog opens — the parent keeps one mounted dialog
  // for both modes, so stale values from the previous open must not leak in.
  // Create mode prefills the localized default: "name + go" is one tap, and
  // the prefill is selected on focus so typing replaces it wholesale.
  useEffect(() => {
    if (open) {
      setName(mode === 'create' ? t('teacher.classroom.defaultName') : initialName);
      setSelectedLanguage(initialLanguage ?? (language as Language));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, selectedLanguage);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        closeButtonLabel={t('common.close')}
        aria-describedby={undefined}
      >
        <DialogHeader variant="cyan">
          <DialogTitle>
            {mode === 'create' ? t('teacher.classroom.create') : t('teacher.classroom.edit')}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          {mode === 'create'
            ? t('teacher.classroom.dialog.createDescription')
            : t('teacher.classroom.dialog.editDescription')}
        </DialogDescription>

        <DialogBody className="space-y-4">
          <div>
            <label
              htmlFor="classroom-form-name"
              className="block text-sm font-neo-body font-black text-neo-black dark:text-neo-cream mb-2"
            >
              {t('teacher.classroom.name')}
            </label>
            <Input
              id="classroom-form-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder={t('teacher.classroom.namePlaceholder')}
              className="border-2 border-black shadow-hard-sm font-bold"
            />
          </div>

          <LanguagePicker
            label={t('teacher.classroom.language')}
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            tone="theme"
            showBoardHint
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-neo-cream text-black font-black border-2 border-black shadow-hard-sm hover:bg-black/5 transition-all"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !name.trim()}
              className="flex-1 bg-neo-cyan text-black font-black border-2 border-black shadow-hard hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
            >
              {isSaving
                ? t('common.loading')
                : mode === 'create'
                  ? t('teacher.classroom.create')
                  : t('teacher.classroom.edit')}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
