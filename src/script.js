const startBtn = document.getElementById('startBtn');
const startScreen = document.getElementById('start');
const ui = document.getElementById('ui');
const status = document.getElementById('status');

const btnCamera = document.getElementById('btnCamera');
const btnModel = document.getElementById('btnModel');

const scene = document.getElementById('scene');
const target = document.getElementById('target');
const model1 = document.getElementById('model1');
const model2 = document.getElementById('model2');

let facingMode = 'environment';
let currentModel = 1;

/* START AR (ONLY ONCE) */
startBtn.addEventListener('click', async () => {
  startScreen.style.display = 'none';
  ui.style.display = 'flex';
  status.style.display = 'block';

  const mindarSystem = scene.systems['mindar-image-system'];
  await mindarSystem.start();
});

/* CAMERA SWITCH */
btnCamera.addEventListener('click', async () => {
  const mindarSystem = scene.systems['mindar-image-system'];
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  await mindarSystem.stop();
  await mindarSystem.start({ facingMode });
});

/* MODEL SWITCH */
btnModel.addEventListener('click', () => {
  currentModel = currentModel === 1 ? 2 : 1;
  model1.setAttribute('visible', currentModel === 1);
  model2.setAttribute('visible', currentModel === 2);
});

/* TARGET EVENTS */
target.addEventListener('targetFound', () => {
  status.textContent = 'Маркер найден';
});

target.addEventListener('targetLost', () => {
  status.textContent = 'Наведи камеру на маркер';
});
