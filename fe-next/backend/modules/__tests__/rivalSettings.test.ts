import { describe, it, expect } from 'vitest';
import { createClassroomGameSchema } from '../../handlers/classroomGameSchemas';

const base = {
  classroomId: '11111111-1111-4111-8111-111111111111',
  teacherId: '22222222-2222-4222-8222-222222222222',
  teacherName: 'Teacher',
  gameCode: 'ABC123',
};

describe('classroom game settings.rivalry', () => {
  it('Given the teacher turned rivalry off, When the create payload is parsed, Then the false survives', () => {
    const parsed = createClassroomGameSchema.safeParse({ ...base, settings: { rivalry: false } });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.settings?.rivalry).toBe(false);
  });

  it('Given settings saved before the toggle, When parsed, Then rivalry is absent (read as on)', () => {
    const parsed = createClassroomGameSchema.safeParse({ ...base, settings: { timerMinutes: 3 } });
    expect(parsed.success && parsed.data.settings?.rivalry).toBeUndefined();
  });

  it('Given a non-boolean rivalry, When parsed, Then it is refused', () => {
    expect(createClassroomGameSchema.safeParse({ ...base, settings: { rivalry: 'yes' } }).success).toBe(false);
  });
});
