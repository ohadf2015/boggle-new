import React from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { X, Wand2, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { MIN_WORD_LENGTH, MAX_WORD_LENGTH, type ValidationStatus } from './customPuzzleValidation';

interface PuzzleWordEditorProps {
  inputWord: string;
  validationStatus: ValidationStatus;
  isCreating: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreatePuzzle: () => void;
  onClose: () => void;
}

/**
 * Word input + validation UI for custom puzzle creation.
 * Renders the enter-word phase of CustomPuzzleCreator.
 */
const PuzzleWordEditor: React.FC<PuzzleWordEditorProps> = ({
  inputWord,
  validationStatus,
  isCreating,
  inputRef,
  onInputChange,
  onCreatePuzzle,
  onClose,
}) => {
  const { t } = useLanguage();

  const getValidationMessage = (): string | null => {
    switch (validationStatus) {
      case 'valid':
        return t('customPuzzle.wordValid');
      case 'invalid':
        return t('customPuzzle.invalidCharacters');
      case 'too-short':
        return t('customPuzzle.wordTooShort');
      case 'too-long':
        return t('customPuzzle.wordTooLong');
      default:
        return null;
    }
  };

  const getValidationStyles = (): { text: string; bg: string; border: string } => {
    switch (validationStatus) {
      case 'valid':
        return { text: 'text-neo-lime', bg: 'bg-neo-lime/20', border: 'border-neo-lime' };
      case 'invalid':
      case 'too-short':
      case 'too-long':
        return { text: 'text-neo-pink', bg: 'bg-neo-pink/20', border: 'border-neo-pink' };
      default:
        return { text: 'text-neo-white', bg: 'bg-neo-navy/50', border: 'border-neo-cream/30' };
    }
  };

  const validationStyles = getValidationStyles();

  return (
    <AdaptiveMotion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: 20 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard-lg max-w-md w-full overflow-hidden"
    >
      {/* Header with gradient */}
      <div className="bg-linear-to-r from-neo-pink to-neo-orange border-b-4 border-neo-black px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AdaptiveMotion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="w-10 h-10 bg-neo-cream border-3 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
            >
              <Wand2 className="w-5 h-5 text-neo-pink" />
            </AdaptiveMotion.div>
            <h2 className="text-xl font-black text-neo-white ltr:drop-shadow-[2px_2px_0px_black] rtl:drop-shadow-[-2px_2px_0px_black]">
              {t('customPuzzle.createTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 bg-neo-cream border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm hover:bg-neo-lime transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4 text-neo-black" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Instructions */}
        <p className="text-neo-black/80 text-center font-medium">
          {t('customPuzzle.enterWord')}
        </p>

        {/* Word Input */}
        <div className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputWord}
              onChange={onInputChange}
              placeholder={t('customPuzzle.enterWordPlaceholder')}
              aria-label={t('customPuzzle.enterWord')}
              className={cn(
                "w-full px-4 py-4 text-2xl font-black text-center uppercase tracking-widest",
                "bg-neo-white border-4 border-neo-black rounded-neo shadow-hard-sm",
                "focus:outline-hidden focus:shadow-hard focus:-translate-y-0.5 transition-all",
                "placeholder:text-neo-black/30 placeholder:lowercase placeholder:font-normal placeholder:tracking-normal placeholder:text-base",
                validationStatus === 'valid' && "border-neo-lime bg-neo-lime/10",
                (validationStatus === 'invalid' || validationStatus === 'too-short' || validationStatus === 'too-long') && "border-neo-pink bg-neo-pink/10 animate-shake"
              )}
              maxLength={MAX_WORD_LENGTH + 2}
              disabled={isCreating}
            />

            {/* Validation icon */}
            <AdaptiveMotion.div
              className="absolute right-4 top-1/2 -translate-y-1/2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              key={validationStatus}
            >
              {validationStatus === 'valid' && (
                <AdaptiveMotion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="w-8 h-8 bg-neo-lime border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                >
                  <Check className="w-5 h-5 text-neo-black" strokeWidth={3} />
                </AdaptiveMotion.div>
              )}
              {(validationStatus === 'invalid' || validationStatus === 'too-short' || validationStatus === 'too-long') && (
                <AdaptiveMotion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-8 h-8 bg-neo-pink border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                >
                  <AlertCircle className="w-5 h-5 text-neo-white" strokeWidth={3} />
                </AdaptiveMotion.div>
              )}
            </AdaptiveMotion.div>
          </div>

          {/* Validation message */}
          <AdaptiveAnimatePresence mode="wait">
            {getValidationMessage() && (
              <AdaptiveMotion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className={cn(
                  "text-sm text-center font-bold py-2 px-3 rounded-neo border-2",
                  validationStyles.text,
                  validationStyles.bg,
                  validationStyles.border
                )}
              >
                {getValidationMessage()}
              </AdaptiveMotion.div>
            )}
          </AdaptiveAnimatePresence>

          {/* Character count indicator */}
          <div className="flex justify-center gap-1">
            {Array.from({ length: MAX_WORD_LENGTH }).map((_, i) => (
              <AdaptiveMotion.div
                key={`char-${i}`}
                initial={{ scale: 0 }}
                animate={{
                  scale: 1,
                  backgroundColor: i < inputWord.length
                    ? (validationStatus === 'valid' ? '#A3E635' : validationStatus === 'idle' ? '#FFE135' : '#FF1493')
                    : i < MIN_WORD_LENGTH ? '#374151' : '#6B7280'
                }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  "w-3 h-3 rounded-full border-2 border-neo-black",
                  i < MIN_WORD_LENGTH && i >= inputWord.length && "opacity-50"
                )}
              />
            ))}
          </div>
        </div>

        {/* Create Button */}
        <AdaptiveMotion.div
          whileHover={validationStatus === 'valid' && !isCreating ? { scale: 1.02 } : {}}
          whileTap={validationStatus === 'valid' && !isCreating ? { scale: 0.98 } : {}}
        >
          <Button
            onClick={onCreatePuzzle}
            disabled={validationStatus !== 'valid' || isCreating}
            className={cn(
              "w-full py-4 text-xl font-black uppercase border-4 rounded-neo transition-all",
              validationStatus === 'valid' && !isCreating
                ? "bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed"
                : "bg-neo-black/20 text-neo-black/40 border-neo-black/30 cursor-not-allowed shadow-none"
            )}
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader size="md" />
                {t('customPuzzle.generating')}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6" />
                {t('customPuzzle.createPuzzle')}
              </span>
            )}
          </Button>
        </AdaptiveMotion.div>

        {/* Hint text */}
        <p className="text-xs text-center text-neo-black/50">
          {t('customPuzzle.createDescription')}
        </p>
      </div>
    </AdaptiveMotion.div>
  );
};

export default PuzzleWordEditor;
