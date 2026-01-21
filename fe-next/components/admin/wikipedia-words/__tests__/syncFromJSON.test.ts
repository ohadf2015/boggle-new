/**
 * Test: Wikipedia Sync from JSON functionality
 * Tests the SyncResult return type and date range update behavior
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Wikipedia Sync from JSON', () => {
  describe('SyncResult interface', () => {
    test('hook should export SyncResult interface', () => {
      // GIVEN: Hook file
      const hookPath = join(__dirname, '../hooks/useWikipediaCandidates.ts');
      const hookContent = readFileSync(hookPath, 'utf-8');

      // THEN: Should define SyncResult interface
      expect(hookContent).toContain('export interface SyncResult');
      expect(hookContent).toContain('success: boolean');
      expect(hookContent).toContain('wordCount?: number');
      expect(hookContent).toContain('languageBreakdown?: Record<string, number>');
      expect(hookContent).toContain('syncDate?: string');
    });

    test('syncFromJSON should return Promise<SyncResult>', () => {
      // GIVEN: Hook file
      const hookPath = join(__dirname, '../hooks/useWikipediaCandidates.ts');
      const hookContent = readFileSync(hookPath, 'utf-8');

      // THEN: syncFromJSON should return SyncResult
      expect(hookContent).toContain('syncFromJSON: () => Promise<SyncResult>');
    });

    test('hooks index should export SyncResult type', () => {
      // GIVEN: Hooks index file
      const indexPath = join(__dirname, '../hooks/index.ts');
      const indexContent = readFileSync(indexPath, 'utf-8');

      // THEN: Should export SyncResult type
      expect(indexContent).toContain("export type { SyncResult }");
    });
  });

  describe('Response parsing', () => {
    test('should parse API results as Record<string, {synced, error}>', () => {
      // GIVEN: Hook file
      const hookPath = join(__dirname, '../hooks/useWikipediaCandidates.ts');
      const hookContent = readFileSync(hookPath, 'utf-8');

      // THEN: Should have correct parsing logic for Record format
      expect(hookContent).toContain("typeof responseData.results === 'object'");
      expect(hookContent).toContain('Object.entries(responseData.results)');
      expect(hookContent).toContain('syncResult.synced');
    });
  });

  describe('Date range update', () => {
    test('WikipediaWordsPanel should handle sync result and update date range', () => {
      // GIVEN: Panel component file
      const panelPath = join(__dirname, '../WikipediaWordsPanel.tsx');
      const panelContent = readFileSync(panelPath, 'utf-8');

      // THEN: Should have handleSyncFromJSON function
      expect(panelContent).toContain('handleSyncFromJSON');

      // THEN: Should update date range to include today after sync
      expect(panelContent).toContain('setDateRange');
      expect(panelContent).toContain('prev.end < today');

      // THEN: Should track sync success state
      expect(panelContent).toContain('setSyncSuccess');
    });

    test('WikipediaWordsPanel should display success banner', () => {
      // GIVEN: Panel component file
      const panelPath = join(__dirname, '../WikipediaWordsPanel.tsx');
      const panelContent = readFileSync(panelPath, 'utf-8');

      // THEN: Should have success banner with CheckCircle icon
      expect(panelContent).toContain('CheckCircle');
      expect(panelContent).toContain('syncSuccess');
      expect(panelContent).toContain('Sync completed');
      expect(panelContent).toContain('words synced');
    });

    test('success banner should auto-dismiss after 5 seconds', () => {
      // GIVEN: Panel component file
      const panelPath = join(__dirname, '../WikipediaWordsPanel.tsx');
      const panelContent = readFileSync(panelPath, 'utf-8');

      // THEN: Should have setTimeout to clear success
      expect(panelContent).toContain('setTimeout(() => setSyncSuccess(null), 5000)');
    });
  });

  describe('Upsert behavior', () => {
    test('should use ignoreDuplicates: false to allow updates', () => {
      // GIVEN: Fetcher service file
      const fetcherPath = join(__dirname, '../../../../backend/services/wikipediaWordFetcher.ts');
      const fetcherContent = readFileSync(fetcherPath, 'utf-8');

      // THEN: Should have ignoreDuplicates: false
      expect(fetcherContent).toContain('ignoreDuplicates: false');

      // THEN: Should have explanatory comment
      expect(fetcherContent).toContain('allows updates to existing records');
    });
  });

  describe('WikipediaStatsCard props', () => {
    test('should accept flexible return type for onSyncFromJSON', () => {
      // GIVEN: StatsCard component file
      const statsCardPath = join(__dirname, '../components/WikipediaStatsCard.tsx');
      const statsCardContent = readFileSync(statsCardPath, 'utf-8');

      // THEN: Should use flexible type that accepts both boolean and SyncResult
      expect(statsCardContent).toContain('onSyncFromJSON?: () => Promise<unknown>');
    });
  });
});
