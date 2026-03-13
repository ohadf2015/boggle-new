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
import { LanguageSelector } from '@/components/join/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getStoredUsername,
  getOrCreateStoredCustomAvatar,
  setStoredUsername,
  setStoredCustomAvatar,
} from '@/utils/profileStorage';
import { sanitizeRoomName } from '@/utils/consts';
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
  const [isEditingName, setIsEditingName] = useState(false);

  // Initialize state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLanguage(defaultLanguage);
    setRoomName('');

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
    if (!username.trim() || !customAvatar) return;

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

  const isValid = username.trim().length >= 2 && customAvatar;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent noDescription className="max-w-sm sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('multiplayerFlow.createModal.title')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {/* Avatar Selector */}
          <AvatarSelector
            selectedAvatar={customAvatar}
            onAvatarChange={setCustomAvatar}
          />

          {/* Username Input */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              {t('multiplayerFlow.createModal.yourName')}
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
                placeholder={t('multiplayerFlow.createModal.namePlaceholder')}
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
                  {username || t('multiplayerFlow.createModal.namePlaceholder')}
                </span>
                <Pencil className="w-4 h-4 text-neo-cyan flex-shrink-0" />
              </button>
            )}
          </div>

          {/* Room Name Input */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              {t('multiplayerFlow.createModal.roomNameLabel')}{' '}
              <span className="font-normal text-slate-400 dark:text-slate-500">
                ({t('multiplayerFlow.createModal.optional')})
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
              ? t('multiplayerFlow.createModal.creating')
              : t('multiplayerFlow.createModal.createButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomModal;
