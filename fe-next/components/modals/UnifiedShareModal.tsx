'use client';

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Reveal } from '@/components/ui/Reveal';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, MessageCircle, Trophy, Flame, Check, Target, Mail, MessageSquare } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { cn } from '@/lib/utils';
import { getJoinUrl, copyJoinUrl, shareViaWhatsApp, shareViaTwitter, shareViaDiscord, shareViaEmail, shareViaSms, canShareViaSms, generatePersonalizedShareMessage, type GameResultForShare } from '@/utils/share';
import { trackShare } from '@/utils/growthTracking';
import { getStoredUsername } from '@/utils/profileStorage';
import { useNativeShare } from '@/hooks/useNativeShare';
import { addCoins } from '@/utils/coinManager';
import { createChallenge, getChallengeUrl, generateChallengeShareMessage, type ChallengeCreatorData, type ChallengeGameConfig, type ChallengePerformance } from '@/utils/challenges';
import toast from 'react-hot-toast';

/**
 * Share context determines the modal's appearance and behavior
 */
type ShareContext = 'pre-game' | 'post-game';

/** Challenge data for creating "Beat My Score" challenges */
interface ChallengeData {
  creator: ChallengeCreatorData;
  gameConfig: ChallengeGameConfig;
  performance: ChallengePerformance;
}

interface UnifiedShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameCode: string;
  roomName?: string;
  t: (key: string) => string;
  /** Context determines styling and content */
  context?: ShareContext;
  /** Post-game stats (only used when context='post-game') */
  gameResult?: GameResultForShare;
  /** Language for personalized messages */
  language?: string;
  /** Witty message to display (optional, auto-generated if not provided) */
  wittyMessage?: string;
  /** Challenge data for creating "Beat My Score" challenges (post-game only) */
  challengeData?: ChallengeData;
}

/**
 * UnifiedShareModal - Single modal for ALL share contexts
 *
 * Supports both pre-game (room code sharing) and post-game (victory sharing).
 * Simplified to 2 primary actions: Copy Link + WhatsApp
 *
 * Design: Neo-brutalist with hard shadows, consistent across contexts
 */
const UnifiedShareModal: React.FC<UnifiedShareModalProps> = ({
  isOpen,
  onClose,
  gameCode,
  roomName = '',
  t,
  context = 'pre-game',
  gameResult,
  language = 'en',
  wittyMessage,
  challengeData,
}) => {
  const { canNativeShare, nativeShare } = useNativeShare();
  const isPostGame = context === 'post-game';

  // Award daily share bonus (20 coins, once per day)
  const awardShareBonus = useCallback(() => {
    if (typeof window === 'undefined') return;
    const today = new Date().toISOString().split('T')[0];
    const lastBonus = localStorage.getItem('lastShareBonusDate');
    if (lastBonus !== today) {
      localStorage.setItem('lastShareBonusDate', today);
      addCoins(20, 'Share Bonus');
      toast.success(t('share.shareBonusAwarded'), { icon: '🎉', duration: 3000 });
    }
  }, [t]);
  const joinUrl = getJoinUrl(
    gameCode,
    isPostGame ? 'share-win' : 'modal-share',
    getStoredUsername() ?? undefined,
  );
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [challengeCreated, setChallengeCreated] = useState(false);
  const [showMorePlatforms, setShowMorePlatforms] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile on mount
  useEffect(() => {
    setIsMobile(canShareViaSms());
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+C to copy link when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !window.getSelection()?.toString()) {
        e.preventDefault();
        copyJoinUrl(gameCode, t, isPostGame ? 'share-win-copy' : 'copy').then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, gameCode, t, isPostGame]);

  // Generate share message for post-game context
  const shareMessage = useMemo(() => {
    if (!isPostGame || !gameResult) {
      return `🎮 ${t('share.inviteTitle')}\n${t('share.inviteMessage')}\n${joinUrl}`;
    }
    return generatePersonalizedShareMessage(gameCode, gameResult, language, 'modal');
  }, [isPostGame, gameResult, gameCode, language, joinUrl, t]);

  const handleCopyLink = useCallback(async () => {
    setIsLoading(true);
    await copyJoinUrl(gameCode, t, isPostGame ? 'share-win-copy' : 'copy');
    setIsLoading(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    awardShareBonus();
    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [gameCode, t, isPostGame, awardShareBonus]);

  const handleWhatsApp = useCallback(() => {
    trackShare('whatsapp', gameCode);
    awardShareBonus();
    if (isPostGame && gameResult) {
      // Use personalized message for post-game
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      shareViaWhatsApp(gameCode, roomName, t);
    }
  }, [gameCode, roomName, t, isPostGame, gameResult, shareMessage, awardShareBonus]);

  const handleTwitter = useCallback(() => {
    trackShare('twitter', gameCode);
    const twitterMessage = isPostGame && gameResult
      ? shareMessage.split('\n').slice(0, 2).join(' ') // Shorter for Twitter
      : `${t('share.inviteTitle')} ${t('share.inviteMessage')}`;
    shareViaTwitter(twitterMessage, joinUrl);
  }, [shareMessage, joinUrl, isPostGame, gameResult, t, gameCode]);

  const handleDiscord = useCallback(async () => {
    trackShare('discord', gameCode);
    const discordMessage = isPostGame && gameResult
      ? shareMessage
      : `🎮 **${t('share.inviteTitle')}**\n${t('share.inviteMessage')}\n\n🎯 Room Code: \`${gameCode}\``;
    await shareViaDiscord(discordMessage, joinUrl, t);
  }, [shareMessage, joinUrl, isPostGame, gameResult, t, gameCode]);

  const handleEmail = useCallback(() => {
    trackShare('email', gameCode);
    const subject = isPostGame
      ? t('share.emailSubjectPostGame')
      : t('share.emailSubjectInvite');
    const body = isPostGame && gameResult
      ? shareMessage
      : `${t('share.inviteTitle')}\n${t('share.inviteMessage')}\n\nRoom Code: ${gameCode}`;
    shareViaEmail(subject, body, joinUrl);
  }, [shareMessage, joinUrl, isPostGame, gameResult, t, gameCode]);

  const handleSms = useCallback(() => {
    trackShare('sms', gameCode);
    const smsMessage = isPostGame && gameResult
      ? shareMessage.split('\n').slice(0, 3).join('\n') // Shorter for SMS
      : `${t('share.inviteTitle')} ${t('share.inviteMessage')}`;
    shareViaSms(smsMessage, joinUrl);
  }, [shareMessage, joinUrl, isPostGame, gameResult, t, gameCode]);

  const handleNativeShare = useCallback(async () => {
    const success = await nativeShare({
      title: isPostGame ? 'LexiClash Victory!' : t('share.inviteTitle'),
      text: shareMessage,
      url: joinUrl,
    });
    if (success) {
      awardShareBonus();
      onClose();
    }
  }, [nativeShare, joinUrl, shareMessage, isPostGame, t, onClose, awardShareBonus]);

  // Handle creating a challenge
  const handleCreateChallenge = useCallback(async () => {
    if (!challengeData) return;

    setIsCreatingChallenge(true);
    try {
      const challenge = await createChallenge(challengeData);
      if (challenge) {
        // Copy the challenge link
        const challengeUrl = getChallengeUrl(challenge.challengeCode, 'share-modal');
        await navigator.clipboard.writeText(challengeUrl);
        setChallengeCreated(true);
        toast.success(
          t('share.challengeLinkCopied'),
          { icon: '🎯', duration: 3000 }
        );
        setTimeout(() => setChallengeCreated(false), 3000);
      } else {
        toast.error(
          t('share.errorCreatingChallenge'),
          { duration: 3000 }
        );
      }
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error(
        t('share.errorCreatingChallenge'),
        { duration: 3000 }
      );
    } finally {
      setIsCreatingChallenge(false);
    }
  }, [challengeData, t]);

  // Determine header color based on context
  const headerColor = isPostGame ? 'bg-neo-lime' : 'bg-neo-pink';
  const headerTextColor = 'text-neo-black';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent noDescription className="sm:max-w-md bg-neo-navy border-4 border-neo-black rounded-neo shadow-hard-xl p-0 overflow-hidden">
        {/* Header - Context-aware */}
        <div className={cn(
          'border-b-4 border-neo-black p-4 flex items-center justify-center gap-2',
          headerColor
        )}>
          {isPostGame && <Trophy className="w-5 h-5 text-neo-black" />}
          <DialogTitle className={cn('text-lg font-black uppercase', headerTextColor)}>
            {isPostGame ? t('share.shareVictory') : t('share.modalTitle')}
          </DialogTitle>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Post-game Stats Display - Enhanced Share Card */}
          {isPostGame && gameResult && (
            <Reveal
              className="flex flex-col items-center gap-3"
            >
              {/* Witty Message */}
              {wittyMessage && (
                <p className="text-center text-white font-bold text-sm px-2 italic">
                  &ldquo;{wittyMessage}&rdquo;
                </p>
              )}

              {/* Player Archetype Badge */}
              {gameResult.archetype && (
                <Reveal
                  noSlide
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-cyan/50 bg-neo-cyan/20"
                >
                  <span className="text-xl">{gameResult.archetype.emoji}</span>
                  <span className="text-sm font-bold text-neo-cyan">
                    {gameResult.archetype.name}
                  </span>
                </Reveal>
              )}

              {/* Main Stats Row */}
              <div className="flex items-center justify-center gap-4 p-3 rounded-neo border-2 border-white/20 bg-black/30">
                <div className="text-center px-3">
                  <div className="text-2xl font-black text-neo-lime">
                    {gameResult.score}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-300">
                    {t('share.pts')}
                  </div>
                </div>
                <div className="w-0.5 h-10 rounded-full bg-white/20" />
                <div className="text-center px-3">
                  <div className="text-2xl font-black text-neo-cyan">
                    {gameResult.wordCount}
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-300">
                    {t('share.words')}
                  </div>
                </div>
                {gameResult.maxCombo && gameResult.maxCombo > 1 && (
                  <>
                    <div className="w-0.5 h-10 rounded-full bg-white/20" />
                    <div className="text-center px-3">
                      <div className="text-2xl font-black text-neo-pink">
                        {gameResult.maxCombo}x
                      </div>
                      <div className="text-xs font-bold uppercase tracking-wide text-gray-300">
                        {t('share.combo')}
                      </div>
                    </div>
                  </>
                )}
                {gameResult.streakDays && gameResult.streakDays > 1 && (
                  <>
                    <div className="w-0.5 h-10 rounded-full bg-white/20" />
                    <div className="text-center px-3">
                      <div className="text-2xl font-black text-orange-400 flex items-center gap-1">
                        <Flame className="w-5 h-5" /> {gameResult.streakDays}
                      </div>
                      <div className="text-xs font-bold uppercase tracking-wide text-gray-300">
                        {t('share.streak')}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Longest Word & Achievements Row */}
              {(gameResult.longestWord || (gameResult.achievements && gameResult.achievements.length > 0)) && (
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {/* Longest Word */}
                  {gameResult.longestWord && (
                    <Reveal
                      noSlide
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 border-purple-500/50 bg-purple-500/20"
                    >
                      <span className="text-purple-300 text-xs font-bold uppercase">
                        {t('share.longest')}
                      </span>
                      <span className="text-white font-black text-sm uppercase">
                        {gameResult.longestWord}
                      </span>
                    </Reveal>
                  )}
                  {/* Achievements */}
                  {gameResult.achievements && gameResult.achievements.length > 0 && (
                    <Reveal
                      noSlide
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-neo border-2 border-neo-lime/50 bg-neo-lime/20"
                    >
                      <span className="text-lg">
                        {gameResult.achievements.slice(0, 3).map(a => a.icon || '🏆').join('')}
                      </span>
                      {gameResult.achievements.length > 3 && (
                        <span className="text-neo-lime text-xs font-bold">
                          +{gameResult.achievements.length - 3}
                        </span>
                      )}
                    </Reveal>
                  )}
                </div>
              )}

              {/* Placement Badge */}
              {gameResult.placement && gameResult.totalPlayers && gameResult.totalPlayers > 1 && (
                <Reveal
                  noSlide
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2',
                    gameResult.placement === 1 ? 'border-yellow-500/50 bg-yellow-500/20' :
                    gameResult.placement === 2 ? 'border-gray-400/50 bg-gray-400/20' :
                    gameResult.placement === 3 ? 'border-orange-600/50 bg-orange-600/20' :
                    'border-white/30 bg-white/10'
                  )}
                >
                  <span className={cn(
                    'font-black',
                    gameResult.placement === 1 ? 'text-yellow-400' :
                    gameResult.placement === 2 ? 'text-gray-300' :
                    gameResult.placement === 3 ? 'text-orange-400' :
                    'text-white'
                  )}>
                    #{gameResult.placement}
                  </span>
                  <span className="text-gray-400 text-xs">
                    / {gameResult.totalPlayers}
                  </span>
                </Reveal>
              )}
            </Reveal>
          )}

          {/* QR Code - Hidden on mobile, visible on desktop */}
          <Reveal
            noSlide
            className="hidden sm:flex flex-col items-center"
          >
            <p className="text-xs font-bold text-white uppercase tracking-wide mb-2">
              {t('share.scanToJoin')}
            </p>
            <div
              className="bg-white text-neo-black p-5 rounded-neo border-3 border-neo-black shadow-hard-md"
              role="img"
              aria-label={`QR code to join game ${gameCode}`}
            >
              <QRCodeSVG
                value={joinUrl}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>
          </Reveal>

          {/* Room Code Display */}
          <Reveal
            className="flex items-center justify-center gap-2"
          >
            <div className="bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm">
              <span className="font-black text-xl text-neo-black tracking-wider">
                {gameCode}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className={cn(
                'border-2 border-neo-black rounded-neo p-3 min-w-[44px] min-h-[44px] flex items-center justify-center shadow-hard-sm hover:shadow-hard-md hover:-translate-y-0.5 transition-all focus:outline-hidden focus:ring-2 focus:ring-neo-lime focus:ring-offset-2',
                copied ? 'bg-neo-lime' : 'bg-neo-cyan'
              )}
              aria-label={copied ? t('share.linkCopied') : t('share.copyLink')}
              title={copied ? t('share.linkCopied') : t('share.copyLink')}
            >
              {copied ? <Check className="w-4 h-4 text-neo-black" /> : <Copy className="w-4 h-4 text-neo-black" />}
            </button>
          </Reveal>

          {/* Simplified Share Options - Only Copy + WhatsApp */}
          <Reveal
            className="space-y-3"
          >
            {/* Primary: Copy Link - Full Width */}
            <button
              onClick={handleCopyLink}
              disabled={isLoading}
              aria-label={copied ? t('share.linkCopied') : t('share.copyLink')}
              className={cn(
                'animate-in fade-in-0 duration-300',
                'w-full flex items-center justify-center gap-2 p-4 rounded-neo',
                'border-4 border-neo-black shadow-hard-lg',
                'hover:shadow-hard-xl hover:-translate-y-1 active:shadow-hard-sm active:translate-y-0',
                'transition-all duration-150',
                'font-black text-lg uppercase tracking-wide',
                copied ? 'bg-neo-lime text-neo-black' : 'bg-neo-lime text-neo-black',
                'focus:outline-hidden focus:ring-4 focus:ring-neo-cyan focus:ring-offset-2',
                'disabled:opacity-70 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <Loader size="sm" />
              ) : copied ? (
                <Check className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
              <span>{copied ? t('share.linkCopied') : t('share.copyLink')}</span>
            </button>

            {/* Secondary: WhatsApp - Full Width */}
            <button
              onClick={handleWhatsApp}
              aria-label={t('share.whatsapp')}
              className={cn(
                'animate-in fade-in-0 duration-300',
                'w-full flex items-center justify-center gap-2 p-3 rounded-neo',
                'border-2 border-neo-black shadow-hard-sm',
                'hover:shadow-hard-md hover:-translate-y-0.5 active:shadow-none active:translate-y-0',
                'transition-all duration-150',
                'font-bold text-sm uppercase tracking-wide',
                'bg-brand-whatsapp text-black',
                'focus:outline-hidden focus:ring-2 focus:ring-neo-lime focus:ring-offset-2'
              )}
            >
              <MessageCircle className="w-5 h-5" />
              <span>{t('share.whatsapp')}</span>
            </button>

            {/* More Platforms Toggle */}
            <button
              onClick={() => setShowMorePlatforms(!showMorePlatforms)}
              aria-expanded={showMorePlatforms}
              aria-controls="more-platforms"
              className={cn(
                'animate-in fade-in-0 duration-300',
                'w-full flex items-center justify-center gap-1.5 py-2 rounded-neo',
                'text-white hover:text-white transition-colors',
                'font-medium text-xs uppercase tracking-wide',
                'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2'
              )}
            >
              <span>{showMorePlatforms ? (t('share.lessOptions')) : (t('share.morePlatforms'))}</span>
              <svg
                className={cn('w-3.5 h-3.5 transition-transform', showMorePlatforms && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Additional Share Platforms */}
            {showMorePlatforms && (
              <Reveal
                noSlide
                id="more-platforms"
                className="grid grid-cols-2 gap-2"
              >
                {/* Twitter/X */}
                <button
                  onClick={handleTwitter}
                  aria-label={t('share.twitter')}
                  className={cn(
                    'animate-in fade-in-0 duration-300',
                    'flex items-center justify-center gap-2 p-3 rounded-neo',
                    'border-2 border-neo-black shadow-hard-sm',
                    'hover:shadow-hard-md hover:-translate-y-0.5 active:shadow-none active:translate-y-0',
                    'transition-all duration-150',
                    'font-bold text-xs uppercase tracking-wide',
                    'bg-black text-white',
                    'focus:outline-hidden focus:ring-2 focus:ring-neo-lime focus:ring-offset-2'
                  )}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span>{t('share.twitter')}</span>
                </button>

                {/* Discord */}
                <button
                  onClick={handleDiscord}
                  aria-label={t('share.discord')}
                  className={cn(
                    'animate-in fade-in-0 duration-300',
                    'flex items-center justify-center gap-2 p-3 rounded-neo',
                    'border-2 border-neo-black shadow-hard-sm',
                    'hover:shadow-hard-md hover:-translate-y-0.5 active:shadow-none active:translate-y-0',
                    'transition-all duration-150',
                    'font-bold text-xs uppercase tracking-wide',
                    'bg-brand-discord text-white',
                    'focus:outline-hidden focus:ring-2 focus:ring-neo-lime focus:ring-offset-2'
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{t('share.discord')}</span>
                </button>

                {/* Email */}
                <button
                  onClick={handleEmail}
                  aria-label={t('share.email')}
                  className={cn(
                    'animate-in fade-in-0 duration-300',
                    'flex items-center justify-center gap-2 p-3 rounded-neo',
                    'border-2 border-neo-black shadow-hard-sm',
                    'hover:shadow-hard-md hover:-translate-y-0.5 active:shadow-none active:translate-y-0',
                    'transition-all duration-150',
                    'font-bold text-xs uppercase tracking-wide',
                    'bg-neo-pink text-neo-black',
                    'focus:outline-hidden focus:ring-2 focus:ring-neo-lime focus:ring-offset-2'
                  )}
                >
                  <Mail className="w-4 h-4" />
                  <span>{t('share.email')}</span>
                </button>

                {/* SMS - Mobile Only */}
                {isMobile && (
                  <button
                    onClick={handleSms}
                    aria-label={t('share.sms')}
                    className={cn(
                      'animate-in fade-in-0 duration-300',
                      'flex items-center justify-center gap-2 p-3 rounded-neo',
                      'border-2 border-neo-black shadow-hard-sm',
                      'hover:shadow-hard-md hover:-translate-y-0.5 active:shadow-none active:translate-y-0',
                      'transition-all duration-150',
                      'font-bold text-xs uppercase tracking-wide',
                      'bg-neo-lime text-neo-black',
                      'focus:outline-hidden focus:ring-2 focus:ring-neo-lime focus:ring-offset-2'
                    )}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{t('share.sms')}</span>
                  </button>
                )}
              </Reveal>
            )}

            {/* Challenge a Friend (Post-game only, when challenge data is available) */}
            {isPostGame && challengeData && (
              <button
                onClick={handleCreateChallenge}
                disabled={isCreatingChallenge}
                aria-label={t('challenge.challengeFriend')}
                className={cn(
                  'animate-in fade-in-0 duration-300',
                  'w-full flex items-center justify-center gap-2 p-3 rounded-neo',
                  'border-2 border-neo-black shadow-hard-sm',
                  'hover:shadow-hard-md hover:-translate-y-0.5 active:shadow-none active:translate-y-0',
                  'transition-all duration-150',
                  'font-bold text-sm uppercase tracking-wide',
                  challengeCreated ? 'bg-neo-lime text-neo-black' : 'bg-neo-cyan text-neo-black',
                  'focus:outline-hidden focus:ring-2 focus:ring-neo-lime focus:ring-offset-2',
                  'disabled:opacity-70 disabled:cursor-not-allowed'
                )}
              >
                {isCreatingChallenge ? (
                  <Loader size="sm" />
                ) : challengeCreated ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Target className="w-5 h-5" />
                )}
                <span>
                  {challengeCreated
                    ? t('share.linkCopied')
                    : t('challenge.challengeFriend')}
                </span>
              </button>
            )}

            {/* Native Share (Mobile Only) */}
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                aria-label={t('share.more')}
                className={cn(
                  'animate-in fade-in-0 duration-300',
                  'w-full sm:hidden flex items-center justify-center gap-2 p-3 rounded-neo',
                  'border-2 border-white/30 shadow-hard-sm',
                  'hover:shadow-hard-md hover:-translate-y-0.5 transition-all',
                  'font-bold text-sm uppercase tracking-wide',
                  'bg-white/10 text-white hover:bg-white/20',
                  'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2'
                )}
              >
                <span>{t('share.more')}</span>
              </button>
            )}
          </Reveal>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedShareModal;
