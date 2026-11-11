'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import posthog from '@/lib/analytics/lazyPosthog';
import { pingErrorKey, reportRival, sendRivalPing } from '@/lib/rivals/pingClient';
import type { RivalPingErrorCode, RivalPingId } from '@/lib/rivals/pings';
import type { ResultsMode } from '@/lib/rivals/types';
import { blockUser } from '@/utils/friends';
import { RivalPingPicker } from './RivalPingPicker';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

export interface RivalPingButtonProps {
  targetUserId: string;
  targetName: string;
  context: ResultsMode;
}

type Status = { kind: 'idle' } | { kind: 'sent' } | { kind: 'refused'; code: RivalPingErrorCode };

const chip =
  'inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border-2 border-neo-black px-3 font-black shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 disabled:active:translate-x-0 disabled:active:translate-y-0';

export function RivalPingButton({ targetUserId, targetName, context }: RivalPingButtonProps) {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const isGuest = !isAuthenticated || !user || user.is_anonymous === true;

  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen && !menuOpen) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof PointerEvent && rootRef.current?.contains(e.target as Node)) return;
      setPickerOpen(false);
      setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [pickerOpen, menuOpen]);

  if (context === 'edu') return null;

  const send = async (pingId: RivalPingId) => {
    setPickerOpen(false);
    if (isGuest) {
      setStatus({ kind: 'refused', code: 'sign_in_required' });
      return;
    }
    setStatus({ kind: 'sent' });
    const result = await sendRivalPing(targetUserId, pingId, context);
    if (result.ok) {
      posthog.capture('rival_ping_sent', { pingId, context });
    } else {
      setStatus({ kind: 'refused', code: result.code });
    }
  };

  const block = async () => {
    setMenuOpen(false);
    const result = await blockUser(targetUserId);
    if (!result.success) return;
    posthog.capture('rival_ping_blocked', { context });
    setStatus({ kind: 'refused', code: 'blocked' });
  };

  const report = async () => {
    setMenuOpen(false);
    if (await reportRival(targetUserId)) setReported(true);
  };

  const refusal = status.kind === 'refused' ? status.code : null;
  const disabled = status.kind === 'sent' || (refusal !== null && refusal !== 'sign_in_required' && refusal !== 'unavailable');

  return (
    <div ref={rootRef} className="relative inline-flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t('rivalPings.buttonLabel', { name: targetName })}
          aria-expanded={pickerOpen}
          disabled={disabled}
          onClick={() => {
            setMenuOpen(false);
            setPickerOpen((o) => !o);
          }}
          className={`${chip} ${status.kind === 'sent' ? 'bg-neo-lime' : 'bg-neo-pink'} text-neo-black`}
        >
          <span aria-hidden="true">{status.kind === 'sent' ? '✅' : '⚡'}</span>
          <span>{status.kind === 'sent' ? t('rivalPings.sent') : t('rivalPings.button')}</span>
        </button>
        {!isGuest && (
          <button
            type="button"
            aria-label={t('rivalPings.more')}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setPickerOpen(false);
              setMenuOpen((o) => !o);
            }}
            className={`${chip} min-w-[44px] bg-neo-cream px-2 text-neo-black`}
          >
            <span aria-hidden="true">⋯</span>
          </button>
        )}
      </div>

      {refusal && (
        <p role="status" className="text-xs font-bold text-neo-yellow">
          {t(pingErrorKey(refusal))}
          {refusal === 'sign_in_required' && (
            <button type="button" onClick={() => setAuthOpen(true)} className="ms-2 min-h-[44px] underline">
              {t('rivalPings.signIn')}
            </button>
          )}
        </p>
      )}
      {reported && <p role="status" className="text-xs font-bold text-neo-cyan">{t('rivalPings.reported')}</p>}

      {pickerOpen && (
        <div className="absolute top-full start-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border-[3px] border-neo-black bg-neo-white p-3 shadow-hard">
          <RivalPingPicker onPick={send} title={t('rivalPings.pickerTitle', { name: targetName })} />
        </div>
      )}

      {menuOpen && (
        <div role="menu" className="absolute top-full start-0 z-50 mt-2 flex w-56 flex-col overflow-hidden rounded-xl border-[3px] border-neo-black bg-neo-white shadow-hard">
          <button role="menuitem" type="button" onClick={block} className="min-h-[44px] px-3 text-start font-bold text-neo-black hover:bg-neo-cream">
            {t('rivalPings.block', { name: targetName })}
          </button>
          <button role="menuitem" type="button" onClick={report} className="min-h-[44px] border-t-2 border-neo-black px-3 text-start font-bold text-neo-red hover:bg-neo-cream">
            {t('rivalPings.report')}
          </button>
        </div>
      )}

      {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />}
    </div>
  );
}

export default RivalPingButton;
