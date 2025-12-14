// script.js — NFT + быстрый цветовой фолбэк
document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const testStatus = document.getElementById('test-status');
  const btnShot = document.getElementById('shot');

  const nftMarker = document.getElementById('nft-snowman');
  const hiroMarker = document.getElementById('marker-hiro');

  const cubeNft = document.getElementById('cube-nft');
  const cubeHiro = document.getElementById('cube-hiro');

  const analysisCanvas = document.getElementById('ml-canvas');
  const aCtx = analysisCanvas.getContext('2d');

  let foundBy = null; // 'nft' | 'hiro' | 'heur' | null
  let resetTimer = null;
  let heurInterval = null;
  const HEUR_DELAY = 2000; // ms до запуска фолбэка после потери NFT
  const HEUR_CHECK_MS = 500; // частота проверки кадра
  const HEUR_THRESHOLD = 0.06; // доля пикселей (6%) для срабатывания

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
    stopHeur(); // при любом найденном маркере фолбэк выключаем
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
    // если потеряли NFT — через HEUR_DELAY запускаем фолбэк
    if (source === 'nft') {
      setTimeout(() => {
        if (!foundBy) startHeur();
      }, HEUR_DELAY);
    }
  }

  // События NFT
  if (nftMarker) {
    nftMarker.addEventListener('markerFound', () => onFound('nft'));
    nftMarker.addEventListener('markerLost', () => onLost('nft'));
  } else {
    setUI('Ошибка: NFT элемент не найден в DOM');
  }

  // Hiro
  if (hiroMarker) {
    hiroMarker.addEventListener('markerFound', () => onFound('hiro'));
    hiroMarker.addEventListener('markerLost', () => onLost('hiro'));
  }

  // Фолбэк: простая цветовая проверка кадра
  function startHeur() {
    if (heurInterval) return;
    heurInterval = setInterval(heurCheckFrame, HEUR_CHECK_MS);
    console.log('heur: started');
  }
  function stopHeur() {
    if (!heurInterval) return;
    clearInterval(heurInterval);
    heurInterval = null;
    console.log('heur: stopped');
  }

  function heurCheckFrame() {
    // берем canvas/video, который использует AR.js
    const video = document.querySelector('video');
    const glCanvas = document.querySelector('canvas'); // WebGL canvas
    if (!video && !glCanvas) return;

    // рисуем в маленький canvas для анализа
    try {
      if (video && video.readyState >= 2) {
        aCtx.drawImage(video, 0, 0, analysisCanvas.width, analysisCanvas.height);
      } else if (glCanvas) {
        // если нет video, пробуем скопировать WebGL canvas
        aCtx.drawImage(glCanvas, 0, 0, analysisCanvas.width, analysisCanvas.height);
      } else return;
    } catch (e) {
      // иногда drawImage может бросать, игнорируем
      return;
    }

    const img = aCtx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
    const data = img.data;
    const total = analysisCanvas.width * analysisCanvas.height;
    let match = 0;

    // Простая проверка: ищем пиксели с насыщенным красно-оранжевым цветом (шарф/нос)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      // условие для "красно-оранжевого": r значительно больше g и b, и r достаточно яркий
      if (r > 120 && r > g + 30 && r > b + 30) {
        match++;
      }
      // также учитываем ярко-оранжевый (нос)
      else if (r > 140 && g > 60 && b < 80 && r > g + 20) {
        match++;
      }
    }

    const ratio = match / total;
    // console.log('heur ratio', ratio.toFixed(3));
    if (ratio >= HEUR_THRESHOLD) {
      // сработал фолбэк
      onFound('heur');
      stopHeur();
    } else {
      // показываем прогресс в UI (нечасто)
      setTestStatus(`Фолбэк: ${(ratio*100).toFixed(2)}%`, '#aa6600');
    }
  }

  // Попытка установить willReadFrequently для canvas (убирает предупреждение)
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

  // Инициализация UI
  setUI('Наведи камеру на снеговика');
  setTestStatus('🔍 Статус: ничего не найдено', '#222');
});
