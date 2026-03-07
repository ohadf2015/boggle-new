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
import { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import {
  getStoredUsername,
  getStoredAvatarId,
  setStoredUsername,
  setStoredAvatarId,
} from '@/utils/profileStorage';
import { getRandomAvatar } from '@/utils/avatarConfig';
import { cn } from '@/lib/utils';
import type { ActiveRoom } from '@/shared/types/game';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ActiveRoom | null;
  isJoining: boolean;
  onJoin: (username: string, avatarId: string) => void;
  isAuthenticated: boolean;
  displayName: string | null;
  profilePictureUrl?: string | null;
  profileAvatarId?: string;
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  room,
  isJoining,
  onJoin,
  isAuthenticated,
  displayName,
  profilePictureUrl,
  profileAvatarId,
}) => {
  const { t } = useLanguage();

  const [username, setUsername] = useState<string>('');
  const [avatarId, setAvatarId] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);

  // Initialize state when modal opens - only runs when modal opens, not on state changes
  useEffect(() => {
    if (!isOpen) return;

    if (isAuthenticated && displayName) {
      setUsername(displayName);
      setAvatarId(profileAvatarId || PROFILE_AVATAR_ID);
    } else {
      const storedUsername = getStoredUsername();
      const storedAvatarId = getStoredAvatarId();

      if (storedUsername) {
        setUsername(storedUsername);
      } else {
        const randomAvatar = getRandomAvatar();
        setUsername(randomAvatar.name);
        setAvatarId(randomAvatar.id);
      }

      if (storedAvatarId) {
        setAvatarId(storedAvatarId);
      } else {
        const randomAvatar = getRandomAvatar();
        setAvatarId(randomAvatar.id);
      }
    }
  }, [isOpen, isAuthenticated, displayName, profileAvatarId]);

  const handleJoin = useCallback(() => {
    if (!username.trim() || !avatarId) return;

    // Always store avatar selection (even for authenticated users) so it's available when joining
    if (!isAuthenticated) {
      setStoredUsername(username.trim());
    }
    setStoredAvatarId(avatarId);

    onJoin(username.trim(), avatarId);
  }, [username, avatarId, isAuthenticated, onJoin]);

  if (!room) return null;

  const isValid = username.trim().length >= 2 && avatarId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent noDescription className="max-w-sm sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('multiplayerFlow.joinModal.title') || 'Join Room'}</DialogTitle>
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
                {room.playerCount || 0} {t('joinView.players') || 'players'}
              </p>
            </div>
          </div>

          {/* Avatar Selector */}
          <AvatarSelector
            selectedAvatarId={avatarId}
            onAvatarChange={setAvatarId}
            profilePictureUrl={profilePictureUrl}
          />

          {/* Username Input */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-neo-cyan">
              {t('multiplayerFlow.joinModal.yourName') || 'Your Name'}
            </Label>
            {isAuthenticated ? (
              <Input
                value={username}
                disabled
                className="font-bold bg-neo-navy/40 border-neo-black text-neo-white cursor-not-allowed opacity-90"
              />
            ) : isEditingName ? (
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                maxLength={20}
                autoFocus
                className="font-bold bg-neo-navy/40 border-neo-black text-neo-white placeholder:text-neo-white/50"
                placeholder={t('multiplayerFlow.joinModal.namePlaceholder') || 'Your name'}
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
                  {username || t('multiplayerFlow.joinModal.namePlaceholder') || 'Your name'}
                </span>
                <Pencil className="w-4 h-4 text-neo-cyan flex-shrink-0" />
              </button>
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
              ? t('multiplayerFlow.joinModal.joining') || 'Joining...'
              : t('multiplayerFlow.joinModal.joinButton') || 'Join Game'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRoomModal;
