document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const btnShot = document.getElementById('shot');
  const btnFlip = document.getElementById('flip');

  let snowmanVisible = false;
  let resetTimer = null;

  function updateStatus() {
    if (snowmanVisible) {
      ui.textContent = 'Снеговик найден 🎯';
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        if (!snowmanVisible) {
          ui.textContent = 'Наведи камеру на снеговика';
        }
      }, 3000);
    } else {
      ui.textContent = 'Наведи камеру на снеговика';
    }
  }

  const snowmanMarker = document.querySelector('a-nft');
  if (snowmanMarker) {
    snowmanMarker.addEventListener('markerFound', () => {
      snowmanVisible = true;
      updateStatus();
    });
    snowmanMarker.addEventListener('markerLost', () => {
      snowmanVisible = false;
      updateStatus();
    });
  }

  if (btnShot) {
    btnShot.addEventListener('click', () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return ui.textContent = 'Canvas не найден';
      try {
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'screenshot.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        ui.textContent = 'Снимок сохранён';
      } catch (e) {
        console.error('Screenshot error:', e);
        ui.textContent = 'Ошибка при сохранении снимка';
      }
    });
  }

  if (btnFlip) {
    btnFlip.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        const video = document.querySelector('video');
        if (video) { video.srcObject = stream; video.play?.(); }
        ui.textContent = 'Фронтальная камера включена';
      } catch (e) {
        ui.textContent = 'Не удалось переключить камеру';
      }
    });
  }
});
