/**
 * AdventureGame — useChapterQuests wiring verification
 * Verifies that useChapterQuests is imported and would be called with correct args.
 * Uses source-level verification since full render requires extensive mocking.
 */
import fs from 'fs';
import path from 'path';

describe('AdventureGame — useChapterQuests wiring', () => {
  const sourceFile = fs.readFileSync(
    path.resolve(__dirname, '../AdventureGame.tsx'),
    'utf-8'
  );
  const questTrackingSource = fs.readFileSync(
    path.resolve(__dirname, '../hooks/useAdventureQuestTracking.ts'),
    'utf-8'
  );
  const callbacksSource = fs.readFileSync(
    path.resolve(__dirname, '../hooks/useAdventureGameCallbacks.ts'),
    'utf-8'
  );
  const allSources = sourceFile + questTrackingSource + callbacksSource;

  it('imports useChapterQuests from hooks', () => {
    expect(sourceFile).toMatch(/import.*useChapterQuests.*from.*hooks\/useChapterQuests/);
  });

  it('imports getChapterNumber from adventure lib', () => {
    expect(sourceFile).toMatch(/import.*getChapterNumber/);
  });

  it('initializes useChapterQuests with worldId and chapterNumber', () => {
    expect(sourceFile).toMatch(/useChapterQuests\s*\(\s*\{/);
    expect(sourceFile).toMatch(/worldId.*levelConfig\.world/);
    expect(sourceFile).toMatch(/chapterNumber/);
  });

  it('calls recordWordsFound when words are found', () => {
    expect(allSources).toMatch(/chapterQuests\.recordWordsFound/);
  });

  it('calls recordLongWord for long words', () => {
    expect(allSources).toMatch(/chapterQuests\.recordLongWord/);
  });

  it('calls recordLevelPerfect when 3 stars earned', () => {
    expect(sourceFile).toMatch(/recordLevelPerfect/);
  });

  it('calls recordBossDefeatedNoHint after boss defeat without hints', () => {
    expect(sourceFile).toMatch(/recordBossDefeatedNoHint/);
  });

  it('calls recordStreakMaster when combo count increases', () => {
    expect(allSources).toMatch(/chapterQuests\.recordStreakMaster/);
  });

  it('calls recordFlashChallengeMaster when flash challenge completes', () => {
    expect(allSources).toMatch(/chapterQuests\.recordFlashChallengeMaster/);
  });

  it('calls recordWorldMechanicUse when boss grid effect triggers', () => {
    expect(allSources).toMatch(/chapterQuests\.recordWorldMechanicUse/);
  });

  it('calls recordScoreChallenge with final score on level complete', () => {
    expect(sourceFile).toMatch(/chapterQuests\.recordScoreChallenge/);
  });

  it('calls recordBossHighHealth when boss defeated with high HP', () => {
    expect(sourceFile).toMatch(/chapterQuests\.recordBossHighHealth/);
  });

  it('calls recordFullComboLevel when full combo achieved', () => {
    expect(sourceFile).toMatch(/chapterQuests\.recordFullComboLevel/);
  });
});
