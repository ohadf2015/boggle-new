import { Container, Graphics, Text } from 'pixi.js';
import { ABILITY_DEFS, type AbilityId, type AbilityState } from '@/lib/adventure/v2/abilities';

interface AbilityButton {
  id: AbilityId;
  container: Container;
  bg: Graphics;
  label: Text;
  cd: Text;
  cooldownOverlay: Graphics;
  ready: boolean;
  pending: boolean;
  cooldownRemaining: number;
}

const BTN_W = 130;
const BTN_H = 96;
const GAP = 14;

export class AbilityBarLayer extends Container {
  private buttons: AbilityButton[] = [];
  private locale: 'en' | 'he' = 'en';
  private onAbilityPressed: (id: AbilityId) => void;

  constructor(onAbilityPressed: (id: AbilityId) => void) {
    super();
    this.onAbilityPressed = onAbilityPressed;
    // Anchor: bottom-left of slate area, above the slate
    this.position.set(40, 740);
  }

  setLocale(locale: 'en' | 'he') {
    this.locale = locale;
    this.buttons.forEach((b) => {
      const def = ABILITY_DEFS[b.id];
      b.label.text = locale === 'he' ? def.labelHe : def.label;
    });
  }

  setAbilities(states: AbilityState[], pending: AbilityId | null) {
    // Sync button list to states (rebuild if changed)
    if (states.length !== this.buttons.length || states.some((s, i) => this.buttons[i]?.id !== s.id)) {
      this.rebuild(states);
    }
    this.buttons.forEach((btn) => {
      const state = states.find((s) => s.id === btn.id);
      if (!state) return;
      btn.ready = state.cooldownRemaining <= 0;
      btn.pending = pending === btn.id;
      btn.cooldownRemaining = state.cooldownRemaining;
      this.paintButton(btn);
    });
  }

  private rebuild(states: AbilityState[]) {
    this.buttons.forEach((b) => this.removeChild(b.container));
    this.buttons = [];
    states.forEach((state, idx) => {
      const def = ABILITY_DEFS[state.id];
      const btn = this.makeButton(state.id);
      btn.container.position.set(idx * (BTN_W + GAP), 0);
      btn.label.text = this.locale === 'he' ? def.labelHe : def.label;
      this.addChild(btn.container);
      this.buttons.push(btn);
    });
  }

  private makeButton(id: AbilityId): AbilityButton {
    const def = ABILITY_DEFS[id];
    const c = new Container();

    const shadow = new Graphics();
    shadow.rect(4, 4, BTN_W, BTN_H).fill({ color: 0x000000, alpha: 0.6 });
    c.addChild(shadow);

    const bg = new Graphics();
    bg.rect(0, 0, BTN_W, BTN_H).fill(def.accent).stroke({ color: 0x000000, width: 3 });
    c.addChild(bg);

    const label = new Text({
      text: def.label,
      style: {
        fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
        fontSize: 26,
        fill: 0x1a1a2e,
        fontWeight: 'bold',
      },
    });
    label.anchor.set(0.5);
    label.position.set(BTN_W / 2, BTN_H / 2 - 8);
    c.addChild(label);

    const cdText = new Text({
      text: '',
      style: {
        fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
        fontSize: 16,
        fill: 0x1a1a2e,
        fontWeight: 'bold',
      },
    });
    cdText.anchor.set(0.5);
    cdText.position.set(BTN_W / 2, BTN_H - 18);
    c.addChild(cdText);

    const cooldownOverlay = new Graphics();
    cooldownOverlay.rect(0, 0, BTN_W, BTN_H).fill({ color: 0x000000, alpha: 0.55 });
    cooldownOverlay.visible = false;
    c.addChild(cooldownOverlay);

    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointerdown', () => this.onAbilityPressed(id));

    return {
      id,
      container: c,
      bg,
      label,
      cd: cdText,
      cooldownOverlay,
      ready: true,
      pending: false,
      cooldownRemaining: 0,
    };
  }

  private paintButton(btn: AbilityButton) {
    const def = ABILITY_DEFS[btn.id];
    btn.bg.clear();
    if (btn.pending) {
      btn.bg
        .rect(0, 0, BTN_W, BTN_H)
        .fill(def.accent)
        .stroke({ color: 0xffffff, width: 5 });
    } else {
      btn.bg
        .rect(0, 0, BTN_W, BTN_H)
        .fill(def.accent)
        .stroke({ color: 0x000000, width: 3 });
    }
    btn.cooldownOverlay.visible = !btn.ready;
    btn.cd.text = btn.ready ? 'READY' : `${btn.cooldownRemaining}`;
    btn.cd.style.fill = btn.ready ? 0x1a1a2e : 0xffffff;
    btn.container.cursor = btn.ready ? 'pointer' : 'not-allowed';
  }
}
