import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const getClassroomStudents = vi.fn();
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: (id: string) => getClassroomStudents(id),
}));
vi.mock('@/components/AvatarLite', () => ({
  default: ({ userId }: { userId: string }) => <span data-testid="avatar">{userId}</span>,
}));

import { ClassAvatarStack } from '../ClassAvatarStack';

const roster = (n: number) => ({ data: Array.from({ length: n }, (_, i) => ({ student_id: `s${i + 1}` })), error: null });

describe('ClassAvatarStack', () => {
  beforeEach(() => getClassroomStudents.mockReset());

  it('Given a big class, Then it shows a few faces and a "+N" for the rest', async () => {
    getClassroomStudents.mockResolvedValue(roster(34));
    render(<ClassAvatarStack classroomId="c1" />);
    await waitFor(() => expect(screen.getAllByTestId('avatar')).toHaveLength(4));
    expect(screen.getByTestId('avatar-stack-more')).toHaveTextContent('+30');
    expect(getClassroomStudents).toHaveBeenCalledWith('c1');
  });

  it('Given a small class, Then every face shows and there is no "+N"', async () => {
    getClassroomStudents.mockResolvedValue(roster(2));
    render(<ClassAvatarStack classroomId="c1" />);
    await waitFor(() => expect(screen.getAllByTestId('avatar')).toHaveLength(2));
    expect(screen.queryByTestId('avatar-stack-more')).toBeNull();
  });

  it('Given no students or a failed read, Then it renders nothing', async () => {
    getClassroomStudents.mockResolvedValue({ data: [], error: { message: 'down' } });
    const { container } = render(<ClassAvatarStack classroomId="c1" />);
    await waitFor(() => expect(getClassroomStudents).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
