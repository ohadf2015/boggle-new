import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    register: vi.fn(),
    __loaded: true,
  },
}));
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

import { trackEduTemplateAssigned } from '../telemetry';

describe('trackEduTemplateAssigned', () => {
  beforeEach(() => {
    captureMock.mockClear();
  });

  it('fires edu_template_assigned with template_id and classroom_id', () => {
    trackEduTemplateAssigned({ templateId: 'en-k2-science-senses', classroomId: 'cls-9' });
    expect(captureMock).toHaveBeenCalledWith('edu_template_assigned', {
      template_id: 'en-k2-science-senses',
      classroom_id: 'cls-9',
    });
  });
});
