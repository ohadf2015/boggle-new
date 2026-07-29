/**
 * Source-contract test: boost application MUST happen before final-scores
 * broadcast (BLT-SEC-1, blast MP audit 2026-04-28; pairs with audit
 * SRV-M1 — historical regression where boosts were only applied inside
 * recordGameResultsToSupabase, leaking unboosted totals to the client).
 *
 * This test locks the call-site wiring at gameScores.ts. The boost helper
 * itself is exercised by gameResults.boosts.test.ts; here we only assert
 * the integration point can't drift.
 *
 * Source-contract pattern (regex over readFileSync) avoids spinning the
 * full game-end pipeline (10+ mocks: scoreManager, supabase, socket, etc.)
 * and survives refactors that preserve the contract.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../gameScores.ts'),
  'utf8',
);

describe('gameScores — boost-apply call-site contract', () => {
  it('imports applyBoostsToScores from gameResults', () => {
    expect(source).toMatch(
      /import\s+\{[^}]*applyBoostsToScores[^}]*\}\s+from\s+['"]\.\/gameResults['"]/,
    );
  });

  it('invokes applyBoostsToScores when game has at least one player boost', () => {
    expect(source).toMatch(/if\s*\(\s*game\.playerBoosts\s*&&\s*Object\.keys\(game\.playerBoosts\)\.length\s*>\s*0\s*\)/);
    expect(source).toMatch(/applyBoostsToScores\s*\(/);
  });

  it('passes a real game-start timestamp (gameStartedAt → startTime → createdAt fallback)', () => {
    // scoreMultiplier fails closed if gameStartTs is 0; this fallback chain
    // protects against schema drift while preserving the safe-default.
    expect(source).toMatch(
      /gameStartTs\s*=\s*game\.gameStartedAt\s*\?\?\s*game\.startTime\s*\?\?\s*game\.createdAt\s*\?\?\s*0/,
    );
  });

  // Anchor on the actual broadcastToRoom call signature: 'EVENT', resultsPayload
  // — avoids matching stray comment mentions of the event name (line 124).
  const validatedScoresCallIdx = source.search(/'validatedScores',\s*resultsPayload/);
  const validationCompleteCallIdx = source.search(/'validationComplete',\s*resultsPayload/);
  // Match the actual function-call invocation, not the import line at the top.
  const applyCallIdx = source.search(/const\s+boosted\s*=\s*applyBoostsToScores\s*\(/);

  it('applies boosts BEFORE the validatedScores broadcast', () => {
    expect(applyCallIdx).toBeGreaterThan(-1);
    expect(validatedScoresCallIdx).toBeGreaterThan(-1);
    expect(applyCallIdx).toBeLessThan(validatedScoresCallIdx);
  });

  it('applies boosts BEFORE the validationComplete broadcast', () => {
    expect(applyCallIdx).toBeGreaterThan(-1);
    expect(validationCompleteCallIdx).toBeGreaterThan(-1);
    expect(applyCallIdx).toBeLessThan(validationCompleteCallIdx);
  });

  it('replaces finalScores in-place with the boosted result (no shadow array)', () => {
    // finalScores.length = 0; finalScores.push(...boosted) — preserves the
    // outer array reference so downstream readers (Supabase persist, sort,
    // game.playerScores write-back) see the boosted totals.
    expect(source).toMatch(/finalScores\.length\s*=\s*0/);
    expect(source).toMatch(/finalScores\.push\([\s\S]*?boosted/);
  });
});
