'use client';

import Image from 'next/image';
import { RefreshCw, Trash2, ImageOff } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import type { DailyBuzzDataAdmin } from '../types';

export interface ImageManagementProps {
  challengeData: DailyBuzzDataAdmin;
  isRegeneratingImage: boolean;
  regenerateImageError: string | null;
  onRegenerateImage: () => void;
  isRemovingImage: boolean;
  removeImageError: string | null;
  onRemoveImage: () => void;
  removeDialogOpen: boolean;
  onRemoveDialogChange: (open: boolean) => void;
  onClearRemoveError: () => void;
}

/**
 * Image management section for Daily Buzz challenges.
 * Handles display, regeneration, and removal of hero images.
 */
export function ImageManagement({
  challengeData,
  isRegeneratingImage,
  regenerateImageError,
  onRegenerateImage,
  isRemovingImage,
  removeImageError,
  onRemoveImage,
  removeDialogOpen,
  onRemoveDialogChange,
  onClearRemoveError,
}: ImageManagementProps): React.ReactElement {
  function handleOpenRemoveDialog(): void {
    onClearRemoveError();
    onRemoveDialogChange(true);
  }

  function handleCloseRemoveDialog(): void {
    onRemoveDialogChange(false);
    onClearRemoveError();
  }

  return (
    <>
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-400">Hero Image</span>
          <div className="flex items-center gap-2">
            {/* Regenerate Image Button */}
            <button
              onClick={onRegenerateImage}
              disabled={isRegeneratingImage}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-neo-cyan/50 text-neo-cyan hover:bg-neo-cyan/10 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Regenerate image"
            >
              {isRegeneratingImage ? (
                <>
                  <Loader size="sm" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </>
              )}
            </button>
            {/* Remove Image Button */}
            {challengeData.image_url && (
              <button
                onClick={handleOpenRemoveDialog}
                disabled={isRegeneratingImage}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors disabled:opacity-50"
                title="Remove image"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            )}
          </div>
        </div>
        {/* Regenerate image error */}
        {regenerateImageError && (
          <div className="p-2 mb-2 bg-red-900/30 border border-red-500 rounded-lg">
            <p className="text-xs text-red-400">{regenerateImageError}</p>
          </div>
        )}
        {challengeData.image_url ? (
          <div className="space-y-2">
            <div className="relative w-full max-w-sm aspect-[4/3]">
              {/* key forces re-render when URL changes, unoptimized bypasses Next.js cache */}
              <Image
                key={challengeData.image_url}
                src={challengeData.image_url}
                alt={challengeData.trending_summary || 'Daily Buzz Hero'}
                fill
                unoptimized
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

      {/* Remove Image Confirmation Dialog */}
      <RemoveImageDialog
        open={removeDialogOpen}
        onOpenChange={handleCloseRemoveDialog}
        challengeData={challengeData}
        isRemovingImage={isRemovingImage}
        removeImageError={removeImageError}
        onRemoveImage={onRemoveImage}
      />
    </>
  );
}

interface RemoveImageDialogProps {
  open: boolean;
  onOpenChange: () => void;
  challengeData: DailyBuzzDataAdmin;
  isRemovingImage: boolean;
  removeImageError: string | null;
  onRemoveImage: () => void;
}

function RemoveImageDialog({
  open,
  onOpenChange,
  challengeData,
  isRemovingImage,
  removeImageError,
  onRemoveImage,
}: RemoveImageDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" noDescription>
        <DialogHeader customBg="bg-red-900/50 border-b border-red-500/30">
          <DialogTitle className="flex items-center justify-center gap-2 text-red-400">
            <Trash2 className="w-5 h-5" />
            Remove Image
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
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
        </DialogBody>
        <DialogFooter>
          <button
            onClick={onOpenChange}
            disabled={isRemovingImage}
            className="px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onRemoveImage}
            disabled={isRemovingImage}
            className="px-4 py-2 rounded-lg bg-red-500 text-white font-bold border-2 border-red-700 shadow-hard-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRemovingImage ? (
              <>
                <Loader size="sm" />
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
  );
}
