'use client';

import { useMemo, useState } from 'react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import AvatarLite from '@/components/AvatarLite';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { buildFixturePremium, fixtureConfigForLevel, FIXTURE_PLAYER_ID } from './fixtures';
import { PANEL } from './labShared';

export { ProfileView } from './ProfileLabView';
export { RevealView } from './RevealLabView';

export function EditorView({ level }: { level: number }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);
  const [saved, setSaved] = useState<CustomAvatarConfig | null>(null);
  // Stable identities — the modal resets its draft whenever initialConfig changes.
  const initialConfig = useMemo(() => saved ?? fixtureConfigForLevel(level), [saved, level]);
  const premium = useMemo(() => buildFixturePremium(level), [level]);

  return (
    <div data-testid="avatar-lab-view-editor" className="flex flex-col items-center gap-4 py-8">
      <div className="border-3 border-black shadow-hard-lg rounded-neo-lg overflow-hidden">
        <AvatarRenderer config={initialConfig} size={120} />
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-6 py-3 bg-neo-lime text-neo-black font-bold rounded-neo border-3 border-black shadow-hard active:translate-x-[2px] active:translate-y-[2px] transition-transform"
      >
        {t('avatarLab.openBuilder')}
      </button>
      <AvatarBuilderModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSave={setSaved}
        initialConfig={initialConfig}
        premium={premium}
      />
    </div>
  );
}

const LITE_SIZES = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

export function LiteView({ level }: { level: number }) {
  const { t } = useLanguage();
  const config = useMemo(() => fixtureConfigForLevel(level), [level]);
  return (
    <div data-testid="avatar-lab-view-lite" className={PANEL}>
      <div className="flex flex-wrap items-end gap-4">
        {LITE_SIZES.map(size => (
          <AvatarLite key={size} userId={FIXTURE_PLAYER_ID} customAvatar={config} size={size} />
        ))}
        <div className="border-2 border-black rounded-full overflow-hidden">
          <AvatarRenderer config={config} size={80} circular />
        </div>
      </div>
      <p className="text-neo-white/70 text-xs mt-3">{t('avatarLab.liteNote')}</p>
    </div>
  );
}
