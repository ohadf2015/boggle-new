/**
 * UGC Moderation Admin Routes - Unit Tests
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock supabaseServer before importing routes
const { mockFrom, mockSelect, mockEq, mockIn, mockUpdate, mockSingle } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockIn = vi.fn();
  const mockUpdate = vi.fn();
  const mockSingle = vi.fn();
  return { mockFrom, mockSelect, mockEq, mockIn, mockUpdate, mockSingle };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => ({
    from: mockFrom,
  }),
}));

vi.mock('../middleware', () => ({
  auditLog: vi.fn(),
}));

import ugcModerationRoutes from '../ugcModerationRoutes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', ugcModerationRoutes);
  return app;
}

describe('ugcModerationRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /ugc/pending', () => {
    it('returns pending/flagged items', async () => {
      const rows = [
        { id: '1', title: 'Pack A', moderation_status: 'pending' },
        { id: '2', title: 'Pack B', moderation_status: 'flagged' },
      ];
      mockFrom.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockResolvedValue({ data: rows, error: null });

      const res = await request(createApp()).get('/ugc/pending');
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual(rows);
    });

    it('returns 500 on db error', async () => {
      mockFrom.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ in: mockIn });
      mockIn.mockResolvedValue({ data: null, error: { message: 'db fail' } });

      const res = await request(createApp()).get('/ugc/pending');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /ugc/:id/approve', () => {
    it('approves an item', async () => {
      mockFrom.mockReturnValue({ update: mockUpdate });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: { id: '1', moderation_status: 'approved' }, error: null });

      const res = await request(createApp()).post('/ugc/1/approve');
      expect(res.status).toBe(200);
      expect(res.body.item.moderation_status).toBe('approved');
    });
  });

  describe('POST /ugc/:id/reject', () => {
    it('rejects an item', async () => {
      mockFrom.mockReturnValue({ update: mockUpdate });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue({ data: { id: '1', moderation_status: 'rejected' }, error: null });

      const res = await request(createApp()).post('/ugc/1/reject');
      expect(res.status).toBe(200);
      expect(res.body.item.moderation_status).toBe('rejected');
    });
  });
});
