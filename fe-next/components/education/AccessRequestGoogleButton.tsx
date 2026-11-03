'use client';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOAuthSignIn } from '@/components/auth/hooks/useOAuthSignIn';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { GoogleIcon } from '@/components/auth/shared/icons/BrandIcons';
import { isEdgeBrowser, isNative } from '@/utils/platform';

const EDU_SOURCE = 'edu_access';

/** Same Google path as the auth modal: Google's in-page button on the web, the SDK or redirect elsewhere. */
export function AccessRequestGoogleButton({ onTap }: { onTap: () => void }) {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const { signIn, loadingProvider } = useOAuthSignIn({ onError: setError, analyticsSource: EDU_SOURCE });

  if (!isNative() && !isEdgeBrowser() && process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    return <GoogleSignInButton analyticsSource={EDU_SOURCE} />;
  }

  return (
    <div>
      <button
        type="button"
        disabled={loadingProvider === 'google'}
        onClick={() => {
          setError(null);
          onTap();
          void signIn('google');
        }}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-neo border-neo-thick border-neo-black bg-neo-white px-5 py-3 font-neo-display text-base font-black text-neo-navy shadow-hard-lg transition-[box-shadow,transform] duration-100 hover:-translate-y-0.5 hover:shadow-hard-xl active:translate-y-0 active:shadow-hard-pressed focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:cursor-wait sm:text-lg"
      >
        <GoogleIcon className="size-6 shrink-0" />
        {t('auth.continueWithGoogle')}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-neo-red">
          {error}
        </p>
      )}
    </div>
  );
}
