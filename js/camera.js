const VISION_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export async function createHandLandmarker() {
  const { FilesetResolver, HandLandmarker } = await import(`${VISION_ROOT}/vision_bundle.mjs`);
  const vision = await FilesetResolver.forVisionTasks(`${VISION_ROOT}/wasm`);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.65,
    minHandPresenceConfidence: 0.65,
    minTrackingConfidence: 0.65,
  });
}

// 후면 카메라를 <video>에 연결. 실패하면 CSS 체육관 배경으로 폴백.
export async function initCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia) {
    document.body.classList.add('no-cam');
    return false;
  }
  let acquiredStream;
  try {
    if (!video.srcObject?.getVideoTracks?.().some((track) => track.readyState === 'live')) {
      acquiredStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      video.srcObject = acquiredStream;
    }
    await video.play();
    document.body.classList.add('cam-on');
    document.body.classList.remove('no-cam');
    return true;
  } catch (err) {
    acquiredStream?.getTracks().forEach((track) => track.stop());
    if (acquiredStream && video.srcObject === acquiredStream) video.srcObject = null;
    console.warn('카메라 사용 불가, 기본 배경으로 진행', err);
    document.body.classList.remove('cam-on');
    document.body.classList.add('no-cam');
    return false;
  }
}
