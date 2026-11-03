'use client';

import { useEffect, useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import { useLanguage } from '@/contexts/LanguageContext';
import { isAndroid, isNative } from '@/utils/platform';

interface AppUpdatePlugin {
  check(): Promise<{ started: boolean }>;
  complete(): Promise<void>;
  addListener(event: 'downloaded', cb: () => void): Promise<{ remove: () => void }>;
}

const CHECK_DELAY_MS = 8000;

/** Play flexible update: downloads in the background, then asks the player to restart (native AppUpdatePlugin). */
export default function NativeUpdateSnackbar() {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);
  const [plugin] = useState<AppUpdatePlugin | null>(() =>
    isNative() && isAndroid() ? registerPlugin<AppUpdatePlugin>('AppUpdate') : null,
  );

  useEffect(() => {
    if (!plugin) return;
    let remove: (() => void) | undefined;
    let cancelled = false;
    plugin.addListener('downloaded', () => setReady(true)).then((h) => {
      if (cancelled) h.remove();
      else remove = h.remove;
    }).catch(() => {});
    // Past first paint and ad/auth init so the Play dialog never competes with cold start.
    const timer = setTimeout(() => { plugin.check().catch(() => {}); }, CHECK_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      remove?.();
    };
  }, [plugin]);

  if (!ready) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-24 z-[200] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl border-2 border-neo-black bg-neo-navy px-4 py-3 text-neo-cream shadow-hard-sm"
    >
      <span className="font-bold">{t('common.updateReady')}</span>
      <button
        type="button"
        onClick={() => { void plugin?.complete(); }}
        className="rounded-lg border-2 border-neo-black bg-neo-lime px-3 py-1 font-bold text-neo-black"
      >
        {t('common.updateRestart')}
      </button>
    </div>
  );
}
