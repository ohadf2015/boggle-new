'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Pencil } from 'lucide-react';
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
import EmojiAvatarPicker, { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import Avatar from '@/components/Avatar';
import { LanguageSelector } from '@/components/join/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getStoredUsername,
  getStoredAvatarId,
  setStoredUsername,
  setStoredAvatarId,
} from '@/utils/profileStorage';
import { AVATARS, getAvatarPath, getRandomAvatar } from '@/utils/avatarConfig';
import { sanitizeRoomName } from '@/utils/consts';
import { cn } from '@/lib/utils';
import type { Language } from '@/shared/types/game';

interface CreateRoomConfig {
  hostUsername: string;
  avatarId: string;
  roomName: string;
  language: Language;
}

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCreating: boolean;
  onCreate: (config: CreateRoomConfig) => void;
  defaultLanguage: Language;

  // Profile data (pre-populated)
  isAuthenticated: boolean;
  displayName: string | null;
  profilePictureUrl?: string | null;
  profileAvatarId?: string;
}

/**
 * CreateRoomModal - Simple modal for creating a room with pre-populated profile
 */
const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  isCreating,
  onCreate,
  defaultLanguage,
  isAuthenticated,
  displayName,
  profilePictureUrl,
  profileAvatarId,
}) => {
  const { t, dir } = useLanguage();

  // Form state
  const [username, setUsername] = useState<string>('');
  const [avatarId, setAvatarId] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [isEditingName, setIsEditingName] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Initialize form with stored/profile data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Reset language to default
    setLanguage(defaultLanguage);
    setRoomName('');

    // Get initial values from storage or profile
    if (isAuthenticated && displayName) {
      setUsername(displayName);
      // Prioritize profile picture - use PROFILE_AVATAR_ID to show it
      // If no profile picture, fall back to profile avatar ID or PROFILE_AVATAR_ID marker
      if (profilePictureUrl) {
        setAvatarId(PROFILE_AVATAR_ID);
      } else {
        setAvatarId(profileAvatarId || PROFILE_AVATAR_ID);
      }
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
  }, [isOpen, isAuthenticated, displayName, profileAvatarId, profilePictureUrl, defaultLanguage, avatarId]);

  // Handle avatar picker save
  const handleAvatarSave = useCallback(
    (selection: { avatarImage: string; emoji?: string; color?: string }) => {
      setAvatarId(selection.avatarImage);
      setShowAvatarPicker(false);
    },
    []
  );

  // Generate room name if empty
  const generateRoomName = useCallback((hostName: string): string => {
    // Sanitize room name - remove apostrophes and special chars
    const sanitized = hostName.replace(/[']/g, '').trim();
    return `${sanitized} Room`;
  }, []);

  // Handle create submission
  const handleCreate = useCallback(() => {
    if (!username.trim() || !avatarId) return;

    // Save to localStorage for guests
    if (!isAuthenticated) {
      setStoredUsername(username.trim());
      setStoredAvatarId(avatarId);
    }

    // Use provided room name or generate one, then sanitize for backend compatibility
    // Desktop: Allow empty room name (same as mobile) - will use random name logic
    const finalRoomName = roomName.trim() 
      ? sanitizeRoomName(roomName.trim())
      : sanitizeRoomName(generateRoomName(username.trim()));

    onCreate({
      hostUsername: username.trim(),
      avatarId,
      roomName: finalRoomName,
      language,
    });
  }, [username, avatarId, roomName, language, isAuthenticated, onCreate, generateRoomName]);

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

  const isValid = username.trim().length >= 2 && avatarId;
  const avatarImagePath = getAvatarImagePath();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent noDescription className="max-w-sm sm:max-w-md">
          <DialogHeader className="relative pr-14 sm:pr-16 rtl:pr-0 rtl:pl-14 sm:rtl:pl-16">
            <DialogTitle className={cn("text-lg font-black uppercase truncate", dir === 'rtl' ? 'text-right' : 'text-left')}>
              {t('multiplayerFlow.createModal.title') || 'Create Room'}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {/* Profile Section */}
            <div className="flex items-center gap-4 p-4 bg-neo-cream dark:bg-slate-700 rounded-neo border-3 border-neo-black text-neo-black dark:text-neo-white">
              {/* Avatar Button */}
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="relative flex-shrink-0 group"
                aria-label={t('multiplayerFlow.createModal.changeAvatar') || 'Change avatar'}
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-neo-black shadow-hard group-hover:shadow-hard-lg transition-all">
                  {avatarImagePath ? (
                    <Image
                      src={avatarImagePath}
                      alt="Avatar"
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full">
                      <Avatar {...getAvatarDisplayProps()} size="xl" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 rtl:-right-auto rtl:-left-1 w-6 h-6 bg-neo-cyan rounded-full border-2 border-neo-black flex items-center justify-center text-neo-black">
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
                    placeholder={t('multiplayerFlow.createModal.namePlaceholder') || 'Your name'}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => !isAuthenticated && setIsEditingName(true)}
                    disabled={isAuthenticated}
                    className={`text-start w-full ${!isAuthenticated ? 'cursor-pointer hover:bg-neo-black/5 rounded px-1 -mx-1' : 'cursor-default'}`}
                  >
                    <p className="font-bold text-lg text-neo-black dark:text-neo-white truncate flex items-center gap-2">
                      {username || t('multiplayerFlow.createModal.namePlaceholder') || 'Your name'}
                      {!isAuthenticated && <Pencil className="w-3.5 h-3.5 text-slate-400" />}
                    </p>
                    {isAuthenticated && (
                      <p className="text-xs text-slate-500">
                        {t('multiplayerFlow.createModal.authenticatedHint') || 'Signed in'}
                      </p>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Room Name Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                {t('multiplayerFlow.createModal.roomNameLabel') || 'Room Name'}{' '}
                <span className="font-normal text-slate-400">
                  ({t('multiplayerFlow.createModal.optional') || 'optional'})
                </span>
              </Label>
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={30}
                placeholder={generateRoomName(username || 'Your')}
                className="bg-slate-100 dark:bg-slate-700/50"
              />
              <p className="text-xs text-slate-500">
                {t('multiplayerFlow.createModal.roomNameHint') ||
                  'Leave empty for auto-generated name'}
              </p>
            </div>

            {/* Language Selector */}
            <LanguageSelector selectedLanguage={language} onLanguageChange={setLanguage} />
          </DialogBody>

          <DialogFooter>
            <Button
              variant="success"
              size="lg"
              onClick={handleCreate}
              disabled={!isValid || isCreating}
              className="w-full font-bold uppercase"
            >
              {isCreating
                ? t('multiplayerFlow.createModal.creating') || 'Creating...'
                : t('multiplayerFlow.createModal.createButton') || 'Create Room'}
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

export default CreateRoomModal;
