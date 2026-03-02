/**
 * BossTelegraph — full-canvas attack warning overlay.
 */

import Phaser from 'phaser';
import { BossTelegraph } from '../BossTelegraph';

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

describe('BossTelegraph', () => {
  it('creates without throwing', () => {
    const scene = makeScene();
    expect(() => new BossTelegraph(scene)).not.toThrow();
  });

  it('sets depth to 50 (highest boss UI layer)', () => {
    const scene = makeScene();
    const telegraph = new BossTelegraph(scene);
    expect(telegraph.setDepth).toHaveBeenCalledWith(50);
  });

  it('show() makes the telegraph visible and starts countdown', () => {
    const scene = makeScene();
    const telegraph = new BossTelegraph(scene);
    telegraph.show('Frost Breath', 2000);
    // Should add a timed event for countdown
    expect(scene.time.addEvent).toHaveBeenCalled();
  });

  it('hide() clears the overlay', () => {
    const scene = makeScene();
    const telegraph = new BossTelegraph(scene);
    telegraph.show('Frost Breath', 2000);
    telegraph.hide();
    // Graphics should be cleared
    const gfx = (telegraph as unknown as { overlay: { clear: jest.Mock } }).overlay;
    expect(gfx.clear).toHaveBeenCalled();
  });

  it('destroy cleans up', () => {
    const scene = makeScene();
    const telegraph = new BossTelegraph(scene);
    expect(() => telegraph.destroy()).not.toThrow();
  });
});
