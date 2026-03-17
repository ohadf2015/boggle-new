'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Users } from 'lucide-react';
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [showNameError, setShowNameError] = useState(false);

  // Initialize state when modal opens
  useEffect(() => {
    if (!isOpen) return;

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
    if (!username.trim() || !customAvatar) return;

    if (!isAuthenticated) {
      setStoredUsername(username.trim());
    }
    setStoredCustomAvatar(customAvatar);

    onJoin(username.trim());
  }, [username, customAvatar, isAuthenticated, onJoin]);

  if (!room) return null;

  const usernameValidation = validateUsername(username);
  const isValid = usernameValidation.isValid && customAvatar;
  const nameError = showNameError && !usernameValidation.isValid ? usernameValidation.error : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent noDescription className="max-w-sm sm:max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('multiplayerFlow.joinModal.title')}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {/* Room Info Card */}
          <div className="flex items-center gap-4 p-4 bg-neo-navy/40 rounded-neo border-2 border-neo-black shadow-hard-sm">
            <span className="text-3xl flex-shrink-0">{LANGUAGE_FLAGS[room.language] || '🎮'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-neo-white truncate text-lg">
                {room.roomName || room.gameCode}
              </p>
              <p className="text-sm text-neo-cyan flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4" />
                {room.playerCount || 0} {t('joinView.players')}
              </p>
            </div>
          </div>

          {/* Avatar Selector */}
          <AvatarSelector
            selectedAvatar={customAvatar}
            onAvatarChange={setCustomAvatar}
          />

          {/* Username Input */}
          <div className="space-y-2">
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
            ) : isEditingName ? (
              <Input
                id="join-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => { setIsEditingName(false); setShowNameError(true); }}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                maxLength={20}
                autoFocus
                className={cn(
                  'font-bold bg-neo-navy/40 border-neo-black text-neo-white placeholder:text-neo-white/50',
                  nameError && 'border-red-500'
                )}
                placeholder={t('multiplayerFlow.joinModal.namePlaceholder')}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3',
                  'bg-neo-navy/40 hover:bg-neo-navy/60',
                  'rounded-neo border-2 border-neo-black',
                  'shadow-hard-sm hover:shadow-hard',
                  'hover:translate-x-[-1px] hover:translate-y-[-1px]',
                  'active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
                  'transition-all duration-200'
                )}
              >
                <span className="font-bold text-neo-white truncate">
                  {username || t('multiplayerFlow.joinModal.namePlaceholder')}
                </span>
                <Pencil className="w-4 h-4 text-neo-cyan flex-shrink-0" />
              </button>
            )}
            {nameError && (
              <p className="text-xs font-bold text-red-400 mt-1" role="alert">
                {t(nameError)}
              </p>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="sticky bottom-0 bg-inherit z-10">
          <Button
            variant="default"
            size="lg"
            onClick={handleJoin}
            disabled={!isValid || isJoining}
            className="w-full bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black font-bold uppercase"
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
