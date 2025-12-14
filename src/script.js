document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const testStatus = document.getElementById('test-status');
  const btnShot = document.getElementById('shot');

  const nftMarker = document.getElementById('nft-snowman');
  const hiroMarker = document.getElementById('marker-hiro');

  const cubeNft = document.getElementById('cube-nft');
  const cubeHiro = document.getElementById('cube-hiro');

  let foundBy = null;
  let resetTimer = null;

  function setUI(text) { if (ui) ui.textContent = text; }
  function setTestStatus(text) { if (testStatus) testStatus.textContent = text; }

  function clearResetTimer() {
    if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; }
  }

  function scheduleReset() {
    clearResetTimer();
    resetTimer = setTimeout(() => {
      foundBy = null;
      setUI('Наведи камеру на снеговика');
      setTestStatus('🔍 Статус: ничего не найдено');
      if (cubeNft) { cubeNft.setAttribute('visible', 'true'); cubeNft.setAttribute('color', '#ff4444'); }
      if (cubeHiro) { cubeHiro.setAttribute('visible', 'true'); cubeHiro.setAttribute('color', '#4444ff'); }
    }, 3000);
  }

  function onFound(source) {
    foundBy = source;
    clearResetTimer();
    if (source === 'nft') {
      setUI('Снеговик (NFT) найден 🎯');
      setTestStatus('✅ Статус: найден по NFT');
      if (cubeNft) cubeNft.setAttribute('color', '#22cc22');
      if (cubeHiro) cubeHiro.setAttribute('visible', 'false');
      try { console.log('[markerFound] nft'); } catch(e){}
    } else if (source === 'hiro') {
      setUI('Метка Hiro найдена 🎯');
      setTestStatus('✅ Статус: найден по Hiro');
      if (cubeHiro) cubeHiro.setAttribute('color', '#22cc22');
      if (cubeNft) cubeNft.setAttribute('visible', 'false');
      try { console.log('[markerFound] hiro'); } catch(e){}
    }
    scheduleReset();
  }

  function onLost(source) {
    try { console.log('[markerLost]', source); } catch(e){}
    if (foundBy === source) {
      foundBy = null;
      scheduleReset();
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

  setUI('Наведи камеру на снеговика');
  setTestStatus('🔍 Статус: ничего не найдено');
});
