document.addEventListener('DOMContentLoaded', () => {
  const ui = document.getElementById('ui');
  const marker = document.getElementById('marker');
  const btnShot = document.getElementById('shot');
  const btnFlip = document.getElementById('flip');
  const btnLogToggle = document.getElementById('log-toggle');
  const scene = document.querySelector('a-scene');
   const btnPreviewToggle = document.getElementById('preview-toggle');

  function safeText(msg) {
    if (ui) ui.textContent = msg;
    // optionally send to remote logger
    sendLog('info', msg);
  }

  // Online logging
  const DEFAULT_LOG_URL = 'http://localhost:3001/logs';
  const logEndpoint = window.LOG_ENDPOINT || DEFAULT_LOG_URL;
  const logEnabledKey = 'webar_online_log_enabled';
  let logEnabled = false;

  function saveLogEnabled(enabled) {
    logEnabled = !!enabled;
    try { localStorage.setItem(logEnabledKey, logEnabled ? '1' : '0'); } catch (_) {}
    if (btnLogToggle) btnLogToggle.checked = logEnabled;
  }

  function sendLog(level, message, meta) {
    if (!logEnabled) return;
    try {
      fetch(logEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, meta: meta || {}, ts: new Date().toISOString() })
      }).catch(e => console.warn('[online-log] send failed', e));
    } catch (e) {
      console.warn('[online-log] send error', e);
    }
  }

  // restore setting
  try { saveLogEnabled(localStorage.getItem(logEnabledKey) === '1'); } catch (e) { saveLogEnabled(false); }
  if (btnLogToggle) btnLogToggle.addEventListener('change', (ev) => saveLogEnabled(ev.target.checked));

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
      sendLog('info', 'markerFound', { id: marker.id });
      safeText('Маркер распознан: фигуры появились.');
      // пометить для доступности
      marker.setAttribute('visible', true);
      marker.classList && marker.classList.add('marker-visible');
    });
    marker.addEventListener('markerLost', () => {
      console.log('[marker] Lost');
      sendLog('warn', 'markerLost', { id: marker.id });
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
      sendLog('debug', 'arjs-system', { detected: !!arjsSystem });
      const v = await getVideoElement();
      console.log('[video] element found:', !!v, v);
      sendLog('debug', 'video-element', { found: !!v });
      const assets = document.querySelectorAll('a-asset-item');
      console.log('[assets] found', assets.length);
      sendLog('debug', 'assets-count', { count: assets.length });
      const aassets = document.querySelector('a-assets');
      if (aassets) {
        aassets.addEventListener('loaded', () => { console.log('[assets] a-assets loaded'); sendLog('info','assets-loaded'); safeText('Модели загружены'); });
        aassets.addEventListener('error', (e) => console.warn('[assets] a-assets error', e));
        // check each asset by fetching its src to validate it is reachable (CORS/404 issues)
        const assetItems = Array.from(aassets.querySelectorAll('a-asset-item'));
        for (const item of assetItems) {
          try {
            const url = item.getAttribute('src');
            if (!url) { console.warn('[assets] asset without src', item); continue; }
            fetch(url, { method: 'HEAD' }).then(r => {
              if (!r.ok) sendLog('warn', 'asset-head-failed', { url, status: r.status });
              else sendLog('debug', 'asset-reachable', { url, status: r.status });
              console.log('[assets] HEAD', url, r.status);
              if (!r.ok) safeText('Ошибка загрузки ресурсов: ' + url + ' (' + r.status + ')');
            }).catch(e => { sendLog('error', 'asset-head-err', { url, err: e.message }); console.warn('[assets] HEAD failed fetch', url, e); });
          } catch (e) { console.warn('[assets] check failed', e); }
        }
      }
      // check marker files
      try {
        if (marker) {
          const base = marker.getAttribute('url');
          if (base) {
            const exts = ['.iset', '.fset', '.fset3'];
            for (const ext of exts) {
              const url = base + ext;
              fetch(url, { method: 'HEAD' }).then(r => {
                console.log('[marker] HEAD', url, r.status);
                if (!r.ok) { sendLog('warn', 'marker-asset-missing', { url, status: r.status }); safeText('Отсутствует файл маркера: ' + url); }
                else sendLog('debug', 'marker-asset', { url, status: r.status });
              }).catch(e => { sendLog('error', 'marker-head-err', { url, err: e.message }); console.warn('[marker] HEAD failed', url, e); });
            }
          } else {
            console.warn('[marker] no url attribute'); sendLog('warn', 'marker-missing-url');
          }
        }
      } catch (e) { console.warn('[marker] check failed', e); }
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

              // Preview functionality — show models directly in front of camera for debugging
              function createPreviewEntities() {
                // create root if doesn't exist
                let root = document.getElementById('preview-root');
                if (!root) {
                  root = document.createElement('a-entity');
                  root.id = 'preview-root';
                  // attach to camera to keep it in view
                  const cam = document.querySelector('[camera]') || scene.querySelector('a-entity[camera]');
                  if (cam) {
                    cam.appendChild(root);
                  } else {
                    scene.appendChild(root);
                  }
                }
                // remove existing children
                root.innerHTML = '';
                // create models as preview children
                const fox = document.createElement('a-entity');
                fox.id = 'fox-preview';
                fox.setAttribute('gltf-model', '#model-fox');
                fox.setAttribute('position', '-0.6 0 -2');
                fox.setAttribute('scale', '0.5 0.5 0.5');
                root.appendChild(fox);

                const hare = document.createElement('a-entity');
                hare.id = 'hare-preview';
                hare.setAttribute('gltf-model', '#model-hare');
                hare.setAttribute('position', '0.6 0 -2');
                hare.setAttribute('scale', '0.5 0.5 0.5');
                root.appendChild(hare);
                // Attach listeners
                fox.addEventListener('model-loaded', () => { sendLog('info', 'fox preview model loaded'); console.log('[preview] fox loaded'); logModelDetails(fox, 'fox-preview'); });
                fox.addEventListener('model-error', (e) => { sendLog('error', 'fox preview model error', { err: e }); console.warn('[preview] fox error', e); });
                hare.addEventListener('model-loaded', () => { sendLog('info', 'hare preview model loaded'); console.log('[preview] hare loaded'); logModelDetails(hare, 'hare-preview'); });
                hare.addEventListener('model-error', (e) => { sendLog('error', 'hare preview model error', { err: e }); console.warn('[preview] hare error', e); });
              }

              function destroyPreviewEntities() {
                const root = document.getElementById('preview-root');
                if (root) root.remove();
              }

              if (btnPreviewToggle) {
                btnPreviewToggle.addEventListener('change', (ev) => {
                  if (ev.target.checked) {
                    createPreviewEntities();
                  } else {
                    destroyPreviewEntities();
                  }
                });
                // restore toggle if saved
                try {
                  const key = 'webar_preview_enabled';
                  const val = localStorage.getItem(key) === '1';
                  if (val) { btnPreviewToggle.checked = true; createPreviewEntities(); }
                  btnPreviewToggle.addEventListener('change', (e) => localStorage.setItem(key, e.target.checked ? '1' : '0'));
                } catch (e) { }
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

  function logModelDetails(el, name) {
    try {
      const obj3d = el.getObject3D('mesh') || el.getObject3D('group') || el.getObject3D('scene');
      if (!obj3d) return;
      const Box3 = AFRAME.THREE.Box3;
      const Vector3 = AFRAME.THREE.Vector3;
      const box = new Box3().setFromObject(obj3d);
      const size = box.getSize(new Vector3());
      console.log(`[model] ${name} bbox size:`, size);
      sendLog('debug', 'model-size', { name, size: { x: size.x, y: size.y, z: size.z } });
    } catch (e) {
      console.warn('[model] log details failed', e);
    }
  }
  try {
    if (fox) fox.addEventListener('model-loaded', () => logModelDetails(fox, 'fox'));
    if (hare) hare.addEventListener('model-loaded', () => logModelDetails(hare, 'hare'));
  } catch (e) { console.warn('[model] add size listener failed', e); }

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
  installModelFallback('fox-preview', 'box');
  installModelFallback('hare-preview', 'sphere');
});
