document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const testStatus = document.getElementById('test-status');
  const btnShot = document.getElementById('shot');
  const debugCube = document.getElementById('debug-cube');

  let snowmanVisible = false;
  let resetTimer = null;

  function setUI(text) { if (ui) ui.textContent = text; }
  function setTestStatus(found) {
    if (!testStatus) return;
    testStatus.textContent = found ? '✅ Статус: снеговик найден' : '🔍 Статус: снеговик не найден';
  }
  function setCubeColor(color) {
    if (!debugCube) return;
    debugCube.setAttribute('color', color);
  }

  function updateStatus() {
    if (snowmanVisible) {
      setUI('Снеговик найден 🎯');
      setTestStatus(true);
      setCubeColor('#22cc22'); // зелёный
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        if (!snowmanVisible) {
          setUI('Наведи камеру на снеговика');
          setTestStatus(false);
          setCubeColor('#ff4444'); // вернуть красный
        }
      }, 3000);
    } else {
      setUI('Наведи камеру на снеговика');
      setTestStatus(false);
      setCubeColor('#ff4444');
    }
  }

  const snowmanMarker = document.querySelector('a-nft');
  if (snowmanMarker) {
    snowmanMarker.addEventListener('markerFound', () => {
      console.log('[markerFound] timestamp:', Date.now());
      snowmanVisible = true;
      updateStatus();
    });
    snowmanMarker.addEventListener('markerLost', () => {
      console.log('[markerLost] timestamp:', Date.now());
      snowmanVisible = false;
      updateStatus();
    });
  } else {
    setUI('Ошибка: метка не найдена в DOM');
    console.warn('a-nft element not found in DOM');
  }

  // Попытка установить willReadFrequently для canvas (убирает предупреждение)
  function trySetWillReadFrequently() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    try {
      canvas.getContext('2d', { willReadFrequently: true });
      console.log('Canvas 2D context requested with willReadFrequently: true');
    } catch (e) {
      console.warn('Не удалось установить willReadFrequently:', e);
    }
  }
  setTimeout(trySetWillReadFrequently, 1200);
  setTimeout(trySetWillReadFrequently, 3000);

  // Снимок
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
});
