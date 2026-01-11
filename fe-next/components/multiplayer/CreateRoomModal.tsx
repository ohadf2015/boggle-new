'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Pencil, Check } from 'lucide-react';
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
  isAuthenticated: boolean;
  displayName: string | null;
  profilePictureUrl?: string | null;
  profileAvatarId?: string;
}

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

  const [username, setUsername] = useState<string>('');
  const [avatarId, setAvatarId] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLanguage(defaultLanguage);
    setRoomName('');

    if (isAuthenticated && displayName) {
      setUsername(displayName);
      if (profilePictureUrl) {
        setAvatarId(PROFILE_AVATAR_ID);
      } else {
        setAvatarId(profileAvatarId || PROFILE_AVATAR_ID);
      }
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
      } else if (!avatarId) {
        const randomAvatar = getRandomAvatar();
        setAvatarId(randomAvatar.id);
      }
    }
  }, [isOpen, isAuthenticated, displayName, profileAvatarId, profilePictureUrl, defaultLanguage, avatarId]);

  const generateRoomName = useCallback((hostName: string): string => {
    const sanitized = hostName.replace(/[']/g, '').trim();
    return `${sanitized} Room`;
  }, []);

  const handleCreate = useCallback(() => {
    if (!username.trim() || !avatarId) return;

    if (!isAuthenticated) {
      setStoredUsername(username.trim());
      setStoredAvatarId(avatarId);
    }

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

  const isUsingProfilePicture = avatarId === PROFILE_AVATAR_ID;
  const hasProfilePicture = !!profilePictureUrl;
  const isValid = username.trim().length >= 2 && avatarId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent noDescription className="max-w-sm sm:max-w-md">
        <DialogHeader className="relative pr-14 sm:pr-16 rtl:pr-0 rtl:pl-14 sm:rtl:pl-16">
          <DialogTitle className={cn("text-lg font-black uppercase truncate", dir === 'rtl' ? 'text-right' : 'text-left')}>
            {t('multiplayerFlow.createModal.title') || 'Create Room'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
              {t('profile.chooseAvatar') || 'Choose Avatar'}
            </Label>
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2 shadow-hard">
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

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
              {t('multiplayerFlow.createModal.yourName') || 'Your Name'}
            </Label>
            {isAuthenticated ? (
              <button
                type="button"
                disabled
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-neo border-2 border-neo-black/20 text-start"
              >
                <span className="font-bold text-neo-black dark:text-neo-white">{username}</span>
                <span className="text-xs text-slate-500">({t('multiplayerFlow.createModal.authenticatedHint') || 'Signed in'})</span>
              </button>
            ) : isEditingName ? (
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                maxLength={20}
                autoFocus
                className="font-bold"
                placeholder={t('multiplayerFlow.createModal.namePlaceholder') || 'Your name'}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-neo border-2 border-neo-black/20 hover:border-neo-cyan/50 transition-colors text-start"
              >
                <span className="font-bold text-neo-black dark:text-neo-white truncate">
                  {username || t('multiplayerFlow.createModal.namePlaceholder') || 'Your name'}
                </span>
                <Pencil className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>
            )}
          </div>

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
          </div>

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
  );
};

export default CreateRoomModal;
