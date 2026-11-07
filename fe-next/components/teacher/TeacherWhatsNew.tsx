'use client';

/**
 * TeacherWhatsNew — header button with an unread dot + a sheet listing every
 * classroom update, newest first. Opening it marks the latest update as seen.
 * Content lives in lib/education/teacherChangelog.ts (add the next update there).
 */

import { useState, useEffect } from 'react';
import { Sparkles, Gift, Trophy, Puzzle, QrCode, Repeat, BarChart3, BookOpen } from 'lucide-react';
import { Dialog, DialogClose } from '@/components/ui/dialog';
import { NbDialogBody, NbDialogContent, NbDialogFooter, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import { NB_BLOCK, NB_PRIMARY, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  TEACHER_CHANGELOG,
  hasUnseenTeacherUpdate,
  markTeacherUpdatesSeen,
  type WhatsNewIcon,
} from '@/lib/education/teacherChangelog';

const ICONS: Record<WhatsNewIcon, typeof Gift> = {
  gift: Gift,
  trophy: Trophy,
  puzzle: Puzzle,
  qr: QrCode,
  repeat: Repeat,
  chart: BarChart3,
  book: BookOpen,
};

function formatDate(iso: string, language: string): string {
  try {
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(`${iso}T12:00:00Z`));
  } catch {
    return iso;
  }
}

export function TeacherWhatsNew() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  // Read after mount: localStorage is not available during SSR.
  const [unseen, setUnseen] = useState(false);
  useEffect(() => setUnseen(hasUnseenTeacherUpdate()), []);

  const handleOpen = () => {
    markTeacherUpdatesSeen();
    setUnseen(false);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        data-testid="whats-new-button"
        onClick={handleOpen}
        aria-label={t('education.whatsNew.button')}
        className={cn(
          'relative flex items-center justify-center gap-2 shrink-0',
          'h-11 min-w-[44px] px-3',
          'bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo shadow-hard-sm',
          'font-neo-display font-black text-sm uppercase',
          'hover:-translate-y-0.5 active:translate-y-0 transition-transform motion-reduce:transition-none'
        )}
      >
        <Sparkles className="size-5" aria-hidden="true" />
        <span className="hidden md:inline">{t('education.whatsNew.button')}</span>
        {unseen && (
          <span
            data-testid="whats-new-dot"
            aria-hidden="true"
            className="absolute -top-1.5 -end-1.5 size-3.5 rounded-full bg-neo-pink border-2 border-neo-black"
          />
        )}
      </button>

      <TeacherWhatsNewDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/** The changelog sheet alone, for callers with their own trigger (the teacher avatar menu). */
export function TeacherWhatsNewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, language } = useLanguage();
  useEffect(() => {
    if (open) markTeacherUpdatesSeen();
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NbDialogContent size="md">
        <NbDialogHeader
          color="lime"
          title={t('education.whatsNew.title')}
          description={t('education.whatsNew.subtitle')}
          closeLabel={t('common.close')}
        />
        <NbDialogBody className="space-y-6">
          {TEACHER_CHANGELOG.map((entry) => (
            <section key={entry.id} aria-labelledby={`whats-new-${entry.id}`}>
              <p className={cn(NB_STICKER, NB_BLOCK.cream)}>{formatDate(entry.date, language)}</p>
              <h3 id={`whats-new-${entry.id}`} className="mb-3 mt-2 font-neo-display text-lg font-black text-neo-cream">
                {t(`education.whatsNew.entries.${entry.id}.title`)}
              </h3>
              <ul className="space-y-2.5">
                {entry.items.map(({ key, icon }) => {
                  const Icon = ICONS[icon];
                  return (
                    <li key={key} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cyan shadow-hard">
                        <Icon className="size-4 text-neo-black" aria-hidden="true" />
                      </span>
                      <span className="font-neo-body text-sm font-semibold leading-snug text-neo-cream/90">
                        {t(`education.whatsNew.entries.${entry.id}.${key}`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </NbDialogBody>
        <NbDialogFooter>
          <DialogClose asChild>
            <button type="button" className={cn(NB_PRIMARY, 'w-full sm:w-auto')}>
              {t('education.whatsNew.close')}
            </button>
          </DialogClose>
        </NbDialogFooter>
      </NbDialogContent>
    </Dialog>
  );
}
