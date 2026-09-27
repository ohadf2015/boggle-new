'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';

/**
 * The dictionary's load state, as a chip.
 *
 * The failure branch is the point of this component. These screens gate submit
 * on `dict` being non-null, so a null dictionary is merely unplayable — but
 * before 2026-09-02 the load error set `dict` to an EMPTY Set instead, which is
 * worse than unplayable: the game accepts input and calls every real word
 * "not in the dictionary". See lib/word-craft/dictionary.ts DictionaryLoadError.
 */
export function DictStatusChip({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { t } = useLanguage();
  if (error) {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex shrink-0 items-center gap-2 rounded-neo border-2 border-black bg-neo-red px-2 py-1 font-neo-body text-xs font-bold text-black shadow-hard active:translate-y-px"
      >
        {t('wordTower.loadError')}
      </button>
    );
  }
  if (!loading) return null;
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-neo border-2 border-black bg-neo-navy-light px-2 py-1">
      <PageLoader size="sm" />
      <span className="text-xs text-neo-white">{t('wordcraft.loadingDict')}</span>
    </div>
  );
}
