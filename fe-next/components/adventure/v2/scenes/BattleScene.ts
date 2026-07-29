import { Container, Graphics } from 'pixi.js';
import type { TileId } from '@/lib/adventure/v2/types';
import type { AbilityId } from '@/lib/adventure/v2/abilities';
import { ActorLayer } from '../layers/ActorLayer';
import { RuneSlateLayer } from '../layers/RuneSlateLayer';
import { CastingGlyphLayer } from '../layers/CastingGlyphLayer';
import { HudOverlayLayer } from '../layers/HudOverlayLayer';
import { BotBannerLayer } from '../layers/BotBannerLayer';
import { AbilityBarLayer } from '../layers/AbilityBarLayer';
import { BuildSidebarLayer } from '../layers/BuildSidebarLayer';

export class BattleScene extends Container {
  readonly backdrop: Graphics;
  readonly actorLayer: ActorLayer;
  readonly runeSlate: RuneSlateLayer;
  readonly castingGlyph: CastingGlyphLayer;
  readonly hud: HudOverlayLayer;
  readonly botBanner: BotBannerLayer;
  readonly abilityBar: AbilityBarLayer;
  readonly buildSidebar: BuildSidebarLayer;

  constructor(
    onTileTap: (tileId: TileId, letter: string) => void,
    onSubmit: () => void,
    onUndo: () => void,
    onAbilityPressed: (id: AbilityId) => void,
  ) {
    super();

    this.backdrop = new Graphics();
    this.backdrop.rect(0, 0, 1920, 1080).fill(0x1a1a2e);
    this.addChild(this.backdrop);

    this.actorLayer = new ActorLayer();
    this.addChild(this.actorLayer);

    this.runeSlate = new RuneSlateLayer(onTileTap);
    this.addChild(this.runeSlate);

    this.castingGlyph = new CastingGlyphLayer();
    this.addChild(this.castingGlyph);

    this.hud = new HudOverlayLayer(onSubmit, onUndo);
    this.addChild(this.hud);

    this.botBanner = new BotBannerLayer();
    this.addChild(this.botBanner);

    this.abilityBar = new AbilityBarLayer(onAbilityPressed);
    this.addChild(this.abilityBar);

    this.buildSidebar = new BuildSidebarLayer();
    this.addChild(this.buildSidebar);
  }
}
