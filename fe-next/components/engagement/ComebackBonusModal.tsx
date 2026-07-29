'use client';

/**
 * ComebackBonusModal
 *
 * Shows returning players their comeback XP multiplier and bonus rewards.
 * Displayed on first load when eligible, lets player claim before playing.
 */

import { useRef, useState } from 'react';
import { X, Zap, Sparkles, Shield, Crown, Check, AlertCircle } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { postWithAuth } from '@/utils/authFetch';
import { captureApiError } from '@/utils/sentry';
import type { ComebackTier } from '@/shared/types/engagement';
import { SilentVideo } from '@/components/ui/SilentVideo';

const MAX_CLAIM_ATTEMPTS = 3;
const COOLDOWN_MS = 1500;

export interface ComebackBonusModalProps {
  isOpen: boolean;
  daysAway: number;
  tier: ComebackTier;
  playerName?: string;
  onClose: () => void;
  onClaimed: () => void;
}

type ClaimState = 'idle' | 'claiming' | 'success' | 'error';

const VIDEO_WEBM = '/gifs/comeback-bonus.webm';
const VIDEO_MP4 = '/gifs/comeback-bonus.mp4';

export function ComebackBonusModal({ isOpen, daysAway, tier, playerName, onClose, onClaimed }: ComebackBonusModalProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [attempts, setAttempts] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cooling, setCooling] = useState(false);

  useFocusTrap(dialogRef, isOpen, onClose);

  const exhausted = attempts >= MAX_CLAIM_ATTEMPTS;

  const handleClaim = async () => {
    if (claimState === 'claiming' || claimState === 'success' || cooling || exhausted) return;
    setAttempts(n => n + 1);
    setClaimState('claiming');
    try {
      const response = await postWithAuth('/api/engagement/comeback');
      if (response.ok) {
        setClaimState('success');
        setTimeout(() => onClaimed(), 1800);
      } else {
        captureApiError(
          new Error(`comeback claim failed: ${response.status}`),
          '/api/engagement/comeback',
          { method: 'POST', statusCode: response.status },
        );
        setClaimState('error');
        setCooling(true);
        cooldownRef.current = setTimeout(() => setCooling(false), COOLDOWN_MS);
      }
    } catch (err) {
      captureApiError(
        err instanceof Error ? err : new Error(String(err)),
        '/api/engagement/comeback',
        { method: 'POST' },
      );
      setClaimState('error');
      setCooling(true);
      cooldownRef.current = setTimeout(() => setCooling(false), COOLDOWN_MS);
    }
  };

  const multiplierDisplay = `${tier.xpMultiplier}x`;

  const tierColor =
    tier.xpMultiplier >= 3.0
      ? { gradient: 'from-neo-pink to-neo-purple', glow: '#FF1493' }
      : tier.xpMultiplier >= 2.5
        ? { gradient: 'from-neo-pink to-neo-cyan', glow: '#FF1493' }
        : tier.xpMultiplier >= 2.0
          ? { gradient: 'from-neo-cyan to-neo-lime', glow: '#00FFFF' }
          : { gradient: 'from-neo-lime to-neo-cyan', glow: '#BFFF00' };

  return (
    <AdaptiveAnimatePresence>
      {isOpen && (
        <AdaptiveMotion.div
          key="comeback-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={(e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <AdaptiveMotion.div
            key="comeback-modal"
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="comeback-title"
            className="relative w-full max-w-[340px]"
          >
            {/* ── Card ── */}
            <div className="bg-neo-navy-light border-neo-thick border-neo-white rounded-neo shadow-hard-lg overflow-hidden relative">

              {/* Close button - top right corner */}
              <button
                aria-label={t('comebackBonus.close')}
                onClick={onClose}
                className="absolute top-2.5 inset-e-2.5 z-30 p-1.5 rounded-full text-neo-white hover:text-neo-white hover:bg-neo-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* ── Hero section with mascot + multiplier ── */}
              <div className="relative pt-4 sm:pt-6 pb-2 sm:pb-3 flex flex-col items-center bg-linear-to-b from-neo-navy to-neo-navy-light">
                {/* Glow effect behind mascot */}
                <div
                  className="absolute top-3 w-36 h-36 rounded-full blur-3xl opacity-40"
                  style={{ background: `radial-gradient(circle, ${tierColor.glow} 0%, transparent 70%)` }}
                />

                {/* Mascot GIF */}
                <AdaptiveMotion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
                  className="relative z-10"
                >
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-3 border-neo-pink shadow-hard bg-neo-navy">
                    <SilentVideo
                      aria-hidden="true"
                      className="w-full h-full object-cover"
                    >
                      <source src={VIDEO_WEBM} type="video/webm" />
                      <source src={VIDEO_MP4} type="video/mp4" />
                    </SilentVideo>
                  </div>
                </AdaptiveMotion.div>

                {/* Player name */}
                {playerName && (
                  <p className="text-neo-white text-xs font-bold mt-1.5 mb-0">
                    {playerName}
                  </p>
                )}

                {/* Title */}
                <h2 id="comeback-title" className="text-lg font-black font-neo-display text-neo-white uppercase tracking-wide mt-1">
                  {t('comebackBonus.title')}
                </h2>
                <p className="text-neo-white text-xs">
                  {t('comebackBonus.daysAway', { days: String(daysAway) })}
                </p>

                {/* Multiplier badge - overlapping into rewards section */}
                <AdaptiveMotion.div
                  initial={{ scale: 0, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.25 }}
                  className="mt-2 sm:mt-3 -mb-4 sm:-mb-5 z-20 relative"
                >
                  <div className={`bg-linear-to-r ${tierColor.gradient} px-6 py-2 rounded-neo border-neo-thick border-neo-white shadow-hard-lg`}>
                    <span className="text-3xl font-black font-neo-display text-neo-white drop-shadow-lg leading-none">
                      {multiplierDisplay}
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-neo-white text-center mt-0.5">
                      {t('comebackBonus.xpBonus')}
                    </span>
                  </div>
                </AdaptiveMotion.div>
              </div>

              {/* ── Rewards section ── */}
              <div className="px-3 sm:px-4 pt-7 sm:pt-8 pb-3 sm:pb-4 bg-neo-navy-light">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  <RewardCard icon={<Zap className="w-5 h-5" />} color="neo-lime" delay={0.3}>
                    {t('comebackBonus.xpDuration', { hours: String(tier.durationHours) })}
                  </RewardCard>

                  {tier.hints > 0 && (
                    <RewardCard icon={<Sparkles className="w-5 h-5" />} color="neo-cyan" delay={0.35}>
                      {t('comebackBonus.hints', { count: String(tier.hints) })}
                    </RewardCard>
                  )}

                  {tier.streakFreezes > 0 && (
                    <RewardCard icon={<Shield className="w-5 h-5" />} color="neo-purple" delay={0.4}>
                      {t('comebackBonus.streakFreezes', { count: String(tier.streakFreezes) })}
                    </RewardCard>
                  )}

                  {tier.title && (
                    <RewardCard icon={<Crown className="w-5 h-5" />} color="neo-pink" delay={0.45}>
                      {t('comebackBonus.titleUnlocked')}
                    </RewardCard>
                  )}
                </div>

                {/* Claim button */}
                <AdaptiveMotion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <button
                    onClick={exhausted ? onClose : handleClaim}
                    disabled={claimState === 'claiming' || claimState === 'success' || cooling}
                    className={`w-full py-3.5 px-4 font-black uppercase text-base border-neo-thick border-neo-white rounded-neo transition-all flex items-center justify-center gap-2 ${
                      claimState === 'success'
                        ? 'bg-neo-lime text-neo-navy shadow-hard'
                        : claimState === 'error'
                          ? 'bg-neo-red text-neo-white shadow-hard hover:shadow-hard-lg'
                          : `bg-linear-to-r ${tierColor.gradient} text-neo-white shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed active:translate-y-0.5`
                    } disabled:cursor-not-allowed`}
                  >
                    {claimState === 'claiming' && (
                      <AdaptiveMotion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-neo-white/30 border-t-neo-white rounded-full"
                      />
                    )}
                    {claimState === 'success' && <Check className="w-5 h-5" />}
                    {claimState === 'error' && <AlertCircle className="w-5 h-5" />}
                    {claimState === 'idle' && t('comebackBonus.claimButton')}
                    {claimState === 'claiming' && t('comebackBonus.claimButton')}
                    {claimState === 'success' && t('comebackBonus.claimed')}
                    {claimState === 'error' && t('comebackBonus.claimError')}
                  </button>
                </AdaptiveMotion.div>

                {claimState === 'error' && (
                  <p className="text-neo-white text-xs text-center mt-2">
                    {t('comebackBonus.tapToRetry')}
                  </p>
                )}
              </div>
            </div>
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}

function RewardCard({ icon, color, delay, children }: {
  icon: React.ReactNode;
  color: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <AdaptiveMotion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay }}
      className={`flex flex-col items-center gap-1.5 rounded-neo p-3 border border-${color}/30 bg-${color}/10 text-center`}
    >
      <div className={`w-9 h-9 rounded-full bg-${color}/25 flex items-center justify-center text-${color}`}>
        {icon}
      </div>
      <span className="text-neo-white text-xs font-bold leading-tight">
        {children}
      </span>
    </AdaptiveMotion.div>
  );
}

export default ComebackBonusModal;
