'use client';

import { useRef } from 'react';
import { FileSpreadsheet, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education/types';
import { parseWordTable, type WordEntry } from '@/lib/education/library';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';

const CHIP = cn(
  'inline-flex min-h-10 min-w-0 cursor-pointer items-center gap-1.5 rounded-neo border-2 border-neo-cream bg-neo-navy-light px-3',
  'font-neo-display text-xs font-bold uppercase text-neo-white shadow-hard-sm transition-all',
  'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-none',
  'focus-within:ring-2 focus-within:ring-neo-cyan',
);

interface ListImportBarProps {
  language: Language;
  onEntries: (entries: WordEntry[], suggestedTitle?: string) => void;
  onFileError: () => void;
}

export default function ListImportBar({ language, onEntries, onFileError }: ListImportBarProps) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const packs = STARTER_LESSON_PACKS.filter((p) => p.language === language);
  const shownPacks = packs.length > 0 ? packs : STARTER_LESSON_PACKS;

  const readFile = async (file: File) => {
    try {
      const entries = parseWordTable(await file.text());
      if (entries.length === 0) onFileError();
      else onEntries(entries, file.name.replace(/\.(csv|tsv|txt)$/i, ''));
    } catch {
      onFileError();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={CHIP}>
        <FileSpreadsheet className="size-4 shrink-0 text-neo-lime" aria-hidden="true" />
        <span className="truncate">{t('eduLibrary.editor.importFile')}</span>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
          className="sr-only"
          data-testid="list-import-file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
            if (fileRef.current) fileRef.current.value = '';
          }}
        />
      </label>

      <label className={cn(CHIP, 'relative pe-2')}>
        <Package className="size-4 shrink-0 text-neo-pink" aria-hidden="true" />
        <span className="truncate">{t('eduLibrary.editor.starterPack')}</span>
        <select
          aria-label={t('eduLibrary.editor.starterPack')}
          data-testid="list-import-pack"
          value=""
          onChange={(e) => {
            const pack = shownPacks[Number(e.target.value)];
            if (!pack) return;
            onEntries(
              pack.words.map((w) => (w.definition ? { word: w.word, definition: w.definition } : { word: w.word })),
              t(pack.nameKey),
            );
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          <option value="">{t('eduLibrary.editor.starterPack')}</option>
          {shownPacks.map((p, i) => (
            <option key={p.nameKey} value={i}>
              {t(p.nameKey)} ({p.words.length})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
