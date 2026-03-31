import { PhysicsWorld } from '../PhysicsWorld';

describe('PhysicsWorld', () => {
  let world: PhysicsWorld;

  beforeEach(() => {
    world = new PhysicsWorld({ gravity: { x: 0, y: 1 } });
  });

  afterEach(() => {
    world.destroy();
  });

  describe('body management', () => {
    it('should create a rectangular body and return its ID', () => {
      const id = world.createRect(100, 100, 50, 50);
      expect(typeof id).toBe('number');
    });

    it('should create a circle body', () => {
      const id = world.createCircle(100, 100, 25);
      expect(typeof id).toBe('number');
    });

    it('should create a static wall', () => {
      const id = world.createWall(200, 400, 400, 20);
      const state = world.getBodyState(id);
      expect(state).not.toBeNull();
      expect(state!.label).toBe('wall');
    });

    it('should remove a body', () => {
      const id = world.createRect(100, 100, 50, 50);
      expect(world.getBodyState(id)).not.toBeNull();
      world.removeBody(id);
      expect(world.getBodyState(id)).toBeNull();
    });

    it('should remove all bodies', () => {
      world.createRect(100, 100, 50, 50);
      world.createRect(200, 200, 50, 50);
      world.removeAllBodies();
      expect(world.getAllBodyStates()).toHaveLength(0);
    });
  });

  describe('body manipulation', () => {
    it('should set body position', () => {
      const id = world.createRect(100, 100, 50, 50, { isStatic: true });
      world.setPosition(id, { x: 200, y: 300 });
      const state = world.getBodyState(id);
      expect(state!.position.x).toBeCloseTo(200);
      expect(state!.position.y).toBeCloseTo(300);
    });

    it('should set body velocity', () => {
      const id = world.createRect(100, 100, 50, 50);
      world.setVelocity(id, { x: 5, y: -3 });
      const state = world.getBodyState(id);
      expect(state!.velocity.x).toBeCloseTo(5);
      expect(state!.velocity.y).toBeCloseTo(-3);
    });

    it('should apply explosion force', () => {
      const id = world.createRect(150, 100, 20, 20);
      const before = world.getBodyState(id)!;
      world.applyExplosion({ x: 100, y: 100 }, 0.05, 200);
      world.update(16.67);
      const after = world.getBodyState(id)!;
      // Body should have moved away from explosion center
      expect(after.position.x).toBeGreaterThan(before.position.x);
    });
  });

  describe('gravity', () => {
    it('should apply gravity on update', () => {
      const id = world.createRect(100, 50, 20, 20);
      const before = world.getBodyState(id)!;
      // Run several frames
      for (let i = 0; i < 10; i++) world.update(16.67);
      const after = world.getBodyState(id)!;
      expect(after.position.y).toBeGreaterThan(before.position.y);
    });

    it('should disable gravity', () => {
      world.disableGravity();
      const id = world.createRect(100, 100, 20, 20);
      world.setVelocity(id, { x: 0, y: 0 });
      world.update(16.67);
      const state = world.getBodyState(id)!;
      // Should not have moved significantly
      expect(Math.abs(state.position.y - 100)).toBeLessThan(1);
    });
  });

  describe('settled detection', () => {
    it('should detect when bodies are settled', () => {
      world.createRect(100, 100, 20, 20, { isStatic: true });
      // Static bodies are always settled
      expect(world.isSettled()).toBe(true);
    });

    it('should detect when bodies are not settled', () => {
      const id = world.createRect(100, 50, 20, 20);
      world.setVelocity(id, { x: 0, y: 10 });
      world.update(16.67);
      expect(world.isSettled()).toBe(false);
    });
  });

  describe('collision callbacks', () => {
    it('should fire collision callback', () => {
      const callback = vi.fn();
      world.onCollision(callback);

      // Create floor and falling body
      world.createWall(200, 400, 400, 20);
      world.createRect(200, 50, 20, 20, { restitution: 0 });

      // Run many frames to let body fall and collide
      for (let i = 0; i < 200; i++) world.update(16.67);

      expect(callback).toHaveBeenCalled();
    });

    it('should unsubscribe collision callback', () => {
      const callback = vi.fn();
      const unsub = world.onCollision(callback);
      unsub();

      world.createWall(200, 400, 400, 20);
      world.createRect(200, 50, 20, 20);

      for (let i = 0; i < 200; i++) world.update(16.67);
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
