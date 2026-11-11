import { isClassroomIdentityRefusal } from '../classroomIdentityRefusal';

describe('isClassroomIdentityRefusal', () => {
  it('Given a sign-in or check-failed refusal, When tested, Then it is an identity refusal', () => {
    expect(isClassroomIdentityRefusal({ code: 'AUTH_REQUIRED', error: 'education.errors.signInRequired' })).toBe(true);
    expect(isClassroomIdentityRefusal({ code: 'AUTH_UNVERIFIED', error: 'education.errors.signInCheckFailed' })).toBe(true);
  });

  it('Given any other refusal or nothing, When tested, Then it is not', () => {
    expect(isClassroomIdentityRefusal({ code: 'LOBBY_LOCK_FAILED' })).toBe(false);
    expect(isClassroomIdentityRefusal(null)).toBe(false);
    expect(isClassroomIdentityRefusal('AUTH_REQUIRED')).toBe(false);
  });
});
