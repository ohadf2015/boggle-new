'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoardCreator } from '@/hooks/useBoardCreator';
import { BoardPreviewGrid } from './BoardPreviewGrid';

// ── Shared helpers ──────────────────────────────────────────────────────────

function NeoButton({
  children,
  onClick,
  className,
  disabled,
  'data-testid': testId,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  'data-testid'?: string;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'border-neo border-black shadow-hard font-neo-display font-bold',
        'px-4 py-2 rounded-neo transition-transform active:translate-y-0.5 active:shadow-hard-pressed',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

// ── Step 1: Configure ───────────────────────────────────────────────────────

function ConfigureStep() {
  const { t } = useLanguage();
  const {
    gridSize, setGridSize,
    seedWords, setSeedWords,
    generatedBoard,
    isGenerating,
    generateError,
    generateBoard,
    shuffleBoard,
  } = useBoardCreator();

  const handleGenerate = useCallback(() => { void generateBoard(); }, [generateBoard]);
  const handleShuffle = useCallback(() => { void shuffleBoard(); }, [shuffleBoard]);

  const SIZES = [4, 5, 6] as const;

  return (
    <div data-testid="step-configure" className="flex flex-col gap-6">
      <h1 className="font-neo-display text-2xl font-bold text-neo-white">
        {t('ugc.createBoard')}
      </h1>

      {/* Grid size picker */}
      <div className="flex flex-col gap-2">
        <label className="font-neo-body text-sm text-neo-white/80">
          {t('ugc.board.gridSize')}
        </label>
        <div className="flex gap-2">
          {SIZES.map(size => (
            <button
              key={size}
              data-testid={`grid-size-${size}`}
              onClick={() => setGridSize(size)}
              className={cn(
                'border-neo border-black shadow-hard-sm font-neo-display font-bold',
                'px-4 py-2 rounded-neo transition-all',
                gridSize === size
                  ? 'bg-neo-lime text-black'
                  : 'bg-neo-navy text-neo-white hover:bg-neo-navy/80'
              )}
            >
              {size}x{size}
            </button>
          ))}
        </div>
      </div>

      {/* Seed words */}
      <div className="flex flex-col gap-2">
        <label className="font-neo-body text-sm text-neo-white/80">
          {t('ugc.board.seedWords')}
        </label>
        <textarea
          data-testid="seed-words-input"
          value={seedWords}
          onChange={e => setSeedWords(e.target.value)}
          placeholder={t('ugc.board.seedWordsHint')}
          rows={2}
          className={cn(
            'border-neo border-black bg-neo-navy text-neo-white',
            'font-neo-body text-sm rounded-neo px-3 py-2 resize-none',
            'placeholder:text-neo-white/40 focus:outline-none focus:ring-2 focus:ring-neo-cyan'
          )}
        />
      </div>

      {/* Error */}
      {generateError && (
        <p data-testid="generate-error" className="text-neo-red font-neo-body text-sm">
          {generateError}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <NeoButton
          data-testid="generate-btn"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-neo-lime text-black"
        >
          {isGenerating ? '...' : t('ugc.board.generate')}
        </NeoButton>

        {generatedBoard && (
          <NeoButton
            data-testid="shuffle-btn"
            onClick={handleShuffle}
            disabled={isGenerating}
            className="bg-neo-orange text-black"
          >
            {t('ugc.board.shuffle')}
          </NeoButton>
        )}
      </div>
    </div>
  );
}

// ── Step 2: Preview ─────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-neo-lime text-black',
  MEDIUM: 'bg-neo-orange text-black',
  HARD: 'bg-neo-red text-white',
};

function wordCountColor(count: number): string {
  if (count >= 15) return 'text-neo-lime';
  if (count >= 5) return 'text-neo-orange';
  return 'text-neo-red';
}

function PreviewStep() {
  const { t } = useLanguage();
  const {
    generatedBoard,
    title, setTitle,
    description, setDescription,
    isPublishing,
    publishError,
    publishBoard,
    setStep,
  } = useBoardCreator();

  const handlePublish = useCallback(() => { void publishBoard(); }, [publishBoard]);
  const handleBack = useCallback(() => { setStep('configure'); }, [setStep]);

  if (!generatedBoard) return null;

  return (
    <div data-testid="step-preview" className="flex flex-col gap-6">
      <h2 className="font-neo-display text-2xl font-bold text-neo-white">
        {t('ugc.board.tryIt')}
      </h2>

      {/* Grid preview */}
      <div className="flex justify-center">
        <BoardPreviewGrid grid={generatedBoard.grid} size="md" />
      </div>

      {/* Stats HUD */}
      <div className="border-neo border-black bg-neo-navy/80 rounded-neo p-4 flex gap-6 flex-wrap shadow-hard">
        <div data-testid="word-count-stat" className="flex flex-col">
          <span className="font-neo-body text-xs text-neo-white/60">
            {t('ugc.board.wordsFound').replace('{{count}}', String(generatedBoard.totalFindableWords))}
          </span>
          <span className={cn('font-neo-display text-xl font-bold', wordCountColor(generatedBoard.totalFindableWords))}>
            {generatedBoard.totalFindableWords}
          </span>
        </div>

        <div className="flex flex-col justify-center">
          <span
            data-testid="difficulty-badge"
            className={cn(
              'border-neo border-black rounded-neo px-2 py-1 text-xs font-neo-display font-bold',
              DIFFICULTY_COLORS[generatedBoard.difficulty] ?? 'bg-neo-navy text-white'
            )}
          >
            {t(`ugc.board.${generatedBoard.difficulty.toLowerCase()}`)}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-2">
        <label className="font-neo-body text-sm text-neo-white/80">
          {t('ugc.board.title')}
        </label>
        <input
          data-testid="title-input"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={t('ugc.board.titlePlaceholder')}
          maxLength={40}
          className={cn(
            'border-neo border-black bg-neo-navy text-neo-white',
            'font-neo-body text-sm rounded-neo px-3 py-2',
            'placeholder:text-neo-white/40 focus:outline-none focus:ring-2 focus:ring-neo-cyan'
          )}
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <label className="font-neo-body text-sm text-neo-white/80">
          {t('ugc.board.description')}
        </label>
        <textarea
          data-testid="description-input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t('ugc.board.descriptionPlaceholder')}
          maxLength={140}
          rows={2}
          className={cn(
            'border-neo border-black bg-neo-navy text-neo-white',
            'font-neo-body text-sm rounded-neo px-3 py-2 resize-none',
            'placeholder:text-neo-white/40 focus:outline-none focus:ring-2 focus:ring-neo-cyan'
          )}
        />
      </div>

      {/* Publish error */}
      {publishError && (
        <p data-testid="publish-error" className="text-neo-red font-neo-body text-sm">
          {publishError}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <NeoButton data-testid="back-btn" onClick={handleBack} className="bg-neo-navy text-white">
          {t('common.back') || 'Back'}
        </NeoButton>
        <NeoButton
          data-testid="publish-btn"
          onClick={handlePublish}
          disabled={isPublishing}
          className="bg-neo-lime text-black"
        >
          {isPublishing ? '...' : t('ugc.board.publish')}
        </NeoButton>
      </div>
    </div>
  );
}

// ── Step 3: Published ───────────────────────────────────────────────────────

function PublishedStep() {
  const { t } = useLanguage();
  const { publishedBoard, setStep } = useBoardCreator();

  const handleMakeAnother = useCallback(() => { setStep('configure'); }, [setStep]);

  const handleCopy = useCallback(async () => {
    if (!publishedBoard) return;
    try {
      await navigator.clipboard.writeText(publishedBoard.boardCode);
    } catch {
      // ignore
    }
  }, [publishedBoard]);

  const handleShare = useCallback(() => {
    if (!publishedBoard || typeof navigator === 'undefined') return;
    const url = `${window.location.origin}/en/custom/${publishedBoard.boardCode}`;
    const text = t('ugc.board.shareMessage');
    if (navigator.share) {
      void navigator.share({ text, url }).catch(() => undefined);
    }
  }, [publishedBoard, t]);

  if (!publishedBoard) return null;

  return (
    <div data-testid="step-published" className="flex flex-col items-center gap-6 text-center">
      <h2 className="font-neo-display text-2xl font-bold text-neo-lime">
        {publishedBoard.title}
      </h2>

      {/* Board code */}
      <div className="border-neo border-black bg-neo-navy shadow-hard rounded-neo p-6">
        <p className="font-neo-body text-sm text-neo-white/60 mb-2">
          {t('ugc.board.code')}
        </p>
        <p
          data-testid="board-code"
          className="font-neo-display text-3xl font-bold text-neo-yellow tracking-widest"
        >
          {publishedBoard.boardCode}
        </p>
      </div>

      {/* Share buttons */}
      <div data-testid="share-buttons" className="flex gap-3 flex-wrap justify-center">
        <NeoButton onClick={handleCopy} className="bg-neo-cyan text-black">
          Copy Code
        </NeoButton>
        <NeoButton onClick={handleShare} className="bg-neo-orange text-black">
          Share
        </NeoButton>
      </div>

      {/* Make another */}
      <NeoButton
        data-testid="make-another-btn"
        onClick={handleMakeAnother}
        className="bg-neo-navy text-white"
      >
        {t('ugc.board.makeAnother')}
      </NeoButton>
    </div>
  );
}

// ── Root wizard ─────────────────────────────────────────────────────────────

/**
 * BoardCreatorWizard — 3-step wizard for creating and publishing custom boards.
 * Steps: configure → preview → published
 */
export function BoardCreatorWizard() {
  const { step } = useBoardCreator();

  return (
    <div className="min-h-screen bg-neo-navy p-4 md:p-8">
      <div className="max-w-lg mx-auto border-neo border-black bg-neo-navy shadow-hard rounded-neo p-6">
        {step === 'configure' && <ConfigureStep />}
        {step === 'preview' && <PreviewStep />}
        {step === 'published' && <PublishedStep />}
      </div>
    </div>
  );
}
