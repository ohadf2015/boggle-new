'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { LanguageSelector } from '@/components/join/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getStoredUsername,
  getOrCreateStoredCustomAvatar,
  setStoredUsername,
  setStoredCustomAvatar,
} from '@/utils/profileStorage';
import { sanitizeRoomName } from '@/utils/consts';
import { validateUsername } from '@/utils/validation';
import { cn } from '@/lib/utils';
import type { Language } from '@/shared/types/game';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';

interface CreateRoomConfig {
  hostUsername: string;
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
  profileAvatar?: CustomAvatarConfig | null;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  isCreating,
  onCreate,
  defaultLanguage,
  isAuthenticated,
  displayName,
  profileAvatar,
}) => {
  const { t } = useLanguage();

  const [username, setUsername] = useState<string>('');
  const [customAvatar, setCustomAvatar] = useState<CustomAvatarConfig | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [hasTouchedName, setHasTouchedName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLanguage(defaultLanguage);
    setRoomName('');
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
  }, [isOpen, isAuthenticated, displayName, profileAvatar, defaultLanguage]);

  const generateRoomName = useCallback((hostName: string): string => {
    const sanitized = hostName.replace(/[']/g, '').trim();
    return `${sanitized} Room`;
  }, []);

  const handleCreate = useCallback(() => {
    setHasAttemptedSubmit(true);

    const validation = validateUsername(username);
    if (!validation.isValid || !customAvatar) {
      // Focus the name input if that's the problem
      if (!validation.isValid) {
        nameInputRef.current?.focus();
      }
      return;
    }

    if (!isAuthenticated) {
      setStoredUsername(username.trim());
    }
    setStoredCustomAvatar(customAvatar);

    const finalRoomName = roomName.trim()
      ? sanitizeRoomName(roomName.trim())
      : sanitizeRoomName(generateRoomName(username.trim()));

    onCreate({
      hostUsername: username.trim(),
      roomName: finalRoomName,
      language,
    });
  }, [username, customAvatar, roomName, language, isAuthenticated, onCreate, generateRoomName]);

  const usernameValidation = validateUsername(username);
  const showError = (hasAttemptedSubmit || hasTouchedName) && !usernameValidation.isValid;
  const nameError = showError ? usernameValidation.error : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent noDescription className="max-w-sm sm:max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('multiplayerFlow.createModal.title')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Avatar + Name — compact inline layout */}
          <div className="flex items-start gap-4">
            <AvatarSelector
              selectedAvatar={customAvatar}
              onAvatarChange={setCustomAvatar}
              compact
            />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="create-username" className="text-xs font-bold uppercase text-neo-cyan">
                {t('multiplayerFlow.createModal.yourName')}
              </Label>
              {isAuthenticated ? (
                <Input
                  id="create-username"
                  value={username}
                  disabled
                  className="font-bold bg-neo-navy/40 border-neo-black text-neo-white cursor-not-allowed opacity-90"
                />
              ) : (
                <Input
                  ref={nameInputRef}
                  id="create-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setHasTouchedName(true)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  maxLength={20}
                  autoFocus
                  className={cn(
                    'font-bold bg-neo-navy/40 border-2 border-neo-black text-neo-white placeholder:text-neo-white/40',
                    nameError && 'border-red-500 animate-neo-shake'
                  )}
                  placeholder={t('multiplayerFlow.createModal.namePlaceholder')}
                />
              )}
              {nameError && (
                <p className="text-xs font-bold text-red-400" role="alert">
                  {t(nameError)}
                </p>
              )}
            </div>
          </div>

          {/* Room Name Input */}
          <div className="space-y-1.5">
            <Label htmlFor="create-room-name" className="text-xs font-bold uppercase text-neo-cyan">
              {t('multiplayerFlow.createModal.roomNameLabel')}{' '}
              <span className="font-normal text-neo-white/40">
                ({t('multiplayerFlow.createModal.optional')})
              </span>
            </Label>
            <Input
              id="create-room-name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={30}
              placeholder={generateRoomName(username || 'Your')}
              className="bg-neo-navy/40 border-neo-black text-neo-white placeholder:text-neo-white/40"
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
            disabled={isCreating}
            className="w-full font-bold uppercase"
          >
            {isCreating
              ? t('multiplayerFlow.createModal.creating')
              : t('multiplayerFlow.createModal.createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomModal;
