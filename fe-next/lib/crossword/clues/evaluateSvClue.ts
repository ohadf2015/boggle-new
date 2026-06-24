/**
 * Swedish/Spanish crossword clue quality evaluator.
 * Scores clues 0..1 based on whether they read like real published crosswords
 * vs dictionary definitions. Used to audit and improve clue banks.
 *
 * Scoring rubric:
 * - 0.9–1.0: Clever, indirect, published-style (e.g., "Gul frukt från varma länder" for "banan")
 * - 0.7–0.9: Clear, correct, but slightly formulaic or on-the-nose
 * - 0.4–0.7: Dictionary-adjacent, some echo or generic phrasing
 * - 0.0–0.4: Contains answer, uses boring definition patterns, or has errors
 */

import { isCircularClue } from './clueText';

interface ClueEvaluation {
  score: number;
  reason: string;
}

/**
 * Penalizes dictionary-like patterns that echo the answer or use generic definitions.
 * Examples of anti-patterns:
 *   - "Frukt som är gul" (contains "frukt", echoes meaning)
 *   - "Gul frukt som växer i tropiska länder" (too long, pedantic)
 *   - "Una fruta que es amarilla" (generic Spanish pattern)
 */
function scoreDefinitionPattern(clue: string, answer: string): number {
  const ansLower = answer.toLowerCase();
  const clueLower = clue.toLowerCase();
  let penalty = 0;

  // Penalize clues that start with generic patterns — strong penalty
  const genericStarts = [
    /^un\s+/i,          // "Un fruto..." (Spanish)
    /^una\s+/i,         // "Una fruta..." (Spanish)
    /^el\s+/i,          // "El..." (Spanish)
    /^la\s+/i,          // "La..." (Spanish)
    /^los\s+/i,         // "Los..." (Spanish)
    /^las\s+/i,         // "Las..." (Spanish)
    /^en\s+/,           // "En frukt..." (Swedish)
    /^ett\s+/,          // "Ett exempel..." (Swedish)
    /^den\s+/,          // "Den frukt..." (Swedish)
    /^det\s+/,          // "Det som..." (Swedish)
    /^något\s+som\s+/,  // "Något som..." (Swedish)
    /^något\s+man\s+/,  // "Något man..." (Swedish)
  ];

  if (genericStarts.some((p) => p.test(clueLower))) {
    penalty += 0.3;
  }

  // Penalize starting with "är" or "es" — very dictionary-like
  if (clueLower.startsWith('är ') || clueLower.startsWith('es ')) {
    penalty += 0.35;
  }

  // Penalize excessive length (more than 50 chars is dictionary-like)
  if (clue.length > 50) {
    penalty += Math.min(0.25, (clue.length - 50) / 80);
  }

  // Penalize presence of " är " or " es " in middle — often signals dictionary definition
  if (clueLower.includes(' är ') || clueLower.includes(' es ')) {
    penalty += 0.25;
  }

  // Penalize weak action words that feel like definitions (Swedish + Spanish)
  const weakWords = [
    'significa', 'llamado', 'llamada', 'definición', 'antónimo', 'opuesto',
    'insecto', 'animal', 'objeto', 'cosa', 'instrumento', 'prenda',
    'recipiente', 'mueble', 'embarcación', 'planta', 'árbol', 'ave', 'pez',
    'reptil', 'vehículo', 'dispositivo', 'estructura', 'ceremonia',
    'espectáculo', 'condimento', 'bebida', 'comida', 'grano', 'fruto', 'flor',
    'sentimiento', 'concepto', 'emoción', 'proteína', 'material', 'elevación',
    'vía pública', 'donde', 'que vive', 'de la',
  ];
  if (weakWords.some((w) => clueLower.includes(w.toLowerCase()))) {
    penalty += 0.35;
  }

  return Math.min(0.6, penalty);
}

/**
 * Check for circular clues (answer embedded in or derivable from clue).
 */
function scoreCircularity(clue: string, answer: string): number {
  if (isCircularClue(clue, answer)) {
    return 0.5; // Fatal flaw, but not 0 (can be salvaged)
  }
  return 0;
}

/**
 * Reward clever indirection and interesting phrasing.
 * Examples: "Gul frukt från varma länder", "Danskar dricker det", "Ligger i Atlanten"
 */
function scoreCleverIndirection(clue: string, answer: string): number {
  const clueLower = clue.toLowerCase();
  let bonus = 0;

  // Reward location/geography clues — strongest bonus
  if (/från|i\s|under|på|mellan|norr|söder|väst|öst|del\s|de\s|desde|entre|en\s|a\s/.test(clueLower)) {
    bonus += 0.15;
  }

  // Reward culture/usage clues
  if (/dricker|äter|spelar|använder|älskar|hatar|räds|bebe|come|juega|usa|ama|odia/.test(clueLower)) {
    bonus += 0.12;
  }

  // Reward color/quality clues (indirect attributes)
  if (/gul|röd|blå|grön|vit|svart|stor|liten|varm|kall|mjuk|hard|snabb|långsam|caliente|amarillo|rojo|azul|verde|blanco|negro|grande|pequeño/.test(clueLower)) {
    bonus += 0.1;
  }

  // Reward metaphor/wordplay hints
  if (/liksom|typ|sort av|slags|sorts|tipo|como|tipo de/.test(clueLower)) {
    bonus += 0.08;
  }

  return Math.min(0.3, bonus);
}

/**
 * Check Swedish/Spanish-specific quality: correct accents (å, ä, ö), no typos.
 */
function scoreSwedishQuality(clue: string): number {
  let penalty = 0;

  // Strong penalty for obvious typos (repeated spaces, trailing spaces in segments)
  if (/\s{2,}/.test(clue) || /\s,$/.test(clue)) {
    penalty += 0.4;
  }

  return Math.min(0.4, penalty);
}

/**
 * Score clarity and brevity — shorter, punchier clues are often better.
 * But not too short (< 10 chars is cryptic, not crossword-y).
 */
function scoreLength(clue: string): number {
  const len = clue.length;

  // Optimal zone: 15-40 characters
  if (len >= 15 && len <= 40) {
    return 0.15; // Nice bonus for "just right"
  }

  // Too short (under 12 chars) loses points
  if (len < 12) {
    return -0.1 * (12 - len) / 12; // Gradually penalize as it shrinks
  }

  // Too long (over 55 chars) loses points
  if (len > 55) {
    return -0.1 * Math.min(1, (len - 55) / 30);
  }

  return 0;
}

/**
 * Main evaluator: given answer and clue, return score (0–1) and reason.
 */
export function evaluateSvClue(answer: string, clue: string): ClueEvaluation {
  // Baseline: 0.5 (neutral)
  let score = 0.5;

  // Subtract penalties
  score -= scoreCircularity(clue, answer);
  score -= scoreDefinitionPattern(clue, answer);
  score -= scoreSwedishQuality(clue);

  // Add bonuses
  score += scoreCleverIndirection(clue, answer);
  score += scoreLength(clue);

  // Clamp to [0, 1]
  score = Math.max(0, Math.min(1, score));

  // Generate reason
  let reason = '';
  if (isCircularClue(clue, answer)) {
    reason = 'Clue contains or echoes the answer';
  } else if (/\s{2,}/.test(clue)) {
    reason = 'Contains typo (multiple spaces)';
  } else if (clue.length > 55) {
    reason = 'Too long (feels like dictionary definition)';
  } else if (/^(är|es)\s+/.test(clue.toLowerCase())) {
    reason = 'Starts with "is" (dictionary definition pattern)';
  } else if (/^(en|ett|den|det|un|una|el|la|los|las)\s+/.test(clue.toLowerCase())) {
    reason = 'Starts with generic article/pronoun pattern';
  } else if (score >= 0.8) {
    reason = 'Clever indirect clue, reads like real published crossword';
  } else if (score >= 0.7) {
    reason = 'Clear clue with correct language, slightly formulaic';
  } else if (score >= 0.5) {
    reason = 'Acceptable but dictionary-adjacent phrasing';
  } else {
    reason = 'Dictionary-like or weak definition';
  }

  return { score: Math.round(score * 100) / 100, reason };
}
