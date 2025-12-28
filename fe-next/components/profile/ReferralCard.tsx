'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Users, Copy, Check, Share2, Trophy, Sparkles } from 'lucide-react';
import { FaWhatsapp, FaFacebook, FaTelegram } from 'react-icons/fa';
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
          <div className="w-8 h-8 border-3 border-neo-purple border-t-transparent rounded-full animate-spin" />
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
        <div className="p-2 bg-neo-purple text-white rounded-neo border-2 border-neo-black">
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
        <div className="bg-neo-orange/20 border-2 border-neo-orange rounded-neo p-3 text-center">
          <Trophy className="w-5 h-5 mx-auto mb-1 text-neo-orange" />
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
            <code className="text-2xl font-black text-neo-purple tracking-wider">{referralData.referralCode}</code>
          </div>
          <Button
            onClick={handleCopyLink}
            className="px-4 py-3 h-auto bg-neo-purple hover:bg-neo-purple/90 text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all"
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
            <FaWhatsapp className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
          <Button
            onClick={() => handleShare('telegram')}
            className="bg-[#0088cc] hover:bg-[#0077b5] text-white border-2 border-neo-black rounded-neo shadow-hard-sm font-bold"
          >
            <FaTelegram className="w-4 h-4 mr-2" />
            Telegram
          </Button>
          <Button
            onClick={() => handleShare('facebook')}
            className="bg-[#1877f2] hover:bg-[#166fe5] text-white border-2 border-neo-black rounded-neo shadow-hard-sm font-bold"
          >
            <FaFacebook className="w-4 h-4 mr-2" />
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
          <div>🎯 Friend joins: <span className="font-bold text-neo-purple">+100 XP</span></div>
          <div>🎮 First game: <span className="font-bold text-neo-purple">+50 XP</span></div>
          <div>🔥 5 games: <span className="font-bold text-neo-purple">+100 XP</span></div>
          <div>⭐ 10 games: <span className="font-bold text-neo-purple">+200 XP</span></div>
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
                        <span className="ml-1 text-neo-purple">✓</span>
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
