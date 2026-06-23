'use client';

import { useEffect, useRef, useState } from 'react';
import { Gift, Sparkles, Coins, Crown, X, Award } from 'lucide-react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/utils/confettiUtils';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';

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

/**
 * AdminGiftModal - Luxury gift reveal modal
 *
 * Features a VIP presentation with:
 * - Gold/purple gradient border
 * - Central crown/gift icon with rotating glow ring
 * - Animated message reveal
 * - Confetti celebration on claim
 * - Coin and XP fly animations
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
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<{ kill: () => void } | null>(null);
  const [phase, setPhase] = useState<'entrance' | 'reveal' | 'ready' | 'claiming' | 'done'>('entrance');
  const [claiming, setClaiming] = useState(false);
  // Track XP/coins at start to show before/after — captured when modal opens
  const startXpRef = useRef(currentXp);
  const startCoinsRef = useRef(currentCoins);

  // Ref to always have latest onDismiss callback (prevents stale closure in setTimeout)
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // VIP gold/purple color scheme
  const vipColors = ['#FFD700', '#FFA500', '#9333EA', '#FFE135', '#F59E0B'];

  // Helper to format badge name from name_key
  const formatBadgeName = (nameKey: string): string => {
    // Extract last part of key (e.g., "collectible.badge.guardian_of_words" -> "guardian_of_words")
    const lastPart = nameKey.split('.').pop() || nameKey;
    // Convert to title case and replace underscores with spaces
    return lastPart
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Rarity color mapping
  const rarityColors: Record<string, { border: string; bg: string; text: string }> = {
    common: { border: 'border-gray-400', bg: 'bg-gray-500/20', text: 'text-gray-300' },
    uncommon: { border: 'border-green-400', bg: 'bg-green-500/20', text: 'text-green-300' },
    rare: { border: 'border-blue-400', bg: 'bg-blue-500/20', text: 'text-blue-300' },
    epic: { border: 'border-purple-400', bg: 'bg-purple-500/20', text: 'text-purple-300' },
    legendary: { border: 'border-amber-400', bg: 'bg-linear-to-br from-amber-500/30 to-orange-500/30', text: 'text-amber-300' },
  };

  // GSAP Timeline Animation — extracted to avoid try/catch value block issue
  useEffect(() => {
    if (!show || !gift) return;

    // Skip animation for reduced motion - go directly to ready state
    if (prefersReducedMotion || !containerRef.current) {
      setPhase('ready');
      return;
    }

    const container = containerRef.current;
    let ctx: { revert: () => void } | null = null;

    const runAnimation = async () => {
      const { default: gsap } = await import('gsap');
      if (!container.isConnected) return;

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          onComplete: () => setPhase('ready'),
        });
        timelineRef.current = tl;

        // Phase 1: Flash overlay
        tl.to('.gift-flash', {
          opacity: 1,
          duration: 0.1,
          ease: 'power2.in',
        })
          .to('.gift-flash', {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out',
          });

        // Phase 2: Crown/Gift icon entrance
        tl.from('.gift-icon-container', {
          scale: 0,
          rotation: -180,
          duration: 0.6,
          ease: 'back.out(1.7)',
        }, '-=0.1');

        // Phase 3: Title reveal
        tl.from('.gift-title', {
          opacity: 0,
          y: 20,
          duration: 0.4,
          ease: 'power2.out',
        }, '-=0.2');

        setPhase('reveal');

        // Phase 4: Message reveal
        tl.from('.gift-message', {
          opacity: 0,
          y: 15,
          duration: 0.4,
          ease: 'power2.out',
        }, '-=0.1');

        // Phase 5: Rewards reveal
        if (gift.xp_amount > 0 || gift.coin_amount > 0) {
          tl.from('.gift-rewards', {
            opacity: 0,
            y: 10,
            duration: 0.3,
            ease: 'power2.out',
          }, '-=0.1');
        }

        // Phase 6: Claim button pulse
        tl.from('.gift-claim-btn', {
          opacity: 0,
          scale: 0.9,
          duration: 0.3,
          ease: 'power2.out',
        });

      }, container);
    };

    runAnimation();

    return () => {
      ctx?.revert();
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [show, gift, prefersReducedMotion]);

  // Reset phase when gift changes — capture start values on open
  const prevShow = useRef(show);
  if (prevShow.current !== show) {
    if (!show) {
      setPhase('entrance');
      setClaiming(false);
    } else {
      startXpRef.current = currentXp;
      startCoinsRef.current = currentCoins;
    }
    prevShow.current = show;
  }

  const handleClaim = async () => {
    if (!gift || claiming) return;

    setClaiming(true);
    setPhase('claiming');

    try {
      await onClaim(gift.id);

      // Fire celebration confetti
      if (!prefersReducedMotion) {
        fireConfetti({
          particleCount: 80,
          spread: 100,
          colors: vipColors,
          origin: { x: 0.5, y: 0.4 },
          scalar: 1.5,
        });

        // Secondary burst
        setTimeout(() => {
          fireConfetti({
            particleCount: 40,
            spread: 60,
            colors: vipColors,
            origin: { x: 0.3, y: 0.5 },
          });
          fireConfetti({
            particleCount: 40,
            spread: 60,
            colors: vipColors,
            origin: { x: 0.7, y: 0.5 },
          });
        }, 200);
      }

      setPhase('done');

      // Auto-dismiss after celebration
      // Use ref to get latest callback, avoiding stale closure issue
      setTimeout(() => onDismissRef.current(), 1500);
    } catch (error) {
      console.error('Failed to claim gift:', error);
      setClaiming(false);
      setPhase('ready');
    }
  };

  if (!gift) return null;

  // Get header line based on template type
  const getHeaderLine = () => {
    switch (gift.template_type) {
      case 'top_player':
        return t('gift.topPlayerLine');
      case 'feedback_request':
        return t('gift.feedbackLine');
      case 'thank_you':
        return t('gift.thankYouLine');
      default:
        return t('gift.customLine');
    }
  };

  // CSS entrances (animate-in) instead of framer-motion for the backdrop and
  // card: a starved main thread — e.g. while the large Hebrew bundle parses —
  // would leave a framer-motion `initial` opacity:0 pinned, so the user sees only
  // the dark backdrop ("black screen"). CSS runs off the main thread and always
  // settles visible. (The GSAP reveal timeline animates already-visible content.)
  return (
      show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs animate-in fade-in-0 duration-300"
            onClick={phase === 'ready' ? onDismiss : undefined}
          />

          {/* Modal Content */}
          <div
            ref={containerRef}
            className={cn(
              'relative w-full max-w-md',
              'bg-linear-to-br from-neo-navy via-neo-navy to-purple-900/30',
              'rounded-xl overflow-hidden',
              'shadow-2xl',
              'animate-in fade-in-0 zoom-in-95 duration-300',
              className
            )}
          >
            {/* VIP Gold/Purple Border */}
            <div className="absolute inset-0 rounded-xl border-4 border-gradient-to-r from-amber-400 via-purple-500 to-amber-400 pointer-events-none"
              style={{
                borderImage: 'linear-gradient(45deg, #FFD700, #9333EA, #FFD700) 1',
              }}
            />

            {/* Flash overlay */}
            <div
              className="gift-flash absolute inset-0 bg-white/90 opacity-0 pointer-events-none z-10"
            />

            {/* Close button */}
            {phase === 'ready' && (
              <button
                onClick={onDismiss}
                className={cn(
                  'absolute top-3 ltr:right-3 rtl:left-3 z-20',
                  'w-12 h-12 min-w-[48px] min-h-[48px]', // Increased from w-10 h-10 (40px) to meet WCAG touch target
                  'rounded-full',
                  'bg-white/10 hover:bg-white/20 active:bg-white/30',
                  'transition-colors duration-200',
                  'flex items-center justify-center',
                  'border-2 border-white/20 hover:border-white/30' // Added border for better visual definition
                )}
                aria-label={t('common.close')}
              >
                <X className="w-6 h-6 text-white" /> {/* Increased from w-5 h-5, improved contrast */}
              </button>
            )}

            {/* Content */}
            <div className="relative p-6 text-center">
              {/* Header Line */}
              <div className="text-amber-400 text-sm font-medium mb-4 tracking-wide uppercase animate-in fade-in-0 duration-300">
                {getHeaderLine()}
              </div>

              {/* Icon Container with Glow Ring */}
              <div className="gift-icon-container relative mx-auto w-24 h-24 mb-6">
                {/* Rotating dashed ring */}
                {enableGlowEffects && (
                  <div className="absolute inset-[-8px] border-2 border-dashed border-amber-400/50 rounded-full animate-spin-slow" />
                )}

                {/* Glow effect */}
                {enableGlowEffects && (
                  <div className="absolute inset-[-4px] bg-linear-to-r from-amber-400/30 to-purple-500/30 rounded-full blur-xl animate-pulse" />
                )}

                {/* Icon background */}
                <div className="absolute inset-0 bg-linear-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center shadow-hard-lg">
                  <Crown className="w-12 h-12 text-neo-navy" />
                </div>
              </div>

              {/* Title */}
              <h2 className="gift-title text-2xl font-bold text-white mb-3 font-neo-display">
                {gift.title}
              </h2>

              {/* Message */}
              <p className="gift-message text-white text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                {gift.message}
              </p>

              {/* Rewards Section */}
              {(gift.xp_amount > 0 || gift.coin_amount > 0) && (
                <div className="gift-rewards mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex justify-center gap-6">
                    {gift.xp_amount > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <Sparkles className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-left">
                          <div className="text-2xl font-bold text-purple-400 font-mono">
                            +{gift.xp_amount.toLocaleString()}
                          </div>
                          <div className="text-xs text-purple-300/70 uppercase tracking-wide">
                            XP
                          </div>
                        </div>
                      </div>
                    )}
                    {gift.coin_amount > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                          <Coins className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="text-left">
                          <div className="text-2xl font-bold text-amber-400 font-mono">
                            +{gift.coin_amount.toLocaleString()}
                          </div>
                          <div className="text-xs text-amber-300/70 uppercase tracking-wide">
                            {t('gift.coins')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Before/After Balance Display (skip for already-claimed gifts) */}
                  {gift.claimed ? null : phase === 'done' ? (
                    <div
                      className="mt-3 pt-3 border-t border-white/10 flex justify-center gap-6 text-xs animate-in fade-in-0 duration-300"
                    >
                      {gift.xp_amount > 0 && (
                        <div className="text-purple-300/80">
                          <span className="text-white">{t('gift.newTotal')}:</span>{' '}
                          <span className="font-bold">{(startXpRef.current + gift.xp_amount).toLocaleString()} XP</span>
                        </div>
                      )}
                      {gift.coin_amount > 0 && (
                        <div className="text-amber-300/80">
                          <span className="text-white">{t('gift.newTotal')}:</span>{' '}
                          <span className="font-bold">{(startCoinsRef.current + gift.coin_amount).toLocaleString()} {t('gift.coins')}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-center gap-6 text-xs text-white">
                      {gift.xp_amount > 0 && (
                        <div>
                          <span>{t('gift.currentBalance')}:</span>{' '}
                          <span className="font-mono">{startXpRef.current.toLocaleString()} XP</span>
                        </div>
                      )}
                      {gift.coin_amount > 0 && (
                        <div>
                          <span>{t('gift.currentBalance')}:</span>{' '}
                          <span className="font-mono">{startCoinsRef.current.toLocaleString()} {t('gift.coins')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Badge Section */}
              {gift.badge && (
                <div
                  className="gift-badge mb-6 p-4 bg-white/5 rounded-lg border border-white/10 animate-in fade-in-0 duration-300"
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className={cn(
                      'relative w-14 h-14 rounded-lg flex items-center justify-center border-2 overflow-hidden',
                      rarityColors[gift.badge.rarity]?.border || 'border-gray-400',
                      rarityColors[gift.badge.rarity]?.bg || 'bg-gray-500/20'
                    )}>
                      {gift.badge.image_url ? (
                        <Image
                          src={gift.badge.image_url}
                          alt={formatBadgeName(gift.badge.name_key)}
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      ) : (
                        <span className="text-3xl">{gift.badge.icon || '🏅'}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <Award className={cn(
                          'w-4 h-4',
                          rarityColors[gift.badge.rarity]?.text || 'text-gray-300'
                        )} />
                        <span className={cn(
                          'text-xs uppercase tracking-wide font-semibold',
                          rarityColors[gift.badge.rarity]?.text || 'text-gray-300'
                        )}>
                          {t(`collectibles.rarity.${gift.badge.rarity}`) || gift.badge.rarity} {t('gift.badge')}
                        </span>
                      </div>
                      <p className="text-white font-bold text-lg">
                        {t(gift.badge.name_key) || formatBadgeName(gift.badge.name_key)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Claim Button */}
              <Button
                onClick={gift.claimed ? onDismiss : handleClaim}
                disabled={claiming || phase === 'done'}
                className={cn(
                  'gift-claim-btn w-full py-6 text-lg font-bold',
                  'bg-linear-to-r from-amber-400 to-amber-500',
                  'hover:from-amber-500 hover:to-amber-600',
                  'text-neo-navy border-2 border-neo-black',
                  'shadow-hard transition-all duration-200',
                  'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
                  'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                  (phase === 'done' || gift.claimed) && 'bg-neo-lime from-neo-lime to-neo-lime'
                )}
              >
                {claiming ? (
                  <Loader size="sm" />
                ) : phase === 'done' || gift.claimed ? (
                  <>
                    <Gift className="w-5 h-5 me-2" />
                    {t('gift.claimed')}
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5 me-2" />
                    {t('gift.claim')}
                  </>
                )}
              </Button>

              {/* From line */}
              {gift.sender && (
                <p className="mt-4 text-xs text-white">
                  {t('gift.from')}: {gift.sender.display_name || gift.sender.username}
                </p>
              )}
            </div>
          </div>
        </div>
      )
  );
}
