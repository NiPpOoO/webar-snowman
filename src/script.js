document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const scene = document.querySelector('a-scene');
  const marker = document.getElementById('marker');
  const btnShot = document.getElementById('shot');
  const btnFlip = document.getElementById('flip');
  const btnPreviewToggle = document.getElementById('preview-toggle');

  function safeText(msg) { if (ui) ui.textContent = msg; }

  if (marker) {
    marker.addEventListener('markerFound', () => safeText('Маркер найден: лиса появилась.'));
    marker.addEventListener('markerLost', () => safeText('Маркер потерян. Наведи камеру снова.'));
  }

  const fox = document.getElementById('fox-model');
  if (fox) fox.addEventListener('model-loaded', () => console.log('[model] fox loaded'));

  if (btnPreviewToggle) {
    btnPreviewToggle.addEventListener('change', (ev) => {
      if (ev.target.checked) {
        const root = document.createElement('a-entity');
        root.id = 'preview-root';
        const cam = document.querySelector('[camera]');
        cam.appendChild(root);

        const preview = document.createElement('a-entity');
        preview.setAttribute('gltf-model', '#model-fox');
        preview.setAttribute('position', '0 0 -2');
        preview.setAttribute('scale', '0.3 0.3 0.3');
        root.appendChild(preview);
      } else {
        const root = document.getElementById('preview-root');
        if (root) root.remove();
      }
    });
  }

  if (btnShot) {
    btnShot.addEventListener('click', () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return safeText('Canvas не найден');
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'fox-shot.png';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        safeText('Снимок сохранён');
      }, 'image/png');
    });
  }

  if (btnFlip) {
    btnFlip.addEventListener('click', async () => {
      let arjs = scene.getAttribute('arjs');
      const currentFacing = /environment/.test(arjs) ? 'environment' : 'user';
      const nextFacing = currentFacing === 'environment' ? 'user' : 'environment';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing } });
        const video = document.querySelector('video');
        if (video) { video.srcObject = stream; video.play?.(); }
        safeText(nextFacing === 'environment' ? 'Основная камера' : 'Фронтальная камера');
      } catch (e) { safeText('Не удалось переключить камеру'); }
    });
  }
});
