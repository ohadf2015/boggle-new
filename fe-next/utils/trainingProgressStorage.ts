/**
 * Training Progress Storage
 *
 * Tracks player skill development during training mode to:
 * 1. Gate demanding modes (multiplayer, daily) until basic skills demonstrated
 * 2. Provide real-time hints for skill gaps
 * 3. Show post-game analysis with improvement areas
 * 4. Track long-term improvement across sessions
 */

import {
  getJsonFromLocalStorage,
  saveJsonToLocalStorage,
  removeFromLocalStorage,
} from '@/utils/storageHelpers';

const STORAGE_KEY = 'lexiclash_training_progress';

/**
 * Skills the player needs to demonstrate proficiency in
 */
export interface TrainingSkills {
  // Direction mastery - can the player drag in all directions?
  hasDraggedHorizontal: boolean;
  hasDraggedVertical: boolean;
  hasDraggedDiagonal: boolean;

  // Advanced: can they change direction mid-word? This is the KEY skill
  hasCombinedDirections: boolean;
  directionChangesCount: number;

  // Grid coverage - do they explore the whole board?
  cornersVisited: string[]; // ['tl', 'tr', 'bl', 'br']
  centerVisited: boolean;

  // Word finding proficiency
  longestWordFound: number;
  totalWordsFound: number;
  wordLengthSum: number; // For calculating average
}

/**
 * Overall training progress
 */
export interface TrainingProgress {
  skills: TrainingSkills;

  // Session tracking
  trainingGamesCompleted: number;
  lastTrainingDate: string | null;

  // Has the player demonstrated enough skills to "pass" training?
  hasPassedTraining: boolean;

  // Track when they first passed (for analytics)
  firstPassedDate: string | null;
}

const DEFAULT_SKILLS: TrainingSkills = {
  hasDraggedHorizontal: false,
  hasDraggedVertical: false,
  hasDraggedDiagonal: false,
  hasCombinedDirections: false,
  directionChangesCount: 0,
  cornersVisited: [],
  centerVisited: false,
  longestWordFound: 0,
  totalWordsFound: 0,
  wordLengthSum: 0,
};

const DEFAULT_PROGRESS: TrainingProgress = {
  skills: { ...DEFAULT_SKILLS },
  trainingGamesCompleted: 0,
  lastTrainingDate: null,
  hasPassedTraining: false,
  firstPassedDate: null,
};

/**
 * Get training progress from localStorage
 */
export function getTrainingProgress(): TrainingProgress {
  const stored = getJsonFromLocalStorage<Partial<TrainingProgress>>(STORAGE_KEY, {});
  // Merge with defaults to handle schema evolution
  return {
    ...DEFAULT_PROGRESS,
    ...stored,
    skills: {
      ...DEFAULT_SKILLS,
      ...(stored.skills || {}),
    },
  };
}

/**
 * Save training progress to localStorage
 */
function saveTrainingProgress(progress: TrainingProgress): void {
  saveJsonToLocalStorage(STORAGE_KEY, progress);
}

/**
 * Calculate pass criteria
 * Player passes training when they demonstrate:
 * - At least 1 diagonal drag
 * - At least 1 direction change mid-word
 * - Found at least 3 words
 * - Visited at least 2 corners
 */
export function checkPassCriteria(skills: TrainingSkills): boolean {
  const hasDiagonal = skills.hasDraggedDiagonal;
  const hasDirectionChange = skills.hasCombinedDirections;
  const hasEnoughWords = skills.totalWordsFound >= 3;
  const hasExploredCorners = skills.cornersVisited.length >= 2;

  return hasDiagonal && hasDirectionChange && hasEnoughWords && hasExploredCorners;
}

/**
 * Update skills based on a word path
 * Called by useTrainingAnalysis when player submits a word
 */
export function updateSkillsFromPath(
  path: Array<{ row: number; col: number }>,
  gridSize: { rows: number; cols: number }
): void {
  if (path.length < 2) return;

  const progress = getTrainingProgress();
  const skills = progress.skills;

  // Analyze directions used in this path
  let hasHorizontal = false;
  let hasVertical = false;
  let hasDiagonal = false;
  let directionChanges = 0;
  let lastDirection: string | null = null;

  for (let i = 1; i < path.length; i++) {
    const dr = path[i].row - path[i - 1].row;
    const dc = path[i].col - path[i - 1].col;

    // Determine direction type
    let currentDirection: string;
    if (dr === 0 && dc !== 0) {
      hasHorizontal = true;
      currentDirection = 'horizontal';
    } else if (dc === 0 && dr !== 0) {
      hasVertical = true;
      currentDirection = 'vertical';
    } else {
      hasDiagonal = true;
      currentDirection = `diagonal-${dr > 0 ? 'd' : 'u'}${dc > 0 ? 'r' : 'l'}`;
    }

    // Count direction changes
    if (lastDirection && lastDirection !== currentDirection) {
      directionChanges++;
    }
    lastDirection = currentDirection;
  }

  // Update direction skills
  if (hasHorizontal) skills.hasDraggedHorizontal = true;
  if (hasVertical) skills.hasDraggedVertical = true;
  if (hasDiagonal) skills.hasDraggedDiagonal = true;
  if (directionChanges > 0) {
    skills.hasCombinedDirections = true;
    skills.directionChangesCount += directionChanges;
  }

  // Update grid coverage
  for (const cell of path) {
    // Check corners (within 1 cell of corner)
    const isTopLeft = cell.row <= 1 && cell.col <= 1;
    const isTopRight = cell.row <= 1 && cell.col >= gridSize.cols - 2;
    const isBottomLeft = cell.row >= gridSize.rows - 2 && cell.col <= 1;
    const isBottomRight = cell.row >= gridSize.rows - 2 && cell.col >= gridSize.cols - 2;

    if (isTopLeft && !skills.cornersVisited.includes('tl')) {
      skills.cornersVisited.push('tl');
    }
    if (isTopRight && !skills.cornersVisited.includes('tr')) {
      skills.cornersVisited.push('tr');
    }
    if (isBottomLeft && !skills.cornersVisited.includes('bl')) {
      skills.cornersVisited.push('bl');
    }
    if (isBottomRight && !skills.cornersVisited.includes('br')) {
      skills.cornersVisited.push('br');
    }

    // Check center (middle 2x2 area)
    const centerRow = Math.floor(gridSize.rows / 2);
    const centerCol = Math.floor(gridSize.cols / 2);
    if (
      Math.abs(cell.row - centerRow) <= 1 &&
      Math.abs(cell.col - centerCol) <= 1
    ) {
      skills.centerVisited = true;
    }
  }

  saveTrainingProgress(progress);
}

/**
 * Update skills when a valid word is found
 */
export function updateSkillsFromWord(wordLength: number): void {
  const progress = getTrainingProgress();
  const skills = progress.skills;

  skills.totalWordsFound++;
  skills.wordLengthSum += wordLength;
  if (wordLength > skills.longestWordFound) {
    skills.longestWordFound = wordLength;
  }

  // Check if player now passes training
  if (!progress.hasPassedTraining && checkPassCriteria(skills)) {
    progress.hasPassedTraining = true;
    progress.firstPassedDate = new Date().toISOString();
  }

  saveTrainingProgress(progress);
}

/**
 * Mark a training game as completed
 */
export function completeTrainingGame(): void {
  const progress = getTrainingProgress();
  progress.trainingGamesCompleted++;
  progress.lastTrainingDate = new Date().toISOString();

  // Final pass check
  if (!progress.hasPassedTraining && checkPassCriteria(progress.skills)) {
    progress.hasPassedTraining = true;
    progress.firstPassedDate = new Date().toISOString();
  }

  saveTrainingProgress(progress);
}

/**
 * Get current skill gaps (skills not yet demonstrated)
 * Used for real-time hints
 */
export function getSkillGaps(): string[] {
  const skills = getTrainingProgress().skills;
  const gaps: string[] = [];

  if (!skills.hasDraggedDiagonal) {
    gaps.push('diagonal');
  }
  if (!skills.hasCombinedDirections) {
    gaps.push('directionChange');
  }
  if (skills.cornersVisited.length < 2) {
    gaps.push('corners');
  }
  if (skills.longestWordFound < 5) {
    gaps.push('longWords');
  }

  return gaps;
}

/**
 * Get a summary of skills for post-game analysis
 */
export function getSkillSummary(): {
  mastered: string[];
  needsWork: string[];
  stats: {
    wordsFound: number;
    longestWord: number;
    averageWordLength: number;
    directionChanges: number;
    cornersExplored: number;
  };
} {
  const skills = getTrainingProgress().skills;
  const mastered: string[] = [];
  const needsWork: string[] = [];

  // Check each skill
  if (skills.hasDraggedDiagonal) {
    mastered.push('diagonal');
  } else {
    needsWork.push('diagonal');
  }

  if (skills.hasCombinedDirections) {
    mastered.push('directionChange');
  } else {
    needsWork.push('directionChange');
  }

  if (skills.cornersVisited.length >= 2) {
    mastered.push('gridCoverage');
  } else {
    needsWork.push('gridCoverage');
  }

  if (skills.longestWordFound >= 5) {
    mastered.push('longWords');
  } else {
    needsWork.push('longWords');
  }

  return {
    mastered,
    needsWork,
    stats: {
      wordsFound: skills.totalWordsFound,
      longestWord: skills.longestWordFound,
      averageWordLength: skills.totalWordsFound > 0
        ? Math.round((skills.wordLengthSum / skills.totalWordsFound) * 10) / 10
        : 0,
      directionChanges: skills.directionChangesCount,
      cornersExplored: skills.cornersVisited.length,
    },
  };
}

/**
 * Reset training progress (for testing or "restart tutorial")
 */
export function resetTrainingProgress(): void {
  removeFromLocalStorage(STORAGE_KEY);
}

/**
 * Reset session skills (start fresh for a new training game)
 * Preserves overall progress but resets per-game tracking
 */
export function resetSessionSkills(): void {
  const progress = getTrainingProgress();
  // Keep aggregated stats but could reset per-session counters if needed
  // For now, we accumulate across sessions for long-term tracking
  saveTrainingProgress(progress);
}

// ============================================
// Daily Challenge Progress Tracking
// ============================================

const DAILY_CHALLENGE_STORAGE_KEY = 'lexiclash_daily_challenge_progress';

interface DailyChallengeProgress {
  challengesCompleted: number;
  lastCompletedDate: string | null;
}

const DEFAULT_DAILY_PROGRESS: DailyChallengeProgress = {
  challengesCompleted: 0,
  lastCompletedDate: null,
};

/**
 * Get the number of daily challenges the player has completed
 */
export function getDailyChallengesCompleted(): number {
  const progress = getJsonFromLocalStorage<DailyChallengeProgress>(
    DAILY_CHALLENGE_STORAGE_KEY,
    DEFAULT_DAILY_PROGRESS
  );
  return progress.challengesCompleted || 0;
}

/**
 * Check if player is a "new player" (completed fewer than threshold challenges)
 */
export function isNewDailyPlayer(threshold: number = 3): boolean {
  return getDailyChallengesCompleted() < threshold;
}

/**
 * Increment the daily challenges completed counter
 * Called after a player finishes a daily challenge (win or lose)
 */
export function incrementDailyChallengesCompleted(): void {
  const stored = getJsonFromLocalStorage<Partial<DailyChallengeProgress>>(
    DAILY_CHALLENGE_STORAGE_KEY,
    {}
  );
  const progress: DailyChallengeProgress = {
    ...DEFAULT_DAILY_PROGRESS,
    ...stored,
  };

  progress.challengesCompleted++;
  progress.lastCompletedDate = new Date().toISOString();

  saveJsonToLocalStorage(DAILY_CHALLENGE_STORAGE_KEY, progress);
}
