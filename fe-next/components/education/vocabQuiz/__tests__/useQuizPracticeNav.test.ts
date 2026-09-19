import { renderHook } from '@testing-library/react';
import { useQuizPracticeNav } from '../useQuizPracticeNav';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({ locale: 'he' }),
}));

describe('useQuizPracticeNav', () => {
  it('sends a student from the quiz finale to their lessons in the current locale', () => {
    // GIVEN a student on the classroom quiz finale (no lesson id reaches the client)
    const { result } = renderHook(() => useQuizPracticeNav());
    // WHEN they tap "practice"
    result.current();
    // THEN they land on their lesson list, where every lesson has practice
    expect(push).toHaveBeenCalledWith('/he/student/lessons');
  });
});
