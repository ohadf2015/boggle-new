'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { Gift, Sparkles, Coins, Crown, X } from 'lucide-react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/utils/confettiUtils';
import { Button } from '@/components/ui/button';
import { NeoLoader } from '@/components/ui/NeoLoader';

interface GiftData {
  id: string;
  title: string;
  message: string;
  template_type: string | null;
  xp_amount: number;
  coin_amount: number;
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
  className,
}: AdminGiftModalProps) {
  const { t } = useLanguage();
  const { isLowEnd, prefersReducedMotion, enableGlowEffects } = useDevicePerformance();
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [phase, setPhase] = useState<'entrance' | 'reveal' | 'ready' | 'claiming' | 'done'>('entrance');
  const [claiming, setClaiming] = useState(false);

  // VIP gold/purple color scheme
  const vipColors = ['#FFD700', '#FFA500', '#9333EA', '#FFE135', '#F59E0B'];

  // GSAP Timeline Animation
  useEffect(() => {
    if (!show || !containerRef.current || prefersReducedMotion || !gift) return;

    const container = containerRef.current;
    const ctx = gsap.context(() => {
      timelineRef.current = gsap.timeline({
        onComplete: () => setPhase('ready'),
      });

      const tl = timelineRef.current;

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

    return () => {
      ctx.revert();
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [show, gift, prefersReducedMotion]);

  // Reset phase when gift changes
  useEffect(() => {
    if (!show) {
      setPhase('entrance');
      setClaiming(false);
    }
  }, [show]);

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
      setTimeout(onDismiss, 1500);
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
        return t('gift.topPlayerLine') || "You're one of our top players!";
      case 'feedback_request':
        return t('gift.feedbackLine') || 'Your voice matters to us!';
      case 'thank_you':
        return t('gift.thankYouLine') || 'A special thank you from us!';
      default:
        return t('gift.customLine') || 'A message just for you!';
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={phase === 'ready' ? onDismiss : undefined}
          />

          {/* Modal Content */}
          <motion.div
            ref={containerRef}
            className={cn(
              'relative w-full max-w-md',
              'bg-gradient-to-br from-neo-navy via-neo-navy to-purple-900/30',
              'rounded-xl overflow-hidden',
              'shadow-2xl',
              className
            )}
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
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
                className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            )}

            {/* Content */}
            <div className="relative p-6 text-center">
              {/* Header Line */}
              <motion.div
                className="text-amber-400 text-sm font-medium mb-4 tracking-wide uppercase"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {getHeaderLine()}
              </motion.div>

              {/* Icon Container with Glow Ring */}
              <div className="gift-icon-container relative mx-auto w-24 h-24 mb-6">
                {/* Rotating dashed ring */}
                {enableGlowEffects && (
                  <div className="absolute inset-[-8px] border-2 border-dashed border-amber-400/50 rounded-full animate-spin-slow" />
                )}

                {/* Glow effect */}
                {enableGlowEffects && (
                  <div className="absolute inset-[-4px] bg-gradient-to-r from-amber-400/30 to-purple-500/30 rounded-full blur-xl animate-pulse" />
                )}

                {/* Icon background */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center shadow-hard-lg">
                  <Crown className="w-12 h-12 text-neo-navy" />
                </div>
              </div>

              {/* Title */}
              <h2 className="gift-title text-2xl font-bold text-white mb-3 font-neo-display">
                {gift.title}
              </h2>

              {/* Message */}
              <p className="gift-message text-white/80 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                {gift.message}
              </p>

              {/* Rewards Section */}
              {(gift.xp_amount > 0 || gift.coin_amount > 0) && (
                <div className="gift-rewards flex justify-center gap-6 mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
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
                          {t('gift.coins') || 'Coins'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Claim Button */}
              <Button
                onClick={handleClaim}
                disabled={claiming || phase === 'done'}
                className={cn(
                  'gift-claim-btn w-full py-6 text-lg font-bold',
                  'bg-gradient-to-r from-amber-400 to-amber-500',
                  'hover:from-amber-500 hover:to-amber-600',
                  'text-neo-navy border-2 border-neo-black',
                  'shadow-hard transition-all duration-200',
                  'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
                  'active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                  phase === 'done' && 'bg-neo-lime from-neo-lime to-neo-lime'
                )}
              >
                {claiming ? (
                  <NeoLoader variant="dots" size="sm" />
                ) : phase === 'done' ? (
                  <>
                    <Gift className="w-5 h-5 mr-2" />
                    {t('gift.claimed') || 'Claimed!'}
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5 mr-2" />
                    {t('gift.claim') || 'Claim Reward'}
                  </>
                )}
              </Button>

              {/* From line */}
              {gift.sender && (
                <p className="mt-4 text-xs text-white/50">
                  {t('gift.from') || 'From'}: {gift.sender.display_name || gift.sender.username}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
