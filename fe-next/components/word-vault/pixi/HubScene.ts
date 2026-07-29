import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';

export type HubButtonId =
  | 'worldmap'
  | 'inventory'
  | 'memory-theatre'
  | 'shop'
  | 'settings';

export type HubButtonDef = {
  id: HubButtonId;
  labelHe: string;
};

export const HUB_BUTTONS: HubButtonDef[] = [
  { id: 'worldmap', labelHe: 'מפת העולם' },
  { id: 'inventory', labelHe: 'מלאי' },
  { id: 'memory-theatre', labelHe: 'תיאטרון הזיכרון' },
  { id: 'shop', labelHe: 'חנות' },
  { id: 'settings', labelHe: 'הגדרות' },
];

const NAVY = 0x0b1220;
const LIME = 0x9aff5f;
const PINK = 0xff4d7a;
const SHADOW = 0x000000;

export type HubSceneOptions = {
  onButtonClick: (id: HubButtonId) => void;
};

export type HubScene = {
  app: Application;
  destroy: () => void;
  resize: (width: number, height: number) => void;
};

export async function createHubScene(
  canvas: HTMLCanvasElement,
  opts: HubSceneOptions,
): Promise<HubScene> {
  const app = new Application();
  await app.init({
    canvas,
    width: canvas.clientWidth || 720,
    height: canvas.clientHeight || 480,
    backgroundColor: NAVY,
    antialias: true,
    autoDensity: true,
    resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  });

  const root = new Container();
  app.stage.addChild(root);

  const titleStyle = new TextStyle({
    fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
    fontSize: 56,
    fontWeight: '900',
    fill: LIME,
    align: 'center',
  });
  const title = new Text({ text: 'מרתף המילים', style: titleStyle });
  title.anchor.set(0.5);
  root.addChild(title);

  const subtitleStyle = new TextStyle({
    fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
    fontSize: 18,
    fontWeight: '500',
    fill: 0xffffff,
    align: 'center',
  });
  const subtitle = new Text({ text: 'ספר 1 — אולמות האח', style: subtitleStyle });
  subtitle.anchor.set(0.5);
  root.addChild(subtitle);

  const buttonsLayer = new Container();
  root.addChild(buttonsLayer);

  const buttons: { container: Container; bg: Graphics; label: Text }[] = HUB_BUTTONS.map(
    (def) => {
      const c = new Container();
      c.eventMode = 'static';
      c.cursor = 'pointer';
      const bg = new Graphics();
      const label = new Text({
        text: def.labelHe,
        style: new TextStyle({
          fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
          fontSize: 22,
          fontWeight: '700',
          fill: 0xffffff,
        }),
      });
      label.anchor.set(0.5);
      c.addChild(bg);
      c.addChild(label);
      c.on('pointerover', () => {
        bg.tint = LIME;
        label.style.fill = NAVY;
      });
      c.on('pointerout', () => {
        bg.tint = 0xffffff;
        label.style.fill = 0xffffff;
      });
      c.on('pointertap', () => opts.onButtonClick(def.id));
      buttonsLayer.addChild(c);
      return { container: c, bg, label };
    },
  );

  const layout = (w: number, h: number) => {
    title.position.set(w / 2, h * 0.18);
    subtitle.position.set(w / 2, h * 0.18 + 56);

    const btnW = Math.min(360, w * 0.7);
    const btnH = 56;
    const gap = 14;
    const startY = h * 0.42;

    buttons.forEach((b, i) => {
      const y = startY + i * (btnH + gap);
      b.container.position.set(w / 2 - btnW / 2, y);
      b.bg.clear();
      b.bg.rect(6, 6, btnW, btnH).fill({ color: SHADOW, alpha: 0.85 });
      b.bg
        .rect(0, 0, btnW, btnH)
        .fill({ color: PINK, alpha: 0.9 })
        .stroke({ width: 4, color: 0xffffff });
      b.label.position.set(btnW / 2, btnH / 2);
    });
  };

  layout(app.renderer.width, app.renderer.height);

  const resize = (w: number, h: number) => {
    app.renderer.resize(w, h);
    layout(w, h);
  };

  return {
    app,
    resize,
    destroy: () => {
      app.destroy(false, { children: true, texture: false });
    },
  };
}
