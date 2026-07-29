import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getSession } from '@/lib/supabase';

export type CreatorStep = 'configure' | 'preview' | 'published';
export type GridSize = 4 | 5 | 6;
export type BoardDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface GeneratedBoard {
  grid: string[][];
  totalFindableWords: number;
  difficulty: BoardDifficulty;
  seedWordsPlaced: string[];
}

export interface PublishedBoard {
  boardCode: string;
  title: string;
}

export interface UseBoardCreatorReturn {
  step: CreatorStep;
  setStep: (step: CreatorStep) => void;
  gridSize: GridSize;
  setGridSize: (size: GridSize) => void;
  language: string;
  setLanguage: (lang: string) => void;
  /** @deprecated Use seedTags instead */
  seedWords: string;
  /** @deprecated Use addTag/removeTag instead */
  setSeedWords: (words: string) => void;
  seedTags: string[];
  addTag: (word: string) => void;
  removeTag: (index: number) => void;
  updateTag: (index: number, value: string) => void;
  generatedBoard: GeneratedBoard | null;
  isGenerating: boolean;
  generateError: string | null;
  generateBoard: () => Promise<void>;
  shuffleBoard: () => Promise<void>;
  /** Increments on each new grid to trigger animation resets */
  gridRevision: number;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  isPublishing: boolean;
  publishError: string | null;
  publishedBoard: PublishedBoard | null;
  publishBoard: () => Promise<void>;
  coverImage: File | null;
  coverImagePreview: string | null;
  setCoverImage: (file: File | null) => void;
  isUploadingImage: boolean;
  imageUploadError: string | null;
}

const DEBOUNCE_MS = 600;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function useBoardCreator(): UseBoardCreatorReturn {
  const [step, setStep] = useState<CreatorStep>('configure');
  const [gridSize, setGridSize] = useState<GridSize>(6);
  const [language, setLanguage] = useState<string>('en');
  const [seedTags, setSeedTags] = useState<string[]>([]);
  const [generatedBoard, setGeneratedBoard] = useState<GeneratedBoard | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [gridRevision, setGridRevision] = useState(0);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedBoard, setPublishedBoard] = useState<PublishedBoard | null>(null);
  const [coverImage, setCoverImageState] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Backward-compat: comma-separated string from tags
  const seedWords = seedTags.join(', ');
  const setSeedWords = useCallback((raw: string) => {
    setSeedTags(raw.split(',').map(w => w.trim()).filter(Boolean));
  }, []);

  const addTag = useCallback((word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;
    setSeedTags(prev => [...prev, trimmed]);
  }, []);

  const removeTag = useCallback((index: number) => {
    setSeedTags(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateTag = useCallback((index: number, value: string) => {
    const trimmed = value.trim();
    setSeedTags(prev => {
      if (!trimmed) return prev.filter((_, i) => i !== index);
      const next = [...prev];
      next[index] = trimmed;
      return next;
    });
  }, []);

  // Cover image management
  const setCoverImage = useCallback((file: File | null) => {
    setImageUploadError(null);

    if (coverImagePreview) {
      URL.revokeObjectURL(coverImagePreview);
      setCoverImagePreview(null);
    }

    if (!file) {
      setCoverImageState(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageUploadError('Only JPEG, PNG, and WebP images are supported');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageUploadError('Image must be under 2MB');
      return;
    }

    setCoverImageState(file);
    setCoverImagePreview(URL.createObjectURL(file));
  }, [coverImagePreview]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
    };
  }, [coverImagePreview]);

  // Core generate function — kept as plain async for abort signal support in debounce
  const runGenerate = useCallback(async (
    seeds: string[],
    size: GridSize,
    lang: string,
    signal?: AbortSignal,
  ): Promise<void> => {
    if (seeds.length === 0) {
      setGeneratedBoard(null);
      return;
    }
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/ugc/boards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gridSize: size, language: lang, seedWords: seeds }),
        signal,
      });

      const data = await res.json() as (GeneratedBoard & { error?: string });
      if (!res.ok) {
        setGenerateError(data.error ?? 'Generation failed');
        return;
      }

      if (data.grid) {
        setGeneratedBoard({
          grid: data.grid,
          totalFindableWords: data.totalFindableWords,
          difficulty: data.difficulty,
          seedWordsPlaced: data.seedWordsPlaced,
        });
        setGridRevision(r => r + 1);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setGenerateError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Auto-generate on tag/gridSize/language changes (debounced)
  useEffect(() => {
    if (step !== 'configure') return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(() => {
      void runGenerate(seedTags, gridSize, language, controller.signal);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [seedTags, gridSize, language, step, runGenerate]);

  const generateBoard = useCallback((): Promise<void> => {
    return runGenerate(seedTags, gridSize, language).then(() => {
      if (seedTags.length > 0) setStep('preview');
    });
  }, [runGenerate, seedTags, gridSize, language]);

  const shuffleBoard = useCallback((): Promise<void> => {
    return runGenerate(seedTags, gridSize, language);
  }, [runGenerate, seedTags, gridSize, language]);

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!generatedBoard) throw new Error('No board to publish');
      const { data: sessionData } = await getSession();
      const accessToken = sessionData?.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      const res = await fetch('/api/ugc/boards/publish', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          description,
          language,
          gridSize,
          grid: generatedBoard.grid,
          difficulty: generatedBoard.difficulty,
          seedWords: generatedBoard.seedWordsPlaced,
          totalFindableWords: generatedBoard.totalFindableWords,
        }),
      });
      const data = await res.json() as { boardCode?: string; title?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Publish failed');
      return data;
    },
    onSuccess: async (data) => {
      if (data.boardCode) {
        // Upload cover image after successful publish
        if (coverImage) {
          setIsUploadingImage(true);
          try {
            const { data: sessionData } = await getSession();
            const accessToken = sessionData?.session?.access_token;
            if (accessToken) {
              const uploadRes = await fetch(`/api/ugc/boards/${data.boardCode}/cover-image`, {
                method: 'POST',
                headers: {
                  'Content-Type': coverImage.type,
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: coverImage,
              });
              if (!uploadRes.ok) {
                const uploadData = await uploadRes.json();
                setImageUploadError(uploadData.error ?? 'Image upload failed');
              }
            }
          } catch {
            setImageUploadError('Image upload failed');
          } finally {
            setIsUploadingImage(false);
          }
        }
        setPublishedBoard({ boardCode: data.boardCode, title: data.title ?? title });
        setStep('published');
      }
    },
    onError: (err: Error) => { setPublishError(err.message); },
  });

  const publishBoard = useCallback(async (): Promise<void> => {
    if (!generatedBoard) return;
    setPublishError(null);
    publishMutation.mutate();
  }, [generatedBoard, publishMutation]);

  return {
    step,
    setStep,
    gridSize,
    setGridSize,
    language,
    setLanguage,
    seedWords,
    setSeedWords,
    seedTags,
    addTag,
    removeTag,
    updateTag,
    generatedBoard,
    isGenerating,
    generateError,
    generateBoard,
    shuffleBoard,
    gridRevision,
    title,
    setTitle,
    description,
    setDescription,
    isPublishing: publishMutation.isPending,
    publishError,
    publishedBoard,
    publishBoard,
    coverImage,
    coverImagePreview,
    setCoverImage,
    isUploadingImage,
    imageUploadError,
  };
}
