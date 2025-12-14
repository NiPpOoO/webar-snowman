document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const testStatus = document.getElementById('test-status');
  const btnShot = document.getElementById('shot');
  const btnFlip = document.getElementById('flip');

  let snowmanVisible = false;
  let resetTimer = null;

  function setUI(text) {
    if (ui) ui.textContent = text;
  }
  function setTestStatus(found) {
    if (!testStatus) return;
    testStatus.textContent = found ? '✅ Статус: снеговик найден' : '🔍 Статус: снеговик не найден';
  }

  function updateStatus() {
    if (snowmanVisible) {
      setUI('Снеговик найден 🎯');
      setTestStatus(true);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        if (!snowmanVisible) {
          setUI('Наведи камеру на снеговика');
          setTestStatus(false);
        }
      }, 3000);
    } else {
      setUI('Наведи камеру на снеговика');
      setTestStatus(false);
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
  } else {
    // Если метка не найдена в DOM — показать предупреждение
    setUI('Ошибка: метка не найдена в DOM');
  }

  if (btnShot) {
    btnShot.addEventListener('click', () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        setUI('Canvas не найден');
        return;
      }
      try {
        const dataURL = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = 'screenshot.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setUI('Снимок сохранён');
      } catch (e) {
        console.error('Screenshot error:', e);
        setUI('Ошибка при сохранении снимка');
      }
    });
  }

  if (btnFlip) {
    btnFlip.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        const video = document.querySelector('video');
        if (video) {
          video.srcObject = stream;
          video.play?.();
        }
        setUI('Фронтальная камера включена');
      } catch (e) {
        console.error('Camera flip error:', e);
        setUI('Не удалось переключить камеру');
      }
    });
  }
});
