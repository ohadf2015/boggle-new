'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { copyToMine } from '@/lib/education/libraryClient';
import type { LibraryItem, LibraryLesson } from '@/lib/education/libraryTypes';
import LibraryCard from './LibraryCard';
import DiscoverFilters from './DiscoverFilters';
import ListPreviewSheet, { type PreviewBusy } from './ListPreviewSheet';
import ReportListDialog from './ReportListDialog';
import AssignListDialog from './AssignListDialog';
import { useDiscoverLibrary } from './useDiscoverLibrary';

interface DiscoverPanelProps {
  onOpenMyLists: () => void;
  onShareFirst: () => void;
  onCopied?: (lesson: LibraryLesson) => void;
}

export default function DiscoverPanel({ onOpenMyLists, onShareFirst, onCopied }: DiscoverPanelProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const lib = useDiscoverLibrary();
  const [open, setOpen] = useState<LibraryItem | null>(null);
  const [busy, setBusy] = useState<PreviewBusy>(null);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [reportFor, setReportFor] = useState<LibraryItem | null>(null);
  const [assignLessonId, setAssignLessonId] = useState<string | null>(null);

  const ensureCopy = async (item: LibraryItem, reuse: boolean) => {
    if (!user) return null;
    const { lesson } = await copyToMine(item, user.id, { reuse });
    if (!lesson) toast.error(t('eduLibrary.preview.copyFailed'));
    return lesson;
  };

  const host = async () => {
    if (!open) return;
    setBusy('host');
    const lesson = await ensureCopy(open, true);
    setBusy(null);
    if (!lesson) return;
    router.push(`/${language}/education/classroom-game?lessonId=${lesson.id}`);
  };

  const assign = async () => {
    if (!open) return;
    setBusy('assign');
    const lesson = await ensureCopy(open, true);
    setBusy(null);
    if (!lesson) return;
    setOpen(null);
    setAssignLessonId(lesson.id);
  };

  const copy = async () => {
    if (!open) return;
    setBusy('copy');
    const lesson = await ensureCopy(open, false);
    setBusy(null);
    if (!lesson) return;
    setCopiedIds((s) => new Set(s).add(open.id));
    if (open.source === 'teacher' && open.copyCount !== null) lib.patchItem(open.id, { copyCount: open.copyCount + 1 });
    toast.success(t('eduLibrary.preview.copiedToast', { name: open.name }));
    onCopied?.(lesson);
  };

  return (
    <div className="space-y-3">
      <DiscoverFilters filters={lib.filters} onChange={lib.update} total={lib.total} />

      {lib.status === 'error' && (
        <div className="flex items-center justify-between gap-3 rounded-neo border-2 border-neo-pink bg-neo-pink/10 p-3 text-sm font-bold text-neo-white">
          {t('eduLibrary.discover.loadError')}
          <button type="button" onClick={lib.reload} className="inline-flex min-h-9 items-center gap-1 rounded-neo border-2 border-neo-cream px-2">
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('eduLibrary.discover.retry')}
          </button>
        </div>
      )}

      {lib.status === 'loading' ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-neo border-3 border-neo-cream/50 bg-neo-navy-light" />
          ))}
        </div>
      ) : lib.items.length === 0 ? (
        <div className="rounded-neo border-3 border-dashed border-neo-cream/40 px-4 py-8 text-center">
          <p className="font-neo-display text-lg text-neo-white">{t('eduLibrary.discover.emptyTitle')}</p>
          <p className="mx-auto mt-1 max-w-prose text-sm text-neo-white/75">{t('eduLibrary.discover.emptyHint')}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {lib.filters.language !== 'all' && (
              <button type="button" onClick={() => lib.update({ language: 'all', query: '', grade: null, topic: null, source: 'all' })} className="min-h-11 rounded-neo border-2 border-neo-cream px-3 font-bold text-neo-white">
                {t('eduLibrary.discover.tryAllLanguages')}
              </button>
            )}
            <button type="button" onClick={onShareFirst} className="inline-flex min-h-11 items-center gap-2 rounded-neo border-3 border-neo-black bg-neo-lime px-3 font-neo-display font-bold uppercase text-neo-black shadow-hard">
              <Globe2 className="size-4" aria-hidden="true" />
              {t('eduLibrary.discover.shareFirst')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div data-testid="discover-grid" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {lib.items.map((item, i) => (
              <LibraryCard key={item.id} item={item} index={i} onOpen={() => setOpen(item)} />
            ))}
          </div>
          {lib.teacherCount === 0 && lib.filters.source !== 'verified' && (
            <button
              type="button"
              onClick={onShareFirst}
              className="flex w-full items-center gap-3 rounded-neo border-2 border-dashed border-neo-lime/60 bg-neo-lime/5 p-3 text-start text-sm text-neo-white"
            >
              <Globe2 className="size-5 shrink-0 text-neo-lime" aria-hidden="true" />
              <span><strong className="text-neo-lime">{t('eduLibrary.discover.beFirstTitle')}</strong> {t('eduLibrary.discover.beFirstHint')}</span>
            </button>
          )}
          {lib.pageCount > 1 && (
            <nav data-testid="discover-pager" className="flex items-center justify-center gap-3 pb-2" aria-label={t('eduLibrary.pager.label')}>
              <button type="button" disabled={lib.page === 0} onClick={() => lib.setPage(lib.page - 1)} className="min-h-11 rounded-neo border-2 border-neo-cream bg-neo-navy-light px-4 font-bold text-neo-white shadow-hard-sm disabled:opacity-40">
                {t('eduLibrary.pager.prev')}
              </button>
              <span className="text-sm font-bold tabular-nums text-neo-white">
                {t('eduLibrary.pager.status', { page: lib.page + 1, total: lib.pageCount })}
              </span>
              <button type="button" disabled={lib.page >= lib.pageCount - 1} onClick={() => lib.setPage(lib.page + 1)} className="min-h-11 rounded-neo border-2 border-neo-cream bg-neo-navy-light px-4 font-bold text-neo-white shadow-hard-sm disabled:opacity-40">
                {t('eduLibrary.pager.next')}
              </button>
            </nav>
          )}
        </>
      )}

      <ListPreviewSheet
        item={open}
        onClose={() => setOpen(null)}
        busy={busy}
        copied={open ? copiedIds.has(open.id) : false}
        onHost={() => void host()}
        onAssign={() => void assign()}
        onCopy={() => void copy()}
        onOpenMyLists={() => { setOpen(null); onOpenMyLists(); }}
        onReport={() => { setReportFor(open); setOpen(null); }}
      />
      <ReportListDialog
        lessonId={reportFor?.id ?? null}
        listName={reportFor?.name ?? ''}
        onClose={() => setReportFor(null)}
        onReported={() => setReportFor(null)}
      />
      <AssignListDialog lessonId={assignLessonId} onClose={() => setAssignLessonId(null)} />
    </div>
  );
}
