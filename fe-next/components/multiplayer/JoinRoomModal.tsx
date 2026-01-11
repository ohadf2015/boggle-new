'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
import EmojiAvatarPicker, { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import {
  getStoredUsername,
  getStoredAvatarId,
  setStoredUsername,
  setStoredAvatarId,
} from '@/utils/profileStorage';
import { AVATARS, getAvatarPath, getRandomAvatar } from '@/utils/avatarConfig';
import type { ActiveRoom } from '@/shared/types/game';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ActiveRoom | null;
  isJoining: boolean;
  onJoin: (username: string, avatarId: string) => void;

  // Profile data (pre-populated)
  isAuthenticated: boolean;
  displayName: string | null;
  profilePictureUrl?: string | null;
  profileAvatarId?: string;
}

/**
 * JoinRoomModal - Simple modal for joining a room with pre-populated profile
 */
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

  // Form state
  const [username, setUsername] = useState<string>('');
  const [avatarId, setAvatarId] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Initialize form with stored/profile data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Get initial values from storage or profile
    if (isAuthenticated && displayName) {
      setUsername(displayName);
      // Use profile avatar ID or special PROFILE_AVATAR_ID marker
      setAvatarId(profileAvatarId || PROFILE_AVATAR_ID);
    } else {
      // Guest user - check localStorage
      const storedUsername = getStoredUsername();
      const storedAvatarId = getStoredAvatarId();

      if (storedUsername) {
        setUsername(storedUsername);
      } else {
        // Generate random name from avatar
        const randomAvatar = getRandomAvatar();
        setUsername(randomAvatar.name);
        setAvatarId(randomAvatar.id);
      }

      if (storedAvatarId) {
        setAvatarId(storedAvatarId);
      } else if (!avatarId) {
        // If no avatar set yet, use random
        const randomAvatar = getRandomAvatar();
        setAvatarId(randomAvatar.id);
      }
    }
  }, [isOpen, isAuthenticated, displayName, profileAvatarId, avatarId]);

  // Handle avatar picker save
  const handleAvatarSave = useCallback(
    (selection: { avatarImage: string; emoji?: string; color?: string }) => {
      setAvatarId(selection.avatarImage);
      setShowAvatarPicker(false);
    },
    []
  );

  // Handle join submission
  const handleJoin = useCallback(() => {
    if (!username.trim() || !avatarId) return;

    // Save to localStorage for guests
    if (!isAuthenticated) {
      setStoredUsername(username.trim());
      setStoredAvatarId(avatarId);
    }

    onJoin(username.trim(), avatarId);
  }, [username, avatarId, isAuthenticated, onJoin]);

  // Get avatar display props
  const getAvatarDisplayProps = () => {
    if (avatarId === PROFILE_AVATAR_ID) {
      return {
        profilePictureUrl: profilePictureUrl || undefined,
        avatarImage: profileAvatarId,
      };
    }
    return {
      avatarImage: avatarId,
    };
  };

  // Get avatar path for display
  const getAvatarImagePath = () => {
    if (avatarId === PROFILE_AVATAR_ID) {
      if (profilePictureUrl) return profilePictureUrl;
      if (profileAvatarId) return getAvatarPath(profileAvatarId);
    }
    if (avatarId) {
      const avatar = AVATARS.find((a) => a.id === avatarId);
      if (avatar) return getAvatarPath(avatar);
    }
    return null;
  };

  if (!room) return null;

  const isValid = username.trim().length >= 2 && avatarId;
  const avatarImagePath = getAvatarImagePath();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Only allow closing if avatar picker is not open
        if (!open && !showAvatarPicker) {
          onClose();
        }
      }}>
        <DialogContent
          noDescription
          className="max-w-sm sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>{t('multiplayerFlow.joinModal.title') || 'Join Room'}</DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {/* Room Info */}
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

            {/* Profile Section */}
            <div className="flex items-center gap-4 p-4 bg-neo-cream dark:bg-slate-700 rounded-neo border-3 border-neo-black text-neo-black dark:text-neo-white">
              {/* Avatar Button */}
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="relative flex-shrink-0 group"
                aria-label={t('multiplayerFlow.joinModal.changeAvatar') || 'Change avatar'}
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-neo-black shadow-hard group-hover:shadow-hard-lg transition-all">
                  {avatarImagePath ? (
                    <Image
                      src={avatarImagePath}
                      alt="Avatar"
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <Avatar {...getAvatarDisplayProps()} size="xl" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-neo-cyan rounded-full border-2 border-neo-black flex items-center justify-center text-neo-black">
                  <Pencil className="w-3 h-3 text-neo-black" />
                </div>
              </button>

              {/* Name Section */}
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                    maxLength={20}
                    autoFocus
                    className="font-bold text-lg"
                    placeholder={t('multiplayerFlow.joinModal.namePlaceholder') || 'Your name'}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => !isAuthenticated && setIsEditingName(true)}
                    disabled={isAuthenticated}
                    className={`text-left w-full ${!isAuthenticated ? 'cursor-pointer hover:bg-neo-black/5 rounded px-1 -mx-1' : 'cursor-default'}`}
                  >
                    <p className="font-bold text-lg text-neo-black dark:text-neo-white truncate flex items-center gap-2">
                      {username || t('multiplayerFlow.joinModal.namePlaceholder') || 'Your name'}
                      {!isAuthenticated && (
                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </p>
                    {isAuthenticated && (
                      <p className="text-xs text-slate-500">
                        {t('multiplayerFlow.joinModal.authenticatedHint') || 'Signed in'}
                      </p>
                    )}
                  </button>
                )}
              </div>
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

      {/* Avatar Picker Modal */}
      <EmojiAvatarPicker
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        onSave={handleAvatarSave}
        currentAvatarImage={avatarId}
        profileAvatar={
          isAuthenticated
            ? {
                profilePictureUrl,
                avatarImage: profileAvatarId,
                displayName: displayName || undefined,
              }
            : undefined
        }
      />
    </>
  );
};

export default JoinRoomModal;
