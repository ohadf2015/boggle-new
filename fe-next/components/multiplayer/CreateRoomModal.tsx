'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { AvatarSelector } from '@/components/multiplayer/AvatarSelector';
import { PROFILE_AVATAR_ID } from '@/components/EmojiAvatarPicker';
import { LanguageSelector } from '@/components/join/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getStoredUsername,
  getStoredAvatarId,
  setStoredUsername,
  setStoredAvatarId,
} from '@/utils/profileStorage';
import { getRandomAvatar } from '@/utils/avatarConfig';
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
  const { t } = useLanguage();

  const [username, setUsername] = useState<string>('');
  const [avatarId, setAvatarId] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [isEditingName, setIsEditingName] = useState(false);

  // Initialize state when modal opens - only runs when modal opens, not on state changes
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
      } else {
        const randomAvatar = getRandomAvatar();
        setAvatarId(randomAvatar.id);
      }
    }
  }, [isOpen, isAuthenticated, displayName, profileAvatarId, profilePictureUrl, defaultLanguage]);

  const generateRoomName = useCallback((hostName: string): string => {
    const sanitized = hostName.replace(/[']/g, '').trim();
    return `${sanitized} Room`;
  }, []);

  const handleCreate = useCallback(() => {
    if (!username.trim() || !avatarId) return;

    // Always store avatar selection (even for authenticated users) so it's available when joining
    if (!isAuthenticated) {
      setStoredUsername(username.trim());
    }
    setStoredAvatarId(avatarId);

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

  const isValid = username.trim().length >= 2 && avatarId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent noDescription className="max-w-sm sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('multiplayerFlow.createModal.title') || 'Create Room'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {/* Avatar Selector */}
          <AvatarSelector
            selectedAvatarId={avatarId}
            onAvatarChange={setAvatarId}
            profilePictureUrl={profilePictureUrl}
          />

          {/* Username Input */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              {t('multiplayerFlow.createModal.yourName') || 'Your Name'}
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
                placeholder={t('multiplayerFlow.createModal.namePlaceholder') || 'Your name'}
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
                  'transition-all duration-200',
                  'text-start'
                )}
              >
                <span className="font-bold text-neo-white truncate">
                  {username || t('multiplayerFlow.createModal.namePlaceholder') || 'Your name'}
                </span>
                <Pencil className="w-4 h-4 text-neo-cyan flex-shrink-0" />
              </button>
            )}
          </div>

          {/* Room Name Input */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              {t('multiplayerFlow.createModal.roomNameLabel') || 'Room Name'}{' '}
              <span className="font-normal text-slate-400 dark:text-slate-500">
                ({t('multiplayerFlow.createModal.optional') || 'optional'})
              </span>
            </Label>
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={30}
              placeholder={generateRoomName(username || 'Your')}
              className="bg-neo-navy/40 border-neo-black text-neo-white placeholder:text-neo-white/50"
            />
          </div>

          {/* Language Selector */}
          <LanguageSelector selectedLanguage={language} onLanguageChange={setLanguage} />
        </DialogBody>

        <DialogFooter className="sticky bottom-0 bg-inherit z-10">
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
