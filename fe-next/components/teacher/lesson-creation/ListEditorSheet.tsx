'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, LayoutGrid, ListChecks, Loader2, Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Dialog, DialogClose, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';
import { NbDialogBody, NbDialogContent, NbDialogFooter } from '@/components/teacher/nb/NbDialog';
import { NbAdvanced } from '@/components/teacher/nb/NbAdvanced';
import { NB_DIALOG_CLOSE, nbDialogHeaderClass } from '@/components/teacher/nb/nbDialogStyles';
import { NB_BLOCK, NB_PRIMARY, NB_STICKER } from '@/components/teacher/nb/nbStyles';
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
import { SINGLE_WORDS_ONLY_KEY, formatRejectedTerms, invalidLessonTerms } from '@/lib/education/singleWordTerm';
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
  const [feedback, setFeedback] = useState<{ added: number; duplicates: number; rejected: string[] } | null>(null);
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
    const { words, added, duplicates, rejected } = mergeWords(base.words, entries, base.language);
    const nextFresh = new Map<string, number>();
    words.slice(base.words.length).forEach((w, i) => nextFresh.set(w.word, i));
    setFresh(nextFresh);
    setFeedback({ added, duplicates, rejected });
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
    // A list saved before multi-word terms were blocked (or edited in another
    // tab) must not be saved with them: the board can't play "Rely on".
    const multiWord = invalidLessonTerms(next.words);
    if (multiWord.length > 0) {
      setHint(t(SINGLE_WORDS_ONLY_KEY, { terms: formatRejectedTerms(multiWord) }));
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
      <NbDialogContent
        data-testid="list-editor-sheet"
        size="xl"
        phone="full"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void handleSave();
        }}
      >
        <DialogTitle className="sr-only">{draft.id ? t('eduLibrary.editor.editTitle') : t('eduLibrary.editor.createTitle')}</DialogTitle>
        <DialogDescription className="sr-only">{t('eduLibrary.editor.description')}</DialogDescription>

        <header className={cn(nbDialogHeaderClass('navy'), 'items-center py-2.5 sm:py-3')}>
          <input
            ref={titleRef}
            data-testid="list-title"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder={t('eduLibrary.editor.titlePlaceholder')}
            aria-label={t('eduLibrary.editor.titleLabel')}
            maxLength={80}
            dir="auto"
            className="h-12 min-w-0 flex-1 rounded-neo border-[3px] border-dashed border-neo-cream/40 bg-transparent px-2.5 font-neo-display text-xl font-black text-neo-cream placeholder:text-neo-cream/45 focus:border-solid focus:border-neo-cyan focus:outline-hidden sm:text-2xl"
          />
          <DialogClose aria-label={t('common.close')} title={t('common.close')} className={NB_DIALOG_CLOSE}>
            <X className="size-5" strokeWidth={3} aria-hidden="true" />
          </DialogClose>
        </header>

        <NbDialogBody className="space-y-5">
          {remixedFrom && (
            <p className={cn(NB_STICKER, NB_BLOCK.purple, 'whitespace-normal')}>
              <Sparkles className="size-3.5 text-neo-yellow" aria-hidden="true" />
              {remixedFrom.author
                ? t('eduLibrary.remixedFrom', { title: remixedFrom.title, author: remixedFrom.author })
                : t('eduLibrary.remixedFromNoAuthor', { title: remixedFrom.title })}
            </p>
          )}

          <div>
            <label htmlFor="list-paste-box" className="mb-1.5 block font-neo-display text-base font-black text-neo-cream">
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
              className="block min-h-[5.5rem] w-full resize-y rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-3 py-2.5 font-neo-body text-base font-bold text-neo-black shadow-hard-lg placeholder:font-semibold placeholder:text-neo-black/50 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
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
              {feedback && feedback.rejected.length > 0 && (
                <span data-testid="list-paste-rejected" className="ms-2 inline-block text-neo-pink">
                  {t(SINGLE_WORDS_ONLY_KEY, { terms: formatRejectedTerms(feedback.rejected) })}
                </span>
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
              <h3 id="list-words-heading" className="flex items-center gap-2 font-neo-display text-base font-black text-neo-cream">
                {t('eduLibrary.editor.wordsHeading')}
                <span key={draft.words.length} className={cn(NB_STICKER, NB_BLOCK.cyan, 'text-sm tabular-nums motion-safe:animate-neo-pop')}>
                  {draft.words.length}
                </span>
              </h3>
              {draft.words.length > 0 && (
                <div role="group" aria-label={t('eduLibrary.editor.viewLabel')} className="flex overflow-hidden rounded-neo border-[3px] border-neo-cream/50">
                  {(['chips', 'details'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={view === v}
                      onClick={() => setView(v)}
                      className={cn(
                        'flex min-h-11 items-center gap-1 px-3 text-xs font-black',
                        view === v ? 'bg-neo-cream text-neo-black' : 'bg-neo-navy-light text-neo-cream',
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
              <p className="rounded-neo-lg border-[3px] border-dashed border-neo-cream/35 px-3 py-6 text-center font-neo-body text-sm font-semibold text-neo-cream/75">
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

          <NbAdvanced
            testId="list-advanced-toggle"
            forceOpen={draft.isPublic}
            label={
              <span className="flex flex-wrap items-center gap-2">
                {t('eduLibrary.editor.moreOptions')}
                <span lang={draft.language} className={cn(NB_STICKER, NB_BLOCK.cream)}>{nativeLanguageName(draft.language)}</span>
              </span>
            }
            closeLabel={t('eduShell.setup.advancedClose')}
          >
            <ListMetaFields draft={draft} classrooms={draft.id ? [] : classrooms} onChange={update} />
            <ShareToDiscoverSwitch checked={draft.isPublic} onChange={(isPublic) => update({ isPublic })} issues={issues} />
          </NbAdvanced>
        </NbDialogBody>

        <NbDialogFooter className="flex-row items-center gap-3 sm:justify-between">
          <p data-testid="list-save-hint" role="status" className="min-w-0 flex-1 font-neo-body text-sm font-bold text-neo-yellow">
            {hint ?? (saved ? <span className="text-neo-lime">{t('eduLibrary.editor.saved')}</span> : null)}
          </p>
          <button
            type="button"
            data-testid="list-save"
            onClick={() => void handleSave()}
            disabled={saving}
            className={cn(NB_PRIMARY, 'shrink-0 sm:min-w-40')}
          >
            {saving ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : saved ? <Check className="size-5" strokeWidth={3} aria-hidden="true" /> : null}
            {saving ? t('eduLibrary.editor.saving') : t('eduLibrary.editor.save')}
          </button>
        </NbDialogFooter>
      </NbDialogContent>
    </Dialog>
  );
}
