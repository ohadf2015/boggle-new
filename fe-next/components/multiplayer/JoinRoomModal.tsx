'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users } from 'lucide-react';
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
  getStoredUsername,
  getOrCreateStoredCustomAvatar,
  setStoredUsername,
  setStoredCustomAvatar,
} from '@/utils/profileStorage';
import { validateUsername } from '@/utils/validation';
import { cn } from '@/lib/utils';
import type { ActiveRoom } from '@/shared/types/game';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ActiveRoom | null;
  isJoining: boolean;
  onJoin: (username: string) => void;
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
  isAuthenticated,
  displayName,
  profileAvatar,
}) => {
  const { t } = useLanguage();

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
      const storedUsername = getStoredUsername();
      setUsername(storedUsername || '');
      setCustomAvatar(getOrCreateStoredCustomAvatar());
    }
  }, [isOpen, isAuthenticated, displayName, profileAvatar]);

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

    onJoin(username.trim());
  }, [username, customAvatar, isAuthenticated, onJoin]);

  if (!room) return null;

  const usernameValidation = validateUsername(username);
  const showError = (hasAttemptedSubmit || hasTouchedName) && !usernameValidation.isValid;
  const nameError = showError ? usernameValidation.error : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent noDescription className="max-w-sm sm:max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('multiplayerFlow.joinModal.title')}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Room Info Card */}
          <div className="flex items-center gap-4 p-3 bg-neo-navy/40 rounded-neo border-2 border-neo-black shadow-hard-sm">
            <span className="text-3xl flex-shrink-0">{LANGUAGE_FLAGS[room.language] || '🎮'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-neo-white truncate text-lg" title={room.roomName || room.gameCode}>
                {room.roomName || room.gameCode}
              </p>
              <p className="text-sm text-neo-cyan flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4" />
                {room.playerCount || 0} {t('joinView.players')}
              </p>
            </div>
          </div>

          {/* Avatar + Name — compact inline layout */}
          <div className="flex items-start gap-4">
            <AvatarSelector
              selectedAvatar={customAvatar}
              onAvatarChange={setCustomAvatar}
              compact
            />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="join-username" className="text-xs font-bold uppercase text-neo-cyan">
                {t('multiplayerFlow.joinModal.yourName')}
              </Label>
              {isAuthenticated ? (
                <Input
                  id="join-username"
                  value={username}
                  disabled
                  className="font-bold bg-neo-navy/40 border-neo-black text-neo-white cursor-not-allowed opacity-90"
                />
              ) : (
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
                    'font-bold bg-neo-navy/40 border-2 border-neo-black text-neo-white placeholder:text-neo-white/40',
                    nameError && 'border-red-500 animate-neo-shake'
                  )}
                  placeholder={t('multiplayerFlow.joinModal.namePlaceholder')}
                />
              )}
              {nameError && (
                <p id="join-username-error" className="text-xs font-bold text-red-400" role="alert">
                  {t(nameError)}
                </p>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="sticky bottom-0 bg-inherit z-10">
          <Button
            variant="default"
            size="lg"
            onClick={handleJoin}
            disabled={isJoining}
            className="w-full bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isJoining
              ? t('multiplayerFlow.joinModal.joining')
              : t('multiplayerFlow.joinModal.joinButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRoomModal;
