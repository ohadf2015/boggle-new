import { Container, Graphics, Text } from 'pixi.js';

export class HudOverlayLayer extends Container {
  private submitBtn: Container;
  private undoBtn: Container;

  constructor(onSubmit: () => void, onUndo: () => void) {
    super();

    this.submitBtn = this.makeButton('CAST', 0xbfff00, 0x1a1a2e);
    this.submitBtn.position.set(1450, 20);
    this.submitBtn.eventMode = 'static';
    this.submitBtn.cursor = 'pointer';
    this.submitBtn.on('pointerdown', onSubmit);
    this.addChild(this.submitBtn);

    this.undoBtn = this.makeButton('UNDO', 0xef4444, 0xffffff);
    this.undoBtn.position.set(160, 20);
    this.undoBtn.eventMode = 'static';
    this.undoBtn.cursor = 'pointer';
    this.undoBtn.on('pointerdown', onUndo);
    this.addChild(this.undoBtn);
  }

  private makeButton(label: string, fill: number, ink: number): Container {
    const c = new Container();
    const shadow = new Graphics();
    shadow.rect(4, 4, 200, 70).fill({ color: 0x000000, alpha: 0.6 });
    c.addChild(shadow);

    const bg = new Graphics();
    bg.rect(0, 0, 200, 70).fill(fill).stroke({ color: 0x000000, width: 3 });
    c.addChild(bg);

    const txt = new Text({
      text: label,
      style: { fontFamily: ['Fredoka', 'Rubik', 'sans-serif'], fontSize: 36, fill: ink, fontWeight: 'bold' },
    });
    txt.anchor.set(0.5);
    txt.position.set(100, 35);
    c.addChild(txt);

    return c;
  }
}
