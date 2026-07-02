'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Mail, LogIn, MailCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { resendEmailVerification } from '@/lib/supabase';
import { AccessRequestForm } from './AccessRequestForm';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

const CTA_CLASS =
  'inline-flex items-center gap-2 rounded-neo border-neo-thick bg-neo-lime px-4 py-3 ' +
  'font-bold text-neo-navy font-neo-display shadow-hard hover:shadow-hard-sm ' +
  'active:shadow-hard-pressed disabled:opacity-50 disabled:cursor-not-allowed transition-all';

/**
 * Auth + email-verification gate in front of the teacher-access request form.
 *
 * Teacher access is bound to a verified account (the API enforces the same in
 * `POST /api/education/access-request`). This surface makes the prerequisite
 * legible: sign up / sign in, then confirm your email, then request access.
 */
export function AccessRequestGate() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Wait for auth to resolve before choosing a branch — rendering the sign-up
  // prompt optimistically would flash it for already-authed users on reload.
  if (loading) {
    return <div aria-hidden="true" className="h-40 animate-pulse rounded-neo bg-neo-navy/40" />;
  }

  // Not signed up / signed in yet.
  if (!user) {
    return (
      <div className="text-neo-white">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-neo border-neo bg-neo-cyan text-neo-navy shadow-hard-sm">
          <LogIn className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold font-neo-display">{t('education.access.auth_required_title')}</h2>
        <p className="mt-2 text-neo-white/85">{t('education.access.auth_required_body')}</p>
        <button type="button" onClick={() => setShowAuth(true)} className={`mt-4 ${CTA_CLASS}`}>
          <LogIn className="h-5 w-5" />
          {t('education.access.auth_required_cta')}
        </button>
        {showAuth && <AuthModal isOpen onClose={() => setShowAuth(false)} initialMode="signup" />}
      </div>
    );
  }

  // Signed in but email not confirmed.
  if (!user.email_confirmed_at) {
    const onResend = async () => {
      if (!user.email || resend === 'sending') return;
      setResend('sending');
      const { error } = await resendEmailVerification(user.email);
      setResend(error ? 'error' : 'sent');
    };
    return (
      <div className="text-neo-white">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-neo border-neo bg-neo-pink text-neo-white shadow-hard-sm">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold font-neo-display">{t('education.access.verify_email_title')}</h2>
        <p className="mt-2 text-neo-white/85">
          {t('education.access.verify_email_body', { email: user.email ?? '' })}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={onResend} disabled={resend === 'sending'} className={CTA_CLASS}>
            <MailCheck className="h-5 w-5" />
            {resend === 'sent'
              ? t('education.access.verify_email_resent')
              : resend === 'sending'
              ? t('education.access.verify_email_sending')
              : t('education.access.verify_email_resend')}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-neo border-neo bg-neo-navy px-4 py-3 font-bold text-neo-white shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-all"
          >
            {t('education.access.verify_email_refresh')}
          </button>
        </div>
        {resend === 'error' && (
          <p role="alert" aria-live="polite" className="mt-3 text-neo-red font-semibold">
            {t('education.access.submit_error')}
          </p>
        )}
      </div>
    );
  }

  // Signed in and verified — email is locked to the proven account address.
  return <AccessRequestForm lockedEmail={user.email ?? undefined} />;
}
