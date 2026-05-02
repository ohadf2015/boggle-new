import { Container, Graphics, Text } from 'pixi.js';
import type { Tile, TileId } from '@/lib/adventure/v2/types';

interface TileSprite {
  id: TileId;
  container: Container;
  bg: Graphics;
  letterText: Text;
  claimText: Text;
  rarity: Tile['rarity'];
  used: boolean;
  claimed: boolean;
  targeted: boolean;
  isGold: boolean;
  claimTurns: number;
}

const TILE_SIZE = 155;
const TILE_GAP = 20;
const SLATE_PADDING = 20;

export class RuneSlateLayer extends Container {
  private tileSprites: TileSprite[] = [];
  private onTileTap: (tileId: TileId, letter: string) => void;

  constructor(onTileTap: (tileId: TileId, letter: string) => void) {
    super();
    this.onTileTap = onTileTap;

    const slateW = SLATE_PADDING * 2 + 4 * TILE_SIZE + 3 * TILE_GAP;
    const slateH = SLATE_PADDING * 2 + 4 * TILE_SIZE + 3 * TILE_GAP;

    const frame = new Graphics();
    frame.rect(0, 0, slateW, slateH).fill(0x0d0d1a).stroke({ color: 0xbfff00, width: 4 });
    this.addChild(frame);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const id = (row * 4 + col) as TileId;
        const sprite = this.makeTileSprite(id);
        sprite.container.position.set(
          SLATE_PADDING + col * (TILE_SIZE + TILE_GAP),
          SLATE_PADDING + row * (TILE_SIZE + TILE_GAP),
        );
        this.addChild(sprite.container);
        this.tileSprites.push(sprite);
      }
    }

    this.position.set((1920 - slateW) / 2, 1080 - slateH - 20);
  }

  private makeTileSprite(id: TileId): TileSprite {
    const c = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, TILE_SIZE, TILE_SIZE).fill(0x1a1a2e).stroke({ color: 0xffffff, width: 2 });
    c.addChild(bg);

    const txt = new Text({
      text: '?',
      style: { fontFamily: ['Fredoka', 'Rubik', 'sans-serif'], fontSize: 64, fill: 0xffffff, fontWeight: 'bold' },
    });
    txt.anchor.set(0.5);
    txt.position.set(TILE_SIZE / 2, TILE_SIZE / 2);
    c.addChild(txt);

    const claim = new Text({
      text: '',
      style: { fontFamily: ['Fredoka', 'Rubik', 'sans-serif'], fontSize: 22, fill: 0xff00aa, fontWeight: 'bold' },
    });
    claim.anchor.set(1, 0);
    claim.position.set(TILE_SIZE - 8, 6);
    c.addChild(claim);

    const sprite: TileSprite = {
      id,
      container: c,
      bg,
      letterText: txt,
      claimText: claim,
      rarity: 'common',
      used: false,
      claimed: false,
      targeted: false,
      isGold: false,
      claimTurns: 0,
    };

    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointerdown', () => {
      if (sprite.claimed) return;
      this.onTileTap(id, sprite.letterText.text);
    });
    c.on('pointerover', () => {
      // Drag-extension: only valid when pointer is held down (caller checks)
      if (sprite.claimed) return;
      this.onTileEnter?.(id, sprite.letterText.text);
    });

    return sprite;
  }

  /** Optional handler for drag-extension (pointer over while held). */
  public onTileEnter?: (tileId: TileId, letter: string) => void;

  setTiles(tiles: Tile[]) {
    tiles.forEach((t, idx) => {
      const sp = this.tileSprites[idx];
      if (!sp) return;
      sp.letterText.text = t.letter;
      sp.rarity = t.rarity;
      sp.used = false;
      sp.claimed = !!t.claimedBy;
      sp.targeted = !!t.targetedBy && !t.claimedBy;
      sp.isGold = !!t.isGold;
      sp.claimTurns = t.claimTurnsRemaining ?? 0;
      sp.letterText.alpha = sp.claimed ? 0.55 : 1;
      sp.claimText.text = sp.claimed && sp.claimTurns > 0 ? `${sp.claimTurns}` : '';
      this.paintTile(sp);
    });
  }

  markUsed(tileId: TileId) {
    const sp = this.tileSprites[tileId];
    if (!sp) return;
    sp.used = true;
    sp.bg.clear();
    sp.bg.rect(0, 0, TILE_SIZE, TILE_SIZE).fill(0x333333).stroke({ color: 0x666666, width: 2 });
    sp.letterText.alpha = 0.3;
  }

  unmarkUsed(tileId: TileId) {
    const sp = this.tileSprites[tileId];
    if (!sp) return;
    sp.used = false;
    sp.letterText.alpha = 1;
    this.paintTile(sp);
  }

  private paintTile(sp: TileSprite) {
    let fillColor: number;
    let strokeColor: number;
    let strokeWidth = 2;

    if (sp.claimed) {
      fillColor = 0x3a0a1a;
      strokeColor = 0xff00aa;
      strokeWidth = 4;
    } else if (sp.targeted) {
      fillColor =
        sp.rarity === 'rare' ? 0x4a1a4a : sp.rarity === 'uncommon' ? 0x1a3a4a : 0x1a1a2e;
      strokeColor = 0xff77cc;
      strokeWidth = 5;
    } else if (sp.isGold) {
      fillColor = 0x4a3a0a;
      strokeColor = 0xffe135;
      strokeWidth = 5;
    } else {
      fillColor =
        sp.rarity === 'rare' ? 0x4a1a4a : sp.rarity === 'uncommon' ? 0x1a3a4a : 0x1a1a2e;
      strokeColor =
        sp.rarity === 'rare' ? 0xffe135 : sp.rarity === 'uncommon' ? 0x00ffff : 0xffffff;
    }
    sp.bg.clear();
    sp.bg
      .rect(0, 0, TILE_SIZE, TILE_SIZE)
      .fill(fillColor)
      .stroke({ color: strokeColor, width: strokeWidth });

    // Gold sparkle overlay — small bright dot upper-left
    if (sp.isGold && !sp.claimed) {
      sp.bg.circle(14, 14, 4).fill(0xffe135);
    }
  }

  flashBotClaim(tileIds: TileId[]) {
    tileIds.forEach((id) => {
      const sp = this.tileSprites[id];
      if (!sp) return;
      const orig = sp.container.scale.x;
      sp.container.scale.set(orig * 1.15);
      setTimeout(() => sp.container.scale.set(orig), 180);
    });
  }
}
