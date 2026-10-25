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
  initialName?: string;
  initialLanguage?: Language;
  isSaving?: boolean;
  onSubmit: (name: string, language: Language) => void;
}

/** Rename a class or change its language. Creating a class is the /teacher/classroom/new flow. */
export function ClassroomFormDialog({
  open,
  onOpenChange,
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

  // Re-seed on every open: the parent keeps one mounted dialog across classes.
  useEffect(() => {
    if (open) {
      setName(initialName);
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
          <DialogTitle>{t('teacher.classroom.edit')}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          {t('teacher.classroom.dialog.editDescription')}
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
              className="flex-1 bg-neo-cream text-black font-black border-2 border-black shadow-hard-sm hover:bg-black/5 transition"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !name.trim()}
              className="flex-1 bg-neo-cyan text-black font-black border-2 border-black shadow-hard hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition"
            >
              {isSaving ? t('common.loading') : t('teacher.classroom.edit')}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
