import { vi, type Mock } from 'vitest';
import { classroomRoomLanguage } from '../classroomRoomLanguage';
import { getClassroomGame } from '../classroomGameManager';

vi.mock('../classroomGameManager', () => ({ getClassroomGame: vi.fn() }));
vi.mock('../supabase/classroomMembership', () => ({ resolveClassroomLanguage: vi.fn() }));

describe('classroomRoomLanguage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GIVEN a classroom record with a language WHEN a Hebrew-UI teacher opens the room THEN the record language wins', async () => {
    (getClassroomGame as Mock).mockResolvedValue({ gameCode: 'ABC123', language: 'en' });
    await expect(classroomRoomLanguage('ABC123', 'he')).resolves.toBe('en');
  });

  it('GIVEN a record made before the field existed WHEN resolved THEN the host language is kept', async () => {
    (getClassroomGame as Mock).mockResolvedValue({ gameCode: 'ABC123' });
    await expect(classroomRoomLanguage('ABC123', 'he')).resolves.toBe('he');
  });

  it('GIVEN no record or a failed lookup WHEN resolved THEN the host language is kept, falling back to English', async () => {
    (getClassroomGame as Mock).mockResolvedValue(null);
    await expect(classroomRoomLanguage('ABC123', 'sv')).resolves.toBe('sv');
    (getClassroomGame as Mock).mockRejectedValue(new Error('redis down'));
    await expect(classroomRoomLanguage('ABC123', undefined)).resolves.toBe('en');
  });
});
