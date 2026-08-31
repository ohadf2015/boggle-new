'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { sanitizeGameCode } from '@/lib/multiplayer/sanitizeGameCode';
import { validateGameCode } from '@/utils/validation';

/**
 * Code entry for `/[locale]/join`.
 *
 * This route used to 404. Only `/join/[code]` resolved, so "go to
 * lexiclash.live/join" — the shorthand a teacher says out loud — was a dead end,
 * and a student holding only the code had nowhere to type it. The page does one
 * thing: validate, then hand off to `/[locale]/join/[code]`, which already owns
 * the real join (classroom preview, guest-student creation, the lot).
 */
export function JoinCodePageClient() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      // Students paste codes out of chat with spaces and punctuation attached.
      const clean = sanitizeGameCode(code).toUpperCase();
      const result = validateGameCode(clean);
      if (!result.isValid) {
        setErrorKey(result.error || 'validation.gameCodeInvalid');
        return;
      }
      setErrorKey(null);
      router.push(`/${language}/join/${clean}`);
    },
    [code, language, router]
  );

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-neo-navy px-4 py-10 text-neo-white">
      <div className="w-full max-w-md rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard-lg sm:p-8">
        <h1 className="font-neo-display text-3xl font-black tracking-[-0.02em] sm:text-4xl">
          {t('joinByCode.title')}
        </h1>
        <p className="mt-3 text-neo-white/85">{t('joinByCode.subtitle')}</p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (errorKey) setErrorKey(null);
            }}
            placeholder={t('joinByCode.placeholder')}
            aria-label={t('joinByCode.placeholder')}
            aria-invalid={!!errorKey}
            autoComplete="off"
            autoCapitalize="characters"
            // A room code is Latin alphanumerics in every locale — keep it LTR
            // so it does not render reversed for Hebrew students.
            dir="ltr"
            className="w-full rounded-neo border-neo-thick border-black bg-neo-cream px-4 py-3 text-center font-neo-display text-2xl font-black uppercase tracking-[0.2em] text-neo-navy placeholder:tracking-normal placeholder:text-neo-navy/40"
          />

          {errorKey && (
            <p role="alert" className="text-sm font-bold text-neo-red">
              {t(errorKey)}
            </p>
          )}

          <button
            type="submit"
            className="rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-lg font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0 active:shadow-hard-pressed"
          >
            {t('joinByCode.submit')}
          </button>
        </form>
      </div>
    </main>
  );
}
