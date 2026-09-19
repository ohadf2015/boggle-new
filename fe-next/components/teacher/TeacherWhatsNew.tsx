'use client';

/**
 * TeacherWhatsNew — header button with an unread dot + a sheet listing every
 * classroom update, newest first. Opening it marks the latest update as seen.
 * Content lives in lib/education/teacherChangelog.ts (add the next update there).
 */

import { useState, useEffect } from 'react';
import { Sparkles, Gift, Trophy, Puzzle, QrCode, Repeat, BarChart3, BookOpen, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
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
  const { t, language } = useLanguage();
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

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Light-only surface (Pitfalls Class 5): every child sets its own dark text. */}
        <DialogContent
          className="sm:max-w-lg bg-neo-cream dark:bg-neo-cream text-black dark:text-black border-3 border-black shadow-hard-lg rounded-neo overflow-hidden p-0"
          hideCloseButton
        >
          <div className="bg-neo-lime px-5 py-4 border-b-3 border-black flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-2xl font-neo-display font-black normal-case text-black">
                {t('education.whatsNew.title')}
              </DialogTitle>
              <p className="text-sm font-bold text-black/70">{t('education.whatsNew.subtitle')}</p>
            </div>
            <DialogClose asChild>
              <button className="text-black hover:bg-black/10 p-1 rounded transition-colors" aria-label={t('common.close')}>
                <X className="size-5" />
              </button>
            </DialogClose>
          </div>

          <div className="max-h-[65dvh] overflow-y-auto p-5 space-y-6">
            {TEACHER_CHANGELOG.map((entry) => (
              <section key={entry.id} aria-labelledby={`whats-new-${entry.id}`}>
                <p className="text-xs font-black uppercase tracking-wider text-black/60">{formatDate(entry.date, language)}</p>
                <h3 id={`whats-new-${entry.id}`} className="font-neo-display font-black text-lg text-black mb-3">
                  {t(`education.whatsNew.entries.${entry.id}.title`)}
                </h3>
                <ul className="space-y-2.5">
                  {entry.items.map(({ key, icon }) => {
                    const Icon = ICONS[icon];
                    return (
                      <li key={key} className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-cyan">
                          <Icon className="size-4 text-black" aria-hidden="true" />
                        </span>
                        <span className="text-sm font-semibold leading-snug text-black">
                          {t(`education.whatsNew.entries.${entry.id}.${key}`)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <div className="border-t-3 border-black p-4">
            <DialogClose asChild>
              <button className="w-full rounded-neo border-3 border-black bg-neo-black py-3 font-neo-display font-black uppercase text-white shadow-hard-sm">
                {t('education.whatsNew.close')}
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
