'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, LayoutGrid, ListChecks, Loader2, Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import WordListEditor from '@/components/teacher/WordListEditor';
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';
import {
  listModerationIssues,
  mergeWords,
  parseWordPaste,
  type GradeBand,
  type LibraryTopic,
  type WordEntry,
} from '@/lib/education/library';
import WordChips from './WordChips';
import ListImportBar from './ListImportBar';
import ListMetaFields from './ListMetaFields';
import ShareToDiscoverSwitch from './ShareToDiscoverSwitch';

export interface ListDraft {
  id?: string;
  name: string;
  description: string;
  language: Language;
  gradeBand: GradeBand | null;
  topic: LibraryTopic | null;
  classroomId: string;
  isPublic: boolean;
  words: VocabularyWord[];
}

export function emptyListDraft(language: Language): ListDraft {
  return { name: '', description: '', language, gradeBand: null, topic: null, classroomId: '', isPublic: false, words: [] };
}

interface ListEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ListDraft;
  classrooms: { id: string; name: string }[];
  onSave: (draft: ListDraft) => Promise<boolean>;
  remixedFrom?: { title: string; author: string | null } | null;
  /** Persist an unsaved draft (create only). */
  onDraftChange?: (draft: ListDraft) => void;
}

const AUTO_COMMIT = /[\n,;|·、，；\t]/;
const HAS_DEFINITION = /\s[-–—=]\s|:\s/;

export default function ListEditorSheet({ open, onOpenChange, initial, classrooms, onSave, remixedFrom, onDraftChange }: ListEditorSheetProps) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<ListDraft>(initial);
  const [fragment, setFragment] = useState('');
  const [fresh, setFresh] = useState<Map<string, number>>(new Map());
  const [feedback, setFeedback] = useState<{ added: number; duplicates: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<'chips' | 'details'>('chips');
  const [hint, setHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(initial);
    setFragment('');
    setFresh(new Map());
    setFeedback(null);
    setSelected(null);
    setHint(null);
    setSaved(false);
    // The draft object is recreated by the parent each render; reset only when the sheet (re)opens or the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial.id]);

  useEffect(() => {
    if (open && !draft.id) onDraftChange?.(draft);
  }, [open, draft, onDraftChange]);

  const issues = useMemo(() => (draft.isPublic ? listModerationIssues(draft) : []), [draft]);
  const update = (patch: Partial<ListDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setHint(null);
    setSaved(false);
  };

  const addEntries = (entries: WordEntry[], base: ListDraft = draft): ListDraft => {
    if (entries.length === 0) return base;
    const { words, added, duplicates } = mergeWords(base.words, entries, base.language);
    const nextFresh = new Map<string, number>();
    words.slice(base.words.length).forEach((w, i) => nextFresh.set(w.word, i));
    setFresh(nextFresh);
    setFeedback({ added, duplicates });
    const next = { ...base, words };
    setDraft(next);
    setHint(null);
    setSaved(false);
    return next;
  };

  const onBoxChange = (value: string) => {
    const lastBreak = Math.max(...[...'\n,;|·、，；\t'].map((c) => value.lastIndexOf(c)));
    const autoCommit = AUTO_COMMIT.test(value) && (value.includes('\n') || !HAS_DEFINITION.test(value));
    if (!autoCommit || lastBreak < 0) {
      setFragment(value);
      return;
    }
    addEntries(parseWordPaste(value.slice(0, lastBreak + 1)));
    setFragment(value.slice(lastBreak + 1).trimStart());
  };

  const commitFragment = (base: ListDraft = draft): ListDraft => {
    if (!fragment.trim()) return base;
    const next = addEntries(parseWordPaste(fragment), base);
    setFragment('');
    return next;
  };

  const handleSave = async () => {
    const next = commitFragment();
    if (!next.name.trim()) {
      setHint(t('eduLibrary.editor.needTitle'));
      titleRef.current?.focus();
      return;
    }
    if (next.words.length === 0) {
      setHint(t('eduLibrary.editor.needWords'));
      return;
    }
    if (next.isPublic && listModerationIssues(next).length > 0) {
      setHint(t('eduLibrary.share.blocked'));
      return;
    }
    setSaving(true);
    const ok = await onSave({ ...next, name: next.name.trim(), description: next.description.trim() });
    setSaving(false);
    if (ok) setSaved(true);
  };

  const removeWord = (i: number) => {
    update({ words: draft.words.filter((_, idx) => idx !== i) });
    setSelected(null);
  };
  const changeWord = (i: number, patch: Partial<VocabularyWord>) =>
    update({ words: draft.words.map((w, idx) => (idx === i ? { ...w, ...patch } : w)) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="list-editor-sheet"
        hideCloseButton
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void handleSave();
        }}
        className={cn(
          'flex h-dvh max-h-dvh w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-neo-navy p-0 text-neo-white',
          'max-sm:data-[state=open]:animate-none max-sm:data-[state=closed]:animate-none',
          'sm:h-auto sm:max-h-[92dvh] sm:w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-3xl xl:max-w-3xl sm:rounded-neo-lg sm:border-4 sm:border-neo-cream',
        )}
        style={{ backgroundImage: 'none' }}
      >
        <DialogTitle className="sr-only">{draft.id ? t('eduLibrary.editor.editTitle') : t('eduLibrary.editor.createTitle')}</DialogTitle>
        <DialogDescription className="sr-only">{t('eduLibrary.editor.description')}</DialogDescription>

        <header className="flex shrink-0 items-center gap-2 border-b-3 border-neo-cream/50 bg-neo-navy-light px-3 py-2 sm:px-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t('common.close')}
            className="flex size-11 shrink-0 items-center justify-center rounded-neo border-2 border-neo-cream bg-neo-navy text-neo-white shadow-hard-sm active:translate-y-0.5 active:shadow-none"
          >
            <X className="size-5" strokeWidth={3} aria-hidden="true" />
          </button>
          <input
            ref={titleRef}
            data-testid="list-title"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder={t('eduLibrary.editor.titlePlaceholder')}
            aria-label={t('eduLibrary.editor.titleLabel')}
            maxLength={80}
            style={{ fontFamily: 'var(--font-fredoka), var(--font-heebo-hebrew), var(--font-rubik), sans-serif', fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}
            className="h-11 min-w-0 flex-1 rounded-neo border-2 border-transparent bg-transparent px-2 font-neo-display text-xl font-bold text-neo-white placeholder:text-neo-white/40 focus:border-neo-cyan focus:outline-hidden sm:text-2xl"
          />
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
          {remixedFrom && (
            <p className="inline-flex items-center gap-1.5 rounded-neo bg-neo-purple/25 px-2 py-1 text-xs font-bold text-neo-white">
              <Sparkles className="size-3.5 text-neo-yellow" aria-hidden="true" />
              {remixedFrom.author
                ? t('eduLibrary.remixedFrom', { title: remixedFrom.title, author: remixedFrom.author })
                : t('eduLibrary.remixedFromNoAuthor', { title: remixedFrom.title })}
            </p>
          )}

          <ListMetaFields
            draft={draft}
            classrooms={draft.id ? [] : classrooms}
            onChange={update}
          />

          <div>
            <label htmlFor="list-paste-box" className="mb-1.5 block font-neo-display text-sm font-bold uppercase text-neo-lime">
              {t('eduLibrary.editor.pasteLabel')}
            </label>
            <textarea
              id="list-paste-box"
              data-testid="list-paste-box"
              value={fragment}
              rows={2}
              onChange={(e) => onBoxChange(e.target.value)}
              onPaste={(e) => {
                const text = e.clipboardData?.getData('text') ?? '';
                if (!text) return;
                e.preventDefault();
                addEntries(parseWordPaste(fragment + text));
                setFragment('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                  commitFragment();
                }
              }}
              placeholder={t('eduLibrary.editor.pastePlaceholder')}
              className="block min-h-[4.5rem] w-full resize-y rounded-neo border-3 border-dashed border-neo-cream/70 bg-neo-black/30 px-3 py-2.5 font-neo-body text-base text-neo-white placeholder:text-neo-white/45 focus:border-solid focus:border-neo-cyan focus:outline-hidden"
            />
            <p data-testid="list-paste-feedback" aria-live="polite" className="mt-1.5 min-h-5 text-xs font-bold">
              {feedback && feedback.added > 0 && (
                <span key={`${draft.words.length}`} className="me-2 inline-block text-neo-lime motion-safe:animate-pop-in">
                  {t('eduLibrary.editor.addedWords', { count: feedback.added })}
                </span>
              )}
              {feedback && feedback.duplicates > 0 && (
                <span className="text-neo-yellow">{t('eduLibrary.editor.skippedDuplicates', { count: feedback.duplicates })}</span>
              )}
            </p>
          </div>

          <ListImportBar
            language={draft.language}
            onEntries={(entries, title) => {
              const base = !draft.name.trim() && title ? { ...draft, name: title } : draft;
              addEntries(entries, base);
            }}
            onFileError={() => setHint(t('eduLibrary.editor.fileError'))}
          />

          <section aria-labelledby="list-words-heading" className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 id="list-words-heading" className="flex items-center gap-2 font-neo-display text-base font-bold text-neo-white">
                {t('eduLibrary.editor.wordsHeading')}
                <span key={draft.words.length} className="rounded border-2 border-neo-black bg-neo-cyan px-1.5 text-sm tabular-nums text-neo-black motion-safe:animate-neo-pop">
                  {draft.words.length}
                </span>
              </h3>
              {draft.words.length > 0 && (
                <div role="group" aria-label={t('eduLibrary.editor.viewLabel')} className="flex overflow-hidden rounded-neo border-2 border-neo-cream">
                  {(['chips', 'details'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={view === v}
                      onClick={() => setView(v)}
                      className={cn(
                        'flex min-h-9 items-center gap-1 px-2.5 text-xs font-bold uppercase',
                        view === v ? 'bg-neo-cream text-neo-black' : 'bg-neo-navy-light text-neo-white',
                      )}
                    >
                      {v === 'chips' ? <LayoutGrid className="size-3.5" aria-hidden="true" /> : <ListChecks className="size-3.5" aria-hidden="true" />}
                      {t(`eduLibrary.editor.view.${v}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {draft.words.length === 0 ? (
              <p className="rounded-neo border-2 border-dashed border-neo-cream/30 px-3 py-6 text-center text-sm text-neo-white/70">
                {t('eduLibrary.editor.emptyWords')}
              </p>
            ) : view === 'chips' ? (
              <WordChips
                words={draft.words}
                language={draft.language}
                fresh={fresh}
                selected={selected}
                onSelect={setSelected}
                onRemove={removeWord}
                onChange={changeWord}
              />
            ) : (
              <WordListEditor words={draft.words} onWordsChange={(words) => update({ words })} language={draft.language} maxHeight="max-h-none" />
            )}
          </section>

          <ShareToDiscoverSwitch checked={draft.isPublic} onChange={(isPublic) => update({ isPublic })} issues={issues} />
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t-3 border-neo-cream/50 bg-neo-navy-light px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <p data-testid="list-save-hint" role="status" className="min-w-0 flex-1 text-sm font-bold text-neo-yellow">
            {hint ?? (saved ? <span className="text-neo-lime">{t('eduLibrary.editor.saved')}</span> : null)}
          </p>
          <button
            type="button"
            data-testid="list-save"
            onClick={() => void handleSave()}
            disabled={saving}
            className={cn(
              'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-neo border-3 border-neo-black px-5 font-neo-display text-base font-bold uppercase text-neo-black',
              'shadow-hard transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-70',
              saved ? 'bg-neo-lime' : 'bg-neo-cyan',
            )}
          >
            {saving ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : saved ? <Check className="size-5" strokeWidth={3} aria-hidden="true" /> : null}
            {saving ? t('eduLibrary.editor.saving') : t('eduLibrary.editor.save')}
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
