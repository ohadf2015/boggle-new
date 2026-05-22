import { describe, it, expect } from 'vitest';
import { connectionBannerCopy } from '@/utils/connectionBannerCopy';

describe('connectionBannerCopy', () => {
  describe('Given a planned server update (deploy)', () => {
    it('shows reassuring "updating" copy regardless of the raw status', () => {
      for (const status of ['disconnected', 'reconnecting', 'connecting'] as const) {
        const v = connectionBannerCopy(status, true);
        expect(v.titleKey).toBe('connection.serverUpdating');
        expect(v.subtitleKey).toBe('connection.serverUpdatingHint');
        expect(v.isUpdate).toBe(true);
      }
    });
  });

  describe('Given an unexpected disconnect (not a deploy)', () => {
    it('uses the reconnecting copy while retrying', () => {
      const v = connectionBannerCopy('reconnecting', false);
      expect(v.titleKey).toBe('connection.reconnecting');
      expect(v.isUpdate).toBe(false);
    });

    it('uses the disconnected copy otherwise', () => {
      const v = connectionBannerCopy('disconnected', false);
      expect(v.titleKey).toBe('connection.disconnected');
      expect(v.isUpdate).toBe(false);
    });

    it('treats the initial "connecting" state as disconnected copy', () => {
      const v = connectionBannerCopy('connecting', false);
      expect(v.titleKey).toBe('connection.disconnected');
      expect(v.isUpdate).toBe(false);
    });
  });

  it('server-update copy wins even when status is reconnecting (deploy takes priority)', () => {
    expect(connectionBannerCopy('reconnecting', true).isUpdate).toBe(true);
  });
});
