import { Container, Graphics, Text } from 'pixi.js';
import { gsap } from 'gsap';

/**
 * Banner that flashes the bot's chosen word + damage at center-screen
 * for ~1.2s during the bot turn. Sells "the bot grabbed STORM for 8".
 */
export class BotBannerLayer extends Container {
  private bg: Graphics;
  private wordText: Text;
  private dmgText: Text;
  private labelText: Text;

  constructor() {
    super();

    this.bg = new Graphics();
    this.bg
      .roundRect(-380, -90, 760, 180, 18)
      .fill({ color: 0x3a0a1a, alpha: 0.94 })
      .stroke({ color: 0xff00aa, width: 5 });
    this.addChild(this.bg);

    this.labelText = new Text({
      text: 'BOT GRABS',
      style: { fontFamily: ['Fredoka', 'Rubik', 'sans-serif'], fontSize: 22, fill: 0xff00aa, fontWeight: 'bold', letterSpacing: 4 },
    });
    this.labelText.anchor.set(0.5);
    this.labelText.position.set(0, -50);
    this.addChild(this.labelText);

    this.wordText = new Text({
      text: '',
      style: { fontFamily: ['Fredoka', 'Rubik', 'sans-serif'], fontSize: 64, fill: 0xffffff, fontWeight: 'bold' },
    });
    this.wordText.anchor.set(0.5);
    this.wordText.position.set(0, -2);
    this.addChild(this.wordText);

    this.dmgText = new Text({
      text: '',
      style: { fontFamily: ['Fredoka', 'Rubik', 'sans-serif'], fontSize: 32, fill: 0xff00aa, fontWeight: 'bold' },
    });
    this.dmgText.anchor.set(0.5);
    this.dmgText.position.set(0, 50);
    this.addChild(this.dmgText);

    this.position.set(960, 360);
    this.alpha = 0;
  }

  show(word: string, damage: number, durationMs: number, onDone: () => void) {
    if (!word) {
      // Nothing claimed — show pass message briefly
      this.wordText.text = '—';
      this.labelText.text = 'BOT PASSES';
      this.dmgText.text = '';
    } else {
      this.wordText.text = word;
      this.labelText.text = 'BOT GRABS';
      this.dmgText.text = damage > 0 ? `${damage} dmg` : '';
    }

    gsap
      .timeline({ onComplete: onDone })
      .fromTo(this, { alpha: 0 }, { alpha: 1, duration: 0.18 })
      .fromTo(this.scale, { x: 0.7, y: 0.7 }, { x: 1, y: 1, duration: 0.22, ease: 'back.out(1.6)' }, 0)
      .to({}, { duration: durationMs / 1000 })
      .to(this, { alpha: 0, duration: 0.22 });
  }
}
