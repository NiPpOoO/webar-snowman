// script.js — надёжный debug canvas + NFT + улучшенная эвристика
document.addEventListener('DOMContentLoaded', () => {
  // UI элементы
  const ui = document.getElementById('ui');
  const testStatus = document.getElementById('test-status');
  const btnShot = document.getElementById('shot');

  // NFT / Hiro
  const nftMarker = document.getElementById('nft-snowman');
  const hiroMarker = document.getElementById('marker-hiro');
  const cubeNft = document.getElementById('cube-nft');
  const cubeHiro = document.getElementById('cube-hiro');

  // --- Создаём debug контейнер и canvas динамически, если их нет ---
  let debugWrap = document.getElementById('debug-wrap');
  if (!debugWrap) {
    debugWrap = document.createElement('div');
    debugWrap.id = 'debug-wrap';
    document.body.appendChild(debugWrap);
    // базовые стили
    Object.assign(debugWrap.style, {
      position: 'fixed',
      right: '10px',
      top: '10px',
      zIndex: 10000,
      display: 'flex',
      gap: '6px',
      alignItems: 'flex-start',
      pointerEvents: 'none'
    });
  }

  // оригинал canvas (маленький) и маска canvas
  let origCanvas = document.getElementById('debug-orig');
  let maskCanvas = document.getElementById('debug-mask');
  if (!origCanvas) {
    origCanvas = document.createElement('canvas');
    origCanvas.id = 'debug-orig';
    origCanvas.width = 240;
    origCanvas.height = 180;
    Object.assign(origCanvas.style, { width: '160px', height: '120px', border: '1px solid rgba(0,0,0,0.2)', background: '#222' });
    debugWrap.appendChild(origCanvas);
  }
  if (!maskCanvas) {
    maskCanvas = document.createElement('canvas');
    maskCanvas.id = 'debug-mask';
    maskCanvas.width = 240;
    maskCanvas.height = 180;
    Object.assign(maskCanvas.style, { width: '160px', height: '120px', border: '1px solid rgba(0,0,0,0.2)', background: '#000' });
    debugWrap.appendChild(maskCanvas);
  }
  const origCtx = origCanvas.getContext('2d');
  const maskCtx = maskCanvas.getContext('2d');

  // параметры эвристики
  const HEUR_DELAY = 1200;
  const HEUR_CHECK_MS = 300;
  const HEUR_THRESHOLD = 0.02; // доля пикселей
  const HEUR_CONS_FRAMES = 2;
  const FRAME_HISTORY = [];

  let heurInterval = null;
  let foundBy = null;
  let resetTimer = null;

  function setUI(text) { if (ui) ui.textContent = text; }
  function setTestStatus(text, color = '#222') {
    if (!testStatus) return;
    testStatus.textContent = text;
    testStatus.style.color = color;
  }

  function clearResetTimer() { if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; } }
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
    if (foundBy === source) foundBy = null;
    if (source === 'nft') {
      setTimeout(() => { if (!foundBy) startHeur(); }, HEUR_DELAY);
    }
  }

  // подключаем маркеры
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

  // эвристика: старт/стоп
  function startHeur() {
    if (heurInterval) return;
    FRAME_HISTORY.length = 0;
    heurInterval = setInterval(heurCheckFrame, HEUR_CHECK_MS);
    console.log('heur: started');
    setTestStatus('Фолбэк: запущен', '#aa6600');
  }
  function stopHeur() {
    if (!heurInterval) return;
    clearInterval(heurInterval);
    heurInterval = null;
    FRAME_HISTORY.length = 0;
    console.log('heur: stopped');
    setTestStatus('🔍 Статус: ничего не найдено', '#222');
  }

  // RGB -> hue,sat,val (приближённо)
  function rgbToHsv(r,g,b) {
    r/=255; g/=255; b/=255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    const d = max-min;
    let h = 0;
    if (d === 0) h = 0;
    else if (max === r) h = ((g-b)/d)%6;
    else if (max === g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h = Math.round(h*60);
    if (h<0) h+=360;
    const s = max === 0 ? 0 : d/max;
    const v = max;
    return {h,s,v};
  }

  function heurCheckFrame() {
    const video = document.querySelector('video');
    const glCanvas = document.querySelector('canvas'); // webgl canvas
    if (!video && !glCanvas) return;

    try {
      if (video && video.readyState >= 2) {
        origCtx.drawImage(video, 0, 0, origCanvas.width, origCanvas.height);
      } else if (glCanvas) {
        origCtx.drawImage(glCanvas, 0, 0, origCanvas.width, origCanvas.height);
      } else return;
    } catch (e) {
      console.warn('drawImage failed', e);
      return;
    }

    const img = origCtx.getImageData(0,0,origCanvas.width,origCanvas.height);
    const data = img.data;
    const total = origCanvas.width * origCanvas.height;
    let match = 0;
    const mask = new Uint8ClampedArray(data.length);

    for (let i=0;i<data.length;i+=4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const {h,s,v} = rgbToHsv(r,g,b);
      const isRed = ((h >= 340 || h <= 10) && s > 0.25 && v > 0.12);
      const isOrange = (h > 10 && h <= 45 && s > 0.25 && v > 0.12);
      if (isRed || isOrange) {
        match++;
        mask[i]=255; mask[i+1]=255; mask[i+2]=255; mask[i+3]=255;
      } else {
        mask[i]=0; mask[i+1]=0; mask[i+2]=0; mask[i+3]=0;
      }
    }

    // отрисовка маски
    const maskImg = new ImageData(mask, origCanvas.width, origCanvas.height);
    maskCtx.putImageData(maskImg, 0, 0);

    const ratio = match / total;
    FRAME_HISTORY.push(ratio >= HEUR_THRESHOLD ? 1 : 0);
    if (FRAME_HISTORY.length > HEUR_CONS_FRAMES) FRAME_HISTORY.shift();
    const sum = FRAME_HISTORY.reduce((a,b)=>a+b,0);

    setTestStatus(`Фолбэк: ${(ratio*100).toFixed(2)}% (hist ${sum}/${FRAME_HISTORY.length})`, '#aa6600');

    if (sum >= HEUR_CONS_FRAMES) {
      onFound('heur');
      stopHeur();
    }
  }

  // попытка убрать предупреждение willReadFrequently
  function trySetWillReadFrequently() {
    const c = document.querySelector('canvas');
    if (!c) return;
    try { c.getContext('2d', { willReadFrequently: true }); } catch(e){}
  }
  setTimeout(trySetWillReadFrequently, 1200);
  setTimeout(trySetWillReadFrequently, 3000);

  // снимок
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

  // инициализация
  setUI('Наведи камеру на снеговика');
  setTestStatus('🔍 Статус: ничего не найдено', '#222');

  // лог для проверки: открой консоль и найди "debug-ready"
  console.log('debug-ready: debug canvases created', {origCanvasId: origCanvas.id, maskCanvasId: maskCanvas.id});
});
