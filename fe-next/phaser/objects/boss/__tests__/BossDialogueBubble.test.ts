/**
 * BossDialogueBubble — speech bubble with boss name and taunt text.
 * RTL support via Phaser Text `rtl` property.
 */

import Phaser from 'phaser';
import { BossDialogueBubble } from '../BossDialogueBubble';

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

describe('BossDialogueBubble', () => {
  it('creates without throwing', () => {
    const scene = makeScene();
    expect(() => new BossDialogueBubble(scene, 400, 100)).not.toThrow();
  });

  it('sets depth to 35 (above tiles, below telegraph)', () => {
    const scene = makeScene();
    const bubble = new BossDialogueBubble(scene, 400, 100);
    expect(bubble.setDepth).toHaveBeenCalledWith(35);
  });

  it('show() updates text and makes visible', () => {
    const scene = makeScene();
    const bubble = new BossDialogueBubble(scene, 400, 100);
    bubble.show('Frost Guardian', 'You cannot defeat me!');
    const nameText = (bubble as unknown as { nameText: { setText: jest.Mock } }).nameText;
    expect(nameText.setText).toHaveBeenCalledWith('Frost Guardian');
  });

  it('hide() makes bubble invisible', () => {
    const scene = makeScene();
    const bubble = new BossDialogueBubble(scene, 400, 100);
    bubble.show('Boss', 'Taunt');
    bubble.hide();
    expect(bubble.setVisible).toHaveBeenCalledWith(false);
  });

  it('setRTL configures text direction', () => {
    const scene = makeScene();
    const bubble = new BossDialogueBubble(scene, 400, 100);
    bubble.setRTL(true);
    const tauntText = (bubble as unknown as { tauntText: { setStyle: jest.Mock } }).tauntText;
    expect(tauntText.setStyle).toHaveBeenCalledWith(expect.objectContaining({ rtl: true }));
  });

  it('destroy cleans up', () => {
    const scene = makeScene();
    const bubble = new BossDialogueBubble(scene, 400, 100);
    expect(() => bubble.destroy()).not.toThrow();
  });
});
