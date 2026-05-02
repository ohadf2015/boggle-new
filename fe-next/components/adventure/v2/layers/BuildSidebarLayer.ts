import { Container, Graphics, Text } from 'pixi.js';
import { UPGRADE_DEFS, type UpgradeId } from '@/lib/adventure/v2/upgrades';

const ROW_H = 38;
const SIDEBAR_W = 220;

/**
 * Right-side panel showing the player's equipped upgrades during combat.
 * Reinforces "you have a build" — RPG feel without a character sheet screen.
 */
export class BuildSidebarLayer extends Container {
  private bg: Graphics;
  private title: Text;
  private rows: Container;
  private locale: 'en' | 'he' = 'en';

  constructor() {
    super();

    this.bg = new Graphics();
    this.bg
      .roundRect(0, 0, SIDEBAR_W, 360, 12)
      .fill({ color: 0x111122, alpha: 0.92 })
      .stroke({ color: 0xbfff00, width: 3 });
    this.addChild(this.bg);

    this.title = new Text({
      text: 'BUILD',
      style: {
        fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
        fontSize: 22,
        fill: 0xbfff00,
        fontWeight: 'bold',
        letterSpacing: 4,
      },
    });
    this.title.position.set(16, 12);
    this.addChild(this.title);

    this.rows = new Container();
    this.rows.position.set(0, 50);
    this.addChild(this.rows);

    // Top-right of stage (1920×1080); RTL flips via setLocale.
    this.position.set(1920 - SIDEBAR_W - 24, 30);
  }

  setLocale(locale: 'en' | 'he') {
    this.locale = locale;
    this.title.text = locale === 'he' ? 'בנייה' : 'BUILD';
    if (locale === 'he') {
      this.position.set(24, 30); // mirror to top-left for RTL
    } else {
      this.position.set(1920 - SIDEBAR_W - 24, 30);
    }
  }

  setEquipped(equipped: UpgradeId[]) {
    this.rows.removeChildren();
    if (equipped.length === 0) {
      const empty = new Text({
        text: this.locale === 'he' ? 'ריק' : '(empty)',
        style: {
          fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
          fontSize: 16,
          fill: 0x666666,
          fontStyle: 'italic',
        },
      });
      empty.position.set(16, 0);
      this.rows.addChild(empty);
      return;
    }
    equipped.forEach((id, idx) => {
      const def = UPGRADE_DEFS[id];
      const row = new Container();
      row.position.set(0, idx * ROW_H);

      // Color swatch
      const swatch = new Graphics();
      swatch.rect(16, 6, 6, 22).fill(def.accent);
      row.addChild(swatch);

      const label = new Text({
        text: this.locale === 'he' ? def.labelHe : def.label,
        style: {
          fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
          fontSize: 16,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
      });
      label.position.set(32, 8);
      row.addChild(label);

      const tag = new Text({
        text: def.kind === 'ability' ? '◆' : '○',
        style: {
          fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
          fontSize: 14,
          fill: def.kind === 'ability' ? def.accent : 0x888888,
        },
      });
      tag.position.set(SIDEBAR_W - 30, 10);
      row.addChild(tag);

      this.rows.addChild(row);
    });
  }
}
