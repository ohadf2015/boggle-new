'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Mail, MailCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { resendEmailVerification } from '@/lib/supabase';
import { latchSignupSource, trackGrowthEvent } from '@/utils/growthTracking';
import { AccessRequestForm } from './AccessRequestForm';
import { AccessRequestGoogleButton } from './AccessRequestGoogleButton';
import type { AccessApproval } from './AccessRequestHandoff';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

const CTA_CLASS =
  'inline-flex items-center gap-2 rounded-neo border-neo-thick border-neo-black bg-neo-lime px-4 py-3 ' +
  'font-bold text-neo-navy font-neo-display shadow-hard hover:shadow-hard-sm ' +
  'active:shadow-hard-pressed disabled:opacity-50 disabled:cursor-not-allowed transition';

const EMAIL_CTA_CLASS =
  'flex min-h-12 w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-cream/60 bg-neo-navy ' +
  'px-4 py-3 font-neo-display text-base font-black text-neo-white text-balance shadow-hard transition-[box-shadow,transform] ' +
  'duration-100 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0 active:shadow-hard-pressed ' +
  'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan';

/**
 * Auth + email-verification gate in front of the teacher-access request form.
 *
 * Teacher access is bound to a verified account (the API enforces the same in
 * `POST /api/education/access-request`). This surface makes the prerequisite
 * legible: sign up / sign in, confirm your email, then one tap into class setup.
 */
export function AccessRequestGate({ onApproved }: { onApproved?: (approval: AccessApproval) => void } = {}) {
  const { t } = useLanguage();
  const { user, profile, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'signup' | 'signin' | null>(null);
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  type GateState = 'auth_required' | 'verify_email' | 'form';
  const gateState: GateState | null = loading
    ? null
    : !user || user.is_anonymous || !user.email
    ? 'auth_required'
    : !user.email_confirmed_at
    ? 'verify_email'
    : 'form';

  const lastEmittedState = useRef<GateState | null>(null);
  useEffect(() => {
    if (!gateState) return;
    if (lastEmittedState.current === gateState) return;
    lastEmittedState.current = gateState;
    try {
      trackGrowthEvent('edu_access_gate_viewed', { state: gateState });
    } catch {
      /* telemetry must never break access request */
    }
  }, [gateState]);

  // The teacher confirms in their mail tab, then comes back to a stale wall.
  useEffect(() => {
    if (gateState !== 'verify_email') return;
    const recheck = () => window.location.reload();
    window.addEventListener('focus', recheck, { once: true });
    return () => window.removeEventListener('focus', recheck);
  }, [gateState]);

  // Wait for auth to resolve before choosing a branch — rendering the sign-up
  // prompt optimistically would flash it for already-authed users on reload.
  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="min-h-[220px] animate-pulse rounded-neo bg-neo-navy/40 sm:min-h-[260px]"
      />
    );
  }

  // Not signed up / signed in yet. An anonymous arcade session has no email to verify.
  if (!user || user.is_anonymous || !user.email) {
    const tapped = (mode: 'google' | 'signup' | 'signin') => {
      try {
        trackGrowthEvent('edu_access_signup_tapped', { mode });
        // Own attribution: signups from the edu gate are not header_or_menu.
        latchSignupSource('edu_access');
      } catch {
        /* telemetry must never break access request */
      }
    };
    return (
      <div className="text-neo-white">
        <h2 className="font-neo-display text-2xl font-black tracking-[-0.02em]">
          {t('education.access.auth_required_title')}
        </h2>
        <p className="mt-2 text-neo-white/80">{t('education.access.auth_required_body')}</p>
        <div className="mt-5">
          <AccessRequestGoogleButton onTap={() => tapped('google')} />
        </div>
        <div className="my-4 flex items-center gap-3" aria-hidden="true">
          <span className="h-0.5 flex-1 bg-neo-cream/25" />
          <span className="text-xs font-bold uppercase tracking-wider text-neo-white/60">
            {t('auth.magicLink.divider')}
          </span>
          <span className="h-0.5 flex-1 bg-neo-cream/25" />
        </div>
        <button
          type="button"
          onClick={() => {
            tapped('signup');
            setAuthMode('signup');
          }}
          className={EMAIL_CTA_CLASS}
        >
          <span className="text-balance">
            <Mail className="me-2 inline size-5 align-[-0.2em]" aria-hidden="true" />
            {t('education.access.auth_required_cta')}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            tapped('signin');
            setAuthMode('signin');
          }}
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-neo px-4 font-neo-display text-sm font-bold text-neo-white/85 underline decoration-neo-cream/40 underline-offset-4 hover:text-neo-white focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          {t('education.access.auth_signin_cta')}
        </button>
        <p className="mt-2 text-center text-sm font-semibold text-neo-white/60">
          {t('education.access.cta_micro')}
        </p>
        {authMode && <AuthModal isOpen onClose={() => setAuthMode(null)} initialMode={authMode} audience="teacher" />}
      </div>
    );
  }

  // Signed in but email not confirmed.
  if (!user.email_confirmed_at) {
    const onResend = async () => {
      if (!user.email || resend === 'sending') return;
      setResend('sending');
      let ok = false;
      try {
        const { error } = await resendEmailVerification(user.email);
        ok = !error;
        setResend(error ? 'error' : 'sent');
      } catch {
        ok = false;
        setResend('error');
      } finally {
        try {
          trackGrowthEvent('edu_access_verify_resent', { ok });
        } catch {
          /* telemetry must never break access request */
        }
      }
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
            className="inline-flex items-center gap-2 rounded-neo border-neo border-neo-cream/40 bg-neo-navy px-4 py-3 font-bold text-neo-white shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
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

  const knownName = profile?.display_name || profile?.username || undefined;
  return <AccessRequestForm knownName={knownName} knownEmail={user.email ?? undefined} onApproved={onApproved} />;
}
