// Offline practice game service
import { SupportedLanguage, DIFFICULTIES, hebrewLetters, englishLetters, swedishLetters, japaneseLetters } from '../../constants/game';
import { DictionaryService } from './DictionaryService';
import { isWordOnBoard, makePositionsMap, PositionsMap } from '../../lib/gameLogic/wordValidator';
import { calculateWordScore, getComboMultiplier } from '../../lib/gameLogic/scoringEngine';

// Letter frequency weights for better gameplay
const ENGLISH_LETTER_WEIGHTS: Record<string, number> = {
  E: 12, T: 9, A: 8, O: 8, I: 7, N: 7, S: 6, H: 6, R: 6,
  D: 4, L: 4, C: 3, U: 3, M: 3, W: 2, F: 2, G: 2, Y: 2,
  P: 2, B: 2, V: 1, K: 1, J: 1, X: 1, Q: 1, Z: 1,
};

const HEBREW_LETTER_WEIGHTS: Record<string, number> = {
  'י': 10, 'ו': 9, 'ה': 8, 'א': 7, 'ל': 6, 'ר': 6, 'ת': 5, 'מ': 5,
  'נ': 5, 'ש': 5, 'ב': 4, 'ע': 4, 'ד': 4, 'ק': 3, 'כ': 3, 'פ': 3,
  'ח': 3, 'ס': 2, 'ג': 2, 'ט': 2, 'צ': 2, 'ז': 1,
};

interface OfflineGameState {
  letterGrid: string[][];
  positionsMap: PositionsMap;
  foundWords: string[];
  score: number;
  comboLevel: number;
  lastWordTime: number;
  startTime: number;
  timerSeconds: number;
  remainingTime: number;
  language: SupportedLanguage;
  difficulty: keyof typeof DIFFICULTIES;
  isActive: boolean;
}

interface WordResult {
  word: string;
  isValid: boolean;
  isOnBoard: boolean;
  isDuplicate: boolean;
  score: number;
  comboLevel: number;
}

class OfflineGameServiceClass {
  private gameState: OfflineGameState | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private onTimeUpdate: ((remaining: number) => void) | null = null;
  private onGameEnd: (() => void) | null = null;

  // Generate a random letter grid
  generateGrid(
    rows: number,
    cols: number,
    language: SupportedLanguage
  ): string[][] {
    const letters = this.getLettersForLanguage(language);
    const weights = this.getWeightsForLanguage(language);
    const grid: string[][] = [];

    // Create weighted letter pool
    const pool: string[] = [];
    for (const letter of letters) {
      const weight = weights[letter] || 1;
      for (let i = 0; i < weight; i++) {
        pool.push(letter);
      }
    }

    // Generate grid
    for (let i = 0; i < rows; i++) {
      const row: string[] = [];
      for (let j = 0; j < cols; j++) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        row.push(pool[randomIndex]);
      }
      grid.push(row);
    }

    return grid;
  }

  private getLettersForLanguage(language: SupportedLanguage): string[] {
    switch (language) {
      case 'he':
        return hebrewLetters;
      case 'sv':
        return swedishLetters;
      case 'ja':
        return japaneseLetters;
      default:
        return englishLetters;
    }
  }

  private getWeightsForLanguage(language: SupportedLanguage): Record<string, number> {
    switch (language) {
      case 'he':
        return HEBREW_LETTER_WEIGHTS;
      case 'en':
        return ENGLISH_LETTER_WEIGHTS;
      default:
        // Default equal weights
        return {};
    }
  }

  // Start a new offline practice game
  async startGame(
    language: SupportedLanguage,
    difficulty: keyof typeof DIFFICULTIES,
    timerSeconds: number,
    onTimeUpdate?: (remaining: number) => void,
    onGameEnd?: () => void
  ): Promise<OfflineGameState | null> {
    // Ensure dictionary is loaded
    const isLoaded = await DictionaryService.loadDictionary(language);
    if (!isLoaded) {
      const isDownloaded = await DictionaryService.isDictionaryDownloaded(language);
      if (!isDownloaded) {
        console.error('[OfflineGame] Dictionary not downloaded:', language);
        return null;
      }
      await DictionaryService.loadDictionary(language);
    }

    // Generate grid
    const { rows, cols } = DIFFICULTIES[difficulty];
    const letterGrid = this.generateGrid(rows, cols, language);
    const positionsMap = makePositionsMap(letterGrid);

    // Create game state
    this.gameState = {
      letterGrid,
      positionsMap,
      foundWords: [],
      score: 0,
      comboLevel: 0,
      lastWordTime: Date.now(),
      startTime: Date.now(),
      timerSeconds,
      remainingTime: timerSeconds,
      language,
      difficulty,
      isActive: true,
    };

    // Set up callbacks
    this.onTimeUpdate = onTimeUpdate || null;
    this.onGameEnd = onGameEnd || null;

    // Start timer
    this.startTimer();

    return this.gameState;
  }

  // Submit a word
  submitWord(word: string): WordResult {
    if (!this.gameState || !this.gameState.isActive) {
      return {
        word,
        isValid: false,
        isOnBoard: false,
        isDuplicate: false,
        score: 0,
        comboLevel: 0,
      };
    }

    const normalizedWord = word.toLowerCase().trim();

    // Check for duplicate
    if (this.gameState.foundWords.includes(normalizedWord)) {
      return {
        word: normalizedWord,
        isValid: false,
        isOnBoard: true,
        isDuplicate: true,
        score: 0,
        comboLevel: this.gameState.comboLevel,
      };
    }

    // Check if word is on board
    const isOnBoard = isWordOnBoard(
      normalizedWord,
      this.gameState.letterGrid,
      this.gameState.positionsMap
    );

    if (!isOnBoard) {
      this.gameState.comboLevel = 0;
      return {
        word: normalizedWord,
        isValid: false,
        isOnBoard: false,
        isDuplicate: false,
        score: 0,
        comboLevel: 0,
      };
    }

    // Check if word is in dictionary
    const isValid = DictionaryService.isValidWord(normalizedWord, this.gameState.language);

    if (!isValid) {
      this.gameState.comboLevel = 0;
      return {
        word: normalizedWord,
        isValid: false,
        isOnBoard: true,
        isDuplicate: false,
        score: 0,
        comboLevel: 0,
      };
    }

    // Word is valid! Calculate score and update state
    const now = Date.now();
    const timeSinceLastWord = now - this.gameState.lastWordTime;

    // Update combo
    if (timeSinceLastWord < 3000) {
      this.gameState.comboLevel = Math.min(this.gameState.comboLevel + 1, 10);
    } else {
      this.gameState.comboLevel = 1;
    }

    const score = calculateWordScore(normalizedWord, this.gameState.comboLevel);
    this.gameState.score += score;
    this.gameState.foundWords.push(normalizedWord);
    this.gameState.lastWordTime = now;

    return {
      word: normalizedWord,
      isValid: true,
      isOnBoard: true,
      isDuplicate: false,
      score,
      comboLevel: this.gameState.comboLevel,
    };
  }

  // Get current game state
  getGameState(): OfflineGameState | null {
    return this.gameState;
  }

  // End the current game
  endGame(): OfflineGameState | null {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.gameState) {
      this.gameState.isActive = false;
    }

    return this.gameState;
  }

  // Private: Start the game timer
  private startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      if (!this.gameState || !this.gameState.isActive) {
        this.endGame();
        return;
      }

      this.gameState.remainingTime--;
      this.onTimeUpdate?.(this.gameState.remainingTime);

      if (this.gameState.remainingTime <= 0) {
        this.endGame();
        this.onGameEnd?.();
      }
    }, 1000);
  }

  // Get statistics for the current game
  getGameStats(): {
    totalScore: number;
    wordCount: number;
    longestWord: string;
    averageWordLength: number;
    maxCombo: number;
  } | null {
    if (!this.gameState) return null;

    const words = this.gameState.foundWords;
    const longestWord = words.reduce((a, b) => (a.length > b.length ? a : b), '');
    const totalLength = words.reduce((sum, w) => sum + w.length, 0);

    return {
      totalScore: this.gameState.score,
      wordCount: words.length,
      longestWord: longestWord || '-',
      averageWordLength: words.length > 0 ? totalLength / words.length : 0,
      maxCombo: this.gameState.comboLevel,
    };
  }
}

export const OfflineGameService = new OfflineGameServiceClass();
