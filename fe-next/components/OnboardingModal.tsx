'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogBody, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { useMusic } from '../contexts/MusicContext';
import { useAuth } from '../contexts/AuthContext';
import OnboardingProgress from './onboarding/OnboardingProgress';
import { markOnboardingComplete, markOnboardingSkipped } from '../utils/onboardingStorage';
import { AVATARS } from '../utils/avatarConfig';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { triggerHaptic } from '../utils/hapticFeedback';

// Step components - Streamlined 3-step onboarding
import WelcomeDemoStep from './onboarding/WelcomeDemoStep';
import ProfileSetupStep from './onboarding/ProfileSetupStep';
import QuickTipsStep from './onboarding/QuickTipsStep';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  avatarId: string;
  displayName: string;
  selectedMode: 'single' | 'multi' | 'daily' | null;
}

const TOTAL_STEPS = 3;

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

  // Set random avatar and its name as default on mount
  // Use sessionStorage to prevent re-selection within the same session (avoids "jumping")
  useEffect(() => {
    const sessionKey = 'lexiclash_onboarding_session_avatar';
    const storedData = sessionStorage.getItem(sessionKey);

    let avatarToUse: typeof AVATARS[0];

    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        // Find the stored avatar or fallback to random
        avatarToUse = AVATARS.find(a => a.id === parsed.avatarId) || AVATARS[Math.floor(Math.random() * AVATARS.length)];
      } catch {
        avatarToUse = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      }
    } else {
      // First time in session - pick random and store it
      avatarToUse = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      sessionStorage.setItem(sessionKey, JSON.stringify({ avatarId: avatarToUse.id }));
    }

    setFormData((prev) => ({
      ...prev,
      avatarId: avatarToUse.id,
      displayName: prev.displayName || avatarToUse.name,
    }));
  }, []);

  // Play bossa music when modal opens (after audio unlock)
  useEffect(() => {
    if (isOpen && audioUnlocked) {
      fadeToTrack(TRACKS.BOSSA, 1000, 2000);
    }
  }, [isOpen, audioUnlocked, fadeToTrack, TRACKS]);

  // Handle dialog state changes - allow closing via X button
  // Marks onboarding as skipped so it won't show again in this session
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      markOnboardingSkipped();
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      triggerHaptic('swipe');
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    // Validation before advancing
    if (currentStep === 0 && !demoCompleted) {
      // User must complete the demo before proceeding
      triggerHaptic('warning');
      return;
    }

    if (currentStep === 1 && !formData.displayName.trim()) {
      // Name is required in profile step
      triggerHaptic('warning');
      return;
    }

    triggerHaptic('swipe');
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  // Swipe gesture handlers
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => {
      // Swipe left = next (in LTR), prev (in RTL) - handled by hook
      if (canAdvance()) {
        handleNext();
      }
    },
    onSwipeRight: () => {
      // Swipe right = prev (in LTR), next (in RTL) - handled by hook
      if (currentStep > 0) {
        handleBack();
      }
    },
    isRtl: dir === 'rtl',
    enableHaptic: false, // We handle haptic manually for better control
    threshold: 50,
  });

  const handleComplete = async () => {
    // Save to localStorage - always set to single/training mode
    markOnboardingComplete({
      avatarId: formData.avatarId,
      displayName: formData.displayName,
      selectedMode: 'single', // Always training mode
    });

    // Save to profile if authenticated
    if (profile && formData.displayName.trim()) {
      await updateProfile({
        avatar_image: formData.avatarId,
        display_name: formData.displayName.trim(),
      });
    }

    // Always navigate to singleplayer (training mode)
    router.push(`/${language}/singleplayer`);

    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        // Step 1: Interactive demo - learn the basics
        return (
          <WelcomeDemoStep
            onDemoComplete={() => setDemoCompleted(true)}
            demoCompleted={demoCompleted}
          />
        );
      case 1:
        // Step 2: Profile setup - avatar + name combined
        return (
          <ProfileSetupStep
            selectedAvatarId={formData.avatarId}
            displayName={formData.displayName}
            onAvatarSelect={(avatarId) =>
              setFormData((prev) => ({ ...prev, avatarId }))
            }
            onNameChange={(name) =>
              setFormData((prev) => ({ ...prev, displayName: name }))
            }
          />
        );
      case 2:
        // Step 3: Quick tips + mode selection
        return (
          <QuickTipsStep
            selectedMode={formData.selectedMode}
            onModeSelect={(mode) =>
              setFormData((prev) => ({ ...prev, selectedMode: mode }))
            }
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  const canAdvance = () => {
    if (currentStep === 0 && !demoCompleted) return false;
    if (currentStep === 1 && !formData.displayName.trim()) return false;
    // Step 2 no longer requires mode selection - we auto-select training mode
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

        {/* Step content with animation and swipe support */}
        <DialogBody className="space-y-3 px-3 sm:px-6" {...swipeHandlers}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: dir === 'rtl' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Swipe hint indicator - only shown on mobile */}
          <div className="block sm:hidden text-center text-xs text-gray-400 mt-2">
            {t('onboarding.swipeHint') || '← Swipe to navigate →'}
          </div>
        </DialogBody>

        {/* Navigation buttons */}
        <DialogFooter className="flex-col sm:flex-row gap-2 px-3 sm:px-6 pb-3 sm:pb-6">
          {/* Back button (except first step) */}
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="bg-neo-cream text-sm sm:text-base"
            >
              <ArrowLeft className="me-2 rtl:rotate-180" />
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
            {!isLastStep && (
              <ArrowRight className="ms-2 rtl:rotate-180" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
