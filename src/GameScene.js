import { makeTextures } from './textures.js';
import { buildLevel, TILE } from './level.js';
import { Controls } from './controls.js';

// 調整しやすいように、動きの数値はここにまとめる。
const P = {
  speed: 180,          // 歩く速さ
  shieldSpeed: 90,     // 盾を構えている間の速さ
  jump: 520,           // ジャンプの強さ
  coyote: 90,          // 足場から落ちた直後でもジャンプできる時間(ms)
  parryWindow: 180,    // 盾を構えてからパリィになる時間(ms)
  parryCooldown: 250,  // 盾を離してから次にパリィできるまでの時間(ms)
  chainMax: 340,       // チェーンの長さ(px)
  chainSpeed: 1600,    // チェーンが伸びる速さ
  retractSpeed: 2200,  // チェーンが戻る速さ
  pullSpeed: 650,      // チェーンで引っぱられる速さ
  invuln: 1200,        // ダメージ後の無敵時間(ms)
  maxHp: 3,
};

const FONT = '"Hiragino Sans","Noto Sans JP",sans-serif';

export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  create() {
    makeTextures(this);
    const L = this.level = buildLevel();
    this.worldW = L.w * TILE;
    this.worldH = L.h * TILE;

    this.drawBackground();
    this.buildTiles();

    this.physics.world.setBounds(0, -300, this.worldW, this.worldH + 600);
    this.physics.world.setBoundsCollision(true, true, false, false);

    // チェックポイント
    this.checkpoints = L.checkpoints.map(c => ({
      x: c.tx * TILE + 16, y: c.ty * TILE + 16,
      img: this.add.image(c.tx * TILE + 11, (c.ty + 1) * TILE - 16, 'cp').setDepth(2),
    }));
    this.checkpoint = this.checkpoints[0];
    this.checkpoint.img.setTexture('cpOn');

    // 看板
    for (const s of L.signs) {
      this.add.text(s.tx * TILE, s.ty * TILE, s.text, {
        fontFamily: FONT, fontSize: '15px', color: '#3e2723',
        backgroundColor: '#fff8e1', padding: { x: 8, y: 6 }, lineSpacing: 4,
      }).setDepth(1).setAlpha(0.92);
    }

    // ゴール
    this.goal = this.physics.add.staticImage(L.goal.tx * TILE + 20, (L.goal.ty + 1) * TILE - 32, 'flag');

    // こびと
    this.player = this.physics.add.sprite(L.start.tx * TILE + 16, L.start.ty * TILE + 16, 'kobito').setDepth(10);
    this.player.body.setSize(16, 28).setOffset(4, 4);
    this.player.setCollideWorldBounds(true);
    this.shieldImg = this.add.image(0, 0, 'shield').setDepth(11);
    this.chainGfx = this.add.graphics().setDepth(9);

    this.hp = P.maxHp;
    this.facing = 1;
    this.invulnUntil = 0;
    this.hurtUntil = 0;
    this.lastGround = 0;
    this.shielding = false;
    this.shieldStart = -9999;
    this.lastShieldRelease = -9999;
    this.parryOk = false;
    this.parryActive = false;
    this.airJump = false;
    this.chain = null;
    this.pulling = false;
    this.kills = 0;
    this.over = false;

    // 敵と針
    this.enemies = this.physics.add.group();
    this.needles = this.physics.add.group();
    for (const e of L.entities) this.spawnEnemy(e.type, e.tx * TILE + 16, e.ty * TILE + 16);

    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.needles, this.solids, n => this.spark(n.x, n.y, 0x888888) || n.destroy());
    this.physics.add.overlap(this.player, this.enemies, (p, e) => this.onPlayerEnemy(e));
    this.physics.add.overlap(this.player, this.needles, (p, n) => this.onPlayerNeedle(n));
    this.physics.add.overlap(this.needles, this.enemies, (n, e) => this.onNeedleEnemy(n, e));
    this.physics.add.overlap(this.enemies, this.enemies, (a, b) => this.onEnemyEnemy(a, b));
    this.physics.add.overlap(this.player, this.goal, () => this.clearStage());

    // 画面がステージより縦に長いときは、上に空が見えるようにする
    const viewH = this.scale.height;
    this.cameras.main.setBounds(0, Math.min(0, this.worldH - viewH), this.worldW, Math.max(this.worldH, viewH));
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.controls = new Controls(this);
    this.createHud();
  }

  // ---------- ステージ ----------

  drawBackground() {
    const W = this.worldW, H = this.worldH;
    // 雲（遠い）
    const clouds = this.add.graphics().setScrollFactor(0.1, 1).setDepth(-30);
    clouds.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 12; i++) {
      const x = i * 260 + (i % 3) * 40, y = -120 + (i % 4) * 60;
      clouds.fillEllipse(x, y, 140, 40); clouds.fillEllipse(x + 40, y - 14, 90, 40);
    }
    // 大きな草（小人から見た世界なので草が木のように大きい）
    const blades = this.add.graphics().setScrollFactor(0.4, 1).setDepth(-20);
    for (let i = 0; i < W * 0.4 / 50 + 20; i++) {
      const x = i * 50 + ((i * 37) % 23), h = 220 + ((i * 53) % 160);
      blades.fillStyle(i % 2 ? 0x9ccc65 : 0x8bc34a, 0.9);
      blades.fillTriangle(x - 14, H, x + 14, H, x + ((i % 3) - 1) * 30, H - h);
    }
    // 大きな花
    const flowers = this.add.graphics().setScrollFactor(0.6, 1).setDepth(-10);
    for (let i = 0; i < W * 0.6 / 420 + 4; i++) {
      const x = 200 + i * 420, top = 150 + ((i * 71) % 90);
      flowers.fillStyle(0x689f38); flowers.fillRect(x - 4, top, 8, H - top);
      const col = [0xf48fb1, 0xfff176, 0xce93d8, 0xffffff][i % 4];
      flowers.fillStyle(col);
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        flowers.fillCircle(x + Math.cos(a) * 26, top + Math.sin(a) * 26, 20);
      }
      flowers.fillStyle(0xffb300); flowers.fillCircle(x, top, 16);
    }
  }

  buildTiles() {
    const L = this.level;
    this.solids = this.physics.add.staticGroup();
    for (let y = 0; y < L.h; y++) {
      let x = 0;
      while (x < L.w) {
        if (!L.solid(x, y)) { x++; continue; }
        let x2 = x;
        while (x2 + 1 < L.w && L.solid(x2 + 1, y)) x2++;
        const zone = this.add.zone((x + x2 + 1) * TILE / 2, y * TILE + TILE / 2, (x2 - x + 1) * TILE, TILE);
        this.solids.add(zone);
        for (let t = x; t <= x2; t++) {
          this.add.image(t * TILE + 16, y * TILE + 16, L.solid(t, y - 1) ? 'dirt' : 'grass');
        }
        x = x2 + 1;
      }
    }
  }

  createHud() {
    this.hearts = [];
    for (let i = 0; i < P.maxHp; i++) {
      this.hearts.push(this.add.image(24 + i * 24, 24, 'heart').setScrollFactor(0).setDepth(100));
    }
    this.killText = this.add.text(100, 13, '', {
      fontFamily: FONT, fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setScrollFactor(0).setDepth(100);
    this.updateHud();

    // 全画面ボタン
    const fs = this.add.text(930, 12, '⛶', {
      fontFamily: FONT, fontSize: '26px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100).setInteractive();
    fs.on('pointerup', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen();
    });
  }

  updateHud() {
    this.hearts.forEach((h, i) => h.setTexture(i < this.hp ? 'heart' : 'heartEmpty'));
    this.killText.setText(`たおした虫: ${this.kills}`);
  }

  // ---------- 敵 ----------

  spawnEnemy(kind, x, y) {
    const e = this.physics.add.sprite(x, y, kind).setDepth(8);
    this.enemies.add(e);
    e.kind = kind;
    e.alive = true;
    e.state = 'walk';
    e.until = 0;
    e.dir = -1;
    e.cool = 0;
    e.lastPush = 0;
    e.homeX = x; e.homeY = y;
    e.phase = Math.random() * Math.PI * 2;
    e.nextShot = 1500 + Math.random() * 1000;
    if (kind === 'ant') e.body.setSize(26, 14).setOffset(2, 4);
    if (kind === 'bee') { e.body.setAllowGravity(false); e.body.setSize(24, 16).setOffset(3, 6); }
    if (kind === 'beetle') e.body.setSize(36, 22).setOffset(2, 8);
    return e;
  }

  updateEnemy(e, time, dt) {
    if (!e.active || !e.alive) return;
    const b = e.body;
    if (e.y > this.worldH + 60) { this.defeat(e, false); return; }

    if (e.state === 'knock') {
      if (b.blocked.down) b.setVelocityX(b.velocity.x * Math.pow(0.15, dt));
      if (time > e.until && (b.blocked.down || e.kind === 'bee')) {
        if (e.kind === 'beetle' && time < e.stunUntil) e.state = 'stun';
        else { e.state = 'walk'; e.setFlipY(false); }
      }
      return;
    }

    if (e.kind === 'ant') {
      this.walk(e, 50);
    } else if (e.kind === 'bee') {
      this.updateBee(e, time);
    } else if (e.kind === 'beetle') {
      this.updateBeetle(e, time);
    }
  }

  // 歩いて、壁や足場の端で向きを変える
  walk(e, speed) {
    const b = e.body;
    if (b.blocked.left) e.dir = 1;
    if (b.blocked.right) e.dir = -1;
    if (b.blocked.down) {
      const fx = e.x + e.dir * (b.width / 2 + 2);
      if (!this.level.solidAtPx(fx, b.bottom + 4)) e.dir *= -1;
    }
    b.setVelocityX(e.dir * speed);
    e.setFlipX(e.dir < 0);
  }

  updateBee(e, time) {
    const b = e.body, p = this.player;
    const t = time / 1000;
    e.setFlipX(p.x < e.x);
    if (e.state === 'walk') {
      const tx = e.homeX + Math.sin(t * 0.8 + e.phase) * 60;
      const ty = e.homeY + Math.sin(t * 2 + e.phase) * 12;
      b.setVelocity((tx - e.x) * 3, (ty - e.y) * 3);
      if (time > e.nextShot && Math.abs(p.x - e.x) < 480 && Math.abs(p.y - e.y) < 320) {
        e.state = 'aim';
        e.until = time + 450;
        e.setTint(0xff6d00);
      }
    } else if (e.state === 'aim') {
      b.setVelocity(0, 0);
      e.x += Math.sin(time * 0.08) * 0.8;
      if (time > e.until) {
        e.clearTint();
        e.state = 'walk';
        e.nextShot = time + 2200;
        const n = this.physics.add.image(e.x, e.y + 4, 'needle').setDepth(9);
        this.needles.add(n);
        n.body.setAllowGravity(false);
        n.owner = 'enemy';
        const ang = Phaser.Math.Angle.Between(e.x, e.y, p.x, p.y);
        n.setRotation(ang);
        n.body.setVelocity(Math.cos(ang) * 260, Math.sin(ang) * 260);
      }
    }
  }

  updateBeetle(e, time) {
    const b = e.body, p = this.player;
    if (e.state === 'walk') {
      this.walk(e, 40);
      const dx = p.x - e.x;
      if (time > e.cool && Math.abs(dx) < 300 && Math.abs(p.y - e.y) < 40 && this.hp > 0) {
        e.state = 'windup';
        e.dir = Math.sign(dx) || 1;
        e.setFlipX(e.dir < 0);
        e.until = time + 550;
        e.setTint(0xff5252);
        b.setVelocityX(0);
      }
    } else if (e.state === 'windup') {
      b.setVelocityX(0);
      e.x += Math.sin(time * 0.1) * 0.8;
      if (time > e.until) {
        e.state = 'charge';
        e.until = time + 1800;
      }
    } else if (e.state === 'charge') {
      b.setVelocityX(e.dir * 340);
      if ((e.dir < 0 && b.blocked.left) || (e.dir > 0 && b.blocked.right)) {
        this.cameras.main.shake(150, 0.006);
        this.spark(e.x + e.dir * 20, e.y, 0xffffff, 8);
        this.stunBeetle(e, time, 2500);
      } else if (time > e.until) {
        e.clearTint();
        e.state = 'walk';
        e.cool = time + 1000;
      }
    } else if (e.state === 'stun') {
      if (b.blocked.down) b.setVelocityX(0);
      if (time > e.stunUntil) {
        e.state = 'walk';
        e.setFlipY(false);
        e.cool = time + 800;
      }
    }
  }

  stunBeetle(e, time, ms) {
    e.clearTint();
    e.state = 'stun';
    e.stunUntil = time + ms;
    e.setFlipY(true);
    e.body.setVelocityX(0);
  }

  knockEnemy(e, dir, vx, vy, ms) {
    if (!e.alive) return;
    e.clearTint();
    e.state = 'knock';
    e.until = this.time.now + ms;
    e.body.setVelocity(dir * vx, vy);
  }

  defeat(e, flyOff) {
    if (!e.alive) return;
    e.alive = false;
    this.kills++;
    this.updateHud();
    this.popText(e.x, Math.min(e.y, this.worldH - 40), 'たおした！', '#ffeb3b');
    if (!flyOff) { e.destroy(); return; }
    e.state = 'dying';
    e.clearTint();
    e.body.checkCollision.none = true;
    e.body.setAllowGravity(true);
    e.body.setVelocity(Phaser.Math.Between(-80, 80), -320);
    this.tweens.add({ targets: e, angle: 540, alpha: 0, duration: 1100, onComplete: () => e.destroy() });
  }

  // ---------- ぶつかったとき ----------

  onPlayerEnemy(e) {
    if (!e.alive || this.over) return;
    const now = this.time.now;
    const side = Math.sign(e.x - this.player.x) || this.facing;
    const guarded = this.shielding && side === this.facing;

    if (guarded) {
      if (now - e.lastPush < 150) return;
      e.lastPush = now;
      const parry = this.parryActive;
      if (e.kind === 'beetle' && (e.state === 'charge' || e.state === 'windup')) {
        if (parry) {
          this.parryFx(e.x - side * 16, e.y);
          this.stunBeetle(e, now, 2500);
          this.knockEnemy(e, this.facing, 320, -200, 500);
        } else {
          // 普通に受けると止められるが、こびとは大きく押し戻される
          this.player.body.setVelocity(-this.facing * 380, -120);
          this.hurtUntil = now + 250;
          e.clearTint();
          e.state = 'walk';
          e.cool = now + 1200;
          e.body.setVelocityX(0);
          this.spark(e.x - side * 16, e.y, 0xffffff, 6);
        }
        return;
      }
      let power = parry ? 460 : 260;
      if (e.kind === 'beetle' && e.state !== 'stun') power = parry ? 300 : 110;
      if (parry) this.parryFx(e.x - side * 12, e.y);
      if (e.kind === 'beetle' && e.state === 'stun') e.stunUntil = Math.max(e.stunUntil, now + 900);
      this.knockEnemy(e, this.facing, power, parry ? -240 : -140, parry ? 600 : 400);
      return;
    }

    if (e.state === 'stun' || e.state === 'knock') return; // ひっくり返った敵や飛ばされた敵には当たってもOK
    this.hurtPlayer(side);
  }

  onPlayerNeedle(n) {
    if (n.owner !== 'enemy' || this.over) return;
    const side = Math.sign(n.x - this.player.x) || this.facing;
    if (this.shielding && side === this.facing) {
      if (this.parryActive) {
        // パリィ: 針が速くなって跳ね返る
        n.owner = 'player';
        n.setTexture('needleP');
        n.body.setVelocity(-n.body.velocity.x * 1.8, -n.body.velocity.y * 1.8);
        n.setRotation(n.rotation + Math.PI);
        this.parryFx(n.x, n.y);
      } else {
        this.spark(n.x, n.y, 0xffffff, 4);
        n.destroy();
      }
      return;
    }
    n.destroy();
    this.hurtPlayer(side);
  }

  onNeedleEnemy(n, e) {
    if (n.owner !== 'player' || !e.alive) return;
    n.destroy();
    this.defeat(e, true);
  }

  onEnemyEnemy(a, b) {
    if (a === b || !a.alive || !b.alive) return;
    const heavy = x => x.kind === 'beetle' && (x.state === 'charge' || (x.state === 'knock' && Math.abs(x.body.velocity.x) > 200));
    const flying = x => x.state === 'knock' && Math.abs(x.body.velocity.x) > 200;
    for (const [att, tgt] of [[a, b], [b, a]]) {
      if (heavy(att) && tgt.kind !== 'beetle') { this.defeat(tgt, true); return; }
      if (flying(att) && tgt.state !== 'knock') {
        // 飛ばした敵が別の敵に当たると、その敵も押し出される
        this.knockEnemy(tgt, Math.sign(att.body.velocity.x), tgt.kind === 'beetle' ? 120 : 300, -160, 400);
        return;
      }
    }
  }

  hurtPlayer(side) {
    const now = this.time.now;
    if (now < this.invulnUntil || this.over) return;
    this.hp--;
    this.updateHud();
    this.invulnUntil = now + P.invuln;
    this.hurtUntil = now + 300;
    this.endChain();
    this.player.body.setVelocity(-side * 220, -260);
    this.cameras.main.shake(120, 0.008);
    if (this.hp <= 0) this.gameOver();
  }

  // ---------- こびと ----------

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const c = this.controls;
    c.update();

    if (this.over) {
      if (time > this.overAt + 600 && (c.anyPressed() || this.input.activePointer.isDown)) this.scene.restart();
      return;
    }

    this.updatePlayer(time);
    this.updateChain(dt);
    for (const e of this.enemies.getChildren().slice()) this.updateEnemy(e, time, dt);
    for (const n of this.needles.getChildren().slice()) {
      if (n.x < -50 || n.x > this.worldW + 50 || n.y > this.worldH + 50 || n.y < -300) n.destroy();
    }

    // チェックポイント
    for (const cp of this.checkpoints) {
      if (cp !== this.checkpoint && this.player.x > cp.x && cp.x > this.checkpoint.x) {
        this.checkpoint.img.setTexture('cp');
        this.checkpoint = cp;
        cp.img.setTexture('cpOn');
      }
    }

    // 穴に落ちた
    if (this.player.y > this.worldH + 40) {
      this.hp--;
      this.updateHud();
      if (this.hp <= 0) { this.gameOver(); return; }
      this.endChain();
      this.player.setPosition(this.checkpoint.x, this.checkpoint.y);
      this.player.body.setVelocity(0, 0);
      this.invulnUntil = time + P.invuln;
    }
  }

  updatePlayer(time) {
    const c = this.controls, p = this.player, b = p.body;
    const onGround = b.blocked.down;
    if (onGround) { this.lastGround = time; this.airJump = false; }

    // 盾
    if (c.pressed.shield) {
      this.shieldStart = time;
      this.parryOk = time - this.lastShieldRelease > P.parryCooldown;
    }
    const was = this.shielding;
    this.shielding = c.held.shield && !this.pulling;
    if (was && !this.shielding) this.lastShieldRelease = time;
    this.parryActive = this.shielding && this.parryOk && time - this.shieldStart < P.parryWindow;

    if (this.chain && this.chain.phase === 'pull' && c.pressed.jump) this.chain.jumpQueued = true;
    if (this.chain && this.chain.phase === 'hang') this.updateHang(time);

    if (!this.pulling) {
      const dx = (c.held.right ? 1 : 0) - (c.held.left ? 1 : 0);
      if (dx) this.facing = dx;
      if (time > this.hurtUntil) b.setVelocityX(dx * (this.shielding ? P.shieldSpeed : P.speed));

      if (c.pressed.jump) {
        if (onGround || time - this.lastGround < P.coyote) {
          b.setVelocityY(-P.jump);
          this.lastGround = -9999;
        } else if (this.airJump) {
          b.setVelocityY(-P.jump * 0.9);
          this.airJump = false;
        }
      }
      if (c.released.jump && b.velocity.y < 0) b.setVelocityY(b.velocity.y * 0.5);

      if (c.pressed.chain && !this.chain) {
        let dir;
        if (c.held.up) dir = { x: 0, y: -1 };
        else if (c.held.down && !onGround) dir = { x: 0, y: 1 };
        else dir = { x: this.facing, y: 0 };
        this.chain = { phase: 'extend', dir, len: 0, t: 0 };
      }
    }

    p.setFlipX(this.facing < 0);
    p.setAlpha(time < this.invulnUntil && Math.floor(time / 80) % 2 ? 0.4 : 1);

    // 盾の絵: 構えているときは前、それ以外は背中
    const s = this.shieldImg;
    if (this.shielding) {
      s.setPosition(p.x + this.facing * 11, p.y + 3).setDepth(11).setScale(1);
      if (this.parryActive) s.setTintFill(0xffffff); else s.clearTint();
    } else {
      s.clearTint();
      s.setPosition(p.x - this.facing * 7, p.y + 4).setDepth(9).setScale(0.8);
    }
  }

  updateChain(dt) {
    const ch = this.chain, g = this.chainGfx;
    g.clear();
    if (!ch) return;
    const p = this.player, b = p.body, L = this.level;
    const ox = p.x, oy = p.y;

    if (ch.phase === 'extend') {
      let step = P.chainSpeed * dt;
      while (step > 0) {
        const d = Math.min(4, step);
        step -= d;
        ch.len += d;
        const tx = ox + ch.dir.x * ch.len, ty = oy + ch.dir.y * ch.len;
        const hit = this.enemies.getChildren().find(e => e.alive && e.body.hitTest(tx, ty));
        if (hit) {
          // チェーンが当たった敵は少しノックバック（ダメージはなし）
          const kd = ch.dir.x || Math.sign(hit.x - p.x) || this.facing;
          const strong = hit.kind === 'beetle' && hit.state !== 'stun';
          this.knockEnemy(hit, kd, strong ? 90 : 220, -120, 350);
          this.spark(tx, ty, 0xb0bec5, 5);
          ch.phase = 'retract';
          break;
        }
        if (L.solidAtPx(tx, ty)) {
          ch.phase = 'pull';
          ch.anchor = { x: tx - ch.dir.x * 2, y: ty - ch.dir.y * 2 };
          ch.t = 0;
          this.pulling = true;
          b.setAllowGravity(false);
          this.spark(tx, ty, 0xffffff, 4);
          break;
        }
        if (ch.len >= P.chainMax) { ch.phase = 'retract'; break; }
      }
      ch.tip = { x: ox + ch.dir.x * ch.len, y: oy + ch.dir.y * ch.len };
    } else if (ch.phase === 'retract') {
      ch.len -= P.retractSpeed * dt;
      if (ch.len <= 0) { this.chain = null; return; }
      ch.tip = { x: ox + ch.dir.x * ch.len, y: oy + ch.dir.y * ch.len };
    } else if (ch.phase === 'pull') {
      ch.t += dt;
      const dx = ch.anchor.x - p.x, dy = ch.anchor.y - p.y, d = Math.hypot(dx, dy);
      const blocked = (ch.dir.x > 0 && b.blocked.right) || (ch.dir.x < 0 && b.blocked.left)
        || (ch.dir.y < 0 && b.blocked.up) || (ch.dir.y > 0 && b.blocked.down);
      if (d < 20 || blocked || ch.t > 0.8) {
        if (ch.dir.y > 0) { this.releaseHang(); return this.updateChain(0); }
        // 着いたら少しの間ぶら下がる（チェーンを押し続けるとずっとぶら下がれる）
        ch.phase = 'hang';
        ch.hangUntil = this.time.now + 700;
        b.setVelocity(0, 0);
      } else {
        b.setVelocity(dx / d * P.pullSpeed, dy / d * P.pullSpeed);
      }
      ch.tip = ch.anchor;
    } else if (ch.phase === 'hang') {
      if (!(ch.dir.y < 0 && (this.controls.held.left || this.controls.held.right))) b.setVelocity(0, 0);
      ch.tip = ch.anchor;
    }

    // チェーンを描く
    const tx = ch.tip.x, ty = ch.tip.y;
    const len = Math.hypot(tx - ox, ty - oy);
    g.lineStyle(2, 0x9e9e9e);
    for (let i = 0; i <= len; i += 7) {
      const k = len ? i / len : 0;
      g.strokeCircle(ox + (tx - ox) * k, oy + (ty - oy) * k, 3);
    }
    g.fillStyle(0x616161);
    g.fillCircle(tx, ty, 5);
  }

  // ぶら下がり中の操作: ジャンプで跳ぶ / 横に動くと離れる / チェーンを離して少したつと落ちる
  updateHang(time) {
    const c = this.controls, ch = this.chain, b = this.player.body;
    const dx = (c.held.right ? 1 : 0) - (c.held.left ? 1 : 0);
    if (dx) this.facing = dx;
    if (c.pressed.jump || ch.jumpQueued) {
      this.releaseHang();
      this.airJump = false;
      b.setVelocityY(-P.jump);
      b.setVelocityX(dx * P.speed);
    } else if (c.pressed.down) {
      this.releaseHang();
    } else if (ch.dir.y < 0 && dx) {
      // 天井ではチェーンを掛け直しながら横に進める（うんてい）
      const p = this.player;
      if (this.level.solidAtPx(p.x + dx * 10, b.top - 6)) {
        b.setVelocity(dx * 130, 0);
        ch.anchor.x = p.x;
        ch.hangUntil = Math.max(ch.hangUntil, time + 250);
      } else {
        this.releaseHang();
        b.setVelocityX(dx * P.speed);
      }
    } else if (dx && dx === -ch.dir.x) {
      this.releaseHang();
      b.setVelocityX(dx * P.speed);
    } else if (time > ch.hangUntil && !c.held.chain) {
      this.releaseHang();
    }
  }

  releaseHang() {
    const ch = this.chain, b = this.player.body;
    this.pulling = false;
    b.setAllowGravity(true);
    b.setVelocity(0, 0);
    this.airJump = true;
    ch.phase = 'retract';
    ch.len = Math.hypot(ch.anchor.x - this.player.x, ch.anchor.y - this.player.y);
  }

  endChain() {
    if (this.pulling) this.player.body.setAllowGravity(true);
    this.pulling = false;
    this.chain = null;
    this.chainGfx.clear();
  }

  // ---------- 演出 ----------

  parryFx(x, y) {
    const ring = this.add.circle(x, y, 8).setStrokeStyle(4, 0x4fc3f7).setDepth(20);
    this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
    this.popText(x, y - 20, 'パリィ！', '#4fc3f7');
    this.cameras.main.shake(80, 0.004);
    // 一瞬止める（ヒットストップ）
    this.physics.world.pause();
    this.time.delayedCall(70, () => { if (!this.over) this.physics.world.resume(); });
  }

  spark(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
      const s = this.add.image(x, y, 'spark').setTint(color).setDepth(20).setScale(0.6);
      const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 18;
      this.tweens.add({
        targets: s, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, alpha: 0, scale: 0.1,
        duration: 250, onComplete: () => s.destroy(),
      });
    }
  }

  popText(x, y, text, color) {
    const t = this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: '18px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  showBanner(title, sub) {
    const cx = 480, cy = this.scale.height / 2 - 40;
    this.add.rectangle(cx, cy + 20, 960, 200, 0x000000, 0.55).setScrollFactor(0).setDepth(200);
    this.add.text(cx, cy, title, {
      fontFamily: FONT, fontSize: '48px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.add.text(cx, cy + 60, sub, {
      fontFamily: FONT, fontSize: '22px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
  }

  clearStage() {
    if (this.over) return;
    this.over = true;
    this.overAt = this.time.now;
    this.endChain();
    this.physics.pause();
    this.showBanner('ステージクリア！', `たおした虫: ${this.kills}\nタップでもう一度`);
  }

  gameOver() {
    if (this.over) return;
    this.over = true;
    this.overAt = this.time.now;
    this.endChain();
    this.physics.pause();
    this.player.setTint(0x888888);
    this.showBanner('ゲームオーバー', 'タップでもう一度');
  }
}
