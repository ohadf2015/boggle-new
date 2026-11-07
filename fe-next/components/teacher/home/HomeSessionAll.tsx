'use client';

import { Dialog } from '@/components/ui/dialog';
import type { Language } from '@/lib/supabase/education/types';
import { useThemedPacks } from '@/components/teacher/StarterPacksSection.data';
import { SessionTemplatesSection } from '@/components/teacher/StarterPacksSection.sessions';
import { NbDialogBody, NbDialogContent, NbDialogHeader } from '@/components/teacher/nb/NbDialog';

type T = (key: string, params?: Record<string, string | number>) => string;

export function HomeSessionAll({ open, onOpenChange, language, classroomId, t }: { open: boolean; onOpenChange: (open: boolean) => void; language: Language; classroomId: string; t: T }) {
  const packs = useThemedPacks(language);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NbDialogContent data-testid="home-session-all" size="xl" phone="full">
        <NbDialogHeader
          color="cyan"
          title={t('education.starterPacks.sessions.title')}
          description={t('education.starterPacks.sessions.subtitle')}
          closeLabel={t('common.close')}
        />
        {/* The section repeats the strip's title and line; the strip already says them. */}
        <NbDialogBody className="@container [&>section>div:first-child]:hidden">
          <SessionTemplatesSection language={language} packs={packs} classroomId={classroomId} />
        </NbDialogBody>
      </NbDialogContent>
    </Dialog>
  );
}

export default HomeSessionAll;
