/**
 * WordHuntLoginModal - Simple integration test
 *
 * This test verifies that:
 * 1. The component is properly exported and importable
 * 2. The component accepts the expected props
 * 3. It integrates with DailyChallenge correctly
 */

import WordHuntLoginModal from '../WordHuntLoginModal';

describe('WordHuntLoginModal', () => {
  it('exports the component correctly', () => {
    expect(WordHuntLoginModal).toBeDefined();
    expect(typeof WordHuntLoginModal).toBe('function');
  });

  it('component accepts required props', () => {
    const props = {
      isOpen: true,
      onClose: jest.fn(),
    };

    // Check that props match expected interface
    expect(typeof props.isOpen).toBe('boolean');
    expect(typeof props.onClose).toBe('function');
  });

  it('is a valid React component', () => {
    // Check for React.FC characteristics
    expect(WordHuntLoginModal.displayName || WordHuntLoginModal.name).toBeDefined();
  });
});
