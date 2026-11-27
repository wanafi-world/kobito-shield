import { GameScene } from './GameScene.js';

// 横幅は960で固定し、縦は画面の形に合わせる（16:9なら540、iPadの4:3なら720）
const ratio = Math.max(window.innerWidth, window.innerHeight) / Math.min(window.innerWidth, window.innerHeight);
const HEIGHT = Math.round(Math.min(720, Math.max(540, 960 / ratio)));

window.__game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#bfe6ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1300 }, debug: false },
  },
  input: { activePointers: 5 },
  scene: [GameScene],
});
