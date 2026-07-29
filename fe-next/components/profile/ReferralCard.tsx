'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Gift, Users, Copy, Check, Share2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';

// Brand icon SVG components
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackShare } from '@/utils/growthTracking';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface ReferralData {
  referralCode: string;
  referralCount: number;
  referralRewardXp: number;
  shareUrl: string;
  referrals: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_emoji: string;
    avatar_color: string;
    avatar_config?: CustomAvatarConfig | null;
    created_at: string;
    referred_games_played: number;
    reward_granted: boolean;
  }>;
}

export function ReferralCard() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRewards, setShowRewards] = useState(false);

  // Fetch referral data
  const fetchReferralData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/referral');
      if (!response.ok) {
        throw new Error('Failed to fetch referral data');
      }

      const result = await response.json();
      if (result.success) {
        setReferralData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      // Serialize error properly - Error objects don't stringify well
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error fetching referral data:', errorMessage);
      setError(errorMessage || 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    if (!referralData) return;

    try {
      await navigator.clipboard.writeText(referralData.shareUrl);
      setCopied(true);
      trackShare('copy');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') return;
      console.error('Failed to copy:', err);
    }
  }, [referralData]);

  // Share via platform
  const handleShare = useCallback(
    async (platform: 'whatsapp' | 'telegram' | 'native') => {
      if (!referralData) return;

      const shareText = `Join me on LexiClash! Use my referral code: ${referralData.referralCode}`;

      if (platform === 'native' && navigator.share) {
        try {
          await navigator.share({
            title: 'Join LexiClash',
            text: shareText,
            url: referralData.shareUrl,
          });
          trackShare('native');
          return;
        } catch (err) {
          console.error('Native share failed:', err);
        }
      }

      const shareUrls: Record<string, string> = {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${referralData.shareUrl}`)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(referralData.shareUrl)}&text=${encodeURIComponent(shareText)}`,
      };

      if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
        trackShare(platform);
      }
    },
    [referralData]
  );

  if (loading) {
    return (
      <div className={cn(
        'rounded-3xl p-6 mb-4',
        'bg-neo-navy-light border border-neo-pink/20 rounded-neo-xl'
      )}>
        <div className="flex items-center justify-center py-6">
          <Loader size="md" />
        </div>
      </div>
    );
  }

  if (error || !referralData) {
    return (
      <div className={cn(
        'rounded-3xl p-6 mb-4',
        'bg-neo-navy-light border border-neo-pink/20 rounded-neo-xl'
      )}>
        <p className="text-center text-red-500 text-sm">{error || 'Failed to load referral data'}</p>
      </div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 sm:p-6 mb-4',
        'bg-neo-navy-light border border-neo-pink/20 rounded-neo-xl'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          'p-2 rounded-xl',
          isDarkMode ? 'bg-neo-pink/20' : 'bg-neo-pink/10'
        )}>
          <Gift className="w-5 h-5 text-neo-pink" />
        </div>
        <div className="flex-1">
          <h3 className={cn(
            'font-bold text-base',
            isDarkMode ? 'text-white' : 'text-gray-900'
          )}>
            {t('profile.referralReward')}
          </h3>
          <p className={cn(
            'text-xs',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            {t('profile.referralDescription')}
          </p>
        </div>
        {/* Stats Summary */}
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className={cn(
              'text-lg font-bold',
              isDarkMode ? 'text-neo-cyan' : 'text-neo-pink'
            )}>
              {referralData.referralCount}
            </div>
            <div className={cn('text-[10px]', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
              {t('profile.referralsCount')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-neo-lime">
              {referralData.referralRewardXp}
            </div>
            <div className={cn('text-[10px]', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
              XP
            </div>
          </div>
        </div>
      </div>

      {/* Referral Code + Copy */}
      <div className={cn(
        'rounded-xl p-3 mb-4',
        isDarkMode ? 'bg-neo-navy/50' : 'bg-gray-50'
      )}>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className={cn(
              'text-[10px] font-medium uppercase tracking-wide mb-1',
              isDarkMode ? 'text-gray-500' : 'text-gray-500'
            )}>
              {t('profile.yourReferralCode')}
            </div>
            <code className="text-xl font-black text-neo-lime bg-neo-lime/10 px-3 py-1 rounded-lg tracking-wider">
              {referralData.referralCode}
            </code>
          </div>
          <Button
            onClick={handleCopyLink}
            size="sm"
            className={cn(
              'h-10 px-4 rounded-xl font-bold transition-all',
              copied
                ? 'bg-green-500 hover:bg-green-500 text-white'
                : isDarkMode
                  ? 'bg-neo-navy-elevated hover:bg-slate-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="ms-1.5 text-xs">{copied ? t('common.copied') : t('common.copy')}</span>
          </Button>
        </div>
      </div>

      {/* Share Buttons - Horizontal */}
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => handleShare('whatsapp')}
          size="sm"
          className="flex-1 h-10 bg-brand-whatsapp hover:bg-brand-whatsapp-hover text-white rounded-xl font-bold"
        >
          <WhatsAppIcon className="w-4 h-4 me-1.5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </Button>
        <Button
          onClick={() => handleShare('telegram')}
          size="sm"
          className="flex-1 h-10 bg-brand-telegram hover:bg-brand-telegram-hover text-white rounded-xl font-bold"
        >
          <TelegramIcon className="w-4 h-4 me-1.5" />
          <span className="hidden sm:inline">Telegram</span>
        </Button>
        <Button
          onClick={() => handleShare('native')}
          size="sm"
          className={cn(
            'flex-1 h-10 rounded-xl font-bold',
            isDarkMode
              ? 'bg-neo-pink hover:bg-neo-pink/90 text-white'
              : 'bg-neo-pink hover:bg-neo-pink/90 text-white'
          )}
        >
          <Share2 className="w-4 h-4 me-1.5" />
          <span className="hidden sm:inline">{t('common.share')}</span>
        </Button>
      </div>

      {/* Collapsible Reward Tiers */}
      <button
        onClick={() => setShowRewards(!showRewards)}
        className={cn(
          'w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-colors',
          isDarkMode
            ? 'text-gray-400 hover:bg-neo-navy-elevated/50'
            : 'text-gray-500 hover:bg-gray-100'
        )}
      >
        <span>💎 {t('profile.referralRewards')}</span>
        {showRewards ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {showRewards && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={cn(
              'grid grid-cols-2 gap-2 mt-2 p-3 rounded-lg text-xs',
              isDarkMode ? 'bg-neo-navy/30' : 'bg-gray-50'
            )}>
              <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                🎯 Friend joins: <span className="font-bold text-neo-pink">+100 XP</span>
              </div>
              <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                🎮 First game: <span className="font-bold text-neo-pink">+50 XP</span>
              </div>
              <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                🔥 5 games: <span className="font-bold text-neo-pink">+100 XP</span>
              </div>
              <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                ⭐ 10 games: <span className="font-bold text-neo-pink">+200 XP</span>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Referred Users List - Compact */}
      {referralData.referrals.length > 0 && (
        <div className={cn(
          'mt-3 pt-3 border-t',
          isDarkMode ? 'border-slate-700' : 'border-gray-200'
        )}>
          <div className={cn(
            'text-xs font-medium mb-2',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            👥 {t('profile.yourReferrals')} ({referralData.referrals.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {referralData.referrals.slice(0, 6).map((referral) => (
              <div
                key={referral.id}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs',
                  isDarkMode ? 'bg-neo-navy-elevated/50' : 'bg-gray-100'
                )}
                title={`${referral.display_name || referral.username} - ${referral.referred_games_played} games`}
              >
                <Avatar customAvatar={referral.avatar_config} userId={referral.id} size="sm" />
                <span className={cn(
                  'font-medium truncate max-w-[60px]',
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                )}>
                  {referral.display_name || referral.username}
                </span>
                {referral.reward_granted && (
                  <Check className="w-3 h-3 text-green-500" />
                )}
              </div>
            ))}
            {referralData.referrals.length > 6 && (
              <div className={cn(
                'px-2 py-1 rounded-lg text-xs font-medium',
                isDarkMode ? 'bg-neo-navy-elevated/50 text-gray-400' : 'bg-gray-100 text-gray-500'
              )}>
                +{referralData.referrals.length - 6}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State - More Compact */}
      {referralData.referrals.length === 0 && (
        <div className={cn(
          'mt-3 pt-3 border-t text-center',
          isDarkMode ? 'border-slate-700' : 'border-gray-200'
        )}>
          <p className={cn('text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
            <Users className="w-4 h-4 inline-block me-1 opacity-50" />
            {t('profile.noReferralsYet')}
          </p>
        </div>
      )}
    </m.div>
  );
}

export default ReferralCard;
