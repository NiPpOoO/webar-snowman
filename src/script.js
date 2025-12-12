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
      safeText('Маркер распознан: фигуры появились.');
      // пометить для доступности
      marker.setAttribute('visible', true);
      marker.classList && marker.classList.add('marker-visible');
    });
    marker.addEventListener('markerLost', () => {
      safeText('Потерян трекинг. Наведи камеру на снеговика ещё раз.');
      marker.setAttribute('visible', false);
      marker.classList && marker.classList.remove('marker-visible');
    });
  }

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

  // Переключение камеры (грубо: переключаем facingMode; если браузер не поддерживает — показываем подсказку)
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

      // Попытка установить новый атрибут
      try {
        const newAttr = Object.assign({}, arjs, { facingMode: nextFacing });
        scene.setAttribute('arjs', newAttr);
        safeText(nextFacing === 'environment' ? 'Включена основная камера' : 'Включена фронтальная камера');
      } catch (e) {
        console.warn('Не удалось переключить arjs атрибут напрямую', e);
        // fallback: покинуть уведомление пользователю
        safeText('Не удалось переключить камеру автоматически. Попробуйте перезагрузить страницу и выбрать камеру в настройках браузера.');
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
});
