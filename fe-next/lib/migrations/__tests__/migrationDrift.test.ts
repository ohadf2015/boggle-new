import { describe, it, expect } from 'vitest';
import {
  extractMigrationVersion,
  parseRemoteVersionsFromMigrationList,
  findUnappliedMigrations,
} from '../migrationDrift';

describe('migrationDrift', () => {
  describe('extractMigrationVersion', () => {
    it('pulls the leading timestamp from a bare filename', () => {
      expect(extractMigrationVersion('20260607100000_word_wheel_catchup.sql')).toBe('20260607100000');
    });

    it('pulls the timestamp from a full repo path', () => {
      expect(
        extractMigrationVersion('fe-next/supabase/migrations/20260608120000_blocked_entities.sql'),
      ).toBe('20260608120000');
    });

    it('returns null for a non-migration filename', () => {
      expect(extractMigrationVersion('README.md')).toBeNull();
      expect(extractMigrationVersion('run-migrations.js')).toBeNull();
    });
  });

  describe('parseRemoteVersionsFromMigrationList', () => {
    // Mirrors `supabase migration list` table output: Local | Remote | Time.
    const sample = [
      '        Local          | Remote         | Time (UTC)          ',
      '  ---------------------|----------------|---------------------',
      '        20260607100000 | 20260607100000 | 2026-06-07 10:00:00 ',
      '        20260608120000 |                | 2026-06-08 12:00:00 ',
      '                       | 20251201000000 | 2025-12-01 00:00:00 ',
    ].join('\n');

    it('returns only versions present in the Remote column', () => {
      const remote = parseRemoteVersionsFromMigrationList(sample);
      expect(remote).toContain('20260607100000'); // applied
      expect(remote).toContain('20251201000000'); // remote-only (applied, file gone)
      expect(remote).not.toContain('20260608120000'); // local-only = NOT applied
    });
  });

  describe('findUnappliedMigrations', () => {
    const remote = ['20260607100000', '20260607103225'];

    it('passes a delta migration that IS in the remote ledger', () => {
      // word_wheel_catchup — now applied → no drift
      expect(findUnappliedMigrations(['20260607100000'], remote)).toEqual([]);
    });

    it('flags a delta migration that is NOT in the remote ledger', () => {
      // blocked_entities — silently skipped by db push → drift
      expect(findUnappliedMigrations(['20260608120000'], remote)).toEqual(['20260608120000']);
    });

    it('flags only the unapplied subset of a mixed delta', () => {
      expect(
        findUnappliedMigrations(['20260607100000', '20260608120000'], remote),
      ).toEqual(['20260608120000']);
    });

    it('returns nothing for an empty delta', () => {
      expect(findUnappliedMigrations([], remote)).toEqual([]);
    });
  });
});
