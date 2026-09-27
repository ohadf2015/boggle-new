'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { AVATAR_LAB_VIEWS, type AvatarLabView } from './fixtures';
import LabGrid from './LabGrid';
import { EditorView, LiteView, ProfileView, RevealView } from './LabViews';

/**
 * Capture harness for critics (noindex, unlinked, no auth):
 *   /<locale>/avatar-test?level=N&view=editor|profile|reveal|lite|grid
 * RTL comes from the locale segment (/he/...). Params are parsed server-side
 * in page.tsx so this stays free of useSearchParams (no Suspense bailout).
 */
export default function AvatarTestPageClient({ level, view }: { level: number; view: AvatarLabView }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-neo-navy p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-neo-display text-neo-white text-2xl sm:text-3xl font-bold">{t('avatarLab.title')}</h1>
            <span className="font-neo-display text-neo-lime font-bold">{t('avatarLab.level', { level })}</span>
          </div>
          <p className="text-neo-white/60 text-xs mt-1">{t('avatarLab.subtitle')}</p>
          <nav className="flex flex-wrap gap-2 mt-3">
            {AVATAR_LAB_VIEWS.map(v => (
              <Link
                key={v}
                href={`?level=${level}&view=${v}`}
                aria-current={v === view ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-neo border-2 border-black text-xs font-bold shadow-hard-sm ${
                  v === view ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-white'
                }`}
              >
                {t(`avatarLab.views.${v}`)}
              </Link>
            ))}
          </nav>
        </header>

        {view === 'editor' && <EditorView level={level} />}
        {view === 'profile' && <ProfileView level={level} />}
        {view === 'reveal' && <RevealView level={level} />}
        {view === 'lite' && <LiteView level={level} />}
        {view === 'grid' && <LabGrid />}
      </div>
    </div>
  );
}
