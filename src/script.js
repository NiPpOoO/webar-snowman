// src/script.js
// Основная логика: NFT + Hiro + эвристический фолбэк (цветовой)
// Подключает события markerFound/markerLost и управляет фолбэком

document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const testStatus = document.getElementById('test-status');
  const btnShot = document.getElementById('shot');

  const nftMarker = document.getElementById('nft-snowman');
  const hiroMarker = document.getElementById('marker-hiro');

  const cubeNft = document.getElementById('cube-nft');
  const cubeHiro = document.getElementById('cube-hiro');

  function setUI(text) { if (ui) ui.textContent = text; }
  function setTestStatus(text, color = '#222') {
    if (!testStatus) return;
    testStatus.textContent = text;
    testStatus.style.color = color;
  }

  // Фолбэк управляется в debug-canvas.js через start/stop события в window
  function onFound(source) {
    if (source === 'nft') {
      setUI('Снеговик (NFT) найден 🎯');
      setTestStatus('✅ Статус: найден по NFT', 'green');
      if (cubeNft) cubeNft.setAttribute('color', '#22cc22');
      if (cubeHiro) cubeHiro.setAttribute('visible', 'false');
      if (window.__debugCanvas) window.__debugCanvas.stopHeur();
    } else if (source === 'hiro') {
      setUI('Метка Hiro найдена 🎯');
      setTestStatus('✅ Статус: найден по Hiro', 'green');
      if (cubeHiro) cubeHiro.setAttribute('color', '#22cc22');
      if (cubeNft) cubeNft.setAttribute('visible', 'false');
      if (window.__debugCanvas) window.__debugCanvas.stopHeur();
    } else if (source === 'heur') {
      setUI('Снеговик (фолбэк) найден 🎯');
      setTestStatus('✅ Статус: найден по цвету', 'green');
      if (cubeNft) cubeNft.setAttribute('color', '#22cc22');
      if (cubeHiro) cubeHiro.setAttribute('visible', 'false');
    }
    // сброс UI через 3 секунды
    clearTimeout(window.__resetTimer);
    window.__resetTimer = setTimeout(() => {
      setUI('Наведи камеру на снеговика');
      setTestStatus('🔍 Статус: ничего не найдено', '#222');
      if (cubeNft) { cubeNft.setAttribute('visible', 'true'); cubeNft.setAttribute('color', '#ff4444'); }
      if (cubeHiro) { cubeHiro.setAttribute('visible', 'true'); cubeHiro.setAttribute('color', '#4444ff'); }
    }, 3000);
  }

  // Подключаем события
  if (nftMarker) {
    nftMarker.addEventListener('markerFound', () => onFound('nft'));
    nftMarker.addEventListener('markerLost', () => {
      // если потеряли NFT — через 1.2s запускаем фолбэк
      setTimeout(() => { if (window.__debugCanvas) window.__debugCanvas.startHeur(); }, 1200);
    });
  } else {
    setUI('Ошибка: NFT элемент не найден в DOM');
  }

  if (hiroMarker) {
    hiroMarker.addEventListener('markerFound', () => onFound('hiro'));
    hiroMarker.addEventListener('markerLost', () => {});
  }

  // Снимок экрана (canvas WebGL)
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
