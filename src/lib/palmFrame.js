// 掌（てのひら）座標系。
//
// 写真は撮るたびに距離も角度も変わる。そのままの画素座標で「線が長い/短い」を
// 判定すると撮り方で結果が変わってしまうので、手そのものを基準にした座標へ移す。
//
//   原点 : 手首の中央
//   y 軸 : 手首 → 指の付け根 方向（1.0 = 指の付け根のライン）
//   x 軸 : 小指側 → 親指側 方向（正 = 親指側）
//
// x 軸を「小指側→親指側」で定義することで、左手でも右手でも、
// 写真が鏡像でも、同じ判定ルールがそのまま使える。

import { sub, add, scale, dot, cross, norm, normalize, midpoint } from './geometry.js'

/**
 * @param {{wrist:{x,y}, indexMcp:{x,y}, pinkyMcp:{x,y}}} anchors 画素座標の3基準点
 * @returns {{toPalm:(p)=>({x,y}), toImage:(p)=>({x,y}), scale:number, origin:{x,y}, mirrored:boolean}}
 */
export function createPalmFrame({ wrist, indexMcp, pinkyMcp }) {
  const knuckleMid = midpoint(indexMcp, pinkyMcp)
  const up = sub(knuckleMid, wrist)
  const palmScale = norm(up)
  if (palmScale === 0) throw new Error('手首と指の付け根が同じ位置です')

  const yAxis = scale(up, 1 / palmScale)
  // 小指→人差し指の向きから、y 軸に直交する成分だけを取り出して x 軸にする
  const across = sub(indexMcp, pinkyMcp)
  const perp = sub(across, scale(yAxis, dot(across, yAxis)))
  if (norm(perp) === 0) throw new Error('指の付け根の2点が縦に並んでいます')
  const xAxis = normalize(perp)

  // 画像が鏡像かどうか（左右の手の判別ではなく、座標系の向きの記録用）
  const mirrored = cross(xAxis, yAxis) < 0

  const toPalm = (p) => {
    const v = sub(p, wrist)
    return { x: dot(v, xAxis) / palmScale, y: dot(v, yAxis) / palmScale }
  }
  const toImage = (p) =>
    add(wrist, add(scale(xAxis, p.x * palmScale), scale(yAxis, p.y * palmScale)))

  return { toPalm, toImage, scale: palmScale, origin: wrist, mirrored }
}

/** ポリラインまるごと掌座標へ */
export function toPalmPolyline(frame, points) {
  return points.map((p) => frame.toPalm(p))
}

/**
 * MediaPipe HandLandmarker の 21 点から基準点を取り出す。
 * 0 = 手首 / 5 = 人差し指付け根 / 17 = 小指付け根
 */
export function anchorsFromLandmarks(landmarks, imageWidth, imageHeight) {
  if (!landmarks || landmarks.length < 18) return null
  const at = (i) => ({ x: landmarks[i].x * imageWidth, y: landmarks[i].y * imageHeight })
  return { wrist: at(0), indexMcp: at(5), pinkyMcp: at(17) }
}
