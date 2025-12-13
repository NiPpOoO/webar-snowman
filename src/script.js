document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const btnShot = document.getElementById('shot');
  const btnFlip = document.getElementById('flip');

  let nftVisible = false;
  let hiroVisible = false;

  function updateStatus() {
    if (nftVisible && hiroVisible) {
      ui.textContent = 'Оба маркера найдены: снеговик и Hiro 🎯';
    } else if (nftVisible) {
      ui.textContent = 'NFT‑снеговик найден: куб появился.';
    } else if (hiroVisible) {
      ui.textContent = 'Hiro найден: шар появился.';
    } else {
      ui.textContent = 'Наведи камеру на снеговика или Hiro 🦊';
    }
  }

  const nftMarker = document.querySelector('a-nft');
  if (nftMarker) {
    nftMarker.addEventListener('markerFound', () => {
      nftVisible = true;
      updateStatus();
    });
    nftMarker.addEventListener('markerLost', () => {
      nftVisible = false;
      updateStatus();
    });
  }

  const hiroMarker = document.querySelector('a-marker');
  if (hiroMarker) {
    hiroMarker.addEventListener('markerFound', () => {
      hiroVisible = true;
      updateStatus();
    });
    hiroMarker.addEventListener('markerLost', () => {
      hiroVisible = false;
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
