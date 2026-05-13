'use client';

import React, { useState, useCallback } from 'react';
import { Target, Send, Zap, Skull, Swords, MessageCircle, Timer, Trophy, Users } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ChallengeInviteDialogProps {
  isOpen: boolean;
  friendUsername: string;
  friendId: string;
  onClose: () => void;
  onSendChallenge: (
    friendId: string,
    challengeType: 'new_game' | 'join_room',
    settings: GameSettings
  ) => Promise<void>;
  className?: string;
}

export type ChallengeFlow = 'async' | 'live';

interface GameSettings {
  language?: string;
  timerSeconds?: number;
  mode?: string;
  message?: string;
  flow?: ChallengeFlow;
}

const TIMER_PRESETS: ReadonlyArray<{ seconds: number; label: string }> = [
  { seconds: 60, label: '1:00' },
  { seconds: 90, label: '1:30' },
  { seconds: 120, label: '2:00' },
  { seconds: 180, label: '3:00' },
];

type ModeId = 'classic' | 'blitz' | 'survival';

interface ModeMeta {
  id: ModeId;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** active background. Each mode has its own electric color for instant recognition. */
  activeBg: string;
  activeText: string;
}

const MODES: ReadonlyArray<ModeMeta> = [
  { id: 'classic', Icon: Swords, activeBg: 'bg-neo-cyan', activeText: 'text-neo-black' },
  { id: 'blitz', Icon: Zap, activeBg: 'bg-neo-yellow', activeText: 'text-neo-black' },
  { id: 'survival', Icon: Skull, activeBg: 'bg-neo-pink', activeText: 'text-neo-white' },
];

/**
 * ChallengeInviteDialog — neo-brutalist challenge sender. Chip pickers replace
 * dropdowns to cut decision load and add tap delight. Language is inherited
 * from the user's locale (rare to change). Custom message is hidden behind a
 * disclosure to avoid blank-field guilt.
 */
export const ChallengeInviteDialog: React.FC<ChallengeInviteDialogProps> = ({
  isOpen,
  friendUsername,
  friendId,
  onClose,
  onSendChallenge,
  className,
}) => {
  const { t, language } = useLanguage();

  const [flow, setFlow] = useState<ChallengeFlow>('async');
  const [mode, setMode] = useState<ModeId>('classic');
  const [timerSeconds, setTimerSeconds] = useState<number>(120);
  const [message, setMessage] = useState<string>('');
  const [showMessage, setShowMessage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFlow('async');
    setMode('classic');
    setTimerSeconds(120);
    setMessage('');
    setShowMessage(false);
    setError(null);
  }, []);

  const handleSend = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onSendChallenge(friendId, 'new_game', {
        language: language || 'en',
        timerSeconds,
        mode,
        message: message.trim() || undefined,
        flow,
      });
      reset();
      onClose();
    } catch {
      setError(t('friends.errors.sendFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [friendId, language, timerSeconds, mode, message, flow, onSendChallenge, onClose, reset, t]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open || isLoading) return;
      reset();
      onClose();
    },
    [isLoading, onClose, reset]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        noDescription
        closeButtonLabel={t('common.close')}
        className={cn('max-w-md', className)}
      >
        <DialogHeader variant="pink">
          <DialogTitle className="flex items-center justify-center gap-2">
            <Target className="w-6 h-6 stroke-3" aria-hidden="true" />
            {t('friends.challenges.send')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Recipient — friendly headline, big & playful */}
          <p
            dir="auto"
            className="text-center font-black text-lg leading-tight text-neo-black dark:text-neo-white"
          >
            {t('friends.challenges.inviteMessage', { name: friendUsername })}
          </p>

          {/* FLOW — async vs live segmented control */}
          <div>
            <div
              role="radiogroup"
              aria-label={t('friends.challenges.flowPicker.label')}
              className="grid grid-cols-2 gap-2"
            >
              {(['async', 'live'] as const).map((f) => {
                const isActive = flow === f;
                const Icon = f === 'async' ? Trophy : Users;
                return (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setFlow(f)}
                    disabled={isLoading}
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-3 py-3 rounded-neo border-3 border-neo-black',
                      'font-black uppercase tracking-tight text-xs transition-all duration-100',
                      isActive
                        ? (f === 'async'
                            ? 'bg-neo-lime text-neo-black shadow-hard-pressed translate-x-px translate-y-px'
                            : 'bg-neo-pink text-neo-white shadow-hard-pressed translate-x-px translate-y-px')
                        : 'bg-neo-cream dark:bg-neo-navy-light text-neo-black dark:text-neo-white shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg',
                      isLoading && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <Icon className="w-5 h-5 stroke-3" aria-hidden={true} />
                    <span>
                      {t(f === 'async' ? 'friends.challenges.flowPicker.async' : 'friends.challenges.flowPicker.live')}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs mt-2 text-center text-current/60 font-bold">
              {t(flow === 'async' ? 'friends.challenges.async.subcopy' : 'friends.challenges.live.subcopy')}
            </p>
          </div>

          {/* MODE — chip row */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-current/60 mb-2 text-center">
              {t('multiplayer.mode')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(({ id, Icon, activeBg, activeText }) => {
                const isActive = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    disabled={isLoading}
                    aria-pressed={isActive}
                    className={cn(
                      'relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-neo border-3 border-neo-black',
                      'font-black uppercase tracking-tight text-xs transition-all duration-100',
                      isActive
                        ? cn(activeBg, activeText, 'shadow-hard-pressed translate-x-px translate-y-px')
                        : 'bg-neo-cream dark:bg-neo-navy-light text-neo-black dark:text-neo-white shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg',
                      isLoading && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <Icon className="w-6 h-6 stroke-3" aria-hidden={true} />
                    <span>{t(`friends.challenges.modes.${id}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TIMER — chip pills */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-current/60 mb-2 text-center flex items-center justify-center gap-1.5">
              <Timer className="w-3.5 h-3.5 stroke-3" aria-hidden="true" />
              {t('multiplayer.timer')}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {TIMER_PRESETS.map(({ seconds, label }) => {
                const isActive = timerSeconds === seconds;
                return (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => setTimerSeconds(seconds)}
                    disabled={isLoading}
                    aria-pressed={isActive}
                    className={cn(
                      'py-2.5 rounded-neo border-3 border-neo-black font-black text-base tracking-tight',
                      'transition-all duration-100',
                      isActive
                        ? 'bg-neo-lime text-neo-black shadow-hard-pressed translate-x-px translate-y-px'
                        : 'bg-neo-cream dark:bg-neo-navy-light text-neo-black dark:text-neo-white shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard',
                      isLoading && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MESSAGE — collapsed by default */}
          <div>
            {!showMessage ? (
              <button
                type="button"
                onClick={() => setShowMessage(true)}
                disabled={isLoading}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2 rounded-neo border-2 border-dashed border-neo-black/40 dark:border-neo-white/30',
                  'font-black uppercase tracking-wide text-xs text-current/70',
                  'hover:bg-neo-cream/60 dark:hover:bg-neo-navy-light/40 transition-colors',
                  isLoading && 'opacity-60 cursor-not-allowed'
                )}
              >
                <MessageCircle className="w-4 h-4 stroke-3" aria-hidden="true" />
                {t('friends.challenges.customMessage')}
              </button>
            ) : (
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isLoading}
                  placeholder={t('friends.challenges.customMessage')}
                  maxLength={200}
                  rows={2}
                  autoFocus
                  className={cn(
                    'w-full px-3 py-2.5 rounded-neo border-3 border-neo-black resize-none',
                    'font-bold text-sm',
                    'bg-neo-cream dark:bg-neo-navy-light text-neo-black dark:text-neo-white',
                    'shadow-hard-sm focus:shadow-hard focus:outline-none',
                    'placeholder:text-current/50',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                />
                <p className="text-xs mt-1 font-bold text-current/50 text-end">
                  {message.length}/200
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-neo border-3 border-neo-red bg-neo-red/15 p-3">
              <p className="text-sm font-black uppercase tracking-tight text-neo-red">{error}</p>
            </div>
          )}

          {/* SEND — single big button. Cancel is the X in the corner. */}
          <button
            onClick={handleSend}
            disabled={isLoading}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-4 rounded-neo border-3 border-neo-black',
              'font-black text-base uppercase tracking-wider',
              'bg-neo-lime text-neo-black shadow-hard',
              'hover:shadow-hard-lg hover:-translate-y-0.5 active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
              'transition-all duration-100',
              isLoading && 'opacity-60 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <Loader size="sm" />
                {t('common.sending')}
              </>
            ) : (
              <>
                <Send className="w-5 h-5 stroke-3" aria-hidden="true" />
                {t(flow === 'async' ? 'friends.challenges.cta.async' : 'friends.challenges.cta.live')}
              </>
            )}
          </button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeInviteDialog;
