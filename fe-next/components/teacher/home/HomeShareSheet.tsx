'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer, Projector } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { NeoButton } from '@/components/ui/button';
import { ClassSetupInviteCode } from '@/components/education/ClassSetupInviteCode';
import { useInviteShare } from '@/components/education/useInviteShare';
import { HqProjectorSheet } from '@/components/teacher/hq/HqProjectorSheet';
import { classroomJoinUrl, inviteLocale, joinAddressForDisplay } from '@/lib/education/classroomInvitePayload';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface HomeShareSheetProps {
  classroom: { id: string; name: string; join_code: string; member_count?: number | null; language?: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uiLanguage: string;
  t: T;
}

/** Home's Share code: the ready screen's code, QR and share channels in one sheet, plus the board view. */
export function HomeShareSheet({ classroom, open, onOpenChange, uiLanguage, t }: HomeShareSheetProps) {
  const [origin, setOrigin] = useState('');
  const [boardOpen, setBoardOpen] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const share = useInviteShare(classroom, t);
  const locale = inviteLocale(classroom.language, uiLanguage);
  const language = uiLanguage;
  const joinUrl = origin ? classroomJoinUrl(origin, locale, classroom.join_code) : '';
  const displayHost = origin ? `${joinAddressForDisplay(origin)}/${locale}/join` : '';

  return (
    <>
      <Dialog open={open && !boardOpen} onOpenChange={onOpenChange}>
        <DialogContent
          closeButtonLabel={t('common.close')}
          closeButtonVariant="minimal"
          style={{ backgroundImage: 'none' }}
          className="max-h-[90dvh] w-[calc(100%-1.5rem)] overflow-auto border-2 border-neo-cream/40 bg-neo-navy p-5 text-neo-cream dark:border-neo-cream/40 dark:bg-neo-navy sm:max-w-lg"
        >
          <DialogTitle className="pe-12 font-neo-display text-xl font-black normal-case tracking-normal text-neo-cream">{t('eduShell.home.shareTitle')}</DialogTitle>
          <DialogDescription dir="auto" className="font-neo-body text-sm text-neo-cream/75">{classroom.name}</DialogDescription>
          {open ? (
            <ClassSetupInviteCode
              code={classroom.join_code}
              className={classroom.name}
              joinUrl={joinUrl}
              displayHost={displayHost}
              onShare={(c, p) => void share(c, p)}
              t={t}
            />
          ) : null}
          <NeoButton variant="secondary" data-testid="home-share-board" onClick={() => setBoardOpen(true)} className="w-full">
            <Projector className="size-5" aria-hidden="true" />
            {t('academy.hq.openProjector')}
          </NeoButton>
          <Link
            href={`/${language}/teacher/join-sheet?code=${encodeURIComponent(classroom.join_code)}&name=${encodeURIComponent(classroom.name)}`}
            target="_blank"
            rel="noopener"
            data-testid="home-share-print"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-neo border-2 border-neo-cream/50 px-4 font-neo-body text-sm font-bold text-neo-cream hover:bg-neo-navy-light focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            <Printer className="size-4" aria-hidden="true" />
            {t('teacher.joinSheet.printAria')}
          </Link>
        </DialogContent>
      </Dialog>
      {boardOpen ? (
        <HqProjectorSheet
          classroom={{ id: classroom.id, name: classroom.name, join_code: classroom.join_code, member_count: classroom.member_count ?? undefined }}
          onClose={() => setBoardOpen(false)}
        />
      ) : null}
    </>
  );
}

export default HomeShareSheet;
