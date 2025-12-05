/**
 * Boggle Solver
 * Finds all valid words on a Boggle grid using DFS traversal and dictionary lookup
 *
 * Performance optimizations:
 * - Trie-based prefix pruning for exponentially faster search
 * - Per-language trie caching to avoid rebuilding
 * - Grid-based result caching to avoid re-solving same boards
 */

const { isDictionaryWordOnly, normalizeWord, dictionary } = require('../dictionary');
const { normalizeHebrewLetter } = require('./wordValidator');
const logger = require('../utils/logger');

// Direction vectors for 8-way adjacent movement
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],  // up-left, up, up-right
  [0, -1],           [0, 1],   // left, right
  [1, -1],  [1, 0],  [1, 1]    // down-left, down, down-right
];

// ============================================================================
// TRIE CACHING FOR CPU OPTIMIZATION
// Building a trie from ~275k words is expensive (~100ms), so we cache per language
// ============================================================================
const trieCache = new Map(); // language -> { trie, timestamp }
const TRIE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes - dictionaries rarely change

/**
 * Get or build a cached trie for a language
 * @param {string} language - Language code
 * @returns {object|null} - Trie root or null if dictionary not available
 */
function getCachedTrie(language) {
  const cached = trieCache.get(language);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < TRIE_CACHE_TTL) {
    return cached.trie;
  }

  // Get the dictionary set for this language
  let wordSet;
  switch (language) {
    case 'en':
      wordSet = dictionary.englishWords;
      break;
    case 'he':
      wordSet = dictionary.hebrewWords;
      break;
    case 'sv':
      wordSet = dictionary.swedishWords;
      break;
    case 'ja':
      wordSet = dictionary.japaneseWords;
      break;
    default:
      wordSet = dictionary.englishWords;
  }

  if (!wordSet || wordSet.size === 0) {
    logger.warn('SOLVER', `No dictionary available for language: ${language}`);
    return null;
  }

  // Build trie
  const startTime = Date.now();
  const trie = buildTrie(wordSet);
  const buildTime = Date.now() - startTime;

  logger.debug('SOLVER', `Built trie for ${language} with ${wordSet.size} words in ${buildTime}ms`);

  trieCache.set(language, { trie, timestamp: now });
  return trie;
}

// ============================================================================
// GRID RESULT CACHING
// Same grid + language = same words, so cache the results
// ============================================================================
const gridCache = new Map(); // gridKey -> { words, timestamp }
const GRID_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_GRID_CACHE_SIZE = 50; // Limit cache entries to prevent memory bloat

/**
 * Generate a cache key from a grid
 */
function getGridCacheKey(grid, language) {
  const gridStr = grid.map(row => row.join('')).join('|');
  return `${language}:${gridStr}`;
}

/**
 * Clean up expired grid cache entries
 */
function cleanupGridCache() {
  const now = Date.now();
  let deleted = 0;

  for (const [key, entry] of gridCache.entries()) {
    if (now - entry.timestamp > GRID_CACHE_TTL) {
      gridCache.delete(key);
      deleted++;
    }
  }

  // If still too many, remove oldest entries
  if (gridCache.size > MAX_GRID_CACHE_SIZE) {
    const entries = Array.from(gridCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, gridCache.size - MAX_GRID_CACHE_SIZE);
    for (const [key] of toRemove) {
      gridCache.delete(key);
      deleted++;
    }
  }

  if (deleted > 0) {
    logger.debug('SOLVER', `Cleaned up ${deleted} expired grid cache entries`);
  }
}

/**
 * Build a trie from a Set of words for efficient prefix lookup
 * @param {Set} wordSet - Set of valid words
 * @returns {object} - Trie root node
 */
function buildTrie(wordSet) {
  const root = {};

  for (const word of wordSet) {
    let node = root;
    for (const char of word) {
      if (!node[char]) {
        node[char] = {};
      }
      node = node[char];
    }
    node.isWord = true;
  }

  return root;
}

/**
 * Check if a prefix exists in the trie
 * @param {object} trie - Trie root node
 * @param {string} prefix - Prefix to check
 * @returns {object|null} - Node at prefix end or null if not found
 */
function getTrieNode(trie, prefix) {
  let node = trie;
  for (const char of prefix) {
    if (!node[char]) return null;
    node = node[char];
  }
  return node;
}

/**
 * Find all valid words on a Boggle grid
 * @param {string[][]} grid - 2D grid of letters
 * @param {string} language - Language code ('en', 'he', 'sv', 'ja')
 * @param {object} options - Options { minLength, maxLength, maxWords, trie }
 * @returns {string[]} - Array of found words sorted by length (longest first)
 */
function findAllWords(grid, language, options = {}) {
  const {
    minLength = 3,
    maxLength = 15,
    maxWords = 500, // Limit to prevent memory issues
    trie = null // Can pass pre-built trie for efficiency
  } = options;

  if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) {
    return [];
  }

  const rows = grid.length;
  const cols = grid[0].length;
  const foundWords = new Set();

  // Normalize grid letters
  const normalizedGrid = grid.map(row =>
    row.map(cell => {
      const letter = String(cell).toLowerCase();
      return language === 'he' ? normalizeHebrewLetter(letter) : letter;
    })
  );

  /**
   * DFS to find words starting from a cell
   */
  function dfs(row, col, currentWord, visited, trieNode) {
    // Stop if we've found enough words
    if (foundWords.size >= maxWords) return;

    // Stop if word is too long
    if (currentWord.length > maxLength) return;

    // Check if current word is valid
    if (currentWord.length >= minLength) {
      if (trieNode) {
        // Using trie - check if this is a complete word
        if (trieNode.isWord) {
          foundWords.add(currentWord);
        }
      } else {
        // Using dictionary lookup (static dictionary only for bot word finding)
        if (isDictionaryWordOnly(currentWord, language)) {
          foundWords.add(currentWord);
        }
      }
    }

    // Continue exploring neighbors
    for (const [dx, dy] of DIRECTIONS) {
      const newRow = row + dx;
      const newCol = col + dy;

      // Check bounds
      if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) continue;

      // Check if already visited in this path
      const key = `${newRow},${newCol}`;
      if (visited.has(key)) continue;

      const nextChar = normalizedGrid[newRow][newCol];
      const nextWord = currentWord + nextChar;

      // If using trie, check if prefix exists (prune early)
      if (trieNode) {
        const nextNode = trieNode[nextChar];
        if (!nextNode) continue; // No words with this prefix

        visited.add(key);
        dfs(newRow, newCol, nextWord, visited, nextNode);
        visited.delete(key);
      } else {
        // Without trie, we must explore all paths
        visited.add(key);
        dfs(newRow, newCol, nextWord, visited, null);
        visited.delete(key);
      }
    }
  }

  // Start DFS from each cell
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (foundWords.size >= maxWords) break;

      const startChar = normalizedGrid[row][col];
      const visited = new Set([`${row},${col}`]);

      if (trie) {
        const startNode = trie[startChar];
        if (startNode) {
          dfs(row, col, startChar, visited, startNode);
        }
      } else {
        dfs(row, col, startChar, visited, null);
      }
    }
  }

  // Sort by length (longest first), then alphabetically
  return Array.from(foundWords).sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    return a.localeCompare(b);
  });
}

/**
 * Find words with scoring potential for bots
 * Returns words categorized by difficulty
 *
 * OPTIMIZED: Uses cached trie for O(prefix) pruning instead of O(8^n) exhaustive search
 * OPTIMIZED: Caches results per grid to avoid re-solving identical boards
 *
 * @param {string[][]} grid - 2D grid of letters
 * @param {string} language - Language code
 * @param {object} options - Options for word finding
 * @returns {object} - { easy: [], medium: [], hard: [] }
 */
function findWordsForBots(grid, language, options = {}) {
  const minLength = options.minLength || 3;
  const maxLength = options.maxLength || 10;

  // Check grid cache first - same grid = same words
  const cacheKey = getGridCacheKey(grid, language);
  const cached = gridCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < GRID_CACHE_TTL) {
    logger.debug('SOLVER', `Cache hit for grid (${language}), reusing ${cached.allWords.length} words`);
    // Filter cached words by current options and return categorized
    return categorizeWords(cached.allWords, minLength, maxLength);
  }

  // Get cached trie for this language - CRITICAL for CPU optimization
  const trie = getCachedTrie(language);

  const startTime = Date.now();
  const allWords = findAllWords(grid, language, {
    minLength: 3, // Always find from 3 to cache broadly
    maxLength: 12, // Find longer words for caching
    maxWords: 400,
    trie // Pass trie for exponential speedup via prefix pruning
  });
  const solveTime = Date.now() - startTime;

  logger.debug('SOLVER', `Found ${allWords.length} words for ${language} grid in ${solveTime}ms`);

  // Cache the raw results
  gridCache.set(cacheKey, { allWords, timestamp: now });

  // Periodically cleanup old cache entries
  if (Math.random() < 0.1) { // 10% chance to cleanup on each call
    cleanupGridCache();
  }

  return categorizeWords(allWords, minLength, maxLength);
}

/**
 * Categorize words by difficulty and filter by length
 * @param {string[]} allWords - All found words
 * @param {number} minLength - Minimum word length
 * @param {number} maxLength - Maximum word length
 * @returns {object} - { easy: [], medium: [], hard: [] }
 */
function categorizeWords(allWords, minLength, maxLength) {
  // Filter by length and solid words (no excessive duplicate letters)
  const filteredWords = allWords.filter(word => {
    if (word.length < minLength || word.length > maxLength) return false;
    const maxDupes = word.length >= 6 ? 3 : 2;
    return isSolidWord(word, maxDupes);
  });

  // Categorize by difficulty based on word length
  const result = {
    easy: [],    // 3-4 letter words
    medium: [],  // 4-5 letter words
    hard: []     // 6+ letter words
  };

  for (const word of filteredWords) {
    const len = word.length;
    if (len <= 4) {
      result.easy.push(word);
    }
    if (len >= 4 && len <= 5) {
      result.medium.push(word);
    }
    if (len >= 5) {
      result.hard.push(word);
    }
  }

  // Shuffle each category to add variety
  result.easy = shuffleArray(result.easy);
  result.medium = shuffleArray(result.medium);
  result.hard = shuffleArray(result.hard);

  return result;
}

/**
 * Shuffle an array (Fisher-Yates)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Check if a word is "solid" - doesn't have too many duplicate letters
 * Words with excessive duplicates (like "aaaa", "mississippi") are often obscure
 * @param {string} word - Word to check
 * @param {number} maxDuplicates - Maximum allowed occurrences of any single letter (default: 2)
 * @returns {boolean} - True if word is solid (acceptable)
 */
function isSolidWord(word, maxDuplicates = 2) {
  if (!word || word.length < 3) return false;

  // Count letter occurrences
  const letterCounts = {};
  for (const char of word.toLowerCase()) {
    letterCounts[char] = (letterCounts[char] || 0) + 1;
    // Quick exit if any letter exceeds max
    if (letterCounts[char] > maxDuplicates) {
      return false;
    }
  }

  return true;
}

/**
 * Get path of a word on the grid (for UI highlighting)
 * @param {string} word - Word to find
 * @param {string[][]} grid - 2D grid
 * @param {string} language - Language code
 * @returns {Array|null} - Array of {row, col} or null if not found
 */
function getWordPath(word, grid, language) {
  if (!word || !grid || grid.length === 0) return null;

  const rows = grid.length;
  const cols = grid[0].length;
  const normalizedWord = normalizeWord(word, language);

  // Normalize grid
  const normalizedGrid = grid.map(row =>
    row.map(cell => {
      const letter = String(cell).toLowerCase();
      return language === 'he' ? normalizeHebrewLetter(letter) : letter;
    })
  );

  function dfs(row, col, index, path, visited) {
    if (index === normalizedWord.length) return path;

    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;

    const key = `${row},${col}`;
    if (visited.has(key)) return null;

    if (normalizedGrid[row][col] !== normalizedWord[index]) return null;

    visited.add(key);
    path.push({ row, col });

    for (const [dx, dy] of DIRECTIONS) {
      const result = dfs(row + dx, col + dy, index + 1, path, visited);
      if (result) return result;
    }

    visited.delete(key);
    path.pop();
    return null;
  }

  // Try starting from each cell
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const path = dfs(row, col, 0, [], new Set());
      if (path) return path;
    }
  }

  return null;
}

/**
 * Clear all solver caches (useful for testing or memory cleanup)
 */
function clearSolverCaches() {
  const trieCount = trieCache.size;
  const gridCount = gridCache.size;

  trieCache.clear();
  gridCache.clear();

  logger.info('SOLVER', `Cleared solver caches: ${trieCount} tries, ${gridCount} grids`);
}

/**
 * Get cache statistics for monitoring
 */
function getSolverCacheStats() {
  return {
    trieCache: {
      size: trieCache.size,
      languages: Array.from(trieCache.keys())
    },
    gridCache: {
      size: gridCache.size,
      maxSize: MAX_GRID_CACHE_SIZE
    }
  };
}

module.exports = {
  findAllWords,
  findWordsForBots,
  getWordPath,
  buildTrie,
  getTrieNode,
  shuffleArray,
  isSolidWord,
  // Cache management
  clearSolverCaches,
  getSolverCacheStats,
  getCachedTrie
};
