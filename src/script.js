const ui = document.getElementById('ui');
const marker = document.getElementById('marker');
const unsupported = document.getElementById('unsupported');
const scene = document.getElementById('scene');

// Проверка поддержки WebGL и камеры
function checkSupport() {
  const webglOK = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch { return false; }
  })();
  const mediaOK = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  if (!webglOK || !mediaOK) {
    unsupported.style.display = 'block';
    scene.style.display = 'none';
  }
}

// События маркера
marker.addEventListener('markerFound', () => {
  ui.textContent = 'Маркер снеговика распознан: фигуры рядом.';
});
marker.addEventListener('markerLost', () => {
  ui.textContent = 'Трекинг потерян. Наведи камеру на снеговика ещё раз.';
});

// Снимок
document.getElementById('shot').addEventListener('click', () => {
  const canvas = document.querySelector('canvas');
  if (!canvas) { ui.textContent = 'Камера ещё не инициализирована.'; return; }
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'webar-snowman.png';
  a.click();
});

// Переключение камеры
document.getElementById('flip').addEventListener('click', () => {
  const current = scene.getAttribute('arjs') || '';
  const isRear = /facingMode:\s*environment/.test(current);
  const next = isRear
    ? 'trackingMethod:nft; sourceType:webcam; debugUIEnabled:false;'
    : 'trackingMethod:nft; sourceType:webcam; debugUIEnabled:false; facingMode: environment;';
  scene.setAttribute('arjs', next);
  ui.textContent = isRear ? 'Фронтальная камера' : 'Основная камера';
});

// Инициализация
checkSupport();
