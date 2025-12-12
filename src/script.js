document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const marker = document.getElementById('marker');
  const btnShot = document.getElementById('shot');
  const btnFlip = document.getElementById('flip');
  const scene = document.querySelector('a-scene');

  function safeText(msg) {
    if (ui) ui.textContent = msg;
  }

  // Проверки
  if (!scene) {
    console.warn('a-scene не найден в документе');
  }
  if (!marker) console.warn('marker element not found');
  if (!btnShot) console.warn('shot button not found');
  if (!btnFlip) console.warn('flip button not found');

  // Обработчики маркера
  if (marker) {
    marker.addEventListener('markerFound', () => {
      console.log('[marker] Found');
      safeText('Маркер распознан: фигуры появились.');
      // пометить для доступности
      marker.setAttribute('visible', true);
      marker.classList && marker.classList.add('marker-visible');
    });
    marker.addEventListener('markerLost', () => {
      console.log('[marker] Lost');
      safeText('Потерян трекинг. Наведи камеру на снеговика ещё раз.');
      marker.setAttribute('visible', false);
      marker.classList && marker.classList.remove('marker-visible');
    });
  }

  // If AR.js system isn't present, show fallback message and unhide marker for debugging
  (async () => {
    const arjsSystem = scene && scene.systems && (scene.systems['arjs'] || scene.systems['artoolkit']);
    if (!arjsSystem) {
      console.warn('[arjs] system not detected. Showing marker contents as fallback for debugging.');
      safeText('AR.js system не обнаружен — показываем объекты для отладки.');
      if (marker) marker.setAttribute('visible', true);
    }
  })();

  // Debug: dump arjs system and video availability
  (async () => {
    try {
      const arjsSystem = scene && scene.systems && (scene.systems['arjs'] || scene.systems['artoolkit']);
      console.log('[arjs] system:', !!arjsSystem, arjsSystem);
      const v = await getVideoElement();
      console.log('[video] element found:', !!v, v);
      const assets = document.querySelectorAll('a-asset-item');
      console.log('[assets] found', assets.length);
      const aassets = document.querySelector('a-assets');
      if (aassets) {
        aassets.addEventListener('loaded', () => console.log('[assets] a-assets loaded'));
        aassets.addEventListener('error', (e) => console.warn('[assets] a-assets error', e));
      }
    } catch (e) {
      console.warn('[debug] error while checking arjs/video elements', e);
    }
  })();

  // Помощники: парсер строки arjs в объект и обратно
  function parseArjsString(str) {
    if (!str || typeof str !== 'string') return {};
    return str.split(';').reduce((acc, part) => {
      const s = part.trim();
      if (!s) return acc;
      const [k, ...rest] = s.split(':');
      if (!k) return acc;
      const key = k.trim();
      const val = rest.join(':').trim();
      // попытка привести к булевым/числам
      if (val === 'true') acc[key] = true;
      else if (val === 'false') acc[key] = false;
      else if (!Number.isNaN(Number(val))) acc[key] = Number(val);
      else acc[key] = val;
      return acc;
    }, {});
  }

  // Делает строку/объект пригодным для setAttribute
  function normalizeArjsAttr(value) {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) return value;
    return {};
  }

  // convert object to arjs attr string (e.g. {a:1,b:true} -> 'a:1; b:true;')
  function arjsAttrToString(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return Object.entries(obj)
      .map(([k, v]) => `${k}:${v}`)
      .join('; ');
  }

  // Переключение камеры (грубо: переключаем facingMode; если браузер не поддерживает — показываем подсказку)
  async function getArjsSystem() {
    if (!scene) return null;
    return scene.systems && (scene.systems['arjs'] || scene.systems['mindar'] || scene.systems['artoolkit']) || null;
  }

  async function getVideoElement() {
    // AR.js creates a video DOM element — try to find most likely selectors
    const selectors = ['#arjs-video', 'video[autoplay]', 'video[playsinline]', 'video'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  if (btnFlip) {
    btnFlip.addEventListener('click', async () => {
      if (!scene) return;
      let arjs = scene.getAttribute('arjs');
      // arjs может быть строкой или объектом
      if (typeof arjs === 'string') arjs = parseArjsString(arjs);
      arjs = normalizeArjsAttr(arjs);

      // текущий режим
      const currentFacing = arjs.facingMode || arjs.facing || arjs.facingmode;
      const isEnv = currentFacing === 'environment';
      const nextFacing = isEnv ? 'user' : 'environment';
      // Try to switch camera via AR.js system if available (more reliable than setAttribute)
      const arjsSystem = await getArjsSystem();
      const video = await getVideoElement();
      console.log('[camera] Requesting switch: ', nextFacing, 'system:', !!arjsSystem, 'video:', !!video);

      try {
        // Attempt to enumerate devices to find deviceId matching facing
        let constraints = { video: { facingMode: { ideal: nextFacing } } };
        // If facingMode not supported we will try deviceId by enumerating devices
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cams = devices.filter(d => d.kind === 'videoinput');
            // Try to find by label hint
            const findLabel = nextFacing === 'environment' ? /(back|rear|environment|wide)/i : /(front|user|selfie)/i;
            let dev = cams.find(c => c.label && findLabel.test(c.label));
            if (!dev && cams.length > 1) {
              dev = cams[cams.length - 1]; // attempt choose different camera
            }
            if (dev) constraints = { video: { deviceId: { exact: dev.deviceId } } };
          } catch (e) {
            console.warn('[camera] enumerateDevices failed', e);
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        function applyStreamToArjs(s) {
          // apply stream to the most-likely video element
          if (video) {
            try { video.srcObject = s; video.play?.(); } catch (e) { console.warn('Failed to set video.srcObject', e); }
          }
          // also try to set to arToolkitSource if available
          try {
            if (arjsSystem && arjsSystem.arToolkitSource) {
              const src = arjsSystem.arToolkitSource;
              // stop old tracks
              if (src.domElement && src.domElement.srcObject) {
                try { src.domElement.srcObject.getTracks().forEach(t => t.stop()); } catch (e) {}
              }
              src.domElement.srcObject = s;
              if (typeof src.onResize === 'function') src.onResize();
              try { if (typeof src.copyElementSizeTo === 'function') src.copyElementSizeTo(scene.renderer.domElement); } catch (e) {}
              if (typeof arjsSystem.onResize === 'function') arjsSystem.onResize();
            }
          } catch (e) {
            console.warn('[camera] applyStreamToArjs failed', e);
          }
        }

        applyStreamToArjs(stream);
        // Also update AR.js attribute so library retains facing preference
        try {
          const newArjs = Object.assign({}, arjs, { facingMode: nextFacing });
          scene.setAttribute('arjs', arjsAttrToString(newArjs));
          console.log('[camera] Updated scene arjs attr to', arjsAttrToString(newArjs));
        } catch (e) {
          console.warn('[camera] Failed to set arjs attribute string', e);
        }
        // user-facing success
        safeText(nextFacing === 'environment' ? 'Включена основная камера' : 'Включена фронтальная камера');
      } catch (ex) {
        console.warn('Не удалось переключить камеру автоматически', ex);
        safeText('Не удалось переключить камеру автоматически. Попробуйте перезагрузить страницу и проверить разрешение на доступ к камере.');
      }
    });
  }

  // Снимок кадра — более надёжный, через Blob
  if (btnShot) {
    btnShot.addEventListener('click', () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        safeText('Невозможно сделать снимок: canvas не найден');
        return;
      }
      // Используем toBlob для лучшей совместимости
      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (!blob) {
            safeText('Не удалось получить изображение с canvas');
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'webar-snowman-test.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          safeText('Снимок сохранён');
        }, 'image/png');
      } else {
        // fallback
        try {
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = url;
          a.download = 'webar-snowman-test.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
          safeText('Снимок сохранён');
        } catch (e) {
          console.warn(e);
          safeText('Не удалось сохранить снимок');
        }
      }
    });
  }

  // Model load logging for easier debugging
  try {
    const fox = document.getElementById('fox-model');
    const hare = document.getElementById('hare-model');
    if (fox) fox.addEventListener('model-loaded', () => console.log('[model] fox loaded'));
    if (fox) fox.addEventListener('model-error', (e) => console.warn('[model] fox error', e));
    if (hare) hare.addEventListener('model-loaded', () => console.log('[model] hare loaded'));
    if (hare) hare.addEventListener('model-error', (e) => console.warn('[model] hare error', e));
  } catch (e) {
    console.warn('[model] listener install failed', e);
  }

  // Model error fallback: replace with simple primitives so user can see objects even when model fails
  function installModelFallback(id, fallbackType = 'box') {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('model-error', () => {
      console.warn('[model] model-error', id);
      // replace with a placeholder depending on fallback
      const parent = el.parentElement;
      if (!parent) return;
      // create fallback entity
      const placeholder = document.createElement('a-entity');
      placeholder.setAttribute('position', el.getAttribute('position') || '0 0 0');
      placeholder.setAttribute('scale', el.getAttribute('scale') || '1 1 1');
      if (fallbackType === 'box') placeholder.setAttribute('geometry', 'primitive: box');
      else if (fallbackType === 'sphere') placeholder.setAttribute('geometry', 'primitive: sphere');
      placeholder.setAttribute('material', 'color: #ff0066;');
      parent.removeChild(el);
      parent.appendChild(placeholder);
    });
  }
  installModelFallback('fox-model', 'box');
  installModelFallback('hare-model', 'sphere');
});
