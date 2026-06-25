'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AvatarSelector } from '@/components/multiplayer/AvatarSelector';
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
import { Reveal } from '@/components/ui/Reveal';
import { Swords, Loader2, MapPin } from 'lucide-react';
import type { Language } from '@/shared/types/game';

const HALFTONE_DOT_STYLE = { backgroundImage: 'radial-gradient(circle, black 1px, transparent 1px)', backgroundSize: '8px 8px' } as const;
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { useAuth } from '@/contexts/AuthContext';

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

const MAX_NAME_LENGTH = 20;
const MAX_ROOM_LENGTH = 30;

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 24 };
const BUTTON_SPRING = { type: 'spring' as const, stiffness: 400, damping: 17 };

const LANGUAGES: { code: Language; flag: string; labelKey: string }[] = [
  { code: 'en', flag: '🇺🇸', labelKey: 'joinView.english' },
  { code: 'he', flag: '🇮🇱', labelKey: 'joinView.hebrew' },
  { code: 'sv', flag: '🇸🇪', labelKey: 'joinView.swedish' },
  { code: 'ja', flag: '🇯🇵', labelKey: 'joinView.japanese' },
  { code: 'es', flag: '🇪🇸', labelKey: 'joinView.spanish' },
];

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
  const { t, dir } = useLanguage();
  const { updateProfile: updateAuthProfile } = useAuth();

  const [username, setUsername] = useState<string>('');
  const [customAvatar, setCustomAvatar] = useState<CustomAvatarConfig | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [hasTouchedName, setHasTouchedName] = useState(false);
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
    // Strip apostrophes + bidirectional/format control characters so a Hebrew or
    // mixed-direction username can't inject RTL/LTR marks that misalign the
    // room-list chip layout (audit UX-H6). Covers LRM/RLM/ALM/LRE/RLE/PDF/LRO/
    // RLO/LRI/RLI/FSI/PDI plus zero-width joiners.
    const sanitized = hostName
      .replace(/[‎‏؜‪-‮⁦-⁩​-‍﻿']/g, '')
      .trim();
    return `${sanitized} Room`;
  }, []);

  const handleCreate = useCallback(() => {
    setHasAttemptedSubmit(true);
    const validation = validateUsername(username);
    if (!validation.isValid || !customAvatar) {
      if (!validation.isValid) nameInputRef.current?.focus();
      return;
    }
    if (!isAuthenticated) setStoredUsername(username.trim());
    setStoredCustomAvatar(customAvatar!);
    if (isAuthenticated) {
      const profileUpdates: Record<string, unknown> = { avatar_config: customAvatar! };
      if (username.trim() !== displayName) {
        profileUpdates.display_name = username.trim();
      }
      updateAuthProfile(profileUpdates).catch(() => {});
    }

    const finalRoomName = roomName.trim()
      ? sanitizeRoomName(roomName.trim())
      : sanitizeRoomName(generateRoomName(username.trim()));

    onCreate({ hostUsername: username.trim(), roomName: finalRoomName, language });
  }, [username, customAvatar, roomName, language, isAuthenticated, onCreate, generateRoomName, updateAuthProfile, displayName]);

  const usernameValidation = validateUsername(username);
  const showError = (hasAttemptedSubmit || hasTouchedName) && !usernameValidation.isValid;
  const nameError = showError ? usernameValidation.error : null;
  const isNameValid = usernameValidation.isValid && username.length > 0;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={!isAvatarBuilderOpen}>
      <DialogContent noDescription dir={dir} className="max-w-[420px]! sm:max-w-[420px]! lg:max-w-[420px]! xl:max-w-[420px]! max-h-[90dvh] overflow-y-auto p-0! gap-0! border-4!">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('multiplayerFlow.createModal.title')}</DialogTitle>
        </DialogHeader>

        {/* ── Battle Arena Banner ── */}
        <Reveal
          className="relative bg-linear-to-r from-neo-orange to-neo-pink px-5 py-4 border-b-4 border-black overflow-hidden"
        >
          {/* Halftone dot pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={HALFTONE_DOT_STYLE} />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 bg-neo-black/20 rounded-neo border-2 border-black flex items-center justify-center shrink-0">
              <Swords className="w-5 h-5 text-neo-white" />
            </div>
            <div>
              <h2 className="font-neo-display text-xl font-bold text-neo-black leading-tight uppercase tracking-tight">
                {t('multiplayerFlow.createModal.title')}
              </h2>
            </div>
          </div>
        </Reveal>

        <div className="px-5 py-5 space-y-5">

          {/* ── Hero Avatar + Name ── */}
          <Reveal
            className="flex flex-col items-center space-y-3"
          >
            {/* Avatar with glow ring */}
            <div className="relative">
              <div className={cn(
                'absolute -inset-1.5 rounded-full transition-opacity duration-300',
                nameFocused || isNameValid ? 'opacity-60' : 'opacity-30',
              )} style={{
                background: 'conic-gradient(from 0deg, var(--neo-cyan), var(--neo-pink), var(--neo-lime), var(--neo-cyan))',
                filter: 'blur(6px)',
              }} />
              <AvatarSelector
                selectedAvatar={customAvatar}
                onAvatarChange={setCustomAvatar}
                compact
                onBuilderOpenChange={setIsAvatarBuilderOpen}
              />
            </div>

            {/* "Enter as..." label */}
            <label htmlFor="create-username" className="text-[11px] font-black text-neo-cyan uppercase tracking-[0.15em]">
              {t('multiplayerFlow.createModal.yourName')}
            </label>

            {/* Name input — centered, underline style */}
            <div className="w-full max-w-[280px]">
              <input
                ref={nameInputRef}
                id="create-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => { setNameFocused(false); setHasTouchedName(true); }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                maxLength={MAX_NAME_LENGTH}
                autoFocus
                aria-required="true"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? 'create-username-error' : undefined}
                className={cn(
                  'w-full bg-transparent text-center font-neo-display font-bold text-2xl text-neo-white',
                  'border-b-3 pb-1.5 outline-hidden transition-colors',
                  'placeholder:text-neo-white',
                  nameError
                    ? 'border-red-500 animate-neo-shake'
                    : nameFocused
                      ? 'border-neo-lime'
                      : isNameValid
                        ? 'border-neo-lime/40'
                        : 'border-neo-white/20',
                )}
                placeholder={t('multiplayerFlow.createModal.namePlaceholder')}
              />
              {/* Feedback row */}
              <div className="flex items-center justify-between mt-1.5 px-1">
                <>
                  {nameError ? (
                    <span
                      key="error"
                      id="create-username-error"
                      className="text-[10px] font-bold text-red-400 animate-in fade-in-0 duration-300"
                      role="alert"
                    >
                      {t(nameError)}
                    </span>
                  ) : isNameValid ? (
                    <span
                      key="ok"
                      className="text-[10px] font-bold text-neo-lime animate-in fade-in-0 zoom-in-95 duration-300"
                    >
                      {isAuthenticated ? `✓ ${t('common.verified')}` : `✓ ${t('common.looksGood')}`}
                    </span>
                  ) : (
                    <span className="text-[10px] text-neo-white">
                      {t('multiplayerFlow.profileSetup.usernameHint')}
                    </span>
                  )}
                </>
                <span className={cn(
                  'text-[10px] font-mono tabular-nums',
                  username.length >= MAX_NAME_LENGTH ? 'text-neo-orange font-bold' : 'text-neo-white',
                )}>
                  {username.length}/{MAX_NAME_LENGTH}
                </span>
              </div>
            </div>
          </Reveal>

          {/* ── Divider ── */}
          <div className="border-t-2 border-neo-white/5" />

          {/* ── Room Name (optional) ── */}
          <Reveal
            className="space-y-1.5"
          >
            <label htmlFor="create-room-name" className="text-[10px] font-black uppercase text-neo-white flex items-center gap-1.5 tracking-widest">
              <MapPin className="w-3 h-3" />
              {t('multiplayerFlow.createModal.roomNameLabel')}
              <span className="font-normal lowercase opacity-50 ms-auto">
                {t('multiplayerFlow.createModal.optional')}
              </span>
            </label>
            <input
              id="create-room-name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={MAX_ROOM_LENGTH}
              placeholder={generateRoomName(username || 'Your')}
              className="w-full h-11 px-3 bg-neo-navy-light/50 border-3 border-neo-white/20 rounded-neo text-neo-white text-sm font-bold placeholder:text-neo-white outline-hidden focus:border-neo-cyan/50 focus:bg-neo-navy-light/70 transition-colors"
            />
          </Reveal>

          {/* ── Language — inline flag pills ── */}
          <Reveal
            className="space-y-2"
          >
            <p className="text-[10px] font-black uppercase text-neo-white tracking-widest">
              {t('joinView.selectLanguage')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 font-bold text-sm transition-all',
                    language === lang.code
                      ? 'bg-neo-lime/15 border-neo-lime text-neo-lime shadow-hard-sm'
                      : 'bg-neo-navy-light/30 border-neo-white/10 text-neo-white hover:border-neo-white/30 hover:text-neo-white',
                  )}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span className="text-xs">{t(lang.labelKey)}</span>
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        {/* ── CTA ── */}
        <div className="px-5 pt-1 animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className={cn(
              'w-full py-4 rounded-neo border-3 border-black font-neo-display font-bold text-xl uppercase tracking-wide',
              'flex items-center justify-center gap-3',
              'transition-all duration-150',
              isCreating
                ? 'bg-neo-navy-light text-neo-white shadow-none cursor-wait'
                : 'bg-neo-lime text-neo-black shadow-hard-lg hover:shadow-hard-xl active:shadow-hard-pressed',
            )}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('multiplayerFlow.createModal.creating')}
              </>
            ) : (
              <>
                <Swords className="w-5 h-5" />
                {t('multiplayerFlow.createModal.createButton')}
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomModal;
