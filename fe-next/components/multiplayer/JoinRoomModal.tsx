'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Pencil, Users, Check } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import {
  getStoredUsername,
  getStoredAvatarId,
  setStoredUsername,
  setStoredAvatarId,
} from '@/utils/profileStorage';
import { AVATARS, getAvatarPath, getRandomAvatar } from '@/utils/avatarConfig';
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

    if (!isAuthenticated) {
      setStoredUsername(username.trim());
      setStoredAvatarId(avatarId);
    }

    onJoin(username.trim(), avatarId);
  }, [username, avatarId, isAuthenticated, onJoin]);

  if (!room) return null;

  const isUsingProfilePicture = avatarId === PROFILE_AVATAR_ID;
  const hasProfilePicture = !!profilePictureUrl;
  const isValid = username.trim().length >= 2 && avatarId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent noDescription className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('multiplayerFlow.joinModal.title') || 'Join Room'}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-neo border-2 border-neo-black/20">
            <span className="text-2xl">{LANGUAGE_FLAGS[room.language] || '🎮'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-neo-black dark:text-neo-white truncate">
                {room.roomName || room.gameCode}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {room.playerCount || 0} {t('joinView.players') || 'players'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
              {t('profile.chooseAvatar') || 'Choose Avatar'}
            </Label>
            <div className="max-h-32 overflow-y-auto rounded-neo border-2 border-neo-black/20 dark:border-slate-600 p-2 bg-slate-50 dark:bg-slate-800/50">
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
              {hasProfilePicture && (
                <motion.button
                  type="button"
                  onClick={() => setAvatarId(PROFILE_AVATAR_ID)}
                  className={cn(
                    'relative aspect-square rounded-neo border-2 overflow-hidden',
                    'transition-all hover:scale-105 active:scale-95',
                    'min-h-[40px] min-w-[40px]',
                    isUsingProfilePicture
                      ? 'border-neo-cyan ring-2 ring-neo-cyan scale-105'
                      : 'border-neo-black hover:border-neo-cyan/50'
                  )}
                  whileHover={{ scale: isUsingProfilePicture ? 1.05 : 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Image
                    src={profilePictureUrl!}
                    alt="Your Profile"
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isUsingProfilePicture && (
                    <div className="absolute inset-0 bg-neo-cyan/20 flex items-center justify-center">
                      <div className="bg-neo-cyan text-neo-black border-2 border-neo-black rounded-full w-5 h-5 flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-neo-black/80 text-white text-[7px] font-bold text-center py-0.5">
                    {t('profile.you') || 'YOU'}
                  </div>
                </motion.button>
              )}

              {AVATARS.map((avatar) => {
                const isSelected = !isUsingProfilePicture && avatar.id === avatarId;
                return (
                  <motion.button
                    key={avatar.id}
                    type="button"
                    onClick={() => setAvatarId(avatar.id)}
                    className={cn(
                      'relative aspect-square rounded-neo border-2 overflow-hidden',
                      'transition-all hover:scale-105 active:scale-95',
                      'min-h-[40px] min-w-[40px]',
                      isSelected
                        ? 'border-neo-cyan ring-2 ring-neo-cyan scale-105'
                        : 'border-neo-black hover:border-neo-cyan/50'
                    )}
                    whileHover={{ scale: isSelected ? 1.05 : 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Image
                      src={getAvatarPath(avatar)}
                      alt={avatar.name}
                      fill
                      className="object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-neo-cyan/20 flex items-center justify-center">
                        <div className="bg-neo-cyan text-neo-black border-2 border-neo-black rounded-full w-5 h-5 flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                    )}
                  </motion.button>
                );
              })}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
              {t('multiplayerFlow.joinModal.yourName') || 'Your Name'}
            </Label>
            {isAuthenticated ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-neo border-2 border-neo-black/20">
                <span className="font-bold text-neo-black dark:text-neo-white">{username}</span>
                <span className="text-xs text-slate-500">({t('multiplayerFlow.joinModal.authenticatedHint') || 'Signed in'})</span>
              </div>
            ) : isEditingName ? (
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                maxLength={20}
                autoFocus
                className="font-bold"
                placeholder={t('multiplayerFlow.joinModal.namePlaceholder') || 'Your name'}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-neo border-2 border-neo-black/20 hover:border-neo-cyan/50 transition-colors"
              >
                <span className="font-bold text-neo-black dark:text-neo-white truncate">
                  {username || t('multiplayerFlow.joinModal.namePlaceholder') || 'Your name'}
                </span>
                <Pencil className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
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
