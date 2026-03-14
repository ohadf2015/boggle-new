/**
 * UGC Moderation Admin Routes - Unit Tests
 */

import express from 'express';
import request from 'supertest';

// Mock supabaseServer before importing routes
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockUpdate = jest.fn();
const mockSingle = jest.fn();

jest.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => ({
    from: mockFrom,
  }),
}));

jest.mock('../middleware', () => ({
  auditLog: jest.fn(),
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
    jest.clearAllMocks();
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
