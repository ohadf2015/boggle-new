// ─── PhysicsDebris Tests ──────────────────────────────────────────────

import { PhysicsDebris } from '../PhysicsDebris';
import { Container } from 'pixi.js';

jest.mock('pixi.js', () => {
  const mockGraphics = {
    clear: jest.fn().mockReturnThis(),
    rect: jest.fn().mockReturnThis(),
    fill: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    alpha: 1,
    x: 0,
    y: 0,
    rotation: 0,
    visible: true,
  };
  const mockContainer = {
    addChild: jest.fn(),
    removeChild: jest.fn(),
    destroy: jest.fn(),
  };
  return {
    Container: jest.fn(() => mockContainer),
    Graphics: jest.fn(() => mockGraphics),
  };
});

// Mock PhysicsWorld
const mockPhysics = {
  createRect: jest.fn().mockReturnValue(1),
  removeBody: jest.fn(),
  getBodyState: jest.fn().mockReturnValue({
    id: 1,
    position: { x: 100, y: 200 },
    angle: 0.5,
    velocity: { x: 2, y: 3 },
    label: 'debris',
  }),
  createWall: jest.fn(),
};

describe('PhysicsDebris', () => {
  let parent: Container;
  let debris: PhysicsDebris;

  beforeEach(() => {
    jest.clearAllMocks();
    parent = new Container();
    debris = new PhysicsDebris(parent, mockPhysics as never, { floorY: 600 });
  });

  afterEach(() => {
    debris.destroy();
  });

  it('should start with no active debris', () => {
    expect(debris.count).toBe(0);
  });

  it('should spawn debris pieces', () => {
    debris.spawn(100, 200, 0xff0000, 4);
    expect(debris.count).toBe(4);
    expect(mockPhysics.createRect).toHaveBeenCalledTimes(4);
  });

  it('should expire debris after maxAge', () => {
    debris.spawn(100, 200, 0xff0000, 2);
    expect(debris.count).toBe(2);

    // Default maxAge is 2s but staggered up to 2*1.3=2.6s
    debris.update(3.0);
    expect(debris.count).toBe(0);
  });

  it('should remove physics bodies on cleanup', () => {
    debris.spawn(100, 200, 0xff0000, 3);
    debris.destroy();
    expect(mockPhysics.removeBody).toHaveBeenCalledTimes(3);
  });

  it('should update graphics positions from physics state', () => {
    debris.spawn(100, 200, 0xff0000, 1);
    debris.update(0.016);
    // getBodyState called to read position
    expect(mockPhysics.getBodyState).toHaveBeenCalled();
  });

  it('should respect maxDebris cap', () => {
    const capped = new PhysicsDebris(parent, mockPhysics as never, { floorY: 600, maxDebris: 5 });
    capped.spawn(100, 200, 0xff0000, 10);
    expect(capped.count).toBeLessThanOrEqual(5);
    capped.destroy();
  });
});
