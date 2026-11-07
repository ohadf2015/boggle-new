'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/dialog';
import type { Language } from '@/lib/supabase/education/types';
import { LanguagePicker } from '@/components/education/pickers/LanguagePicker';
import { NbDialogBody, NbDialogContent, NbDialogFooter, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import { NB_INPUT, NB_PRIMARY, NB_SECONDARY } from '@/components/teacher/nb/nbStyles';

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
      <NbDialogContent size="sm" aria-describedby={undefined}>
        <NbDialogHeader
          color="orange"
          title={t('teacher.classroom.edit')}
          srDescription={t('teacher.classroom.dialog.editDescription')}
          closeLabel={t('common.close')}
        />
        <NbDialogBody className="space-y-4">
          <div>
            <label htmlFor="classroom-form-name" className="mb-2 block font-neo-body text-sm font-black text-neo-cream">
              {t('teacher.classroom.name')}
            </label>
            <input
              id="classroom-form-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder={t('teacher.classroom.namePlaceholder')}
              className={NB_INPUT}
            />
          </div>

          <LanguagePicker
            label={t('teacher.classroom.defaultLanguage', 'Default language')}
            value={selectedLanguage}
            onChange={setSelectedLanguage}
            showBoardHint
          />
        </NbDialogBody>
        <NbDialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={NB_SECONDARY}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !name.trim()}
            className={cn(NB_PRIMARY, 'sm:min-w-44')}
          >
            {isSaving ? t('common.loading') : t('teacher.classroom.edit')}
          </button>
        </NbDialogFooter>
      </NbDialogContent>
    </Dialog>
  );
}
