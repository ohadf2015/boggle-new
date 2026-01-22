'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateRoomName, sanitizeInput } from '@/utils/validation';
import { useDebouncedValidation, getValidationClasses } from '@/hooks/useDebouncedValidation';
import { generateRoomCode } from '@/utils/utils';
import { LanguageSelector } from '@/components/join/LanguageSelector';
import Avatar from '@/components/Avatar';
import LandscapeIndicator from '@/components/LandscapeIndicator';
import { cn } from '@/lib/utils';
import type { Language } from '@/shared/types/game';
import type { ProfileData } from './ProfileSetup';

interface CreateRoomFormProps {
  profile: ProfileData;
  defaultLanguage: Language;
  isSubmitting: boolean;
  profilePictureUrl?: string | null; // Profile picture URL for authenticated users
  onSubmit: (config: {
    gameCode: string;
    roomName: string;
    language: Language;
    hostUsername: string;
    avatarId: string;
  }) => void;
  onBack: () => void;
}

/**
 * CreateRoomForm - Simplified create room form (step 2 of create flow)
 * Auto-generates game code behind the scenes, prepopulates room name
 */
const CreateRoomForm: React.FC<CreateRoomFormProps> = ({
  profile,
  defaultLanguage,
  isSubmitting,
  profilePictureUrl,
  onSubmit,
  onBack,
}) => {
  const { t, dir } = useLanguage();

  // Auto-generate game code on mount (hidden from user)
  const [gameCode] = useState(() => generateRoomCode());

  // Room name - prepopulated with profile name
  const [roomName, setRoomName] = useState(profile.roomName || `${profile.username} Room`);
  const [roomNameError, setRoomNameError] = useState(false);

  // Language selection
  const [language, setLanguage] = useState<Language>(defaultLanguage);

  // Real-time validation
  const roomNameValidation = useDebouncedValidation(roomName, {
    validate: validateRoomName,
    delay: 300,
    minLength: 1,
  });

  const showRoomNameError = roomNameError || roomNameValidation.hasError;
  const roomNameErrorMessage = roomNameValidation.errorKey;

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate room name (use default if empty)
    const finalRoomName = roomName.trim() || `${profile.username} Room`;

    onSubmit({
      gameCode,
      roomName: finalRoomName,
      language,
      hostUsername: profile.username,
      avatarId: profile.avatarId,
    });
  };

  return (
    <>
      <LandscapeIndicator />

      <div dir={dir} className="min-h-full bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy flex flex-col page-content-safe">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center justify-center py-4 sm:py-6 flex-shrink-0 px-4"
        >
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="absolute start-4 flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] min-w-[44px] rounded-neo border-3 border-neo-black dark:border-neo-black/50 bg-neo-cream dark:bg-neo-navy shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-neo-black dark:text-neo-white text-sm font-bold disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </button>

          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase text-neo-black dark:text-neo-white">
              {t('multiplayerFlow.createForm.title') || 'Create Room'}
            </h1>
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-3 h-3 rounded-full bg-neo-cyan border-2 border-neo-black dark:border-neo-white/30" />
              <div className="w-3 h-3 rounded-full bg-neo-cyan border-2 border-neo-black dark:border-neo-white/30" />
              <span className="text-xs text-neo-black/60 dark:text-slate-400 ms-2">
                {t('multiplayerFlow.createForm.progress') || 'Step 2 of 2'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-4 min-h-0 overflow-y-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-md"
          >
            <Card className="border-3 border-neo-black dark:border-neo-black/50 shadow-hard">
              <CardContent className="p-6 sm:p-8">
                <form id="create-room-form" onSubmit={handleSubmit} className="space-y-6">
                  {/* Profile Badge */}
                  <div className="space-y-2">
                    <Label className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                      {t('multiplayerFlow.createForm.profileLabel') || 'Your Profile'}
                    </Label>
                    <div className="flex items-center gap-3 p-3 rounded-neo bg-neo-cyan/10 dark:bg-neo-cyan/5 text-neo-black dark:text-white border-2 border-neo-cyan/30">
                      <Avatar
                        avatarImage={profile.avatarId}
                        profilePictureUrl={profilePictureUrl || undefined}
                        size="lg"
                        className="border-2 border-neo-black"
                      />
                      <span className="font-bold text-lg text-neo-black dark:text-neo-white">
                        {profile.username}
                      </span>
                    </div>
                  </div>

                  {/* Room Name */}
                  <div className="space-y-2">
                    <Label htmlFor="room-name" className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">
                      {t('multiplayerFlow.createForm.roomNameLabel') || 'Room Name'}
                    </Label>
                    <Input
                      id="room-name"
                      value={roomName}
                      onChange={(e) => {
                        setRoomName(sanitizeInput(e.target.value, 30));
                        if (roomNameError) setRoomNameError(false);
                      }}
                      aria-invalid={showRoomNameError ? 'true' : undefined}
                      aria-describedby={showRoomNameError ? 'room-name-error' : 'room-name-hint'}
                      className={cn(
                        "h-14 text-lg bg-neo-navy/30 dark:bg-neo-navy/50 border-neo-white/20 dark:border-neo-black/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500",
                        getValidationClasses(
                          roomNameError ? 'invalid' : roomNameValidation.state,
                          showRoomNameError ? "border-red-500 bg-red-900/30 focus-visible:ring-red-500" : ""
                        )
                      )}
                      placeholder={t('multiplayerFlow.createForm.roomNamePlaceholder') || 'Enter room name (optional)'}
                      maxLength={30}
                    />
                    <p id="room-name-hint" className="text-xs text-neo-black/60 dark:text-slate-400 flex items-center gap-1">
                      <span>💡</span>
                      {t('multiplayerFlow.createForm.roomNameHint') || 'This name is shown to other players in the lobby'}
                    </p>
                    {showRoomNameError && (
                      <p id="room-name-error" className="text-xs text-red-400" role="alert">
                        {t(roomNameErrorMessage || 'validation.roomNameInvalid')}
                      </p>
                    )}
                  </div>

                  {/* Language Selector */}
                  <div className="space-y-2">
                    <LanguageSelector
                      selectedLanguage={language}
                      onLanguageChange={setLanguage}
                    />
                    <p className="text-xs text-neo-black/60 dark:text-slate-400">
                      {t('multiplayerFlow.createForm.languageHint') || 'Players will find words in this language'}
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sticky Create Button - always visible at bottom */}
        <div className="flex-shrink-0 px-4 sm:px-6 pb-6 pt-2 bg-slate-100 dark:bg-neo-navy">
          <div className="w-full max-w-md mx-auto">
            <Button
              type="submit"
              form="create-room-form"
              disabled={isSubmitting}
              variant="success"
              size="lg"
              className="w-full h-16 text-xl font-black uppercase"
            >
              <Crown className="mr-3 w-6 h-6" />
              {isSubmitting
                ? (t('multiplayerFlow.createForm.creating') || 'Creating...')
                : (t('multiplayerFlow.createForm.createButton') || 'Create Room')
              }
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateRoomForm;
