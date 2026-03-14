import { useState, useCallback } from 'react';

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
  seedWords: string;
  setSeedWords: (words: string) => void;
  generatedBoard: GeneratedBoard | null;
  isGenerating: boolean;
  generateError: string | null;
  generateBoard: () => Promise<void>;
  shuffleBoard: () => Promise<void>;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  isPublishing: boolean;
  publishError: string | null;
  publishedBoard: PublishedBoard | null;
  publishBoard: () => Promise<void>;
}

export function useBoardCreator(): UseBoardCreatorReturn {
  const [step, setStep] = useState<CreatorStep>('configure');
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [language, setLanguage] = useState<string>('en');
  const [seedWords, setSeedWords] = useState<string>('');
  const [generatedBoard, setGeneratedBoard] = useState<GeneratedBoard | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedBoard, setPublishedBoard] = useState<PublishedBoard | null>(null);

  const runGenerate = useCallback(async (advanceStep: boolean): Promise<void> => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const seeds = seedWords
        .split(',')
        .map(w => w.trim())
        .filter(Boolean);

      const res = await fetch('/api/ugc/boards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gridSize, language, seedWords: seeds }),
      });

      const data = await res.json() as { board?: GeneratedBoard; error?: string };
      if (!res.ok) {
        setGenerateError(data.error ?? 'Generation failed');
        return;
      }

      if (data.board) {
        setGeneratedBoard(data.board);
        if (advanceStep) {
          setStep('preview');
        }
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [gridSize, language, seedWords]);

  const generateBoard = useCallback((): Promise<void> => {
    return runGenerate(true);
  }, [runGenerate]);

  const shuffleBoard = useCallback((): Promise<void> => {
    return runGenerate(false);
  }, [runGenerate]);

  const publishBoard = useCallback(async (): Promise<void> => {
    if (!generatedBoard) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch('/api/ugc/boards/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          language,
          gridSize,
          grid: generatedBoard.grid,
          difficulty: generatedBoard.difficulty,
          seedWordsPlaced: generatedBoard.seedWordsPlaced,
          totalFindableWords: generatedBoard.totalFindableWords,
        }),
      });

      const data = await res.json() as { boardCode?: string; title?: string; error?: string };
      if (!res.ok) {
        setPublishError(data.error ?? 'Publish failed');
        return;
      }

      if (data.boardCode) {
        setPublishedBoard({ boardCode: data.boardCode, title: data.title ?? title });
        setStep('published');
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
  }, [generatedBoard, title, description, language, gridSize]);

  return {
    step,
    setStep,
    gridSize,
    setGridSize,
    language,
    setLanguage,
    seedWords,
    setSeedWords,
    generatedBoard,
    isGenerating,
    generateError,
    generateBoard,
    shuffleBoard,
    title,
    setTitle,
    description,
    setDescription,
    isPublishing,
    publishError,
    publishedBoard,
    publishBoard,
  };
}
