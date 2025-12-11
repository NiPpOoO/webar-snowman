// script.js — логика UI и кнопок

const ui = document.getElementById('ui');
const marker = document.getElementById('marker');

// События маркера
marker.addEventListener('markerFound', () => {
  ui.textContent = 'Готово: снеговик распознан. Фигуры появились.';
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

// Переключение камеры
document.getElementById('flip').addEventListener('click', () => {
  const scene = document.querySelector('a-scene');
  const current = scene.getAttribute('arjs');
  const isRear = /facingMode: environment/.test(current);
  const next = isRear
    ? 'trackingMethod: nft; sourceType: webcam;'
    : 'trackingMethod: nft; sourceType: webcam; facingMode: environment;';
  scene.setAttribute('arjs', next);
  ui.textContent = isRear ? 'Включена фронтальная камера' : 'Включена основная камера';
});
