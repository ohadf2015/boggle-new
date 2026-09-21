'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { ChevronLeft, ChevronRight, Play, Pause, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTourPlayer } from './useTourPlayer';
import { TourScene1, TourScene2, TourScene3, TourScene4, TourScene5 } from './scenes';

const SCENES = [TourScene1, TourScene2, TourScene3, TourScene4, TourScene5];
const SCENE_DURATIONS = [5000, 5000, 5000, 4000, 0]; // Last scene doesn't auto-advance

export function TeacherTourDialog() {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const {
    currentScene,
    isPaused,
    progress,
    togglePause,
    nextScene,
    previousScene,
    goToScene,
    cleanup,
  } = useTourPlayer(SCENE_DURATIONS, open);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Cleanup when dialog closes
  useEffect(() => {
    if (!open) {
      cleanup();
    }
  }, [open, cleanup]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextScene();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        previousScene();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, togglePause, nextScene, previousScene]);

  const handleDialogChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      cleanup();
    }
  };

  const CurrentScene = SCENES[currentScene - 1];
  const isLastScene = currentScene === 5;

  return (
    <>
      <button
        type="button"
        data-testid="tour-button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-2 rounded-neo border-neo border-neo-black',
          'bg-neo-cyan px-4 py-2 font-neo-display font-black uppercase text-neo-black',
          'shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg',
          'active:translate-y-0.5 active:shadow-hard-pressed text-sm'
        )}
      >
        {t('education.tour.watchButton')}
      </button>

      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent
          ref={dialogRef}
          data-testid="tour-dialog"
          className={cn(
            'bg-neo-navy dark:bg-neo-navy border-3 border-neo-black shadow-hard-lg rounded-neo',
            'max-w-2xl w-full overflow-hidden p-0'
          )}
          hideCloseButton
          noDescription
        >
          {/* Header with close button */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b-3 border-neo-black">
            <h2 className="font-neo-display font-black text-white text-lg">
              {t('education.tour.title')}
            </h2>
            <DialogClose asChild>
              <button
                data-testid="tour-close"
                className="text-neo-white hover:bg-neo-white/10 p-1 rounded transition-colors"
                aria-label={t('common.close')}
              >
                <X className="size-5" />
              </button>
            </DialogClose>
          </div>

          {/* Main scene area */}
          <div className="bg-neo-navy px-5 py-8 min-h-80">
            {CurrentScene && <CurrentScene />}
          </div>

          {/* Progress bar */}
          <div className="px-5 py-3 border-t-3 border-neo-black flex gap-1">
            {SCENE_DURATIONS.map((_, i) => (
              <button
                key={i}
                data-testid={`tour-progress-${i + 1}`}
                onClick={() => goToScene(i + 1)}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-all cursor-pointer',
                  i + 1 <= currentScene ? 'bg-neo-lime' : 'bg-neo-white/30'
                )}
                style={{
                  width: i + 1 === currentScene ? `${progress}%` : '100%',
                }}
                aria-label={`Go to scene ${i + 1}`}
              />
            ))}
          </div>

          {/* Captions and controls */}
          <div className="px-5 py-4 bg-neo-navy border-t-3 border-neo-black">
            <div className="text-center mb-4">
              <p className="text-neo-white/70 text-sm">
                {t(`education.onboarding.steps.${['create', 'share', 'join', 'play', 'results'][currentScene - 1]}.title`)}
              </p>
              <p className="text-neo-white text-sm mt-1">
                {t(`education.onboarding.steps.${['create', 'share', 'join', 'play', 'results'][currentScene - 1]}.text`)}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                data-testid="tour-previous"
                onClick={previousScene}
                disabled={currentScene === 1}
                className={cn(
                  'p-2 rounded border-2 border-neo-black transition-all',
                  currentScene === 1
                    ? 'bg-neo-white/20 text-neo-white/40 cursor-not-allowed'
                    : 'bg-neo-cyan text-neo-black hover:-translate-y-0.5 active:translate-y-0.5'
                )}
                aria-label={t('common.previous')}
              >
                <DirectionalIcon icon={ChevronLeft} className="size-5" />
              </button>

              {!isPaused ? (
                <button
                  data-testid="tour-pause"
                  onClick={togglePause}
                  className={cn(
                    'p-2 px-4 rounded border-2 border-neo-black bg-neo-pink text-neo-black',
                    'hover:-translate-y-0.5 active:translate-y-0.5 transition-all'
                  )}
                  aria-label={t('common.pause')}
                >
                  <Pause className="size-5" />
                </button>
              ) : (
                <button
                  data-testid="tour-play"
                  onClick={togglePause}
                  className={cn(
                    'p-2 px-4 rounded border-2 border-neo-black bg-neo-lime text-neo-black',
                    'hover:-translate-y-0.5 active:translate-y-0.5 transition-all'
                  )}
                  aria-label={t('common.play')}
                >
                  <Play className="size-5" />
                </button>
              )}

              <button
                data-testid="tour-next"
                onClick={nextScene}
                disabled={currentScene === 5}
                className={cn(
                  'p-2 rounded border-2 border-neo-black transition-all',
                  currentScene === 5
                    ? 'bg-neo-white/20 text-neo-white/40 cursor-not-allowed'
                    : 'bg-neo-cyan text-neo-black hover:-translate-y-0.5 active:translate-y-0.5'
                )}
                aria-label={t('common.next')}
              >
                <DirectionalIcon icon={ChevronRight} className="size-5" />
              </button>
            </div>

            {isLastScene && (
              <div className="mt-4 pt-4 border-t-2 border-neo-black/30">
                <Link
                  href={`/${language}/education/access`}
                  data-testid="tour-final-cta"
                  className={cn(
                    'block w-full rounded-neo border-2 border-neo-black bg-neo-lime',
                    'px-4 py-3 text-center font-neo-display font-black uppercase text-neo-black',
                    'shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg',
                    'active:translate-y-0.5 active:shadow-hard-pressed'
                  )}
                >
                  {t('education.landing.teacherCta')}
                </Link>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
