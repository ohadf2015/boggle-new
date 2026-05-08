import { useLanguage } from '@/contexts/LanguageContext';
import { ThemedPanel } from '../ThemedPanel';
import type { MpDesktopMode } from '../types';

interface CategoryBannerProps {
  mode: MpDesktopMode;
  category: string;
}

export function CategoryBanner({ mode, category }: CategoryBannerProps) {
  const { t } = useLanguage();
  const display = (category || '').trim();
  return (
    <ThemedPanel
      mode={mode}
      variant="rail"
      header={t('mp.insights.categoryHeader')}
      testId="category-banner"
    >
      <div className="flex items-center justify-center py-1">
        <span
          data-testid="category-banner-value"
          className="text-2xl font-neo-display font-black uppercase tracking-wide"
        >
          {display ? display : '—'}
        </span>
      </div>
    </ThemedPanel>
  );
}
