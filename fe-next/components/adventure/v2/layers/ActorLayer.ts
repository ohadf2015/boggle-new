import { Container, Graphics, Text } from 'pixi.js';
import { gsap } from 'gsap';

export class ActorLayer extends Container {
  private heroSprite: Graphics;
  private enemySprite: Graphics;
  private heroHpBar: Graphics;
  private enemyHpBar: Graphics;
  private heroHpText: Text;
  private enemyHpText: Text;

  constructor() {
    super();

    this.heroSprite = new Graphics();
    this.heroSprite.rect(-40, -80, 80, 160).fill(0x4ade80);
    this.heroSprite.position.set(280, 320);
    this.addChild(this.heroSprite);

    this.enemySprite = new Graphics();
    this.enemySprite.rect(-50, -100, 100, 200).fill(0xef4444);
    this.enemySprite.position.set(1640, 320);
    this.addChild(this.enemySprite);

    this.heroHpBar = new Graphics();
    this.heroHpBar.position.set(220, 220);
    this.addChild(this.heroHpBar);

    this.enemyHpBar = new Graphics();
    this.enemyHpBar.position.set(1580, 200);
    this.addChild(this.enemyHpBar);

    this.heroHpText = new Text({
      text: '',
      style: { fontFamily: ['Fredoka', 'Rubik', 'sans-serif'], fontSize: 22, fill: 0xffffff },
    });
    this.heroHpText.position.set(220, 240);
    this.addChild(this.heroHpText);

    this.enemyHpText = new Text({
      text: '',
      style: { fontFamily: ['Fredoka', 'Rubik', 'sans-serif'], fontSize: 22, fill: 0xffffff },
    });
    this.enemyHpText.position.set(1580, 220);
    this.addChild(this.enemyHpText);
  }

  updateHp(heroHp: number, heroMaxHp: number, enemyHp: number, enemyMaxHp: number) {
    this.heroHpBar.clear();
    this.heroHpBar.rect(0, 0, 120, 14).fill(0x111111);
    this.heroHpBar.rect(2, 2, Math.max(0, (heroHp / heroMaxHp) * 116), 10).fill(0x4ade80);
    this.heroHpText.text = `HP ${heroHp}/${heroMaxHp}`;

    this.enemyHpBar.clear();
    this.enemyHpBar.rect(0, 0, 160, 16).fill(0x111111);
    this.enemyHpBar.rect(2, 2, Math.max(0, (enemyHp / enemyMaxHp) * 156), 12).fill(0xef4444);
    this.enemyHpText.text = `HP ${enemyHp}/${enemyMaxHp}`;
  }

  flashEnemyHurt() {
    const origTint = this.enemySprite.tint;
    const origX = this.enemySprite.position.x;
    this.enemySprite.tint = 0xffffff;
    gsap.to(this.enemySprite.position, {
      x: origX + 16,
      duration: 0.04,
      yoyo: true,
      repeat: 5,
      ease: 'power1.inOut',
      onComplete: () => {
        this.enemySprite.tint = origTint;
        this.enemySprite.position.x = origX;
      },
    });
  }

  flashHeroHurt() {
    const origTint = this.heroSprite.tint;
    const origX = this.heroSprite.position.x;
    this.heroSprite.tint = 0xff8888;
    gsap.to(this.heroSprite.position, {
      x: origX - 12,
      duration: 0.04,
      yoyo: true,
      repeat: 5,
      ease: 'power1.inOut',
      onComplete: () => {
        this.heroSprite.tint = origTint;
        this.heroSprite.position.x = origX;
      },
    });
  }

  getEnemyImpactPoint(): { x: number; y: number } {
    return { x: this.enemySprite.position.x, y: this.enemySprite.position.y };
  }
}
