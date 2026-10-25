import { renderHook, act } from '@testing-library/react';
import { useStartTeacherProTrial } from '../useStartTeacherProTrial';

const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
  goToPolarCheckout: vi.fn(),
}));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackTrialCtaTap: vi.fn() }));
const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({ default: { error: (...a: unknown[]) => toastError(...a) } }));

describe('useStartTeacherProTrial', () => {
  beforeEach(() => {
    postTeacherProCheckout.mockReset();
    toastError.mockReset();
  });

  it('Given a trial CTA source, When started, Then the checkout reports failures under that placement and the teacher sees a toast', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(() => useStartTeacherProTrial((k) => k, 'he', 'reports_teaser'));
    await act(async () => {
      await result.current.start();
    });
    expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, { trial: true, locale: 'he', placement: 'reports_teaser' });
    expect(toastError).toHaveBeenCalledWith('teacher.subscription.checkoutError');
  });
});
