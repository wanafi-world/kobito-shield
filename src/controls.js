// キーボードとタッチボタンをまとめて読む。
// held: 押している間 true / pressed: 押した瞬間だけ true / released: 離した瞬間だけ true
const NAMES = ['left', 'right', 'up', 'down', 'jump', 'shield', 'chain'];

export class Controls {
  constructor(scene) {
    this.scene = scene;
    this.held = {}; this.pressed = {}; this.released = {};
    NAMES.forEach(n => { this.held[n] = false; });

    const kb = scene.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb ? {
      left: [kb.addKey(K.LEFT), kb.addKey(K.A)],
      right: [kb.addKey(K.RIGHT), kb.addKey(K.D)],
      up: [kb.addKey(K.UP), kb.addKey(K.W)],
      down: [kb.addKey(K.DOWN), kb.addKey(K.S)],
      jump: [kb.addKey(K.Z), kb.addKey(K.SPACE), kb.addKey(K.J)],
      shield: [kb.addKey(K.X), kb.addKey(K.K)],
      chain: [kb.addKey(K.C), kb.addKey(K.L)],
    } : null;

    this.isTouch = scene.sys.game.device.input.touch;
    this.buttons = [];
    const H = scene.scale.height;
    this.dpad = { x: 130, y: H - 110, r: 115 };
    if (this.isTouch) this.createTouchUI();
  }

  createTouchUI() {
    const s = this.scene;
    const style = { fontFamily: '"Hiragino Sans","Noto Sans JP",sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' };
    const d = this.dpad;
    const base = s.add.circle(d.x, d.y, d.r, 0x000000, 0.18).setScrollFactor(0).setDepth(100);
    base.setStrokeStyle(3, 0xffffff, 0.35);
    this.arrows = {};
    [['left', -70, 0, '◀'], ['right', 70, 0, '▶'], ['up', 0, -70, '▲'], ['down', 0, 70, '▼']].forEach(([n, dx, dy, t]) => {
      const c = s.add.circle(d.x + dx, d.y + dy, 34, 0xffffff, 0.25).setScrollFactor(0).setDepth(101);
      s.add.text(d.x + dx, d.y + dy, t, style).setOrigin(0.5).setScrollFactor(0).setDepth(102);
      this.arrows[n] = c;
    });
    const btn = (name, x, y, r, label, color) => {
      const c = s.add.circle(x, y, r, color, 0.45).setScrollFactor(0).setDepth(101);
      c.setStrokeStyle(3, 0xffffff, 0.6);
      s.add.text(x, y, label, style).setOrigin(0.5).setScrollFactor(0).setDepth(102);
      this.buttons.push({ name, x, y, r, c });
    };
    const H = s.scale.height;
    btn('jump', 875, H - 95, 58, 'ジャンプ', 0x43a047);
    btn('shield', 750, H - 70, 50, '盾', 0x8d6e63);
    btn('chain', 800, H - 195, 46, 'チェーン', 0x607d8b);
  }

  update() {
    const now = {};
    NAMES.forEach(n => {
      now[n] = !!(this.keys && this.keys[n].some(k => k.isDown));
    });

    if (this.isTouch) {
      const d = this.dpad;
      for (const p of this.scene.input.manager.pointers) {
        if (!p.isDown) continue;
        const dx = p.x - d.x, dy = p.y - d.y;
        if (Math.hypot(dx, dy) < d.r * 1.3) {
          if (dx < -22) now.left = true;
          if (dx > 22) now.right = true;
          if (dy < -38) now.up = true;
          if (dy > 38) now.down = true;
          continue;
        }
        for (const b of this.buttons) {
          if (Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.2) now[b.name] = true;
        }
      }
      for (const b of this.buttons) b.c.setFillStyle(b.c.fillColor, now[b.name] ? 0.85 : 0.45);
      for (const n in this.arrows) this.arrows[n].setFillStyle(0xffffff, now[n] ? 0.7 : 0.25);
    }

    NAMES.forEach(n => {
      this.pressed[n] = now[n] && !this.held[n];
      this.released[n] = !now[n] && this.held[n];
      this.held[n] = now[n];
    });
  }

  anyPressed() {
    return NAMES.some(n => this.pressed[n]);
  }
}
