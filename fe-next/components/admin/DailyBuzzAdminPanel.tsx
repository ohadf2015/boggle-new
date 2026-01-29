'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X } from 'lucide-react';
import { useBuzzGeneration, useChallengeData } from './buzz/hooks';
import { GenerationControls, ChallengeViewer } from './buzz/components';
import { SectionEditor } from './buzz/section-editor';
import { getSession } from '@/lib/supabase';
import type { DailyBuzzDataAdmin } from './buzz/types';

/**
 * DailyBuzzAdminPanel - Admin control panel for Daily Buzz
 * Features:
 * - Manual generation trigger (all languages or single)
 * - Generation status display
 * - View and edit today's challenges
 * - Regenerate individual challenges with feedback
 * - Feature flag management link
 */
export default function DailyBuzzAdminPanel(): React.ReactElement {
  // Date state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Auth token for API calls
  const [authToken, setAuthToken] = useState<string | undefined>(undefined);

  // Success message state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch auth token on mount
  useEffect(() => {
    async function fetchAuthToken(): Promise<void> {
      const result = await getSession();
      if (result.data.session?.access_token) {
        setAuthToken(result.data.session.access_token);
      }
    }
    fetchAuthToken();
  }, []);

  // Challenge data hook
  const {
    challengeData,
    loadingChallenges,
    fetchChallenges,
    setChallengeData,
    isRegeneratingImage,
    regenerateImageError,
    handleRegenerateImage,
    isRemovingImage,
    removeImageError,
    handleRemoveImage,
    clearImageErrors,
    isRegeneratingType,
    typeRegenerateError,
    handleRegenerateByType,
    clearTypeError,
  } = useChallengeData();

  // Generation hook with refresh callback
  const {
    isGenerating,
    result,
    elapsedTime,
    handleGenerate,
  } = useBuzzGeneration({
    onGenerationComplete: () => {
      // Refresh challenges if viewer has data
      if (challengeData) {
        fetchChallenges(selectedDate, challengeData.language);
      }
    },
  });

  // Handle success messages
  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000);
  }, []);

  // Handle challenge data updates
  const handleChallengeDataUpdate = useCallback((data: DailyBuzzDataAdmin) => {
    setChallengeData(data);
  }, [setChallengeData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-neo-yellow" />
          <h1 className="text-3xl font-neo-display font-black text-neo-yellow">
            Daily Buzz Admin
          </h1>
        </div>
        <p className="text-slate-400">
          Generate Daily Buzz challenges manually or configure settings
        </p>
      </div>

      {/* Generation Controls */}
      <GenerationControls
        isGenerating={isGenerating}
        result={result}
        elapsedTime={elapsedTime}
        onGenerate={handleGenerate}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {/* Success Message Toast */}
      <SuccessToast
        message={successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />

      {/* Today's Challenges Section */}
      <ChallengeViewer
        selectedDate={selectedDate}
        challengeData={challengeData}
        loadingChallenges={loadingChallenges}
        onFetchChallenges={fetchChallenges}
        onChallengeDataUpdate={handleChallengeDataUpdate}
        isRegeneratingImage={isRegeneratingImage}
        regenerateImageError={regenerateImageError}
        onRegenerateImage={handleRegenerateImage}
        isRemovingImage={isRemovingImage}
        removeImageError={removeImageError}
        onRemoveImage={handleRemoveImage}
        onClearImageErrors={clearImageErrors}
        isRegeneratingType={isRegeneratingType}
        typeRegenerateError={typeRegenerateError}
        onRegenerateByType={handleRegenerateByType}
        onClearTypeError={clearTypeError}
        onSuccess={showSuccess}
        authToken={authToken}
      />

      {/* Quick Links */}
      <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-bold text-white mb-3">Quick Links</h2>
        <div className="space-y-2">
          <a
            href="/api/admin/feature-flags"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 bg-slate-900 border-2 border-slate-700 rounded-lg text-slate-300 hover:border-neo-cyan hover:text-neo-cyan transition-colors"
          >
            Manage Feature Flags (API)
          </a>
          <a
            href="/api/buzz/stats"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 bg-slate-900 border-2 border-slate-700 rounded-lg text-slate-300 hover:border-neo-cyan hover:text-neo-cyan transition-colors"
          >
            View Statistics (API)
          </a>
        </div>
      </div>

      {/* Prompt Sections Editor */}
      {authToken && (
        <SectionEditor
          authToken={authToken}
          language="en"
          onSuccess={showSuccess}
        />
      )}
    </motion.div>
  );
}

interface SuccessToastProps {
  message: string | null;
  onDismiss: () => void;
}

function SuccessToast({ message, onDismiss }: SuccessToastProps): React.ReactElement | null {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50 max-w-md"
      >
        <div className="bg-green-900/90 border-2 border-green-500 rounded-xl p-4 shadow-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-400 shrink-0" />
          <p className="text-green-200 text-sm">{message}</p>
          <button
            onClick={onDismiss}
            className="text-green-400 hover:text-green-200 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
