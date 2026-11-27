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
    // 移動スティック: 画面の左半分のどこを触っても、触った場所が中心になる
    this.stick = null;
    this.stickBase = s.add.circle(d.x, d.y, 70, 0x000000, 0.18).setScrollFactor(0).setDepth(100);
    this.stickBase.setStrokeStyle(3, 0xffffff, 0.4);
    this.stickKnob = s.add.circle(d.x, d.y, 30, 0xffffff, 0.4).setScrollFactor(0).setDepth(101);
    this.stickHint = s.add.text(d.x, d.y + 95, '左半分のどこでも\n触って動かす', {
      ...style, fontSize: '14px', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setAlpha(0.7);
    this.setStickIdle();
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
      const pointers = this.scene.input.manager.pointers.filter(p => p.isDown);
      const used = new Set();
      for (const p of pointers) {
        for (const b of this.buttons) {
          if (Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.2) { now[b.name] = true; used.add(p); }
        }
      }
      // スティックの指が離れたら消す
      if (this.stick && !pointers.some(p => p.id === this.stick.id)) {
        this.stick = null;
        this.setStickIdle();
      }
      // 左半分に新しく触れた指をスティックにする
      if (!this.stick) {
        const p = pointers.find(p => !used.has(p) && p.downX < 480);
        if (p) this.stick = { id: p.id, ox: p.downX, oy: p.downY };
      }
      if (this.stick) {
        const p = pointers.find(p => p.id === this.stick.id);
        const st = this.stick, R = 70;
        let dx = p.x - st.ox, dy = p.y - st.oy;
        const dist = Math.hypot(dx, dy);
        if (dist > R) {
          // 指が外に出たら、中心も指についていく
          st.ox = p.x - dx / dist * R; st.oy = p.y - dy / dist * R;
          dx = p.x - st.ox; dy = p.y - st.oy;
        }
        if (dx < -18) now.left = true;
        if (dx > 18) now.right = true;
        if (dy < -32) now.up = true;
        if (dy > 32) now.down = true;
        this.stickBase.setPosition(st.ox, st.oy).setAlpha(1);
        this.stickKnob.setPosition(st.ox + dx, st.oy + dy).setAlpha(1);
        this.stickHint.setVisible(false);
      }
      for (const b of this.buttons) b.c.setFillStyle(b.c.fillColor, now[b.name] ? 0.85 : 0.45);
    }

    NAMES.forEach(n => {
      this.pressed[n] = now[n] && !this.held[n];
      this.released[n] = !now[n] && this.held[n];
      this.held[n] = now[n];
    });
  }

  setStickIdle() {
    const d = this.dpad;
    this.stickBase.setPosition(d.x, d.y).setAlpha(0.5);
    this.stickKnob.setPosition(d.x, d.y).setAlpha(0.5);
    this.stickHint.setVisible(true);
  }

  anyPressed() {
    return NAMES.some(n => this.pressed[n]);
  }
}
