// MediaPipe HandLandmarker を静止画に 1 回だけ走らせて、掌座標系の基準点を取る。
// 失敗しても致命傷ではない（ユーザーが 3 点をタップする手動フォールバックがある）。

import { anchorsFromLandmarks } from '../lib/palmFrame.js'

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

let landmarkerPromise = null

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'IMAGE',
        numHands: 1,
      })
    })().catch((err) => {
      landmarkerPromise = null
      throw err
    })
  }
  return landmarkerPromise
}

/**
 * @returns {Promise<{anchors:{wrist,indexMcp,pinkyMcp}, handedness:string|null, landmarks:Array}|null>}
 */
export async function detectAnchors(canvas) {
  const landmarker = await getLandmarker()
  const result = landmarker.detect(canvas)
  const landmarks = result?.landmarks?.[0]
  if (!landmarks) return null
  const anchors = anchorsFromLandmarks(landmarks, canvas.width, canvas.height)
  if (!anchors) return null
  return {
    anchors,
    handedness: result.handedness?.[0]?.[0]?.categoryName ?? null,
    landmarks: landmarks.map((p) => ({ x: p.x * canvas.width, y: p.y * canvas.height })),
  }
}
