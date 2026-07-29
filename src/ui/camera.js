// カメラの起動と静止画の取り込み。
// カメラが使えない環境（許可されない・PC・ヘッドレス）ではファイル選択に落とす。

export async function startCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('この環境ではカメラを使えません')
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
    audio: false,
  })
  video.srcObject = stream
  await video.play()
  return stream
}

export function stopCamera(stream) {
  stream?.getTracks?.().forEach((t) => t.stop())
}

/** video の現在フレームを canvas に焼く。長辺 1280px までに抑える */
export function grabFrame(video, maxSide = 1280) {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) throw new Error('カメラの映像がまだ届いていません')
  const k = Math.min(1, maxSide / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * k)
  canvas.height = Math.round(h * k)
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** File / Blob を canvas に読み込む */
export async function canvasFromFile(file, maxSide = 1280) {
  const bitmap = await createImageBitmap(file)
  const k = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * k)
  canvas.height = Math.round(bitmap.height * k)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas
}
