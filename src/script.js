// script.js — логика UI и fallback

const marker = document.getElementById('marker');
const fallback = document.getElementById('fallback');
const ui = document.getElementById('ui');

let foundOnce = false;
let fallbackTimer = setTimeout(() => {
  if (!foundOnce) {
    fallback.classList.remove('hidden');
    ui.textContent = 'Демо‑режим: трекинг не найден. Это бета — завтра добавим финальные модели.';
  }
}, 8000); // 8 секунд на первый захват

marker.addEventListener('markerFound', () => {
  foundOnce = true;
  clearTimeout(fallbackTimer);
  fallback.classList.add('hidden');
  ui.textContent = 'Готово: снеговик распознан. Тестовые фигуры вращаются.';
});

marker.addEventListener('markerLost', () => {
  ui.textContent = 'Потерян трекинг. Наведи камеру на снеговика ещё раз.';
});

// Снимок кадра
document.getElementById('shot').addEventListener('click', () => {
  const canvas = document.querySelector('canvas');
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'webar-snowman-beta.png';
  a.click();
});

// Переключение камеры (если поддерживается)
document.getElementById('flip').addEventListener('click', () => {
  const scene = document.querySelector('a-scene');
  const current = scene.getAttribute('arjs');
  const isRear = /facingMode: environment/.test(current);
  const next = isRear
    ? 'trackingMethod: best; sourceType: webcam;'
    : 'trackingMethod: best; sourceType: webcam; facingMode: environment;';
  scene.setAttribute('arjs', next);
  ui.textContent = isRear ? 'Включена фронтальная камера' : 'Включена основная камера';
});
