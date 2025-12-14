// script.js — улучшенная эвристика: HSV-подобная проверка + агрегация по кадрам + debug canvas
document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const testStatus = document.getElementById('test-status');
  const btnShot = document.getElementById('shot');

  const nftMarker = document.getElementById('nft-snowman');
  const hiroMarker = document.getElementById('marker-hiro');

  const cubeNft = document.getElementById('cube-nft');
  const cubeHiro = document.getElementById('cube-hiro');

  // debug canvas — теперь видимый, чтобы ты видел, что детектируется
  const analysisCanvas = document.getElementById('ml-canvas');
  analysisCanvas.width = 320;
  analysisCanvas.height = 240;
  analysisCanvas.style.display = 'block';
  analysisCanvas.style.position = 'fixed';
  analysisCanvas.style.right = '10px';
  analysisCanvas.style.top = '10px';
  analysisCanvas.style.zIndex = '10000';
  analysisCanvas.style.border = '2px solid rgba(0,0,0,0.2)';
  const aCtx = analysisCanvas.getContext('2d');

  let foundBy = null;
  let resetTimer = null;
  let heurInterval = null;

  // параметры эвристики
  const HEUR_DELAY = 1200; // ms до запуска фолбэка после потери NFT
  const HEUR_CHECK_MS = 300; // частота проверки кадра
  const HEUR_THRESHOLD = 0.03; // доля пикселей (3%) — порог для одного кадра
  const HEUR_CONS_FRAMES = 3; // сколько подряд кадров должно пройти порог
  const FRAME_HISTORY = []; // буфер для подрядных срабатываний

  function setUI(text) { if (ui) ui.textContent = text; }
  function setTestStatus(text, color = '#222') {
    if (!testStatus) return;
    testStatus.textContent = text;
    testStatus.style.color = color;
  }

  function clearResetTimer() {
    if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; }
  }

  function scheduleReset() {
    clearResetTimer();
    resetTimer = setTimeout(() => {
      foundBy = null;
      setUI('Наведи камеру на снеговика');
      setTestStatus('🔍 Статус: ничего не найдено', '#222');
      if (cubeNft) { cubeNft.setAttribute('visible', 'true'); cubeNft.setAttribute('color', '#ff4444'); }
      if (cubeHiro) { cubeHiro.setAttribute('visible', 'true'); cubeHiro.setAttribute('color', '#4444ff'); }
    }, 3000);
  }

  function onFound(source) {
    foundBy = source;
    clearResetTimer();
    stopHeur();
    if (source === 'nft') {
      setUI('Снеговик (NFT) найден 🎯');
      setTestStatus('✅ Статус: найден по NFT', 'green');
      if (cubeNft) cubeNft.setAttribute('color', '#22cc22');
      if (cubeHiro) cubeHiro.setAttribute('visible', 'false');
    } else if (source === 'hiro') {
      setUI('Метка Hiro найдена 🎯');
      setTestStatus('✅ Статус: найден по Hiro', 'green');
      if (cubeHiro) cubeHiro.setAttribute('color', '#22cc22');
      if (cubeNft) cubeNft.setAttribute('visible', 'false');
    } else if (source === 'heur') {
      setUI('Снеговик (фолбэк) найден 🎯');
      setTestStatus('✅ Статус: найден по цвету', 'green');
      if (cubeNft) cubeNft.setAttribute('color', '#22cc22');
      if (cubeHiro) cubeHiro.setAttribute('visible', 'false');
    }
    scheduleReset();
  }

  function onLost(source) {
    if (foundBy === source) {
      foundBy = null;
      scheduleReset();
    }
    if (source === 'nft') {
      setTimeout(() => {
        if (!foundBy) startHeur();
      }, HEUR_DELAY);
    }
  }

  if (nftMarker) {
    nftMarker.addEventListener('markerFound', () => onFound('nft'));
    nftMarker.addEventListener('markerLost', () => onLost('nft'));
  } else {
    setUI('Ошибка: NFT элемент не найден в DOM');
  }

  if (hiroMarker) {
    hiroMarker.addEventListener('markerFound', () => onFound('hiro'));
    hiroMarker.addEventListener('markerLost', () => onLost('hiro'));
  }

  function startHeur() {
    if (heurInterval) return;
    FRAME_HISTORY.length = 0;
    heurInterval = setInterval(heurCheckFrame, HEUR_CHECK_MS);
    console.log('heur: started');
  }
  function stopHeur() {
    if (!heurInterval) return;
    clearInterval(heurInterval);
    heurInterval = null;
    FRAME_HISTORY.length = 0;
    console.log('heur: stopped');
  }

  // Преобразование RGB -> приближённый HSV hue (0..360), sat (0..1), val (0..1)
  function rgbToHueSatVal(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d === 0) h = 0;
    else if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h, s, v };
  }

  function heurCheckFrame() {
    const video = document.querySelector('video');
    const glCanvas = document.querySelector('canvas');
    if (!video && !glCanvas) return;

    try {
      if (video && video.readyState >= 2) {
        aCtx.drawImage(video, 0, 0, analysisCanvas.width, analysisCanvas.height);
      } else if (glCanvas) {
        aCtx.drawImage(glCanvas, 0, 0, analysisCanvas.width, analysisCanvas.height);
      } else return;
    } catch (e) {
      return;
    }

    const img = aCtx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
    const data = img.data;
    const total = analysisCanvas.width * analysisCanvas.height;
    let match = 0;

    // создаём маску для отладки
    const mask = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const { h, s, v } = rgbToHueSatVal(r, g, b);

      // Условия для красно-оранжевых оттенков:
      // красный: hue около 350..10 или 340..360 and 0..10
      // оранжевый: hue 10..45
      // учитываем насыщенность и яркость
      const isRed = ((h >= 340 || h <= 10) && s > 0.25 && v > 0.15);
      const isOrange = (h > 10 && h <= 45 && s > 0.25 && v > 0.15);

      if (isRed || isOrange) {
        match++;
        // помечаем маску белым
        mask[i] = 255; mask[i+1] = 255; mask[i+2] = 255; mask[i+3] = 255;
      } else {
        mask[i] = 0; mask[i+1] = 0; mask[i+2] = 0; mask[i+3] = 0;
      }
    }

    // отрисуем маску поверх для отладки (полупрозрачная)
    const maskImg = new ImageData(mask, analysisCanvas.width, analysisCanvas.height);
    // сначала затемняем оригинал
    aCtx.globalCompositeOperation = 'source-over';
    aCtx.fillStyle = 'rgba(0,0,0,0.25)';
    aCtx.fillRect(0, 0, analysisCanvas.width, analysisCanvas.height);
    // затем рисуем маску красным
    aCtx.putImageData(maskImg, 0, 0);
    aCtx.globalCompositeOperation = 'source-over';

    const ratio = match / total;
    FRAME_HISTORY.push(ratio >= HEUR_THRESHOLD ? 1 : 0);
    if (FRAME_HISTORY.length > HEUR_CONS_FRAMES) FRAME_HISTORY.shift();
    const sum = FRAME_HISTORY.reduce((a,b) => a+b, 0);

    // показываем текущую долю и историю
    setTestStatus(`Фолбэк: ${(ratio*100).toFixed(2)}% (hist ${sum}/${FRAME_HISTORY.length})`, '#aa6600');

    if (sum >= HEUR_CONS_FRAMES) {
      onFound('heur');
      stopHeur();
    }
  }

  // Попытка установить willReadFrequently
  function trySetWillReadFrequently() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    try { canvas.getContext('2d', { willReadFrequently: true }); } catch (e) {}
  }
  setTimeout(trySetWillReadFrequently, 1200);
  setTimeout(trySetWillReadFrequently, 3000);

  // Снимок
  if (btnShot) {
    btnShot.addEventListener('click', () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) { setUI('Canvas не найден'); return; }
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
        setUI('Ошибка при сохранении снимка');
      }
    });
  }

  setUI('Наведи камеру на снеговика');
  setTestStatus('🔍 Статус: ничего не найдено', '#222');
});
