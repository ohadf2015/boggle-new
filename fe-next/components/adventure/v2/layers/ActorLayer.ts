import { Container, Graphics, Text } from 'pixi.js';
import { gsap } from 'gsap';

const HERO_X = 280;
const HERO_Y = 320;
const ENEMY_X = 1640;
const ENEMY_Y = 320;

export class ActorLayer extends Container {
  private heroSprite: Container;
  private heroSilhouette: Graphics;
  private enemySprite: Container;
  private enemySilhouette: Graphics;
  private heroHpBar: Graphics;
  private enemyHpBar: Graphics;
  private heroHpText: Text;
  private enemyHpText: Text;
  private heroNameText: Text;
  private enemyNameText: Text;
  private weaknessText: Text;
  private floatingNumbers: Container;
  private isBossMode = false;

  constructor() {
    super();

    // HERO ────────────────────────────────────
    this.heroSprite = new Container();
    this.heroSprite.position.set(HERO_X, HERO_Y);
    this.heroSilhouette = new Graphics();
    this.drawHeroSilhouette(this.heroSilhouette);
    this.heroSprite.addChild(this.heroSilhouette);
    this.addChild(this.heroSprite);

    // Hero nameplate
    this.heroNameText = new Text({
      text: 'HERO · Lv. 1',
      style: {
        fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
        fontSize: 22,
        fill: 0xbfff00,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 4 },
      },
    });
    this.heroNameText.anchor.set(0.5);
    this.heroNameText.position.set(HERO_X, HERO_Y + 130);
    this.addChild(this.heroNameText);

    this.heroHpBar = new Graphics();
    this.heroHpBar.position.set(HERO_X - 80, HERO_Y + 150);
    this.addChild(this.heroHpBar);

    this.heroHpText = new Text({
      text: '',
      style: {
        fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
        fontSize: 16,
        fill: 0xffffff,
      },
    });
    this.heroHpText.anchor.set(0.5);
    this.heroHpText.position.set(HERO_X, HERO_Y + 195);
    this.addChild(this.heroHpText);

    // ENEMY ────────────────────────────────────
    this.enemySprite = new Container();
    this.enemySprite.position.set(ENEMY_X, ENEMY_Y);
    this.enemySilhouette = new Graphics();
    this.drawEnemySilhouette(this.enemySilhouette, false);
    this.enemySprite.addChild(this.enemySilhouette);
    this.addChild(this.enemySprite);

    this.enemyNameText = new Text({
      text: 'ENEMY',
      style: {
        fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
        fontSize: 22,
        fill: 0xef4444,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 4 },
        letterSpacing: 2,
      },
    });
    this.enemyNameText.anchor.set(0.5);
    this.enemyNameText.position.set(ENEMY_X, ENEMY_Y - 160);
    this.addChild(this.enemyNameText);

    this.enemyHpBar = new Graphics();
    this.enemyHpBar.position.set(ENEMY_X - 100, ENEMY_Y - 130);
    this.addChild(this.enemyHpBar);

    this.enemyHpText = new Text({
      text: '',
      style: {
        fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
        fontSize: 16,
        fill: 0xffffff,
      },
    });
    this.enemyHpText.anchor.set(0.5);
    this.enemyHpText.position.set(ENEMY_X, ENEMY_Y - 100);
    this.addChild(this.enemyHpText);

    this.weaknessText = new Text({
      text: '',
      style: {
        fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
        fontSize: 14,
        fill: 0xffe135,
        fontWeight: 'bold',
        letterSpacing: 2,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.weaknessText.anchor.set(0.5);
    this.weaknessText.position.set(ENEMY_X, ENEMY_Y - 75);
    this.addChild(this.weaknessText);

    // FLOATING NUMBERS ────────────────────────
    this.floatingNumbers = new Container();
    this.addChild(this.floatingNumbers);
  }

  setEnemyName(name: string, isBoss: boolean = false) {
    this.isBossMode = isBoss;
    this.enemyNameText.text = isBoss ? `👑 ${name}` : name;
    this.enemyNameText.style.fill = isBoss ? 0xff1493 : 0xef4444;
    this.drawEnemySilhouette(this.enemySilhouette, isBoss);
  }

  setEnemyWeakness(label: string) {
    this.weaknessText.text = label;
  }

  setHeroName(name: string) {
    this.heroNameText.text = name;
  }

  /** Stylized "wizard with pointed hat" silhouette in lime accent. */
  private drawHeroSilhouette(g: Graphics) {
    g.clear();
    // Cloak body (trapezoid)
    g.poly([-50, 80, 50, 80, 40, -20, -40, -20]).fill(0x4ade80).stroke({ color: 0x000000, width: 4 });
    // Head (circle)
    g.circle(0, -40, 22).fill(0xfde68a).stroke({ color: 0x000000, width: 4 });
    // Hat (pointed triangle)
    g.poly([-32, -55, 32, -55, 0, -125]).fill(0xbfff00).stroke({ color: 0x000000, width: 4 });
    // Hat star
    g.star(0, -85, 5, 6, 3).fill(0xffe135);
    // Eye
    g.circle(-6, -42, 2).fill(0x000000);
    g.circle(8, -42, 2).fill(0x000000);
    // Staff
    g.rect(40, -10, 6, 90).fill(0x8b5a2b).stroke({ color: 0x000000, width: 2 });
    g.circle(43, -15, 8).fill(0x00ffff).stroke({ color: 0x000000, width: 2 });
  }

  /** Stylized "monster" silhouette. Boss = magenta + horns. */
  private drawEnemySilhouette(g: Graphics, isBoss: boolean) {
    g.clear();
    const bodyColor = isBoss ? 0xff1493 : 0xef4444;
    const accentColor = isBoss ? 0xffe135 : 0xff8888;
    // Body (rounded shape)
    g.roundRect(-55, -40, 110, 130, 16).fill(bodyColor).stroke({ color: 0x000000, width: 4 });
    // Head (circle, larger for boss)
    const headR = isBoss ? 38 : 32;
    g.circle(0, -65, headR).fill(bodyColor).stroke({ color: 0x000000, width: 4 });
    // Horns (boss)
    if (isBoss) {
      g.poly([-30, -90, -22, -120, -14, -90]).fill(0xffe135).stroke({ color: 0x000000, width: 3 });
      g.poly([14, -90, 22, -120, 30, -90]).fill(0xffe135).stroke({ color: 0x000000, width: 3 });
    }
    // Eyes (angry slits)
    g.poly([-15, -65, -5, -70, -5, -60]).fill(0xffffff);
    g.poly([15, -65, 5, -70, 5, -60]).fill(0xffffff);
    g.circle(-10, -65, 3).fill(0x000000);
    g.circle(10, -65, 3).fill(0x000000);
    // Mouth (jagged)
    g.poly([-20, -45, -10, -38, 0, -45, 10, -38, 20, -45, 15, -32, -15, -32]).fill(0x000000);
    // Claws / spikes on body sides
    g.poly([-55, 0, -75, 10, -55, 20]).fill(accentColor).stroke({ color: 0x000000, width: 2 });
    g.poly([55, 0, 75, 10, 55, 20]).fill(accentColor).stroke({ color: 0x000000, width: 2 });
  }

  updateHp(heroHp: number, heroMaxHp: number, enemyHp: number, enemyMaxHp: number) {
    this.heroHpBar.clear();
    this.heroHpBar.rect(0, 0, 160, 18).fill(0x111111).stroke({ color: 0x000000, width: 2 });
    this.heroHpBar
      .rect(2, 2, Math.max(0, (heroHp / heroMaxHp) * 156), 14)
      .fill(0x4ade80);
    this.heroHpText.text = `${heroHp}/${heroMaxHp}`;

    this.enemyHpBar.clear();
    this.enemyHpBar.rect(0, 0, 200, 22).fill(0x111111).stroke({ color: 0x000000, width: 2 });
    this.enemyHpBar
      .rect(2, 2, Math.max(0, (enemyHp / enemyMaxHp) * 196), 18)
      .fill(this.isBossMode ? 0xff1493 : 0xef4444);
    this.enemyHpText.text = `${enemyHp}/${enemyMaxHp}`;
  }

  flashEnemyHurt(damage: number, isCrit: boolean = false, isWeak: boolean = false) {
    const orig = this.enemySprite.position.x;
    this.enemySilhouette.tint = 0xffffff;
    gsap.to(this.enemySprite.position, {
      x: orig + 18,
      duration: 0.04,
      yoyo: true,
      repeat: 5,
      ease: 'power1.inOut',
      onComplete: () => {
        this.enemySilhouette.tint = 0xffffff;
        this.enemySprite.position.x = orig;
      },
    });
    this.spawnFloatingNumber(damage, ENEMY_X, ENEMY_Y - 40, isCrit ? 'crit' : 'enemy-hit');
    if (isWeak) this.spawnWeakCallout();
  }

  private spawnWeakCallout() {
    const text = new Text({
      text: 'WEAK!',
      style: {
        fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
        fontSize: 38,
        fill: 0xffe135,
        fontWeight: 'bold',
        stroke: { color: 0xff1493, width: 5 },
        letterSpacing: 4,
      },
    });
    text.anchor.set(0.5);
    text.position.set(ENEMY_X, ENEMY_Y - 100);
    this.floatingNumbers.addChild(text);
    gsap
      .timeline({
        onComplete: () => {
          text.parent?.removeChild(text);
          text.destroy();
        },
      })
      .fromTo(
        text.scale,
        { x: 0.4, y: 0.4 },
        { x: 1.5, y: 1.5, duration: 0.18, ease: 'back.out(2.2)' },
      )
      .to(text.scale, { x: 1, y: 1, duration: 0.12 })
      .to(text, { alpha: 0, duration: 0.5 }, '+=0.2');
  }

  flashHeroHurt(damage: number) {
    const orig = this.heroSprite.position.x;
    this.heroSilhouette.tint = 0xff8888;
    gsap.to(this.heroSprite.position, {
      x: orig - 14,
      duration: 0.04,
      yoyo: true,
      repeat: 5,
      ease: 'power1.inOut',
      onComplete: () => {
        this.heroSilhouette.tint = 0xffffff;
        this.heroSprite.position.x = orig;
      },
    });
    this.spawnFloatingNumber(damage, HERO_X, HERO_Y - 40, 'hero-hit');
  }

  /** Floating damage number that scales up + fades up + out. */
  private spawnFloatingNumber(
    value: number,
    x: number,
    y: number,
    kind: 'enemy-hit' | 'hero-hit' | 'crit',
  ) {
    const color =
      kind === 'crit' ? 0xffe135 : kind === 'hero-hit' ? 0xef4444 : 0xbfff00;
    const fontSize = kind === 'crit' ? 64 : 44;
    const text = new Text({
      text: kind === 'crit' ? `${value}!` : `${value}`,
      style: {
        fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
        fontSize,
        fill: color,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 6 },
      },
    });
    text.anchor.set(0.5);
    text.position.set(x + (Math.random() - 0.5) * 40, y);
    text.alpha = 0;
    this.floatingNumbers.addChild(text);

    gsap
      .timeline({
        onComplete: () => {
          text.parent?.removeChild(text);
          text.destroy();
        },
      })
      .to(text, { alpha: 1, duration: 0.08 })
      .to(text.scale, { x: 1.4, y: 1.4, duration: 0.16, ease: 'back.out(2.4)' }, 0)
      .to(text.scale, { x: 1, y: 1, duration: 0.12 }, '>')
      .to(text.position, { y: y - 80, duration: 0.6, ease: 'power2.out' }, 0)
      .to(text, { alpha: 0, duration: 0.25 }, '>-0.1');

    if (kind === 'crit') {
      // Big "CRIT!" callout
      const critText = new Text({
        text: 'CRIT!',
        style: {
          fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
          fontSize: 36,
          fill: 0xffe135,
          fontWeight: 'bold',
          stroke: { color: 0x000000, width: 5 },
          letterSpacing: 4,
        },
      });
      critText.anchor.set(0.5);
      critText.position.set(x, y - 50);
      this.floatingNumbers.addChild(critText);
      gsap
        .timeline({
          onComplete: () => {
            critText.parent?.removeChild(critText);
            critText.destroy();
          },
        })
        .fromTo(
          critText.scale,
          { x: 0.5, y: 0.5 },
          { x: 1.6, y: 1.6, duration: 0.18, ease: 'back.out(2)' },
        )
        .to(critText.scale, { x: 1, y: 1, duration: 0.12 })
        .to(critText, { alpha: 0, duration: 0.4 }, '+=0.2');
    }
  }

  getEnemyImpactPoint(): { x: number; y: number } {
    return { x: ENEMY_X, y: ENEMY_Y };
  }
}
