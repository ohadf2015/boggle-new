'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gift, Sparkles, X } from 'lucide-react';
import { Coins } from '@/components/ui/CoinsIcon';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/utils/confettiUtils';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { GiftBox } from './GiftBox';
import { useCountUp } from './useCountUp';

interface BadgeInfo {
  id: string;
  name_key: string;
  icon: string;
  image_url: string | null;
  rarity: string;
}

interface GiftData {
  id: string;
  title: string;
  message: string;
  template_type: string | null;
  xp_amount: number;
  coin_amount: number;
  badge_id?: string | null;
  badge?: BadgeInfo | null;
  claimed?: boolean;
  sender?: {
    username: string;
    display_name: string | null;
  };
}

interface AdminGiftModalProps {
  gift: GiftData | null;
  show: boolean;
  onClaim: (giftId: string) => Promise<void>;
  onDismiss: () => void;
  currentXp?: number;
  currentCoins?: number;
  className?: string;
}

const CONFETTI_COLORS = ['#BFFF00', '#FF1493', '#00FFFF', '#FFE135', '#8B5CF6'];

const RARITY_RING: Record<string, string> = {
  common: 'border-neo-cream/60',
  uncommon: 'border-neo-lime',
  rare: 'border-neo-cyan',
  epic: 'border-neo-purple',
  legendary: 'border-neo-yellow',
};

const formatBadgeName = (nameKey: string): string =>
  (nameKey.split('.').pop() || nameKey).split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/**
 * AdminGiftModal: the reveal a player sees for a gift from the team.
 * A gift box drops in and wiggles; claiming pops the lid, bursts confetti and counts
 * the new balances up. All motion is CSS (see .gift-* in globals.css) so it settles
 * even when the main thread is busy, and it switches off under reduced motion.
 */
export function AdminGiftModal({
  gift,
  show,
  onClaim,
  onDismiss,
  currentXp = 0,
  currentCoins = 0,
  className,
}: AdminGiftModalProps) {
  const { t } = useLanguage();
  const { prefersReducedMotion, enableGlowEffects } = useDevicePerformance();
  const [phase, setPhase] = useState<'ready' | 'claiming' | 'done'>('ready');
  // Balances at open time, so "new total" is stable while the profile refreshes underneath.
  const startXpRef = useRef(currentXp);
  const startCoinsRef = useRef(currentCoins);
  // Latest callback, so the post-claim timer never fires a stale closure.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const boxRef = useRef<HTMLDivElement>(null);
  const dismissGen = useRef(0);
  const claimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearClaimTimer = () => {
    if (!claimTimerRef.current) return;
    clearTimeout(claimTimerRef.current);
    claimTimerRef.current = null;
  };
  const requestDismiss = () => {
    dismissGen.current += 1;
    clearClaimTimer();
    onDismissRef.current();
  };
  const requestDismissRef = useRef(requestDismiss);
  requestDismissRef.current = requestDismiss;

  useEffect(() => {
    if (!show || !gift) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestDismissRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, gift]);

  useEffect(() => clearClaimTimer, []);

  const prevShow = useRef(show);
  const prevGiftId = useRef(gift?.id);
  if (prevShow.current !== show || prevGiftId.current !== gift?.id) {
    if (!show || prevGiftId.current !== gift?.id) setPhase('ready');
    if (show) {
      startXpRef.current = currentXp;
      startCoinsRef.current = currentCoins;
    }
    prevShow.current = show;
    prevGiftId.current = gift?.id;
  }

  const opened = phase === 'done' || !!gift?.claimed;
  const xp = gift?.xp_amount ?? 0;
  const coins = gift?.coin_amount ?? 0;
  const xpTotal = useCountUp(startXpRef.current, startXpRef.current + xp, phase === 'done', prefersReducedMotion);
  const coinTotal = useCountUp(startCoinsRef.current, startCoinsRef.current + coins, phase === 'done', prefersReducedMotion);

  const handleClaim = async () => {
    if (!gift || phase !== 'ready') return;
    const gen = dismissGen.current;
    setPhase('claiming');
    try {
      await onClaim(gift.id);
    } catch (error) {
      console.error('Failed to claim gift:', error);
      if (dismissGen.current !== gen) return;
      toast.error(t('gift.claimError'));
      setPhase('ready');
      return;
    }
    if (dismissGen.current !== gen) return;
    setPhase('done');
    if (!prefersReducedMotion) {
      const r = boxRef.current?.getBoundingClientRect();
      const origin = r
        ? { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
        : { x: 0.5, y: 0.4 };
      fireConfetti({ particleCount: 90, spread: 80, colors: CONFETTI_COLORS, origin });
      setTimeout(() => fireConfetti({ particleCount: 40, spread: 120, colors: CONFETTI_COLORS, origin }), 220);
    }
    clearClaimTimer();
    claimTimerRef.current = setTimeout(() => {
      if (dismissGen.current !== gen) return;
      onDismissRef.current();
    }, 2200);
  };

  if (!gift || !show) return null;

  const headerLine = {
    top_player: t('gift.topPlayerLine'),
    feedback_request: t('gift.feedbackLine'),
    thank_you: t('gift.thankYouLine'),
  }[gift.template_type ?? ''] ?? t('gift.customLine');
  const senderName = gift.sender && (gift.sender.display_name || gift.sender.username);
  const rewardChip = 'gift-chip flex min-w-28 flex-col items-center rounded-neo border-3 px-4 py-2 shadow-hard-sm';

  // X is a sibling of the card, anchored to this viewport dialog — not inside
  // .gift-card. The card is transform-animated and overflow-clips; a long
  // personal message made it taller than the phone, so the X (and the claim
  // button) sat off-screen. Header is z-60, so this dialog is portaled above
  // the bottom tabs (z-80); otherwise the only exit is switching tabs.
  const dialog = (
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 animate-in fade-in-0 duration-300" onClick={phase === 'ready' ? requestDismiss : undefined} />

        <button
          type="button"
          onClick={requestDismiss}
          className={cn(
            'absolute z-20',
            'top-[max(0.75rem,var(--cap-safe-area-top,env(safe-area-inset-top,0px)))]',
            'ltr:right-3 rtl:left-3',
            'w-12 h-12 min-w-[48px] min-h-[48px] rounded-full',
            'bg-neo-black/80 hover:bg-neo-black active:bg-neo-black',
            'transition-colors duration-200 flex items-center justify-center',
            'border-2 border-neo-cream/50 hover:border-neo-cream'
          )}
          aria-label={t('common.close')}
        >
          <X className="h-6 w-6 text-white" />
        </button>

        <div ref={boxRef} className={cn('gift-card relative w-full max-w-sm max-h-[calc(100dvh-6.5rem)] overflow-x-hidden overflow-y-auto rounded-neo-lg border-4 border-neo-cream/40 bg-neo-navy shadow-hard-xl', className)}>
          {/* Header strip */}
          <div className="relative flex min-h-[72px] items-center justify-center bg-neo-lime px-16 py-2 text-center font-neo-display text-sm font-black uppercase leading-tight tracking-wide text-neo-black">
            {headerLine}
          </div>

          <div className="relative px-6 pb-6 pt-8 text-center">
            {enableGlowEffects && <div aria-hidden className="gift-rays pointer-events-none absolute left-1/2 top-2 h-72 w-72 -translate-x-1/2" />}

            <GiftBox open={opened} />

            <h2 className="gift-rise relative mt-5 font-neo-display text-3xl font-black leading-tight text-white" style={{ animationDelay: '0.55s' }}>
              {gift.title}
            </h2>

            <p className="gift-rise relative mx-auto mt-3 whitespace-pre-wrap rounded-neo border-2 border-neo-black bg-neo-cream px-4 py-3 text-sm font-medium leading-relaxed text-neo-black shadow-hard-sm" style={{ animationDelay: '0.7s' }}>
              {gift.message}
            </p>

            {(xp > 0 || coins > 0) && (
              <div className="relative mt-5 flex flex-wrap justify-center gap-3">
                {xp > 0 && (
                  <div className={cn(rewardChip, 'border-neo-black bg-neo-purple text-white')} style={{ animationDelay: opened ? '0s' : '0.9s' }}>
                    <Sparkles className="h-5 w-5" />
                    <span className="font-mono text-2xl font-black">+{xp.toLocaleString()}</span>
                    <span className="text-xs font-bold uppercase tracking-wide">XP</span>
                  </div>
                )}
                {coins > 0 && (
                  <div className={cn(rewardChip, 'border-neo-black bg-neo-yellow text-neo-black')} style={{ animationDelay: opened ? '0s' : '1.05s' }}>
                    <Coins className="h-5 w-5" />
                    <span className="font-mono text-2xl font-black">+{coins.toLocaleString()}</span>
                    <span className="text-xs font-bold uppercase tracking-wide">{t('gift.coins')}</span>
                  </div>
                )}
              </div>
            )}

            {phase === 'done' && (
              <p className="gift-rise relative mt-3 text-xs font-bold text-white/80">
                {t('gift.newTotal')}:{' '}
                {xp > 0 && <span className="font-mono">{xpTotal.toLocaleString()} XP</span>}
                {xp > 0 && coins > 0 && ' · '}
                {coins > 0 && <span className="font-mono">{coinTotal.toLocaleString()} {t('gift.coins')}</span>}
              </p>
            )}

            {gift.badge && (
              <div className="gift-chip relative mt-4 flex items-center justify-center gap-3" style={{ animationDelay: opened ? '0s' : '1.2s' }}>
                <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-neo border-3 bg-neo-navy-light', RARITY_RING[gift.badge.rarity] ?? 'border-neo-cream/60')}>
                  {gift.badge.image_url ? (
                    <Image src={gift.badge.image_url} alt={formatBadgeName(gift.badge.name_key)} width={48} height={48} className="object-contain" />
                  ) : (
                    <span className="text-3xl">{gift.badge.icon || '🏅'}</span>
                  )}
                </div>
                <div className="text-start">
                  <div className="text-xs font-bold uppercase tracking-wide text-neo-cyan">{t('gift.badge')}</div>
                  <p className="text-lg font-black text-white">{t(gift.badge.name_key) || formatBadgeName(gift.badge.name_key)}</p>
                </div>
              </div>
            )}

            <Button
              onClick={gift.claimed ? onDismiss : handleClaim}
              disabled={phase !== 'ready' && !gift.claimed}
              className={cn(
                'relative mt-6 w-full rounded-neo border-3 border-neo-black py-6 text-lg font-black',
                'shadow-hard transition duration-200',
                'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg',
                'active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed',
                opened ? 'bg-neo-lime text-neo-black hover:bg-neo-lime' : 'gift-cta bg-neo-pink text-white hover:bg-neo-pink'
              )}
            >
              {phase === 'claiming' ? (
                <Loader size="sm" />
              ) : (
                <>
                  <Gift className="me-2 h-5 w-5" />
                  {opened ? t('gift.claimed') : t('gift.claim')}
                </>
              )}
            </Button>

            {senderName && (
              <p className="relative mt-4 text-xs font-medium text-white/80">
                {t('gift.from')}: {senderName}
              </p>
            )}
          </div>
        </div>
      </div>
  );

  if (typeof document === 'undefined') return dialog;
  return createPortal(dialog, document.body);
}
