'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Rocket } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogBody, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { useMusic } from '../contexts/MusicContext';
import { useAuth } from '../contexts/AuthContext';
import OnboardingProgress from './onboarding/OnboardingProgress';
import { markOnboardingComplete, markOnboardingSkipped } from '../utils/onboardingStorage';
import { hasCompleteStoredProfile, getStoredProfile, setStoredCustomAvatar } from '../utils/profileStorage';
import { type CustomAvatarConfig, getRandomAvatarConfig } from '@/shared/types/customAvatar';
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
  customAvatar: CustomAvatarConfig | null;
  displayName: string;
  selectedMode: 'single' | 'multi' | 'daily' | null;
}

/**
 * OnboardingModal - Interactive multi-step onboarding for new players
 * Teaches game mechanics through hands-on demos and guides avatar/name setup
 */
const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { t, dir, language } = useLanguage();
  const { fadeToTrack, TRACKS, audioUnlocked } = useMusic();
  const { profile, updateProfile, isAuthenticated } = useAuth();
  const router = useRouter();

  // Determine if we should skip the profile setup step
  // Skip if: (1) authenticated with avatar+name, or (2) guest with stored avatar+name
  const shouldSkipProfileStep = React.useMemo(() => {
    // Check if authenticated user has complete profile
    if (isAuthenticated && profile?.avatar_image && profile?.display_name) {
      return true;
    }
    // Check if guest has a complete stored profile
    if (hasCompleteStoredProfile()) {
      return true;
    }
    return false;
  }, [isAuthenticated, profile?.avatar_image, profile?.display_name]);

  // Calculate total steps based on whether profile step is skipped
  const TOTAL_STEPS = shouldSkipProfileStep ? 2 : 3;

  const [currentStep, setCurrentStep] = useState(0);
  const [demoCompleted, setDemoCompleted] = useState(false);
  const [formData, setFormData] = useState<FormData>(() => {
    // Priority: (1) stored guest custom avatar, (2) random
    const storedProfile = getStoredProfile();
    const initialAvatar = storedProfile.customAvatar ?? getRandomAvatarConfig();
    return {
      avatarId: storedProfile.avatarId || '',
      customAvatar: initialAvatar,
      displayName: profile?.display_name || storedProfile.username || '',
      selectedMode: null,
    };
  });

  // Sync from authenticated profile on mount
  useEffect(() => {
    if (isAuthenticated && profile?.display_name) {
      setFormData((prev) => ({
        ...prev,
        avatarId: profile.avatar_image || prev.avatarId,
        displayName: profile.display_name || prev.displayName,
      }));
    }
  }, [isAuthenticated, profile?.avatar_image, profile?.display_name]);

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

    // Only validate displayName if we're on the profile step (step 1 when not skipping)
    if (!shouldSkipProfileStep && currentStep === 1 && !formData.displayName.trim()) {
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

  // Swipe gesture handlers - left=next, right=back
  const swipeHandlers = useSwipeGesture({
    onSwipe: (direction) => {
      if (direction === 'left' && canAdvance()) {
        handleNext();
      } else if (direction === 'right' && currentStep > 0) {
        handleBack();
      }
    },
    threshold: 50,
  });

  const handleComplete = async () => {
    // Save custom avatar to localStorage
    if (formData.customAvatar) {
      setStoredCustomAvatar(formData.customAvatar);
    }

    // Save to localStorage - always set to single/training mode
    markOnboardingComplete({
      avatarId: formData.avatarId || 'custom',
      displayName: formData.displayName,
      selectedMode: 'single', // Always training mode
    });

    // Save to profile if authenticated
    if (profile && formData.displayName.trim()) {
      await updateProfile({
        avatar_image: formData.avatarId || 'custom',
        display_name: formData.displayName.trim(),
      });
    }

    // Land in cozy practice hub — players pick a mode + see a guided tutorial
    // before being dropped into the real engine. Replaces legacy autoStart flow.
    router.push(`/${language}/practice`);

    onClose();
  };

  const renderStep = () => {
    // Map current step index to actual step component
    // When profile step is skipped: 0 = Demo, 1 = Tips
    // When profile step included: 0 = Demo, 1 = Profile, 2 = Tips
    const actualStep = shouldSkipProfileStep
      ? (currentStep === 0 ? 'demo' : 'tips')
      : (currentStep === 0 ? 'demo' : currentStep === 1 ? 'profile' : 'tips');

    switch (actualStep) {
      case 'demo':
        // Step 1: Interactive demo - learn the basics
        return (
          <WelcomeDemoStep
            onDemoComplete={() => setDemoCompleted(true)}
            demoCompleted={demoCompleted}
          />
        );
      case 'profile':
        // Step 2: Profile setup - avatar + name combined (skipped for authenticated/stored users)
        return (
          <ProfileSetupStep
            customAvatar={formData.customAvatar ?? getRandomAvatarConfig()}
            displayName={formData.displayName}
            onAvatarSelect={(config) =>
              setFormData((prev) => ({ ...prev, customAvatar: config }))
            }
            onNameChange={(name) =>
              setFormData((prev) => ({ ...prev, displayName: name }))
            }
          />
        );
      case 'tips':
        // Step 3 (or 2 when skipping profile): Quick tips + mode selection
        return (
          <QuickTipsStep
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
    // Only validate displayName if we're on the profile step (step 1 when not skipping)
    if (!shouldSkipProfileStep && currentStep === 1 && !formData.displayName.trim()) return false;
    // Tips step no longer requires mode selection - we auto-select training mode
    return true;
  };

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl" dir={dir}>
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">{t('onboarding.navigation.title')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('onboarding.navigation.description')}
        </DialogDescription>

        {/* Progress indicator */}
        <div className="px-3 sm:px-6 pt-3 sm:pt-4">
          <OnboardingProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        </div>

        {/* Step content with animation and swipe support */}
        <DialogBody className="space-y-3 px-3 sm:px-6" {...swipeHandlers}>
          <AnimatePresence mode="wait">
            <m.div
              key={currentStep}
              initial={{ opacity: 0, x: dir === 'rtl' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
              transition={{
                duration: 0.25,
                ease: [0.25, 0.1, 0.25, 1]
              }}
              style={{ willChange: 'transform, opacity' }}
            >
              {renderStep()}
            </m.div>
          </AnimatePresence>

          {/* Swipe hint indicator - only shown on mobile */}
          <div className="block sm:hidden text-center text-xs text-neo-white mt-2">
            {t('onboarding.swipeHint')}
          </div>
        </DialogBody>

        {/* Navigation buttons */}
        <DialogFooter className="flex-col sm:flex-row gap-2 px-3 sm:px-6 pb-3 sm:pb-6">
          {/* Back button (hidden on first step) */}
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
            size={isLastStep ? 'lg' : 'default'}
            onClick={handleNext}
            disabled={!canAdvance()}
            className={`flex-1 ${
              !canAdvance() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLastStep ? (
              <>
                <Rocket className="me-2" />
                {t('onboarding.navigation.startPractice')}
              </>
            ) : (
              <>
                {t('onboarding.navigation.next')}
                <ArrowRight className="ms-2 rtl:rotate-180" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
