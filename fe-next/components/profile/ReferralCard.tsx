'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Users, Copy, Check, Share2, Trophy, Sparkles } from 'lucide-react';

// Brand icon SVG components
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
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
    created_at: string;
    referred_games_played: number;
    reward_granted: boolean;
  }>;
}

export function ReferralCard() {
  const { t } = useLanguage();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      console.error('Error fetching referral data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load referral data');
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
      console.error('Failed to copy:', err);
    }
  }, [referralData]);

  // Share via platform
  const handleShare = useCallback(
    async (platform: 'whatsapp' | 'facebook' | 'telegram' | 'native') => {
      if (!referralData) return;

      const shareText = `🎯 Join me on LexiClash! Use my referral code: ${referralData.referralCode}`;

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
          // User cancelled or error
          console.error('Native share failed:', err);
        }
      }

      // Platform-specific sharing
      const shareUrls: Record<string, string> = {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${referralData.shareUrl}`)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralData.shareUrl)}`,
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
      <div className="bg-white/90 dark:bg-neo-navy-light/90 rounded-neo border-3 border-neo-black dark:border-white/20 p-6 shadow-hard-sm">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-3 border-neo-pink border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !referralData) {
    return (
      <div className="bg-white/90 dark:bg-neo-navy-light/90 rounded-neo border-3 border-neo-black dark:border-white/20 p-6 shadow-hard-sm">
        <p className="text-center text-red-500">{error || 'Failed to load referral data'}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/90 dark:bg-neo-navy-light/90 rounded-neo border-3 border-neo-black dark:border-white/20 p-6 shadow-hard-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-neo-pink text-white rounded-neo border-2 border-neo-black">
          <Gift className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-black text-lg uppercase tracking-wide text-neo-black dark:text-white">
            {t('profile.referralReward') || 'Invite Friends'}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            {t('profile.referralDescription') || 'Earn rewards when friends join!'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Referral Count */}
        <div className="bg-neo-cyan/20 border-2 border-neo-cyan rounded-neo p-3 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-neo-cyan" />
          <div className="text-2xl font-black text-neo-black dark:text-white">{referralData.referralCount}</div>
          <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
            {t('profile.referralsCount') || 'Friends'}
          </div>
        </div>

        {/* Total XP Earned */}
        <div className="bg-neo-yellow/20 border-2 border-neo-yellow rounded-neo p-3 text-center">
          <Sparkles className="w-5 h-5 mx-auto mb-1 text-neo-yellow" />
          <div className="text-2xl font-black text-neo-black dark:text-white">{referralData.referralRewardXp}</div>
          <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
            {t('common.xp') || 'XP Earned'}
          </div>
        </div>

        {/* Active Referrals */}
        <div className="bg-neo-yellow/20 border-2 border-neo-yellow rounded-neo p-3 text-center">
          <Trophy className="w-5 h-5 mx-auto mb-1 text-neo-yellow" />
          <div className="text-2xl font-black text-neo-black dark:text-white">
            {referralData.referrals.filter(r => r.referred_games_played > 0).length}
          </div>
          <div className="text-xs font-bold text-gray-700 dark:text-gray-200">
            {t('profile.activeReferrals') || 'Active'}
          </div>
        </div>
      </div>

      {/* Referral Code Display */}
      <div className="bg-neo-cream dark:bg-neo-navy text-neo-black dark:text-neo-white border-3 border-neo-black rounded-neo p-4 mb-4">
        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">
          {t('profile.yourReferralCode') || 'Your Referral Code'}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white dark:bg-neo-navy-light text-neo-black dark:text-white border-2 border-neo-black rounded-neo px-4 py-3">
            <code className="text-2xl font-black text-neo-pink tracking-wider">{referralData.referralCode}</code>
          </div>
          <Button
            onClick={handleCopyLink}
            className="px-4 py-3 h-auto bg-neo-pink hover:bg-neo-pink/90 text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="space-y-2 mb-6">
        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">
          {t('profile.shareWith') || 'Share Your Link'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleShare('whatsapp')}
            className="bg-[#25D366] hover:bg-[#20BA5A] text-white border-2 border-neo-black rounded-neo shadow-hard-sm font-bold"
          >
            <WhatsAppIcon className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
          <Button
            onClick={() => handleShare('telegram')}
            className="bg-[#0088cc] hover:bg-[#0077b5] text-white border-2 border-neo-black rounded-neo shadow-hard-sm font-bold"
          >
            <TelegramIcon className="w-4 h-4 mr-2" />
            Telegram
          </Button>
          <Button
            onClick={() => handleShare('facebook')}
            className="bg-[#1877f2] hover:bg-[#166fe5] text-white border-2 border-neo-black rounded-neo shadow-hard-sm font-bold"
          >
            <FacebookIcon className="w-4 h-4 mr-2" />
            Facebook
          </Button>
          <Button
            onClick={() => handleShare('native')}
            className="bg-neo-pink hover:bg-neo-pink/90 text-white border-2 border-neo-black rounded-neo shadow-hard-sm font-bold"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {t('common.share') || 'Share'}
          </Button>
        </div>
      </div>

      {/* Reward Tiers */}
      <div className="bg-neo-yellow/10 border-2 border-neo-yellow/30 rounded-neo p-4 mb-4">
        <div className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">
          💎 {t('profile.referralRewards') || 'Referral Rewards'}
        </div>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <div>🎯 Friend joins: <span className="font-bold text-neo-pink">+100 XP</span></div>
          <div>🎮 First game: <span className="font-bold text-neo-pink">+50 XP</span></div>
          <div>🔥 5 games: <span className="font-bold text-neo-pink">+100 XP</span></div>
          <div>⭐ 10 games: <span className="font-bold text-neo-pink">+200 XP</span></div>
        </div>
      </div>

      {/* Referred Users List */}
      {referralData.referrals.length > 0 && (
        <div>
          <div className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">
            👥 {t('profile.yourReferrals') || 'Your Referrals'} ({referralData.referrals.length})
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <AnimatePresence>
              {referralData.referrals.map((referral, index) => (
                <motion.div
                  key={referral.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2 p-2 bg-white/50 dark:bg-neo-navy/50 border border-neo-black/20 rounded-neo"
                >
                  <div
                    className="w-8 h-8 rounded-neo flex items-center justify-center text-sm border border-neo-black"
                    style={{ backgroundColor: referral.avatar_color || '#FFE135' }}
                  >
                    {referral.avatar_emoji || '🎯'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-neo-black dark:text-white truncate">
                      {referral.display_name || referral.username}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {referral.referred_games_played} {t('common.games') || 'games'}
                      {referral.reward_granted && (
                        <span className="ml-1 text-neo-pink">✓</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {referralData.referrals.length === 0 && (
        <div className="text-center py-4 text-gray-600 dark:text-gray-300 text-sm">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{t('profile.noReferralsYet') || 'No referrals yet. Start sharing!'}</p>
        </div>
      )}
    </motion.div>
  );
}

export default ReferralCard;
