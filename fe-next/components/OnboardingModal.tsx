'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { Dialog, DialogContent, DialogTitle, DialogBody, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { useMusic } from '../contexts/MusicContext';
import { useAuth } from '../contexts/AuthContext';
import OnboardingProgress from './onboarding/OnboardingProgress';
import {
  markOnboardingComplete,
  markOnboardingSkipped,
  type OnboardingData,
} from '../utils/onboardingStorage';
import { AVATARS } from '../utils/avatarConfig';

// Step components (will be created)
import WelcomeDemoStep from './onboarding/WelcomeDemoStep';
import ComboStep from './onboarding/ComboStep';
import SpecialRoundsStep from './onboarding/SpecialRoundsStep';
import AvatarStep from './onboarding/AvatarStep';
import NameStep from './onboarding/NameStep';
import ModeSelectionStep from './onboarding/ModeSelectionStep';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  avatarId: string;
  displayName: string;
  selectedMode: 'single' | 'multi' | 'daily' | null;
}

const TOTAL_STEPS = 6;

/**
 * OnboardingModal - Interactive multi-step onboarding for new players
 * Teaches game mechanics through hands-on demos and guides avatar/name setup
 */
const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { t, dir, language } = useLanguage();
  const { fadeToTrack, TRACKS, audioUnlocked } = useMusic();
  const { profile, updateProfile } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [demoCompleted, setDemoCompleted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    avatarId: '',
    displayName: profile?.display_name || '',
    selectedMode: null,
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      avatarId: AVATARS[Math.floor(Math.random() * AVATARS.length)].id,
    }));
  }, []);

  // Play bossa music when modal opens (after audio unlock)
  useEffect(() => {
    if (isOpen && audioUnlocked) {
      fadeToTrack(TRACKS.BOSSA, 1000, 2000);
    }
  }, [isOpen, audioUnlocked, fadeToTrack, TRACKS]);

  const handleSkip = () => {
    markOnboardingSkipped();
    onClose();
  };

  // Handle dialog close via X button or clicking outside
  // This ensures onboarding is marked as skipped even if user doesn't use the Skip button
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // User is closing the dialog - mark as skipped so it doesn't show again
      markOnboardingSkipped();
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    // Validation before advancing
    if (currentStep === 0 && !demoCompleted) {
      // User must complete the demo before proceeding
      return;
    }

    if (currentStep === 4 && !formData.displayName.trim()) {
      // Name is required
      return;
    }

    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    // Save to localStorage
    markOnboardingComplete({
      avatarId: formData.avatarId,
      displayName: formData.displayName,
      selectedMode: formData.selectedMode,
    });

    // Save to profile if authenticated
    if (profile && formData.displayName.trim()) {
      await updateProfile({
        avatar_image: formData.avatarId,
        display_name: formData.displayName.trim(),
      });
    }

    // Navigate to selected mode
    if (formData.selectedMode === 'single') {
      router.push(`/${language}/singleplayer`);
    } else if (formData.selectedMode === 'multi') {
      router.push(`/${language}/multiplayer`);
    } else if (formData.selectedMode === 'daily') {
      router.push(`/${language}/daily`);
    }

    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <WelcomeDemoStep
            onDemoComplete={() => setDemoCompleted(true)}
            demoCompleted={demoCompleted}
          />
        );
      case 1:
        return <ComboStep />;
      case 2:
        return <SpecialRoundsStep />;
      case 3:
        return (
          <AvatarStep
            selectedAvatarId={formData.avatarId}
            onAvatarSelect={(avatarId) =>
              setFormData((prev) => ({ ...prev, avatarId }))
            }
          />
        );
      case 4:
        return (
          <NameStep
            name={formData.displayName}
            onNameChange={(name) =>
              setFormData((prev) => ({ ...prev, displayName: name }))
            }
          />
        );
      case 5:
        return (
          <ModeSelectionStep
            selectedMode={formData.selectedMode}
            onModeSelect={(mode) =>
              setFormData((prev) => ({ ...prev, selectedMode: mode }))
            }
          />
        );
      default:
        return null;
    }
  };

  const canAdvance = () => {
    if (currentStep === 0 && !demoCompleted) return false;
    if (currentStep === 4 && !formData.displayName.trim()) return false;
    if (currentStep === 5 && !formData.selectedMode) return false;
    return true;
  };

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl" dir={dir}>
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">{t('onboarding.navigation.title') || 'Player Onboarding'}</DialogTitle>

        {/* Progress indicator */}
        <div className="px-3 sm:px-6 pt-3 sm:pt-4">
          <OnboardingProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        </div>

        {/* Step content with animation */}
        <DialogBody className="space-y-4 px-3 sm:px-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </DialogBody>

        {/* Navigation buttons */}
        <DialogFooter className="flex-col sm:flex-row gap-2 px-3 sm:px-6 pb-3 sm:pb-6">
          {/* Skip button (not on last step) */}
          {!isLastStep && (
            <Button
              variant="outline"
              onClick={handleSkip}
              className="bg-neo-cream text-sm sm:text-base"
            >
              <FaTimes className={dir === 'rtl' ? 'ml-2' : 'mr-2'} />
              {t('onboarding.navigation.skip')}
            </Button>
          )}

          {/* Back button (except first step) */}
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="bg-neo-cream text-sm sm:text-base"
            >
              {dir === 'rtl' ? (
                <FaArrowRight className="ml-2" />
              ) : (
                <FaArrowLeft className="mr-2" />
              )}
              {t('onboarding.navigation.back')}
            </Button>
          )}

          {/* Next/Complete button */}
          <Button
            variant={isLastStep ? 'default' : 'accent'}
            onClick={handleNext}
            disabled={!canAdvance()}
            className={`flex-1 text-sm sm:text-base ${
              !canAdvance() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLastStep ? t('onboarding.navigation.letsPlay') : t('onboarding.navigation.next')}
            {!isLastStep && (dir === 'rtl' ? (
              <FaArrowLeft className="mr-2" />
            ) : (
              <FaArrowRight className="ml-2" />
            ))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
