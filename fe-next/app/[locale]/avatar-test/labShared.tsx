'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/** avatarBuilder.* label key for an unlock category. */
export const CATEGORY_LABEL_KEY: Record<string, string> = {
  base: 'avatarBuilder.base',
  hair: 'avatarBuilder.hair',
  eyes: 'avatarBuilder.eyes',
  mouth: 'avatarBuilder.mouth',
  accessory: 'avatarBuilder.accessories',
  bgColor: 'avatarBuilder.background',
};

export const PANEL = 'border-3 border-black shadow-hard rounded-neo-lg bg-neo-navy-light p-4';

export function Placeholder({ id, level }: { id: 'profile' | 'reveal'; level: number }) {
  const { t } = useLanguage();
  return (
    <div data-testid={`avatar-lab-placeholder-${id}`} className="border-3 border-dashed border-neo-yellow rounded-neo-lg p-4 mb-6">
      <p className="font-neo-display text-neo-yellow font-bold uppercase tracking-wider text-sm">{t('avatarLab.placeholder.title')}</p>
      <p className="text-neo-white/80 text-sm mt-1">{t(`avatarLab.placeholder.${id}`)}</p>
      <p className="text-neo-white/60 text-xs mt-2">{t('avatarLab.level', { level })}</p>
    </div>
  );
}
