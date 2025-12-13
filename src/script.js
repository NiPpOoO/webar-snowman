document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const btnShot = document.getElementById('shot');
  const btnFlip = document.getElementById('flip');

  function safeText(msg) { if (ui) ui.textContent = msg; }

  // Логика для NFT‑маркера
  const nftMarker = document.querySelector('a-nft');
  if (nftMarker) {
    nftMarker.addEventListener('markerFound', () => safeText('NFT‑снеговик найден: куб появился.'));
    nftMarker.addEventListener('markerLost', () => safeText('Снеговик потерян.'));
  }

  // Логика для Hiro‑маркера
  const hiroMarker = document.querySelector('a-marker');
  if (hiroMarker) {
    hiroMarker.addEventListener('markerFound', () => safeText('Hiro найден: шар появился.'));
    hiroMarker.addEventListener('markerLost', () => safeText('Hiro потерян.'));
  }

  // 📸 Снимок
  if (btnShot) {
    btnShot.addEventListener('click', () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return safeText('Canvas не найден');
      try {
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'screenshot.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        safeText('Снимок сохранён');
      } catch (e) {
        console.error('Screenshot error:', e);
        safeText('Ошибка при сохранении снимка');
      }
    });
  }

  // 🔄 Переключение камеры
  if (btnFlip) {
    btnFlip.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        const video = document.querySelector('video');
        if (video) { video.srcObject = stream; video.play?.(); }
        safeText('Фронтальная камера включена');
      } catch (e) { safeText('Не удалось переключить камеру'); }
    });
  }
});
