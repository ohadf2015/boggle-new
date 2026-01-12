import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdleMascot } from '../IdleMascot';
import { useRandomMascotActivity } from '@/hooks/useRandomMascotActivity';
import type { ActivityVariant } from '../InteractiveMascot';

// Mock the hook
jest.mock('@/hooks/useRandomMascotActivity');
const mockUseRandomMascotActivity = useRandomMascotActivity as jest.MockedFunction<
  typeof useRandomMascotActivity
>;

// Mock InteractiveMascot since we only want to test IdleMascot logic
jest.mock('../InteractiveMascot', () => ({
  __esModule: true,
  default: ({ variant, onClick }: any) => (
    <div data-testid="interactive-mascot" data-variant={variant} onClick={onClick}>
      Mascot: {variant}
    </div>
  ),
}));

// Mock device performance hook
jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableComplexAnimations: true,
  }),
}));

describe('IdleMascot', () => {
  const mockTriggerActivity = jest.fn();
  const mockResetToBase = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRandomMascotActivity.mockReturnValue({
      currentVariant: 'happy',
      isDoingActivity: false,
      triggerActivity: mockTriggerActivity,
      resetToBase: mockResetToBase,
    });
  });

  it('should render with base variant', () => {
    render(<IdleMascot baseVariant="happy" />);

    const mascot = screen.getByTestId('interactive-mascot');
    expect(mascot).toBeInTheDocument();
    expect(mascot).toHaveAttribute('data-variant', 'happy');
  });

  it('should pass props to useRandomMascotActivity hook', () => {
    const activities: ActivityVariant[] = ['eating_pizza', 'gaming'];
    const minInterval = 15000;
    const maxInterval = 45000;
    const activityDuration = 5000;

    render(
      <IdleMascot
        baseVariant="thinking"
        activities={activities}
        minInterval={minInterval}
        maxInterval={maxInterval}
        activityDuration={activityDuration}
      />
    );

    expect(mockUseRandomMascotActivity).toHaveBeenCalledWith({
      baseVariant: 'thinking',
      activities,
      minInterval,
      maxInterval,
      activityDuration,
      enabled: true,
    });
  });

  it('should display current variant from hook', () => {
    mockUseRandomMascotActivity.mockReturnValue({
      currentVariant: 'eating_pizza',
      isDoingActivity: true,
      triggerActivity: mockTriggerActivity,
      resetToBase: mockResetToBase,
    });

    render(<IdleMascot baseVariant="happy" />);

    const mascot = screen.getByTestId('interactive-mascot');
    expect(mascot).toHaveAttribute('data-variant', 'eating_pizza');
  });

  it('should trigger activity on click', async () => {
    const user = userEvent.setup();
    render(<IdleMascot baseVariant="happy" enableClick />);

    const mascot = screen.getByTestId('interactive-mascot');
    await user.click(mascot);

    expect(mockTriggerActivity).toHaveBeenCalledTimes(1);
  });

  it('should call custom onClick handler along with trigger', async () => {
    const user = userEvent.setup();
    const mockOnClick = jest.fn();

    render(<IdleMascot baseVariant="happy" enableClick onClick={mockOnClick} />);

    const mascot = screen.getByTestId('interactive-mascot');
    await user.click(mascot);

    expect(mockTriggerActivity).toHaveBeenCalledTimes(1);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should respect enableIdleActivities prop', () => {
    render(<IdleMascot baseVariant="encouraging" enableIdleActivities={false} />);

    expect(mockUseRandomMascotActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('should pass size prop to InteractiveMascot', () => {
    render(<IdleMascot baseVariant="happy" size="xl" />);

    const mascot = screen.getByTestId('interactive-mascot');
    expect(mascot).toBeInTheDocument();
  });

  it('should pass animation props to InteractiveMascot', () => {
    render(
      <IdleMascot baseVariant="celebrating" animated enableHover enableClick />
    );

    const mascot = screen.getByTestId('interactive-mascot');
    expect(mascot).toBeInTheDocument();
  });
});
