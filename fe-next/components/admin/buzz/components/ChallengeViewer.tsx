'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { NeoLoader } from '@/components/ui/NeoLoader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import RegenerationDialog from '../RegenerationDialog';
import { CHALLENGE_TYPE_ICONS, type DailyBuzzDataAdmin } from '../types';
import { ChallengeCard } from './ChallengeCard';
import { ImageManagement } from './ImageManagement';
import { SocialContent } from './SocialContent';

const CHALLENGE_LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'he', label: 'HE' },
  { code: 'sv', label: 'SV' },
  { code: 'ja', label: 'JA' },
  { code: 'es', label: 'ES' },
];

export interface ChallengeViewerProps {
  selectedDate: string;
  challengeData: DailyBuzzDataAdmin | null;
  loadingChallenges: boolean;
  onFetchChallenges: (date: string, language: string) => Promise<void>;
  onChallengeDataUpdate: (data: DailyBuzzDataAdmin) => void;
  // Image operations
  isRegeneratingImage: boolean;
  regenerateImageError: string | null;
  onRegenerateImage: () => Promise<boolean>;
  isRemovingImage: boolean;
  removeImageError: string | null;
  onRemoveImage: () => Promise<boolean>;
  onClearImageErrors: () => void;
  // Type regeneration
  isRegeneratingType: boolean;
  typeRegenerateError: string | null;
  onRegenerateByType: (type: string, feedback: string) => Promise<void>;
  onClearTypeError: () => void;
  // Success callback
  onSuccess: (message: string) => void;
  // Auth for mark-as-bad feature
  authToken?: string;
}

/**
 * Challenge viewer component that orchestrates the display and editing of challenges.
 */
export function ChallengeViewer({
  selectedDate,
  challengeData,
  loadingChallenges,
  onFetchChallenges,
  onChallengeDataUpdate,
  isRegeneratingImage,
  regenerateImageError,
  onRegenerateImage,
  isRemovingImage,
  removeImageError,
  onRemoveImage,
  onClearImageErrors,
  isRegeneratingType,
  typeRegenerateError,
  onRegenerateByType,
  onClearTypeError,
  onSuccess,
  authToken,
}: ChallengeViewerProps): React.ReactElement {
  const [showChallenges, setShowChallenges] = useState(false);
  const [viewLanguage, setViewLanguage] = useState<string>('en');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChallengeIndex, setEditingChallengeIndex] = useState<number | null>(null);

  // Regenerate by type dialog state
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [typeFeedback, setTypeFeedback] = useState('');

  // Remove image dialog state
  const [removeImageDialogOpen, setRemoveImageDialogOpen] = useState(false);

  // Fetch challenges when language changes
  const fetchChallenges = useCallback((lang?: string) => {
    const targetLanguage = lang || viewLanguage;
    onFetchChallenges(selectedDate, targetLanguage);
  }, [selectedDate, viewLanguage, onFetchChallenges]);

  // Handle toggle
  function handleToggle(): void {
    setShowChallenges(!showChallenges);
    if (!showChallenges && !challengeData) {
      fetchChallenges();
    }
  }

  // Handle language change
  function handleLanguageChange(code: string): void {
    setViewLanguage(code);
    fetchChallenges(code);
  }

  // Handle edit challenge
  function handleEditChallenge(index: number): void {
    setEditingChallengeIndex(index);
    setEditDialogOpen(true);
  }

  // Handle regenerate success
  function handleRegenerateSuccess(updatedData: DailyBuzzDataAdmin, message: string): void {
    onChallengeDataUpdate(updatedData);
    setEditingChallengeIndex(null);
    onSuccess(message);
  }

  // Handle regenerate by type
  async function handleRegenerateByType(): Promise<void> {
    if (!selectedType || !typeFeedback.trim()) return;

    try {
      await onRegenerateByType(selectedType, typeFeedback);
      setTypeDialogOpen(false);
      setTypeFeedback('');
      onSuccess(`All ${selectedType.replace(/_/g, ' ')} challenges regenerated successfully!`);
      setSelectedType('');
    } catch {
      // Error is handled in the hook
    }
  }

  // Handle image regeneration with success message
  async function handleRegenerateImage(): Promise<void> {
    const success = await onRegenerateImage();
    if (success && challengeData) {
      onSuccess(`Image regenerated for ${challengeData.language.toUpperCase()} on ${challengeData.puzzle_date}`);
    }
  }

  // Handle image removal with success message
  async function handleRemoveImage(): Promise<void> {
    const success = await onRemoveImage();
    if (success && challengeData) {
      setRemoveImageDialogOpen(false);
      onSuccess(`Image removed for ${challengeData.language.toUpperCase()} on ${challengeData.puzzle_date}`);
    }
  }

  // Open type dialog
  function openTypeDialog(): void {
    setTypeDialogOpen(true);
    setTypeFeedback('');
    setSelectedType('');
    onClearTypeError();
  }

  // Close type dialog
  function closeTypeDialog(): void {
    setTypeDialogOpen(false);
    setTypeFeedback('');
    setSelectedType('');
    onClearTypeError();
  }

  return (
    <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-6 space-y-4">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-neo-cyan" />
          View & Edit Challenges
        </h2>
        {showChallenges ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {showChallenges && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Language selector */}
            <div className="flex gap-2 flex-wrap items-center">
              {CHALLENGE_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`px-3 py-1.5 rounded-lg border-2 font-medium text-sm transition-colors ${
                    viewLanguage === lang.code
                      ? 'bg-neo-cyan/20 border-neo-cyan text-neo-cyan'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
              <button
                onClick={() => fetchChallenges()}
                disabled={loadingChallenges}
                className="p-2 rounded-lg border-2 border-slate-700 text-slate-400 hover:border-neo-cyan hover:text-neo-cyan transition-colors disabled:opacity-50"
                title="Refresh challenges"
              >
                {loadingChallenges ? (
                  <NeoLoader variant="dots" size="sm" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
              {/* Regenerate by Type button */}
              {challengeData && (
                <button
                  onClick={openTypeDialog}
                  className="ms-auto px-3 py-1.5 rounded-lg border-2 border-neo-orange text-neo-orange hover:bg-neo-orange/10 font-medium text-sm transition-colors flex items-center gap-1.5"
                  title="Regenerate all challenges of a specific type"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate by Type
                </button>
              )}
            </div>

            {/* Challenges list */}
            {loadingChallenges ? (
              <div className="flex justify-center py-8">
                <NeoLoader variant="dots" size="lg" />
              </div>
            ) : challengeData ? (
              <div className="space-y-3">
                <div className="text-sm text-slate-400">
                  <span className="font-medium text-neo-yellow">{challengeData.trending_summary}</span>
                  {' \u00B7 '}
                  {challengeData.puzzle_date}
                  {' \u00B7 '}
                  {challengeData.challenges.length} challenges
                </div>

                {/* Image Section */}
                <ImageManagement
                  challengeData={challengeData}
                  isRegeneratingImage={isRegeneratingImage}
                  regenerateImageError={regenerateImageError}
                  onRegenerateImage={handleRegenerateImage}
                  isRemovingImage={isRemovingImage}
                  removeImageError={removeImageError}
                  onRemoveImage={handleRemoveImage}
                  removeDialogOpen={removeImageDialogOpen}
                  onRemoveDialogChange={setRemoveImageDialogOpen}
                  onClearRemoveError={onClearImageErrors}
                />

                {/* Social Content Section */}
                <SocialContent socialContent={challengeData.social_content} />

                {/* Challenge Cards */}
                {challengeData.challenges.map((challenge, index) => (
                  <ChallengeCard
                    key={index}
                    challenge={challenge}
                    index={index}
                    onEdit={handleEditChallenge}
                    authToken={authToken}
                    date={challengeData.puzzle_date}
                    language={viewLanguage}
                    onMarkAsBadSuccess={() => onSuccess('Challenge marked as bad - feedback stored for AI improvement')}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No challenges found for {selectedDate} ({viewLanguage}). Generate them first.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Challenge Dialog */}
      <RegenerationDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        challengeIndex={editingChallengeIndex}
        challengeData={challengeData}
        onRegenerateSuccess={handleRegenerateSuccess}
      />

      {/* Regenerate by Type Dialog */}
      <RegenerateByTypeDialog
        open={typeDialogOpen}
        onOpenChange={closeTypeDialog}
        challengeData={challengeData}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        typeFeedback={typeFeedback}
        onTypeFeedbackChange={setTypeFeedback}
        isRegeneratingType={isRegeneratingType}
        typeRegenerateError={typeRegenerateError}
        onRegenerate={handleRegenerateByType}
      />
    </div>
  );
}

interface RegenerateByTypeDialogProps {
  open: boolean;
  onOpenChange: () => void;
  challengeData: DailyBuzzDataAdmin | null;
  selectedType: string;
  onSelectType: (type: string) => void;
  typeFeedback: string;
  onTypeFeedbackChange: (feedback: string) => void;
  isRegeneratingType: boolean;
  typeRegenerateError: string | null;
  onRegenerate: () => void;
}

function RegenerateByTypeDialog({
  open,
  onOpenChange,
  challengeData,
  selectedType,
  onSelectType,
  typeFeedback,
  onTypeFeedbackChange,
  isRegeneratingType,
  typeRegenerateError,
  onRegenerate,
}: RegenerateByTypeDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" noDescription>
        <DialogHeader variant="yellow">
          <DialogTitle className="flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Regenerate by Challenge Type
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {challengeData && (
            <>
              {/* Challenge type selector */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Select challenge type to regenerate
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CHALLENGE_TYPE_ICONS).map(([type, icon]) => {
                    const count = challengeData.challenges.filter(c => c.type === type).length;
                    return (
                      <button
                        key={type}
                        onClick={() => onSelectType(type)}
                        disabled={count === 0 || isRegeneratingType}
                        className={`px-3 py-2 rounded-lg border-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                          selectedType === type
                            ? 'bg-neo-orange/20 border-neo-orange text-neo-orange'
                            : count > 0
                            ? 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                            : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <span className="text-lg">{icon}</span>
                        <span className="flex-1 text-start">{type.replace(/_/g, ' ')}</span>
                        <span className="text-xs opacity-60">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback textarea */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  What is wrong with these {selectedType.replace(/_/g, ' ')} challenges?
                </label>
                <textarea
                  value={typeFeedback}
                  onChange={(e) => onTypeFeedbackChange(e.target.value)}
                  placeholder="e.g., All wordle answers are too difficult, The anagram clues are too easy, Wrong language register..."
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-lg text-neo-black dark:text-white focus:border-neo-orange focus:outline-none resize-none"
                  rows={3}
                  disabled={isRegeneratingType || !selectedType}
                />
                <p className="mt-1 text-xs text-slate-500">
                  This will regenerate ALL challenges of the selected type.
                </p>
              </div>

              {/* Error display */}
              {typeRegenerateError && (
                <div className="p-3 bg-red-900/30 border border-red-500 rounded-lg">
                  <p className="text-sm text-red-400">{typeRegenerateError}</p>
                </div>
              )}
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <button
            onClick={onOpenChange}
            disabled={isRegeneratingType}
            className="px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onRegenerate}
            disabled={isRegeneratingType || !selectedType || typeFeedback.trim().length < 5}
            className="px-4 py-2 rounded-lg bg-neo-orange text-neo-black font-bold border-2 border-neo-black shadow-hard-sm hover:shadow-hard disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRegeneratingType ? (
              <>
                <NeoLoader variant="dots" size="sm" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Regenerate All {selectedType.replace(/_/g, ' ')}
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
