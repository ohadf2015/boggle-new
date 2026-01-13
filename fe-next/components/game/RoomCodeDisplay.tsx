'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getJoinUrl } from '@/utils/share';

interface RoomCodeDisplayProps {
  gameCode: string;
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onShare?: () => void;
}

/**
 * RoomCodeDisplay - Prominent room code display with one-tap copy functionality
 * Designed for maximum visibility and ease of sharing
 */
export function RoomCodeDisplay({
  gameCode,
  t,
  className,
  size = 'md',
  onShare,
}: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      toast.success(t('roomCode.copied') || 'Code copied!', {
        duration: 1500,
        icon: '📋',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = gameCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success(t('roomCode.copied') || 'Code copied!', {
        duration: 1500,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  }, [gameCode, t]);

  const handleCopyLink = useCallback(async () => {
    try {
      const joinUrl = getJoinUrl(gameCode);
      await navigator.clipboard.writeText(joinUrl);
      toast.success(t('roomCode.linkCopied') || 'Link copied!', {
        duration: 1500,
        icon: '🔗',
      });
    } catch {
      toast.error(t('common.error') || 'Failed to copy');
    }
  }, [gameCode, t]);

  const sizeClasses = {
    sm: {
      container: 'px-3 py-2 gap-2',
      code: 'text-xl tracking-[0.15em]',
      label: 'text-[10px]',
      button: 'p-1.5',
      icon: 'w-3.5 h-3.5',
    },
    md: {
      container: 'px-4 py-3 gap-3',
      code: 'text-2xl tracking-[0.2em]',
      label: 'text-xs',
      button: 'p-2',
      icon: 'w-4 h-4',
    },
    lg: {
      container: 'px-5 py-4 gap-4',
      code: 'text-3xl tracking-[0.25em]',
      label: 'text-sm',
      button: 'p-2.5',
      icon: 'w-5 h-5',
    },
  };

  const styles = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        styles.container,
        'bg-neo-navy/60 rounded-neo',
        'border-3 border-neo-black shadow-hard',
        className
      )}
    >
      {/* Label */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            styles.label,
            'font-bold uppercase tracking-wider text-neo-cream/60'
          )}
        >
          {t('roomCode.label') || 'Room Code'}
        </span>

        {/* Code */}
        <motion.button
          onClick={handleCopy}
          whileTap={{ scale: 0.95 }}
          className={cn(
            styles.code,
            'font-black text-neo-lime',
            'cursor-pointer hover:text-neo-yellow transition-colors',
            'flex items-center gap-2'
          )}
          title={t('roomCode.tapToCopy') || 'Tap to copy'}
        >
          {gameCode}
          <motion.span
            initial={false}
            animate={copied ? { scale: [1, 1.3, 1] } : {}}
            className="inline-flex"
          >
            {copied ? (
              <Check className={cn(styles.icon, 'text-neo-lime')} />
            ) : (
              <Copy className={cn(styles.icon, 'text-neo-cream/50')} />
            )}
          </motion.span>
        </motion.button>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-neo-cream/20" />

      {/* Actions */}
      <div className="flex gap-2">
        {/* Copy Link */}
        <motion.button
          onClick={handleCopyLink}
          whileTap={{ scale: 0.9 }}
          className={cn(
            styles.button,
            'rounded-neo border-2 border-neo-cream/30',
            'bg-neo-navy/40 hover:bg-neo-cream/10',
            'text-neo-cream/70 hover:text-neo-cream',
            'transition-all'
          )}
          title={t('roomCode.copyLink') || 'Copy link'}
        >
          <Copy className={styles.icon} />
        </motion.button>

        {/* Share */}
        {onShare && (
          <motion.button
            onClick={onShare}
            whileTap={{ scale: 0.9 }}
            className={cn(
              styles.button,
              'rounded-neo border-2 border-neo-cyan/50',
              'bg-neo-cyan/20 hover:bg-neo-cyan/30',
              'text-neo-cyan',
              'transition-all'
            )}
            title={t('share.buttonLabel') || 'Share'}
          >
            <Share2 className={styles.icon} />
          </motion.button>
        )}
      </div>
    </div>
  );
}

export default RoomCodeDisplay;
