// 絵の素材はまだないので、図形を組み合わせて仮の絵を作る。
export function makeTextures(scene) {
  if (scene.textures.exists('kobito')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const done = (key, w, h) => { g.generateTexture(key, w, h); g.clear(); };

  // 地面（上に草がある）
  g.fillStyle(0x7a5230); g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x6a4527); g.fillRect(4, 16, 6, 4); g.fillRect(20, 24, 5, 3);
  g.fillStyle(0x5fae3e); g.fillRect(0, 0, 32, 9);
  g.fillStyle(0x4c9431);
  for (let i = 0; i < 32; i += 6) g.fillTriangle(i, 9, i + 3, 13, i + 6, 9);
  done('grass', 32, 32);

  // 地面（中）
  g.fillStyle(0x7a5230); g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x6a4527); g.fillRect(6, 6, 6, 4); g.fillRect(20, 18, 5, 4); g.fillRect(3, 24, 4, 3);
  done('dirt', 32, 32);

  // こびと（右向き）24x32
  g.fillStyle(0xc0392b); g.fillTriangle(3, 12, 21, 12, 12, 0);
  g.fillStyle(0xf5cba7); g.fillCircle(12, 15, 6);
  g.fillStyle(0x222222); g.fillCircle(15, 15, 1.3);
  g.fillStyle(0xffffff); g.fillCircle(12, 20, 3); // ひげ
  g.fillStyle(0x2e8b57); g.fillRect(6, 21, 12, 8);
  g.fillStyle(0x6b4226); g.fillRect(6, 25, 12, 2);
  g.fillStyle(0x5d4037); g.fillRect(7, 29, 4, 3); g.fillRect(13, 29, 4, 3);
  done('kobito', 24, 32);

  // 盾 12x26
  g.fillStyle(0x5d4037); g.fillEllipse(6, 13, 12, 26);
  g.fillStyle(0x9c7a5b); g.fillEllipse(6, 13, 9, 22);
  g.fillStyle(0xd7ccc8); g.fillCircle(6, 13, 2.5);
  done('shield', 12, 26);

  // アリ（右向き）30x18
  g.lineStyle(1.5, 0x222222);
  g.lineBetween(10, 10, 6, 17); g.lineBetween(15, 10, 15, 17); g.lineBetween(18, 10, 23, 17);
  g.lineBetween(26, 5, 29, 0);
  g.fillStyle(0x2b2b2b);
  g.fillCircle(7, 9, 6); g.fillCircle(16, 10, 3.5); g.fillCircle(24, 8, 4.5);
  g.fillStyle(0xffffff); g.fillCircle(26, 7, 1.2);
  done('ant', 30, 18);

  // ハチ（右向き）30x24
  g.fillStyle(0xffffff, 0.75); g.fillEllipse(11, 6, 10, 12); g.fillEllipse(18, 5, 10, 12);
  g.fillStyle(0xf7c948); g.fillEllipse(15, 15, 24, 14);
  g.fillStyle(0x222222); g.fillRect(9, 9, 3, 12); g.fillRect(15, 8, 3, 14);
  g.fillTriangle(0, 15, 5, 12, 5, 18);
  g.fillCircle(24, 14, 4);
  g.fillStyle(0xffffff); g.fillCircle(25, 13, 1.2);
  done('bee', 30, 24);

  // カブトムシ（右向き）44x30
  g.lineStyle(2, 0x1b0f0a);
  g.lineBetween(10, 22, 6, 30); g.lineBetween(20, 24, 20, 30); g.lineBetween(30, 22, 34, 30);
  g.fillStyle(0x4e342e); g.fillEllipse(19, 17, 34, 22);
  g.fillStyle(0x6d4c41); g.fillEllipse(15, 12, 16, 8);
  g.lineStyle(1, 0x2b1a14); g.lineBetween(19, 7, 19, 27);
  g.fillStyle(0x3e2723); g.fillCircle(35, 19, 6);
  g.fillTriangle(35, 14, 44, 2, 40, 17);
  g.fillStyle(0xffffff); g.fillCircle(37, 18, 1.2);
  done('beetle', 44, 30);

  // 針（右向き）
  g.fillStyle(0x333333); g.fillTriangle(16, 2, 0, 0, 0, 4);
  done('needle', 16, 4);
  g.fillStyle(0x4fc3f7); g.fillTriangle(16, 2, 0, 0, 0, 4);
  done('needleP', 16, 4);

  // チェーンの輪
  g.lineStyle(2, 0x9e9e9e); g.strokeCircle(4, 4, 3);
  done('link', 8, 8);

  // 火花
  g.fillStyle(0xffffff); g.fillCircle(4, 4, 4);
  done('spark', 8, 8);

  // ハート
  g.fillStyle(0xe53935); g.fillCircle(5, 5, 5); g.fillCircle(13, 5, 5); g.fillTriangle(0, 7, 18, 7, 9, 17);
  done('heart', 18, 18);
  g.fillStyle(0x555555); g.fillCircle(5, 5, 5); g.fillCircle(13, 5, 5); g.fillTriangle(0, 7, 18, 7, 9, 17);
  done('heartEmpty', 18, 18);

  // ゴールの旗
  g.fillStyle(0x795548); g.fillRect(2, 0, 4, 64);
  g.fillStyle(0xffeb3b); g.fillTriangle(6, 2, 38, 12, 6, 24);
  done('flag', 40, 64);

  // チェックポイント（小さな旗）
  g.fillStyle(0x795548); g.fillRect(1, 0, 3, 32);
  g.fillStyle(0x90caf9); g.fillTriangle(4, 2, 20, 8, 4, 14);
  done('cp', 22, 32);
  g.fillStyle(0x795548); g.fillRect(1, 0, 3, 32);
  g.fillStyle(0xff7043); g.fillTriangle(4, 2, 20, 8, 4, 14);
  done('cpOn', 22, 32);

  g.destroy();
}
