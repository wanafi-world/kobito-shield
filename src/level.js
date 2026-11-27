// ステージ1のデータ。1マス = 32px、横170マス x 縦17マス。
// rect(x0, y0, x1, y1) でその範囲を地面にする（y=0が一番上）。
export const TILE = 32;

export function buildLevel() {
  const W = 170, H = 17;
  const g = [...Array(H)].map(() => Array(W).fill(0));
  const rect = (x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = 1;
  };

  // 1. スタート地点とアリのエリア（3マスの穴に落とす）
  rect(0, 0, 0, 14);          // 左端の壁
  rect(0, 15, 44, 16);
  // 穴: 45〜47
  // 2. チェーンで天井に上がるエリア
  rect(48, 15, 75, 16);
  rect(54, 5, 63, 5);         // 天井（チェーンをかける場所）
  rect(60, 9, 75, 14);        // 高い足場（ジャンプでは届かない）
  // 3. チェーンで穴を越えるエリア
  rect(76, 15, 84, 16);
  // 穴: 85〜92（ジャンプでは越えられない）
  // 4. ハチのエリア（向こう岸は1マス高い）
  rect(93, 14, 141, 16);
  // 5. カブトムシのエリア
  rect(127, 12, 127, 13);     // 低い壁（突進をぶつける）
  // 穴: 142〜144
  rect(145, 14, 169, 16);
  rect(169, 0, 169, 13);      // 右端の壁

  const solid = (x, y) => {
    if (x < 0 || x >= W) return true;
    if (y < 0 || y >= H) return false;
    return g[y][x] === 1;
  };

  return {
    w: W,
    h: H,
    solid,
    solidAtPx: (px, py) => solid(Math.floor(px / TILE), Math.floor(py / TILE)),
    start: { tx: 9, ty: 14 },
    goal: { tx: 162, ty: 13 },
    entities: [
      { type: 'ant', tx: 26, ty: 14 },
      { type: 'ant', tx: 36, ty: 14 },
      { type: 'bee', tx: 104, ty: 8 },
      { type: 'ant', tx: 112, ty: 13 },
      { type: 'bee', tx: 119, ty: 7 },
      { type: 'beetle', tx: 136, ty: 13 },
    ],
    checkpoints: [9, 48, 77, 95, 126, 146].map(tx => ({ tx, ty: tx >= 93 ? 13 : 14 })),
    signs: [
      { tx: 8, ty: 9, text: '画面の左半分を触って指をずらすと移動\nジャンプボタンで跳ぶ\n（キーボード: ← → / Z）' },
      { tx: 20, ty: 10, text: '盾を構えてアリを押そう\n穴に落とせばたおせる\n（キーボード: X）' },
      { tx: 49, ty: 10, text: '▲ を押しながらチェーンで上へ\n天井にぶら下がったら ◀ ▶ で進む、▼ で降りる\n（キーボード: ↑ + C）' },
      { tx: 77, ty: 10, text: 'チェーンを横に伸ばして向こうの壁へ\n引っぱられた後は空中で1回ジャンプできる' },
      { tx: 96, ty: 8, text: 'ハチが光ったら針が来る\n当たる直前に盾を構えるとパリィ！\n針を跳ね返してハチに当てよう' },
      { tx: 128, ty: 7, text: 'カブトムシの突進は壁にぶつけるかパリィで止める\nひっくり返ったら押して穴へ' },
    ],
  };
}
