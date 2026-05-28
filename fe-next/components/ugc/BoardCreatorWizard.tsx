'use client';

import { useCallback, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoardCreator, type UseBoardCreatorReturn } from '@/hooks/useBoardCreator';
import { AnimatedBoardGrid } from './AnimatedBoardGrid';
import { SeedWordTags } from './SeedWordTags';

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

// ── Step 1: Configure (Live Grid) ───────────────────────────────────────────

function ConfigureStep({ creator }: { creator: UseBoardCreatorReturn }) {
  const { t } = useLanguage();
  const router = useRouter();
  const {
    gridSize,
    seedTags, addTag, removeTag, updateTag,
    generatedBoard,
    isGenerating,
    generateError,
    gridRevision,
    setStep,
  } = creator;

  const canProceed = generatedBoard !== null && seedTags.length > 0;

  return (
    <div data-testid="step-configure" className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          data-testid="back-to-community"
          onClick={() => router.back()}
          className={cn(
            'border-neo border-black bg-neo-navy text-neo-white shadow-hard-sm',
            'rounded-neo p-2 transition-transform active:translate-y-0.5 active:shadow-hard-pressed',
            'hover:bg-neo-white/10'
          )}
          aria-label={t('common.back') || 'Back'}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-neo-display text-2xl font-bold text-neo-white">
          {t('ugc.createBoard')}
        </h1>
      </div>

      {/* Seed words tag input */}
      <SeedWordTags
        tags={seedTags}
        onAdd={addTag}
        onRemove={removeTag}
        onUpdate={updateTag}
        disabled={isGenerating}
      />

      {/* Live animated grid */}
      <div className="flex flex-col items-center gap-3">
        <AnimatedBoardGrid
          grid={generatedBoard?.grid ?? null}
          gridSize={gridSize}
          revision={gridRevision}
          isGenerating={isGenerating}
        />

        {/* Stats HUD — appears when grid is generated */}
        <AnimatePresence>
          {generatedBoard && (
            <m.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex items-center gap-3 flex-wrap justify-center"
            >
              <span className={cn(
                'font-neo-display text-sm font-bold px-2 py-1 rounded-neo border-2 border-black shadow-hard-sm',
                generatedBoard.totalFindableWords >= 15 ? 'bg-neo-lime text-black'
                  : generatedBoard.totalFindableWords >= 5 ? 'bg-neo-orange text-black'
                  : 'bg-neo-red text-white'
              )}>
                {generatedBoard.totalFindableWords} {t('ugc.board.words') || 'words'}
              </span>
              <span className={cn(
                'font-neo-display text-xs font-bold px-2 py-1 rounded-neo border-2 border-black shadow-hard-sm',
                generatedBoard.difficulty === 'EASY' ? 'bg-neo-lime text-black'
                  : generatedBoard.difficulty === 'MEDIUM' ? 'bg-neo-orange text-black'
                  : 'bg-neo-red text-white'
              )}>
                {t(`ugc.board.${generatedBoard.difficulty.toLowerCase()}`)}
              </span>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      <AnimatePresence>
        {generateError && (
          <m.p
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            data-testid="generate-error"
            className="text-neo-red font-neo-body text-sm"
          >
            {generateError}
          </m.p>
        )}
      </AnimatePresence>

      {/* Proceed to preview */}
      <NeoButton
        data-testid="proceed-btn"
        onClick={() => setStep('preview')}
        disabled={!canProceed}
        className="bg-neo-lime text-black"
      >
        {t('ugc.board.preview') || 'Preview & Publish'}
      </NeoButton>
    </div>
  );
}

// ── Step 2: Preview ─────────────────────────────────────────────────────────

function PreviewStep({ creator }: { creator: UseBoardCreatorReturn }) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    generatedBoard,
    gridSize,
    gridRevision,
    title, setTitle,
    description, setDescription,
    isPublishing,
    publishError,
    publishBoard,
    shuffleBoard,
    isGenerating,
    setStep,
    coverImagePreview,
    setCoverImage,
    isUploadingImage,
    imageUploadError,
  } = creator;

  const handlePublish = useCallback(() => { void publishBoard(); }, [publishBoard]);
  const handleShuffle = useCallback(() => { void shuffleBoard(); }, [shuffleBoard]);
  const handleBack = useCallback(() => { setStep('configure'); }, [setStep]);

  if (!generatedBoard) return null;

  return (
    <div data-testid="step-preview" className="flex flex-col gap-6">
      <h2 className="font-neo-display text-2xl font-bold text-neo-white">
        {t('ugc.board.tryIt')}
      </h2>

      {/* Grid preview with shuffle */}
      <div className="flex flex-col items-center gap-3">
        <AnimatedBoardGrid
          grid={generatedBoard.grid}
          gridSize={gridSize}
          revision={gridRevision}
          isGenerating={isGenerating}
        />
        <NeoButton
          data-testid="shuffle-btn"
          onClick={handleShuffle}
          disabled={isGenerating}
          className="bg-neo-orange text-black text-sm"
        >
          {t('ugc.board.shuffle')}
        </NeoButton>
      </div>

      {/* Stats HUD */}
      <div className="border-neo border-black bg-neo-navy/80 rounded-neo p-4 flex gap-6 flex-wrap shadow-hard">
        <div data-testid="word-count-stat" className="flex flex-col">
          <span className="font-neo-body text-xs text-neo-white">
            {t('ugc.board.wordsFound', { count: generatedBoard.totalFindableWords })}
          </span>
          <span className={cn(
            'font-neo-display text-xl font-bold',
            generatedBoard.totalFindableWords >= 15 ? 'text-neo-lime'
              : generatedBoard.totalFindableWords >= 5 ? 'text-neo-orange'
              : 'text-neo-red'
          )}>
            {generatedBoard.totalFindableWords}
          </span>
        </div>
        <div className="flex flex-col justify-center">
          <span
            data-testid="difficulty-badge"
            className={cn(
              'border-neo border-black rounded-neo px-2 py-1 text-xs font-neo-display font-bold',
              generatedBoard.difficulty === 'EASY' ? 'bg-neo-lime text-black'
                : generatedBoard.difficulty === 'MEDIUM' ? 'bg-neo-orange text-black'
                : 'bg-neo-red text-white'
            )}
          >
            {t(`ugc.board.${generatedBoard.difficulty.toLowerCase()}`)}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-2">
        <label className="font-neo-body text-sm text-neo-white">
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
            'border-neo border-neo-white/20 bg-black/30 text-neo-white',
            'font-neo-body text-sm rounded-neo px-3 py-2',
            'placeholder:text-neo-white focus:outline-hidden focus:border-neo-cyan',
            'focus:shadow-[0_0_0_1px_--theme(--color-neo-cyan/40)] transition-colors'
          )}
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <label className="font-neo-body text-sm text-neo-white">
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
            'border-neo border-neo-white/20 bg-black/30 text-neo-white',
            'font-neo-body text-sm rounded-neo px-3 py-2 resize-none',
            'placeholder:text-neo-white focus:outline-hidden focus:border-neo-cyan',
            'focus:shadow-[0_0_0_1px_--theme(--color-neo-cyan/40)] transition-colors'
          )}
        />
      </div>

      {/* Cover Image Upload */}
      <div className="flex flex-col gap-2">
        <label className="font-neo-body text-sm text-neo-white">
          {t('ugc.board.coverImage')}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          data-testid="cover-image-input"
          onChange={e => {
            const file = e.target.files?.[0] ?? null;
            setCoverImage(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
        {coverImagePreview ? (
          <div className="relative">
            <Image
              src={coverImagePreview}
              alt={t('ugc.board.coverImageAlt')}
              data-testid="cover-image-preview"
              width={600}
              height={160}
              unoptimized
              className="w-full h-40 object-cover rounded-neo border-neo border-black"
            />
            <button
              data-testid="remove-cover-image"
              onClick={() => setCoverImage(null)}
              className="absolute top-2 inset-e-2 bg-black/70 text-white rounded-full p-1 hover:bg-black transition-colors"
              aria-label={t('ugc.board.removeCoverImage')}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            data-testid="add-cover-image"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'w-full h-32 border-2 border-dashed border-neo-white/30 rounded-neo',
              'flex flex-col items-center justify-center gap-2',
              'text-neo-white hover:text-neo-white hover:border-neo-white/50',
              'transition-colors cursor-pointer'
            )}
          >
            <ImagePlus size={24} />
            <span className="font-neo-body text-xs">{t('ugc.board.addCoverImage')}</span>
          </button>
        )}
        {imageUploadError && (
          <p data-testid="image-upload-error" className="text-neo-red font-neo-body text-xs">
            {imageUploadError}
          </p>
        )}
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
          disabled={isPublishing || isUploadingImage}
          className="bg-neo-lime text-black"
        >
          {isPublishing || isUploadingImage ? '...' : t('ugc.board.publish')}
        </NeoButton>
      </div>
    </div>
  );
}

// ── Step 3: Published ───────────────────────────────────────────────────────

function PublishedStep({ creator }: { creator: UseBoardCreatorReturn }) {
  const { t } = useLanguage();
  const { publishedBoard, setStep } = creator;

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
    <m.div
      data-testid="step-published"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <h2 className="font-neo-display text-2xl font-bold text-neo-lime">
        {publishedBoard.title}
      </h2>

      {/* Board code */}
      <div className="border-neo border-black bg-neo-navy shadow-hard rounded-neo p-6">
        <p className="font-neo-body text-sm text-neo-white mb-2">
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
          {t('ugc.board.copyCode') || 'Copy Code'}
        </NeoButton>
        <NeoButton onClick={handleShare} className="bg-neo-orange text-black">
          {t('ugc.board.share') || 'Share'}
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
    </m.div>
  );
}

// ── Root wizard ─────────────────────────────────────────────────────────────

/**
 * BoardCreatorWizard — 3-step wizard for creating and publishing custom boards.
 * Steps: configure (live grid) → preview → published
 */
export function BoardCreatorWizard() {
  const { language: appLanguage } = useLanguage();
  const creator = useBoardCreator();

  // Sync board language with app locale
  useEffect(() => {
    creator.setLanguage(appLanguage);
  }, [appLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-lg mx-auto border-neo border-black bg-black/20 shadow-hard rounded-neo p-6">
        <AnimatePresence mode="wait">
          {creator.step === 'configure' && (
            <m.div key="configure" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              <ConfigureStep creator={creator} />
            </m.div>
          )}
          {creator.step === 'preview' && (
            <m.div key="preview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              <PreviewStep creator={creator} />
            </m.div>
          )}
          {creator.step === 'published' && (
            <m.div key="published" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              <PublishedStep creator={creator} />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
