// 후면 카메라를 <video>에 연결. 실패하면 CSS 체육관 배경으로 폴백.
export async function initCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia) {
    document.body.classList.add('no-cam');
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    document.body.classList.add('cam-on');
    return true;
  } catch (err) {
    console.warn('카메라 사용 불가, 기본 배경으로 진행', err);
    document.body.classList.add('no-cam');
    return false;
  }
}
