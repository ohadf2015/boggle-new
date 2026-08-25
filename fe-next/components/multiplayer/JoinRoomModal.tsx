'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Swords, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarSelector } from '@/components/multiplayer/AvatarSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import {
  getOrCreateStoredUsername,
  getOrCreateStoredCustomAvatar,
  setStoredUsername,
  setStoredCustomAvatar,
} from '@/utils/profileStorage';
import { validateUsername } from '@/utils/validation';
import { cn } from '@/lib/utils';
import type { ActiveRoom } from '@/shared/types/game';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { useAuth } from '@/contexts/AuthContext';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ActiveRoom | null;
  isJoining: boolean;
  onJoin: (username: string) => void;
  onSpectate?: (username: string) => void;
  isAuthenticated: boolean;
  displayName: string | null;
  profileAvatar?: CustomAvatarConfig | null;
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  room,
  isJoining,
  onJoin,
  onSpectate,
  isAuthenticated,
  displayName,
  profileAvatar,
}) => {
  const { t, dir } = useLanguage();
  const { updateProfile: updateAuthProfile } = useAuth();

  const [username, setUsername] = useState<string>('');
  const [customAvatar, setCustomAvatar] = useState<CustomAvatarConfig | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [hasTouchedName, setHasTouchedName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setHasAttemptedSubmit(false);
    setHasTouchedName(false);

    if (isAuthenticated && displayName) {
      setUsername(displayName);
      setCustomAvatar(profileAvatar ?? getRandomAvatarConfig());
    } else {
      // Prefill a generated name for first-time guests so "Join Battle" is
      // live on open. Mirrors CreateRoomModal — both entry paths must resolve
      // the guest identity identically or they diverge.
      setUsername(getOrCreateStoredUsername(room?.language));
      setCustomAvatar(getOrCreateStoredCustomAvatar());
    }
  }, [isOpen, isAuthenticated, displayName, profileAvatar, room?.language]);

  const handleJoin = useCallback(() => {
    setHasAttemptedSubmit(true);

    const validation = validateUsername(username);
    if (!validation.isValid || !customAvatar) {
      if (!validation.isValid) {
        nameInputRef.current?.focus();
      }
      return;
    }

    if (!isAuthenticated) {
      setStoredUsername(username.trim());
    }
    setStoredCustomAvatar(customAvatar);
    if (isAuthenticated) {
      const profileUpdates: Record<string, unknown> = { avatar_config: customAvatar };
      if (username.trim() !== displayName) {
        profileUpdates.display_name = username.trim();
      }
      updateAuthProfile(profileUpdates).catch(() => {});
    }

    onJoin(username.trim());
  }, [username, customAvatar, isAuthenticated, onJoin, updateAuthProfile, displayName]);

  if (!room) return null;

  const usernameValidation = validateUsername(username);
  const showError = (hasAttemptedSubmit || hasTouchedName) && !usernameValidation.isValid;
  const nameError = showError ? usernameValidation.error : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent noDescription dir={dir} className="max-w-sm sm:max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader variant="pink">
          <DialogTitle>{t('multiplayerFlow.joinModal.title')}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Room Info Card — lobby ticket style */}
          <div className="relative rounded-neo border-3 border-neo-black shadow-hard-sm bg-neo-navy-light overflow-hidden">
            {/* Dashed separator line for "ticket" feel */}
            <div className="absolute inset-x-0 bottom-0 border-b-2 border-dashed border-neo-white/10" />
            <div className="flex items-center gap-3 p-3">
              <span className="text-3xl shrink-0">{LANGUAGE_FLAGS[room.language] || '🎮'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-neo-white truncate text-lg tracking-tight" title={room.roomName || room.gameCode}>
                  {room.roomName || room.gameCode}
                </p>
                <p className={cn(
                  'text-sm flex items-center gap-1.5 font-bold',
                  room.maxPlayers && room.playerCount >= room.maxPlayers ? 'text-neo-red' : 'text-neo-cyan'
                )}>
                  <Users className="w-4 h-4" />
                  {room.playerCount || 0}{room.maxPlayers ? `/${room.maxPlayers}` : ''} {t('joinView.players')}
                  {room.maxPlayers && room.playerCount >= room.maxPlayers && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-neo-red/20 text-neo-red px-1.5 py-0.5 rounded-sm border border-neo-red/30">
                      {t('multiplayerFlow.joinModal.roomFull')}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Avatar + Name — compact inline layout */}
          <div className="flex items-center gap-3">
            <AvatarSelector
              selectedAvatar={customAvatar}
              onAvatarChange={setCustomAvatar}
              compact
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="join-username" className="text-xs font-black uppercase tracking-wider text-neo-pink">
                {t('multiplayerFlow.joinModal.yourName')}
              </Label>
              <Input
                ref={nameInputRef}
                id="join-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setHasTouchedName(true)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={20}
                autoFocus
                aria-required="true"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? 'join-username-error' : undefined}
                className={cn(
                  'font-bold bg-neo-navy-light border-2 border-neo-black text-neo-white placeholder:text-neo-white/50 focus-visible:ring-neo-pink',
                  nameError && 'border-neo-red animate-neo-shake'
                )}
                placeholder={t('multiplayerFlow.joinModal.namePlaceholder')}
              />
              {nameError && (
                <p id="join-username-error" className="text-xs font-bold text-neo-red" role="alert">
                  {t(nameError)}
                </p>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="sticky bottom-0 bg-inherit z-10 flex flex-col gap-2" style={{ paddingBottom: 'calc(max(0.75rem, env(safe-area-inset-bottom, 0.75rem)) + var(--admob-banner-height, 0px))' }}>
          {room.maxPlayers && room.playerCount >= room.maxPlayers ? (
            <>
              <p className="text-xs text-center text-neo-white font-bold">
                {t('multiplayerFlow.joinModal.roomFullSpectate')}
              </p>
              <Button
                variant="default"
                size="lg"
                // Re-check capacity at click time — if a player left while the
                // modal was open the room may no longer be full, in which case
                // we should join as a player instead of silently spectating
                // (audit UX-H1).
                onClick={() => {
                  const stillFull = room.maxPlayers && room.playerCount >= room.maxPlayers;
                  if (stillFull) {
                    onSpectate?.(username.trim()) || handleJoin();
                  } else {
                    handleJoin();
                  }
                }}
                disabled={isJoining}
                className="w-full bg-neo-purple hover:bg-neo-purple/90 text-neo-white font-black uppercase tracking-wide border-3 border-neo-black shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 gap-2"
              >
                <Eye className="w-5 h-5" />
                {t('multiplayerFlow.joinModal.spectateButton')}
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="lg"
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full bg-neo-pink hover:bg-neo-pink-light text-neo-black font-black uppercase tracking-wide border-3 border-neo-black shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 gap-2"
            >
              <Swords className="w-5 h-5" />
              {isJoining
                ? t('multiplayerFlow.joinModal.joining')
                : t('multiplayerFlow.joinModal.joinButton')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRoomModal;
