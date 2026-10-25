import { describe, it, expect } from 'vitest';
import { classroomSeatName } from '../classroomSeatName';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('classroomSeatName', () => {
  it('Given a free name, Then the student keeps it', () => {
    expect(classroomSeatName({}, 'Noa', B)).toBe('Noa');
  });

  it('Given the same student already seated under that name, Then it is a reconnect, not a rename', () => {
    expect(classroomSeatName({ Noa: { authUserId: B } }, 'Noa', B)).toBe('Noa');
  });

  it('Given a different signed-in student holds the name, Then the newcomer gets "Noa 2"', () => {
    expect(classroomSeatName({ Noa: { authUserId: A } }, 'Noa', B)).toBe('Noa 2');
  });

  it('Given "Noa 2" is also taken, Then the newcomer gets "Noa 3"', () => {
    expect(classroomSeatName({ Noa: { authUserId: A }, 'Noa 2': { authUserId: '33333333-3333-4333-8333-333333333333' } }, 'Noa', B)).toBe('Noa 3');
  });

  it('Given the renamed student comes back asking for "Noa", Then they land on their own "Noa 2" seat', () => {
    expect(classroomSeatName({ Noa: { authUserId: A }, 'Noa 2': { authUserId: B } }, 'Noa', B)).toBe('Noa 2');
  });

  it('Given a guest holds the name, Then a signed-in student does not take over their seat', () => {
    expect(classroomSeatName({ Noa: { guestTokenHash: 'h1' } }, 'Noa', B)).toBe('Noa 2');
  });

  it('Given a seat with no identity at all, Then the old reconnect behaviour is kept', () => {
    expect(classroomSeatName({ Noa: {} }, 'Noa', B)).toBe('Noa');
  });

  it('Given a 30-character name, Then the suffixed name still fits the socket limit', () => {
    const long = 'א'.repeat(30);
    const name = classroomSeatName({ [long]: { authUserId: A } }, long, B);
    expect(name.length).toBeLessThanOrEqual(30);
    expect(name).not.toBe(long);
  });
});
