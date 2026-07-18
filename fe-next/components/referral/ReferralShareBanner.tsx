'use client';

/**
 * ReferralShareBanner — Prominent CTA on the leaderboard page encouraging
 * users to invite friends. Shows referral code + share buttons.
 */

import { useState, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';
import { Gift, Users, Copy, Check, Share2, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { neoSuccessToast } from '@/components/NeoToast';

interface ReferralData {
  referralCode: string;
  referralCount: number;
  referralRewardXp: number;
  totalCoins: number;
  shareUrl: string;
}

export default function ReferralShareBanner() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetch('/api/growth/referral')
      .then((r) => r.json())
      .then((d) => {
        if (d.referralCode) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const handleCopy = useCallback(async () => {
    if (!data?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      neoSuccessToast(t('leaderboard.referral.copied') || 'Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = data.shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [data, t]);

  const handleShare = useCallback(async () => {
    if (!data?.shareUrl) return;
    const text = `${t('leaderboard.referral.shareText') || '🎮 Play LexiClash with me! Challenge me to a word game!'}\n\n${data.shareUrl}`;

    if (navigator.share) {
      await navigator.share({ title: 'LexiClash', text, url: data.shareUrl });
    } else {
      await navigator.clipboard.writeText(text);
      neoSuccessToast(t('leaderboard.referral.copied') || 'Copied to clipboard!');
    }
  }, [data, t]);

  if (!user || loading) return null;
  if (!data) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'rounded-neo-lg border-3 border-neo-black shadow-hard overflow-hidden',
        'bg-gradient-to-r from-neo-purple/10 via-neo-pink/10 to-neo-cyan/10'
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-purple/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-neo-purple" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-white">
              {t('leaderboard.referral.inviteFriends') || 'Invite Friends, Earn Rewards!'}
            </h3>
            <p className="text-xs text-neo-cream/70 mt-0.5">
              {t('leaderboard.referral.subtitle') || 'Share your code and both get 100 XP + 50 coins when they play!'}
            </p>

            {/* Referral code display */}
            <div className="flex items-center gap-2 mt-2">
              <code className="px-2 py-1 rounded-md bg-neo-navy-elevated text-neo-cyan font-mono font-bold text-sm tracking-wider">
                {data.referralCode}
              </code>
              <span className="text-xs text-neo-cream/50">
                {data.referralCount > 0
                  ? `${data.referralCount} ${t('leaderboard.referral.friendsJoined') || 'friends joined'}`
                  : t('leaderboard.referral.noReferralsYet') || 'No referrals yet'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              haptic
              className="text-xs"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline ms-1">{copied ? t('common.copied') || 'Copied!' : t('common.copy') || 'Copy'}</span>
            </Button>
            <Button
              variant="cyan"
              size="sm"
              onClick={handleShare}
              haptic
              animation="pop"
              className="text-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ms-1">{t('common.share') || 'Share'}</span>
            </Button>
          </div>
        </div>
      </div>
    </m.div>
  );
}