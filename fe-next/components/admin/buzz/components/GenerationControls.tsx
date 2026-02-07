'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import type { GenerationResult } from '../hooks/useBuzzGeneration';

const LANGUAGES = [
  { code: 'all', label: 'All Languages' },
  { code: 'en', label: 'English' },
  { code: 'he', label: 'Hebrew' },
  { code: 'sv', label: 'Swedish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'es', label: 'Spanish' },
];

export interface GenerationControlsProps {
  isGenerating: boolean;
  result: GenerationResult | null;
  elapsedTime: number;
  onGenerate: (date: string, language: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

/**
 * Controls for manual Daily Buzz generation.
 * Includes date picker, language selector, and generate button.
 */
export function GenerationControls({
  isGenerating,
  result,
  elapsedTime,
  onGenerate,
  selectedDate,
  onDateChange,
}: GenerationControlsProps): React.ReactElement {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  function handleGenerate(): void {
    onGenerate(selectedDate, selectedLanguage);
  }

  return (
    <>
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
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border-2 border-slate-700 rounded-lg text-white focus:border-neo-cyan focus:outline-none"
          />
        </div>

        {/* Language Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Language
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((lang) => (
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
              <Loader size="sm" className="me-2" />
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
        <GenerationResultDisplay result={result} />
      )}
    </>
  );
}

interface GenerationResultDisplayProps {
  result: GenerationResult;
}

function GenerationResultDisplay({ result }: GenerationResultDisplayProps): React.ReactElement {
  return (
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
  );
}
