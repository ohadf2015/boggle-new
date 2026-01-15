'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Play,
  Check,
  X,
  Clock,
  Sparkles,
  Eye,
  Edit2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ImageOff,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoLoader } from '@/components/ui/NeoLoader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { getSession } from '@/lib/supabase';
import RegenerationDialog from './buzz/RegenerationDialog';
import type { DailyBuzzDataAdmin } from './buzz/types';

// Client-side timeout matches server maxDuration (120s) with buffer
const CLIENT_TIMEOUT_MS = 130_000;

// Regeneration timeout (70s API maxDuration + buffer)
// Server has 50s internal AI timeout + processing time
const REGENERATE_TIMEOUT_MS = 80_000;

interface GenerationResult {
  success: boolean;
  results: Record<string, { success: boolean; error?: string }>;
  duration: number;
  date: string;
  message?: string;
}

const CHALLENGE_LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'he', label: 'HE' },
  { code: 'sv', label: 'SV' },
  { code: 'ja', label: 'JA' },
  { code: 'es', label: 'ES' },
];

const CHALLENGE_TYPE_ICONS: Record<string, string> = {
  anagram: '🔀',
  fill_blank: '📝',
  word_chain: '🔗',
  definition_match: '🎯',
  trending_trio: '3️⃣',
  riddle: '🧩',
  wordle_guess: '🟩',
};

/**
 * DailyBuzzAdminPanel - Admin control panel for Daily Buzz
 * Features:
 * - Manual generation trigger (all languages or single)
 * - Generation status display
 * - View and edit today's challenges
 * - Regenerate individual challenges with feedback
 * - Feature flag management link
 */
export default function DailyBuzzAdminPanel() {
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [elapsedTime, setElapsedTime] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Challenge viewer state
  const [challengeData, setChallengeData] = useState<DailyBuzzDataAdmin | null>(null);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [viewLanguage, setViewLanguage] = useState<string>('en');

  // Edit dialog state (single challenge) - uses new RegenerationDialog component
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChallengeIndex, setEditingChallengeIndex] = useState<number | null>(null);

  // Regenerate by type dialog state
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [typeFeedback, setTypeFeedback] = useState('');
  const [isRegeneratingType, setIsRegeneratingType] = useState(false);
  const [typeRegenerateError, setTypeRegenerateError] = useState<string | null>(null);

  // Image removal state
  const [removeImageDialogOpen, setRemoveImageDialogOpen] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [removeImageError, setRemoveImageError] = useState<string | null>(null);

  // Success message state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const languages = [
    { code: 'all', label: 'All Languages' },
    { code: 'en', label: 'English' },
    { code: 'he', label: 'Hebrew' },
    { code: 'sv', label: 'Swedish' },
    { code: 'ja', label: 'Japanese' },
    { code: 'es', label: 'Spanish' },
  ];

  // Update elapsed time during generation
  useEffect(() => {
    if (!isGenerating) {
      setElapsedTime(0);
      return;
    }

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  // Fetch challenges for viewing/editing
  const fetchChallenges = useCallback(async (lang?: string) => {
    const targetLanguage = lang || viewLanguage;
    setLoadingChallenges(true);

    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `/api/admin/buzz/challenges?date=${selectedDate}&language=${targetLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setChallengeData(null);
          return;
        }
        throw new Error('Failed to fetch challenges');
      }

      const data = await response.json();
      setChallengeData(data.data);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      setChallengeData(null);
    } finally {
      setLoadingChallenges(false);
    }
  }, [selectedDate, viewLanguage]);

  // Handle regenerating all challenges of a specific type
  const handleRegenerateByType = async () => {
    if (!selectedType || !challengeData || !typeFeedback.trim()) return;

    setIsRegeneratingType(true);
    setTypeRegenerateError(null);

    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REGENERATE_TIMEOUT_MS);

      const response = await fetch('/api/admin/buzz/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: challengeData.puzzle_date,
          language: challengeData.language,
          challengeType: selectedType,
          feedback: typeFeedback.trim(),
          saveFeedback: false, // No original challenge to store for type-based regen
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Regeneration failed');
      }

      const data = await response.json();
      setChallengeData(data.data);
      setTypeDialogOpen(false);
      setTypeFeedback('');

      // Show success message
      setSuccessMessage(`All ${selectedType.replace(/_/g, ' ')} challenges regenerated successfully!`);
      setTimeout(() => setSuccessMessage(null), 5000);

      setSelectedType('');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setTypeRegenerateError(
          'Request timed out after 80 seconds. The AI model may be overloaded. ' +
          'Please try again in a few minutes.'
        );
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Failed to regenerate';
        setTypeRegenerateError(errorMsg);
      }
    } finally {
      setIsRegeneratingType(false);
    }
  };

  // Handle successful regeneration from the RegenerationDialog
  const handleRegenerateSuccess = useCallback((updatedData: DailyBuzzDataAdmin, message: string) => {
    setChallengeData(updatedData);
    setEditingChallengeIndex(null);
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000);
  }, []);

  // Handle removing the image for current challenge
  const handleRemoveImage = async () => {
    if (!challengeData) return;

    setIsRemovingImage(true);
    setRemoveImageError(null);

    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/admin/buzz/remove-image', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: challengeData.puzzle_date,
          language: challengeData.language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove image');
      }

      // Update local state to reflect image removal
      setChallengeData({
        ...challengeData,
        image_url: null,
        image_prompt: null,
        image_category: null,
      });

      setRemoveImageDialogOpen(false);
      setSuccessMessage(`Image removed for ${challengeData.language.toUpperCase()} on ${challengeData.puzzle_date}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove image';
      setRemoveImageError(errorMsg);
    } finally {
      setIsRemovingImage(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);

    // Create abort controller for timeout
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, CLIENT_TIMEOUT_MS);

    try {
      // Get user's JWT token from session
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session. Please refresh the page.');
      }

      const body: Record<string, string> = { date: selectedDate };
      if (selectedLanguage !== 'all') {
        body.language = selectedLanguage;
      }

      const response = await fetch('/api/cron/generate-daily-buzz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult(data);

      // Refresh challenges if viewer is open
      if (showChallenges) {
        fetchChallenges();
      }
    } catch (error) {
      // Handle abort differently from other errors
      if (error instanceof Error && error.name === 'AbortError') {
        setResult({
          success: false,
          results: {},
          duration: 0,
          date: selectedDate,
          message: 'Request timed out after 130 seconds. The AI model may be overloaded. Please try again in a few minutes.',
        });
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setResult({
          success: false,
          results: {},
          duration: 0,
          date: selectedDate,
          message: errorMsg,
        });
      }
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  const getChallengeTypeIcon = (type: string): string => {
    return CHALLENGE_TYPE_ICONS[type] || '❓';
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-900/50 text-green-400';
      case 'medium':
        return 'bg-yellow-900/50 text-yellow-400';
      case 'hard':
        return 'bg-red-900/50 text-red-400';
      default:
        return 'bg-slate-700 text-slate-400';
    }
  };

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
      <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-neo-cyan" />
          Manual Generation
        </h2>

        {/* Date Picker */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border-2 border-slate-700 rounded-lg text-white focus:border-neo-cyan focus:outline-none"
          />
        </div>

        {/* Language Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Language
          </label>
          <div className="grid grid-cols-3 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                  selectedLanguage === lang.code
                    ? 'bg-neo-cyan/20 border-neo-cyan text-neo-cyan'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-6 text-lg font-black uppercase bg-neo-yellow text-neo-black border-4 border-neo-black rounded-xl shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <NeoLoader variant="dots" size="sm" className="me-2" />
              Generating... {elapsedTime > 0 && `(${elapsedTime}s)`}
            </>
          ) : (
            <>
              <Play className="w-5 h-5 me-2" />
              Generate Daily Buzz
            </>
          )}
        </Button>

        <p className="text-xs text-slate-500 text-center">
          {isGenerating
            ? 'AI generation in progress. This may take 30-90 seconds depending on languages selected.'
            : `This will generate challenges for ${selectedLanguage === 'all' ? 'all languages' : selectedLanguage} on ${selectedDate}`
          }
        </p>
      </div>

      {/* Results Display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`border-2 rounded-xl p-6 ${
            result.success
              ? 'bg-green-900/20 border-green-500'
              : 'bg-red-900/20 border-red-500'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            {result.success ? (
              <Check className="w-6 h-6 text-green-400" />
            ) : (
              <X className="w-6 h-6 text-red-400" />
            )}
            <h3 className="text-xl font-bold text-white">
              {result.success ? 'Generation Successful' : 'Generation Failed'}
            </h3>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Date</div>
              <div className="font-bold text-white">{result.date}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Duration</div>
              <div className="font-bold text-white flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {(result.duration / 1000).toFixed(2)}s
              </div>
            </div>
          </div>

          {/* Language Results */}
          {Object.keys(result.results).length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-400 mb-2">
                Results by Language:
              </div>
              {Object.entries(result.results).map(([lang, status]) => (
                <div
                  key={lang}
                  className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3"
                >
                  <span className="font-medium text-white uppercase">
                    {lang}
                  </span>
                  {status.success ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="text-xs text-red-400">
                        {status.error}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {!result.success && result.message && (
            <div className="mt-4 p-3 bg-red-900/30 rounded-lg">
              <p className="text-sm text-red-400">{result.message}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Success Message Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 max-w-md"
          >
            <div className="bg-green-900/90 border-2 border-green-500 rounded-xl p-4 shadow-lg flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400 shrink-0" />
              <p className="text-green-200 text-sm">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-400 hover:text-green-200 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's Challenges Section */}
      <div className="bg-slate-800/50 border-2 border-slate-700 rounded-xl p-6 space-y-4">
        <button
          onClick={() => {
            setShowChallenges(!showChallenges);
            if (!showChallenges && !challengeData) {
              fetchChallenges();
            }
          }}
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
              {/* Language selector for viewing */}
              <div className="flex gap-2 flex-wrap items-center">
                {CHALLENGE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setViewLanguage(lang.code);
                      fetchChallenges(lang.code);
                    }}
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
                    onClick={() => {
                      setTypeDialogOpen(true);
                      setTypeFeedback('');
                      setSelectedType('');
                      setTypeRegenerateError(null);
                    }}
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
                    {' · '}
                    {challengeData.puzzle_date}
                    {' · '}
                    {challengeData.challenges.length} challenges
                  </div>

                  {/* Image Section */}
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-400">Hero Image</span>
                      {challengeData.image_url && (
                        <button
                          onClick={() => {
                            setRemoveImageDialogOpen(true);
                            setRemoveImageError(null);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors"
                          title="Remove image"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      )}
                    </div>
                    {challengeData.image_url ? (
                      <div className="space-y-2">
                        <div className="relative w-full max-w-sm aspect-[4/3]">
                          <Image
                            src={challengeData.image_url}
                            alt={challengeData.trending_summary || 'Daily Buzz Hero'}
                            fill
                            className="rounded-lg border-2 border-slate-600 object-cover"
                          />
                        </div>
                        {challengeData.image_prompt && (
                          <div className="text-xs text-slate-500">
                            <span className="text-slate-400">Prompt: </span>
                            {challengeData.image_prompt}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <ImageOff className="w-4 h-4" />
                        No image set for this language
                      </div>
                    )}
                  </div>

                  {challengeData.challenges.map((challenge, index) => (
                    <div
                      key={index}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-2xl" title={challenge.type}>
                            {getChallengeTypeIcon(challenge.type)}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300">
                            {challenge.type}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                            {challenge.difficulty}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingChallengeIndex(index);
                            setEditDialogOpen(true);
                          }}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-neo-yellow transition-colors shrink-0"
                          title="Edit / Regenerate"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-white">
                        <span className="text-slate-500 text-sm">Prompt: </span>
                        {challenge.prompt}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Answer: </span>
                          <span className="font-mono font-bold text-neo-yellow">
                            {challenge.answer}
                          </span>
                        </div>
                        {challenge.hint && (
                          <div>
                            <span className="text-slate-500">Hint: </span>
                            <span className="text-slate-300">{challenge.hint}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-slate-500">
                        Trend: {challenge.trend_topic}
                        {challenge.trending_context && (
                          <span className="text-slate-600"> · {challenge.trending_context}</span>
                        )}
                      </div>
                    </div>
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
      </div>

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

      {/* Edit Challenge Dialog - uses new multi-step RegenerationDialog */}
      <RegenerationDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        challengeIndex={editingChallengeIndex}
        challengeData={challengeData}
        onRegenerateSuccess={handleRegenerateSuccess}
      />

      {/* Regenerate by Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
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
                          onClick={() => setSelectedType(type)}
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
                    onChange={(e) => setTypeFeedback(e.target.value)}
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
              onClick={() => {
                setTypeDialogOpen(false);
                setTypeFeedback('');
                setSelectedType('');
                setTypeRegenerateError(null);
              }}
              disabled={isRegeneratingType}
              className="px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRegenerateByType}
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

      {/* Remove Image Confirmation Dialog */}
      <Dialog open={removeImageDialogOpen} onOpenChange={setRemoveImageDialogOpen}>
        <DialogContent className="sm:max-w-md" noDescription>
          <DialogHeader customBg="bg-red-900/50 border-b border-red-500/30">
            <DialogTitle className="flex items-center justify-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Remove Image
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {challengeData && (
              <>
                <p className="text-slate-300 text-center">
                  Are you sure you want to remove the hero image for{' '}
                  <span className="font-bold text-neo-yellow">{challengeData.language.toUpperCase()}</span>
                  {' '}on{' '}
                  <span className="font-bold text-neo-cyan">{challengeData.puzzle_date}</span>?
                </p>
                <p className="text-sm text-slate-500 text-center">
                  This action cannot be undone. The challenge will display without an image until a new one is generated.
                </p>

                {/* Preview of image being removed */}
                {challengeData.image_url && (
                  <div className="flex justify-center">
                    <div className="relative w-[200px] aspect-[4/3]">
                      <Image
                        src={challengeData.image_url}
                        alt="Image to be removed"
                        fill
                        className="rounded-lg border-2 border-red-500/50 opacity-75 object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Error display */}
                {removeImageError && (
                  <div className="p-3 bg-red-900/30 border border-red-500 rounded-lg">
                    <p className="text-sm text-red-400">{removeImageError}</p>
                  </div>
                )}
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <button
              onClick={() => {
                setRemoveImageDialogOpen(false);
                setRemoveImageError(null);
              }}
              disabled={isRemovingImage}
              className="px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRemoveImage}
              disabled={isRemovingImage}
              className="px-4 py-2 rounded-lg bg-red-500 text-white font-bold border-2 border-red-700 shadow-hard-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRemovingImage ? (
                <>
                  <NeoLoader variant="dots" size="sm" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Remove Image
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
