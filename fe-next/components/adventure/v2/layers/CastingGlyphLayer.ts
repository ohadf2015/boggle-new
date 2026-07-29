import { Container, Graphics, Text } from 'pixi.js';
import { gsap } from 'gsap';

export class CastingGlyphLayer extends Container {
  private bg: Graphics;
  private wordText: Text;
  private dmgText: Text;
  private homeX: number;
  private homeY: number;

  constructor() {
    super();

    this.bg = new Graphics();
    this.bg
      .roundRect(-300, -60, 600, 120, 16)
      .fill({ color: 0x1a1a2e, alpha: 0.9 })
      .stroke({ color: 0xbfff00, width: 4 });
    this.bg.alpha = 0;
    this.addChild(this.bg);

    this.wordText = new Text({
      text: '',
      style: { fontFamily: ['Fredoka', 'Rubik', 'sans-serif'], fontSize: 56, fill: 0xffffff, fontWeight: 'bold' },
    });
    this.wordText.anchor.set(0.5);
    this.wordText.position.set(0, -10);
    this.addChild(this.wordText);

    this.dmgText = new Text({
      text: '',
      style: { fontFamily: ['Fredoka', 'Rubik', 'sans-serif'], fontSize: 28, fill: 0xbfff00 },
    });
    this.dmgText.anchor.set(0.5);
    this.dmgText.position.set(0, 30);
    this.addChild(this.dmgText);

    this.homeX = 960;
    this.homeY = 540;
    this.position.set(this.homeX, this.homeY);
  }

  showWord(word: string, predictedDamage: number, isValid: boolean) {
    if (!word) {
      gsap.to(this.bg, { alpha: 0, duration: 0.15 });
      this.wordText.text = '';
      this.dmgText.text = '';
      return;
    }
    this.wordText.text = word;
    this.wordText.style.fill = isValid ? 0xffffff : 0xff8888;
    this.dmgText.text = predictedDamage > 0 ? `${predictedDamage} dmg` : isValid ? '' : 'invalid';
    gsap.to(this.bg, { alpha: 1, duration: 0.15 });
  }

  fireProjectile(toX: number, toY: number, onArrive: () => void) {
    gsap
      .timeline()
      .to(this.scale, { x: 1.2, y: 1.2, duration: 0.12, ease: 'back.out(2)' })
      .to(this.scale, { x: 1, y: 1, duration: 0.06 })
      .to(this.position, { x: toX, y: toY, duration: 0.35, ease: 'power3.in' })
      .call(() => {
        onArrive();
        this.position.set(this.homeX, this.homeY);
        this.bg.alpha = 0;
        this.wordText.text = '';
        this.dmgText.text = '';
      });
  }

  shakeInvalid() {
    gsap.fromTo(
      this.position,
      { x: this.homeX - 12 },
      { x: this.homeX, duration: 0.05, repeat: 5, yoyo: true, ease: 'power1.inOut' },
    );
  }
}
