/**
 * Jest mock for Phaser 3.
 *
 * Phaser accesses window, document, and canvas at module load time, making it
 * incompatible with Node.js / jsdom. This stub replaces every Phaser import
 * in Jest with no-op constructors and chainable method stubs.
 *
 * Key requirements satisfied:
 * - `new Phaser.Game(config)` does not throw
 * - `class MyScene extends Phaser.Scene {}` works (base class must be a real class)
 * - `this.add.image()`, `this.tweens.add()`, etc. return chainable stubs
 * - `Phaser.Scale.RESIZE`, `Phaser.AUTO`, etc. are defined constants
 */

// ─── Chainable stub factory ───────────────────────────────────────────────────

/** A generic stub object where every method returns itself (chainable). */
function chainable(): Record<string, unknown> {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') return undefined; // prevent Promise detection
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler) as Record<string, unknown>;
}

/** Stub that acts as both a function and a chainable object. */
function stubFn() {
  const fn = jest.fn().mockReturnValue(chainable());
  return Object.assign(fn, chainable());
}

// ─── Base Scene class ─────────────────────────────────────────────────────────

class Scene {
  sys = chainable();
  add = {
    image: jest.fn().mockReturnValue(chainable()),
    graphics: jest.fn().mockReturnValue(chainable()),
    text: jest.fn().mockReturnValue(chainable()),
    container: jest.fn().mockReturnValue(chainable()),
    particles: jest.fn().mockReturnValue(chainable()),
    rectangle: jest.fn().mockReturnValue(chainable()),
    circle: jest.fn().mockReturnValue(chainable()),
    existing: jest.fn().mockReturnValue(chainable()),
  };
  tweens = {
    add: jest.fn().mockReturnValue(chainable()),
    addCounter: jest.fn().mockReturnValue(chainable()),
    killTweensOf: jest.fn(),
  };
  cameras = {
    main: {
      shake: jest.fn(),
      flash: jest.fn(),
      zoom: jest.fn(),
      zoomTo: jest.fn(),
      setZoom: jest.fn(),
      width: 800,
      height: 600,
    },
  };
  scale = {
    width: 800,
    height: 600,
    on: jest.fn(),
    off: jest.fn(),
    resize: jest.fn(),
    gameSize: { width: 800, height: 600 },
  };
  input = {
    on: jest.fn(),
    off: jest.fn(),
    setDraggable: jest.fn(),
    setPollAlways: jest.fn(),
  };
  matter = {
    add: {
      image: jest.fn().mockReturnValue(chainable()),
      rectangle: jest.fn().mockReturnValue(chainable()),
    },
    world: {
      setBounds: jest.fn(),
      on: jest.fn(),
    },
  };
  events = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
  };
  scene = {
    start: jest.fn(),
    stop: jest.fn(),
    restart: jest.fn(),
    get: jest.fn(),
    key: 'MockScene',
  };
  textures = {
    exists: jest.fn().mockReturnValue(false),
    get: jest.fn().mockReturnValue(chainable()),
    addBase64: jest.fn(),
    generate: jest.fn().mockReturnValue(chainable()),
  };
  load = {
    image: jest.fn(),
    atlas: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    start: jest.fn(),
  };
  time = {
    addEvent: jest.fn().mockReturnValue(chainable()),
    delayedCall: jest.fn().mockReturnValue(chainable()),
    removeEvent: jest.fn(),
  };
  physics = {
    add: {
      image: jest.fn().mockReturnValue(chainable()),
      group: jest.fn().mockReturnValue(chainable()),
    },
    world: {
      setBounds: jest.fn(),
      gravity: { y: 0 },
    },
  };
  make = {
    // Return real PhaserGraphics/PhaserText instances so tests can spy on methods
    graphics: jest.fn().mockImplementation(() => new PhaserGraphics()),
    text: jest.fn().mockImplementation(() => new PhaserText()),
  };
  game = {
    canvas: {
      style: {} as CSSStyleDeclaration,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    config: {},
    renderer: { gl: null },
  };

  constructor(_config?: object) {}

  create() {}
  preload() {}
  update(_time?: number, _delta?: number) {}
  init(_data?: unknown) {}
  shutdown() {}
}

// ─── GameObject stubs ─────────────────────────────────────────────────────────

class PhaserContainer {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  alpha = 1;
  visible = true;
  // Store scene so subclasses can call this.scene.tweens / this.scene.add etc.
  scene: Scene;
  add = jest.fn().mockReturnValue(this);
  remove = jest.fn().mockReturnValue(this);
  destroy = jest.fn();
  setPosition = jest.fn().mockReturnValue(this);
  setAlpha = jest.fn().mockReturnValue(this);
  setVisible = jest.fn().mockReturnValue(this);
  setInteractive = jest.fn().mockReturnValue(this);
  on = jest.fn().mockReturnValue(this);
  off = jest.fn().mockReturnValue(this);
  setSize = jest.fn().mockReturnValue(this);
  setScale = jest.fn().mockReturnValue(this);
  setDepth = jest.fn().mockReturnValue(this);

  constructor(scene: Scene, _x?: number, _y?: number) {
    this.scene = scene;
  }
}

class PhaserGraphics {
  // Store scene so subclasses (ComboRing, WordPathTrail) can call this.scene.tweens etc.
  scene: Scene;
  fillStyle = jest.fn().mockReturnValue(this);
  fillCircle = jest.fn().mockReturnValue(this);
  fillRect = jest.fn().mockReturnValue(this);
  fillRoundedRect = jest.fn().mockReturnValue(this);
  lineStyle = jest.fn().mockReturnValue(this);
  strokeCircle = jest.fn().mockReturnValue(this);
  strokeRect = jest.fn().mockReturnValue(this);
  strokeRoundedRect = jest.fn().mockReturnValue(this);
  beginPath = jest.fn().mockReturnValue(this);
  moveTo = jest.fn().mockReturnValue(this);
  lineTo = jest.fn().mockReturnValue(this);
  strokePath = jest.fn().mockReturnValue(this);
  fillPath = jest.fn().mockReturnValue(this);
  closePath = jest.fn().mockReturnValue(this);
  // Note: clear is defined on the prototype (not as an instance field) so that
  // `super.clear()` calls work correctly from subclasses like WordPathTrail.
  destroy = jest.fn();
  setAlpha = jest.fn().mockReturnValue(this);
  setDepth = jest.fn().mockReturnValue(this);
  setPosition = jest.fn().mockReturnValue(this);
  setBlendMode = jest.fn().mockReturnValue(this);
  setScale = jest.fn().mockReturnValue(this);
  arc = jest.fn().mockReturnValue(this);
  fillTriangle = jest.fn().mockReturnValue(this);
  generateTexture = jest.fn().mockReturnValue(this);
  x = 0;
  y = 0;
  alpha = 1;

  constructor(scene?: Scene) {
    // If called with a scene (e.g. ComboRing), store it for this.scene.tweens access
    // If called without (e.g. via scene.make.graphics), scene will be set later or unused
    this.scene = scene ?? new Scene();
  }
}
// Must be on the prototype (not an instance field) so `super.clear()` works
// correctly from subclasses like WordPathTrail. Class field syntax (e.g.
// `clear = jest.fn()`) sets the property on the instance only — super calls
// look at the prototype chain and would find undefined.
Object.defineProperty(PhaserGraphics.prototype, 'clear', {
  value: jest.fn().mockReturnThis(),
  writable: true,
  configurable: true,
});

class PhaserText {
  setText = jest.fn().mockReturnValue(this);
  setStyle = jest.fn().mockReturnValue(this);
  setFontSize = jest.fn().mockReturnValue(this);
  setColor = jest.fn().mockReturnValue(this);
  setOrigin = jest.fn().mockReturnValue(this);
  setPosition = jest.fn().mockReturnValue(this);
  setDepth = jest.fn().mockReturnValue(this);
  setAlpha = jest.fn().mockReturnValue(this);
  setVisible = jest.fn().mockReturnValue(this);
  setInteractive = jest.fn().mockReturnValue(this);
  destroy = jest.fn();
  on = jest.fn().mockReturnValue(this);
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  alpha = 1;
  visible = true;
  text = '';
}

class PhaserImage {
  setOrigin = jest.fn().mockReturnValue(this);
  setPosition = jest.fn().mockReturnValue(this);
  setScale = jest.fn().mockReturnValue(this);
  setAlpha = jest.fn().mockReturnValue(this);
  setDepth = jest.fn().mockReturnValue(this);
  setTint = jest.fn().mockReturnValue(this);
  setInteractive = jest.fn().mockReturnValue(this);
  setVisible = jest.fn().mockReturnValue(this);
  destroy = jest.fn();
  on = jest.fn().mockReturnValue(this);
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  alpha = 1;
  visible = true;
  texture = { key: '' };
}

// ─── Game class ───────────────────────────────────────────────────────────────

class Game {
  canvas = { style: {} as CSSStyleDeclaration };
  config = {};
  renderer = { gl: null };
  events = { on: jest.fn(), off: jest.fn(), emit: jest.fn() };
  scene = {
    add: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    get: jest.fn(),
    getScene: jest.fn(),
  };
  scale = {
    width: 800,
    height: 600,
    on: jest.fn(),
    resize: jest.fn(),
  };
  destroy = jest.fn();

  constructor(_config?: object) {}
}

// ─── Particle system stub ─────────────────────────────────────────────────────

const ParticleEmitter = {
  setPosition: jest.fn().mockReturnThis(),
  explode: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  setSpeed: jest.fn().mockReturnThis(),
  setScale: jest.fn().mockReturnThis(),
  setAlpha: jest.fn().mockReturnThis(),
  setLifespan: jest.fn().mockReturnThis(),
  setQuantity: jest.fn().mockReturnThis(),
  setGravityY: jest.fn().mockReturnThis(),
  setBlendMode: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
};

// ─── Phaser namespace exports ─────────────────────────────────────────────────

const Phaser = {
  Game,
  Scene,

  GameObjects: {
    Container: PhaserContainer,
    Graphics: PhaserGraphics,
    Text: PhaserText,
    Image: PhaserImage,
    GameObject: class {},
    Particles: {
      ParticleEmitter,
      ParticleEmitterManager: class {
        createEmitter = jest.fn().mockReturnValue(ParticleEmitter);
        setDepth = jest.fn().mockReturnThis();
        destroy = jest.fn();
      },
    },
  },

  Physics: {
    Matter: {
      MatterPhysics: class {},
      Matter: {
        Bodies: {
          rectangle: jest.fn().mockReturnValue({}),
          circle: jest.fn().mockReturnValue({}),
        },
        Body: {
          setStatic: jest.fn(),
          setVelocity: jest.fn(),
        },
        World: class {},
      },
    },
    Arcade: {
      ArcadePhysics: class {},
      Group: class {},
    },
  },

  Tweens: {
    Tween: class {},
    TweenManager: class {},
  },

  Scale: {
    RESIZE: 'RESIZE',
    FIT: 'FIT',
    NONE: 'NONE',
    CENTER_BOTH: 'CENTER_BOTH',
    CENTER_HORIZONTALLY: 'CENTER_HORIZONTALLY',
    ScaleManager: class {},
  },

  Math: {
    Clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
    Between: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    FloatBetween: (min: number, max: number) => Math.random() * (max - min) + min,
    DegToRad: (deg: number) => (deg * Math.PI) / 180,
    RadToDeg: (rad: number) => (rad * 180) / Math.PI,
    Distance: {
      Between: (x1: number, y1: number, x2: number, y2: number) =>
        Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
    },
    Vector2: class {
      x: number;
      y: number;
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
      normalize() { return this; }
      length() { return Math.sqrt(this.x ** 2 + this.y ** 2); }
    },
  },

  Display: {
    Color: {
      IntegerToRGB: jest.fn().mockReturnValue({ r: 0, g: 0, b: 0 }),
      RGBToString: jest.fn().mockReturnValue('#000000'),
      HexStringToColor: jest.fn().mockReturnValue({ color: 0 }),
      GetColor: jest.fn().mockReturnValue(0),
      GetColor32: jest.fn().mockReturnValue(0),
    },
  },

  BlendModes: {
    NORMAL: 0,
    ADD: 1,
    MULTIPLY: 2,
    SCREEN: 3,
  },

  Input: {
    Events: {
      POINTER_DOWN: 'pointerdown',
      POINTER_MOVE: 'pointermove',
      POINTER_UP: 'pointerup',
    },
    Keyboard: {
      KeyCodes: {},
    },
  },

  // Common renderer type constants
  AUTO: 0,
  CANVAS: 1,
  WEBGL: 2,
  HEADLESS: 3,
};

module.exports = Phaser;
module.exports.default = Phaser;
