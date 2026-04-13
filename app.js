// === GLOBAL STATE ===
let currentCharIdx = 0;
let writer = null;
let isPracticeMode = false;
let currentCharData = null;
let totalStrokes = 0;
let currentStrokeNum = 0;
let isAnimating = false;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// === СЕТКА ===
let guidelineCanvas = null;
let guidelineCtx = null;

function initGuidelineCanvas() {
  const canvas = document.getElementById('guideline-canvas');
  if (!canvas) return;

  guidelineCanvas = canvas;
  guidelineCtx = canvas.getContext('2d');

  const resizeObserver = new ResizeObserver(() => drawGrid());
  const container = canvas.parentElement;
  if (container) resizeObserver.observe(container);

  drawGrid();
}

function drawGrid() {
  if (!guidelineCanvas || !guidelineCtx) return;

  const container = guidelineCanvas.parentElement;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);

  if (size === 0) return;

  guidelineCanvas.width = size;
  guidelineCanvas.height = size;
  guidelineCanvas.style.width = `${size}px`;
  guidelineCanvas.style.height = `${size}px`;

  const ctx = guidelineCtx;
  ctx.clearRect(0, 0, size, size);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const mainColor = isDark ? '#ef4444' : '#c0392b';
  const accentColor = '#e67e22';
  const lightColor = isDark ? 'rgba(239,68,68,0.3)' : 'rgba(192,57,43,0.25)';

  ctx.save();
  ctx.shadowBlur = 0;

  const margin = Math.max(3, size * 0.01);

  ctx.beginPath();
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = Math.max(2, size * 0.007);
  ctx.strokeRect(margin, margin, size - margin*2, size - margin*2);

  ctx.beginPath();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(1, size * 0.003);
  ctx.strokeRect(margin/2, margin/2, size - margin, size - margin);

  ctx.beginPath();
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = Math.max(1.5, size * 0.005);
  ctx.moveTo(size / 2, margin);
  ctx.lineTo(size / 2, size - margin);
  ctx.moveTo(margin, size / 2);
  ctx.lineTo(size - margin, size / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(1, size * 0.004);
  ctx.moveTo(margin, margin);
  ctx.lineTo(size - margin, size - margin);
  ctx.moveTo(size - margin, margin);
  ctx.lineTo(margin, size - margin);
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = lightColor;
  ctx.lineWidth = Math.max(1, size * 0.003);
  ctx.setLineDash([Math.max(4, size * 0.015), Math.max(3, size * 0.01)]);

  const third = size / 3;
  const twoThird = (size * 2) / 3;
  ctx.moveTo(margin, third);
  ctx.lineTo(size - margin, third);
  ctx.moveTo(margin, twoThird);
  ctx.lineTo(size - margin, twoThird);
  ctx.moveTo(third, margin);
  ctx.lineTo(third, size - margin);
  ctx.moveTo(twoThird, margin);
  ctx.lineTo(twoThird, size - margin);
  ctx.stroke();

  ctx.restore();
}

function setGridDim(dim) {
  const canvas = document.getElementById('guideline-canvas');
  if (canvas) {
    if (dim) canvas.classList.add('dim');
    else canvas.classList.remove('dim');
  }
}

function updateGridTheme() { drawGrid(); }

// === TOOLTIP SYSTEM ===
function initTooltips() {
  const tooltip = document.getElementById('tooltip');
  if (!tooltip) return;

  document.querySelectorAll('[data-tooltip]').forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      const text = el.getAttribute('data-tooltip');
      if (text) {
        tooltip.textContent = text;
        tooltip.classList.add('show');
        updateTooltipPosition(e);
      }
    });
    el.addEventListener('mousemove', updateTooltipPosition);
    el.addEventListener('mouseleave', () => {
      tooltip.classList.remove('show');
    });
  });
}

function updateTooltipPosition(e) {
  const tooltip = document.getElementById('tooltip');
  if (!tooltip || !tooltip.classList.contains('show')) return;
  tooltip.style.left = `${e.clientX}px`;
  tooltip.style.top = `${e.clientY - tooltip.offsetHeight - 10}px`;
}

// === ANIMATIONS ===
function animateBlocks() {
  const blocks = document.querySelectorAll('.info-block');
  blocks.forEach((block, index) => {
    block.style.animation = 'none';
    block.offsetHeight;
    block.style.animation = `fadeInUp 0.6s ease forwards`;
    block.style.animationDelay = `${index * 0.1}s`;
  });
}

// === UTILITIES ===
function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function hideError() {
  const banner = document.getElementById('error-banner');
  if (banner) banner.style.display = 'none';
}

function showError(msg) {
  const banner = document.getElementById('error-banner');
  const msgEl = document.getElementById('error-message');
  if (banner && msgEl) {
    msgEl.textContent = msg;
    banner.style.display = 'flex';
  }
}

function setButtonsEnabled(enabled) {
  const btns = ['btn-animate', 'btn-practice'];
  btns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enabled;
  });
}

// === ИНДИКАТОР ПРОГРЕССА ===
function renderStrokeDots(total) {
  const container = document.getElementById('stroke-dots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'stroke-dot';
    dot.dataset.stroke = i + 1;
    container.appendChild(dot);
  }
}

function updateStrokeProgress(strokeNum, total) {
  const currentEl = document.getElementById('current-stroke');
  const totalEl = document.getElementById('total-strokes');
  const progressFill = document.getElementById('progress-fill');
  const percentageEl = document.getElementById('progress-percentage');

  if (currentEl) currentEl.textContent = strokeNum;
  if (totalEl) totalEl.textContent = total;

  if (progressFill) {
    const percent = total > 0 ? Math.round((strokeNum / total) * 100) : 0;
    progressFill.style.width = percent + '%';
    if (percentageEl) percentageEl.textContent = percent + '%';
  }

  const dots = document.querySelectorAll('.stroke-dot');
  dots.forEach((dot, index) => {
    dot.classList.remove('active', 'completed');
    if (index < strokeNum) {
      dot.classList.add('completed');
    } else if (index === strokeNum) {
      dot.classList.add('active');
    }
  });
}

// === ИЗБРАННОЕ ===
function updateFavoriteButton() {
  const btn = document.getElementById('btn-favorite');
  if (!btn) return;
  const isFav = favorites.includes(currentCharIdx);
  if (isFav) btn.classList.add('active');
  else btn.classList.remove('active');
}

function toggleFavorite() {
  const idx = currentCharIdx;
  const isFav = favorites.includes(idx);
  if (isFav) {
    favorites = favorites.filter(i => i !== idx);
    showToast('Удалено из избранного');
  } else {
    favorites.push(idx);
    showToast('Добавлено в избранное ⭐');
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  updateFavoriteButton();
  updateFavoritesModal();
}

const favoritesModal = document.getElementById('favorites-modal');
const favoritesList = document.getElementById('favorites-list');

function updateFavoritesModal() {
  if (!favoritesList) return;
  if (favorites.length === 0) {
    favoritesList.innerHTML = '<div class="empty-favorites">Нет избранных ключей</div>';
    return;
  }
  favoritesList.innerHTML = '';
  favorites.forEach(idx => {
    const charData = CHARACTERS[idx];
    if (!charData) return;
    const div = document.createElement('div');
    div.className = 'fav-item';
    div.innerHTML = `
      <div class="fav-char">${charData.char}</div>
      <div class="fav-info">
        <div class="fav-pinyin">${charData.pinyin}</div>
        <div class="fav-meaning">${charData.meaning}</div>
      </div>
    `;
    div.addEventListener('click', () => {
      selectChar(idx);
      closeFavoritesModal();
    });
    favoritesList.appendChild(div);
  });
}

function openFavoritesModal() {
  if (!favoritesModal) return;
  updateFavoritesModal();
  favoritesModal.style.display = 'flex';
}

function closeFavoritesModal() {
  if (favoritesModal) favoritesModal.style.display = 'none';
}

// === КАРУСЕЛЬ ===
function renderCarousel() {
  const container = document.getElementById('radicalCarousel');
  if (!container) return;

  container.innerHTML = '';
  CHARACTERS.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = `carousel-item ${i === currentCharIdx ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="carousel-hanzi">${c.char}</span>
      <span class="carousel-pinyin">${c.pinyin}</span>
      <span class="carousel-num">${c.radicalNum}</span>
    `;
    btn.onclick = () => selectChar(i);
    container.appendChild(btn);
  });

  setTimeout(() => {
    const activeItem = container.querySelector('.carousel-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, 100);
}

function setupCarouselNavigation() {
  const container = document.getElementById('radicalCarousel');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');

  if (prevBtn) prevBtn.addEventListener('click', () => container.scrollBy({ left: -120, behavior: 'smooth' }));
  if (nextBtn) nextBtn.addEventListener('click', () => container.scrollBy({ left: 120, behavior: 'smooth' }));
}

// === ОТОБРАЖЕНИЕ ИНФОРМАЦИИ ===
function renderInfo(charData) {
  if (!charData) return;

  const pinyinEl = document.getElementById('detail-pinyin');
  if (pinyinEl) pinyinEl.textContent = charData.pinyin;

  const toneEl = document.getElementById('detail-tone');
  if (toneEl) toneEl.textContent = charData.tone;

  const koreanReadEl = document.getElementById('detail-korean-read');
  if (koreanReadEl) koreanReadEl.textContent = charData.koreanName;

  const meaningRuEl = document.getElementById('detail-meaning-ru');
  if (meaningRuEl) meaningRuEl.textContent = charData.meaning;

  const meaningKrEl = document.getElementById('detail-meaning-kr');
  if (meaningKrEl) meaningKrEl.textContent = `${charData.koreanName} (${charData.koreanMeaning})`;

  const statsEl = document.getElementById('detail-stats');
  if (statsEl) statsEl.textContent = `Ключ №${charData.radicalNum} · Черты: ${charData.strokes}`;

  const memoryEl = document.getElementById('detail-memory');
  if (memoryEl) memoryEl.innerHTML = charData.memoryHook || '';

  const historyEl = document.getElementById('history-text');
  if (historyEl) {
    const formattedHistory = charData.history.replace(/\n/g, '<br>');
    historyEl.innerHTML = formattedHistory;
  }

  const positionEl = document.getElementById('position-text');
  if (positionEl) positionEl.textContent = charData.position;

  renderExamples(charData.examples.slice(0, 2));
  updateFavoriteButton();

  renderStrokeDots(charData.strokes);
  updateStrokeProgress(0, charData.strokes);

  animateBlocks();
}

function renderExamples(examples) {
  const container = document.getElementById('examples-grid');
  if (!container) return;

  container.innerHTML = '';
  examples.forEach(example => {
    const data = window.getExampleData(example);
    const card = document.createElement('div');
    card.className = 'example-card';
    card.innerHTML = `
      <div class="example-char">${example}</div>
      <div class="example-details">
        <div class="example-pinyin">${data.pinyin}</div>
        <div class="example-meaning">${data.meaning}</div>
        <div class="example-korean">🇰🇷 ${data.korean}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

// === HANZI WRITER ===
function clearWriterContainer() {
  const container = document.getElementById('hanzi-target');
  if (container) container.innerHTML = '';
}

function getWriterOptions() {
  const container = document.getElementById('hanzi-target');
  const size = container ? container.clientWidth : 320;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  return {
    width: size,
    height: size,
    padding: Math.max(10, size * 0.03),
    showOutline: true,
    showCharacter: true,
    strokeColor: isDark ? '#ef4444' : '#c0392b',
    outlineColor: isDark ? '#444' : '#ddd',
    highlightColor: '#f1c40f',
    drawingColor: '#2c6e9e',
    drawingWidth: Math.max(4, size * 0.02),
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 500,
    strokeHighlightSpeed: 2,
    showHintAfterMisses: 3,
    highlightOnComplete: true,

    onLoadCharDataSuccess: function(data) {
      totalStrokes = data.strokes ? data.strokes.length : currentCharData.strokes;
      updateStrokeProgress(0, totalStrokes);
      hideError();
      setTimeout(() => {
        drawGrid();
        const svg = document.querySelector('#hanzi-target svg');
        if (svg) {
          svg.style.display = 'block';
          svg.style.margin = '0 auto';
        }
      }, 100);
    },

    onLoadCharDataError: function(reason) {
      console.error('Error:', reason);
      showError('Не удалось загрузить данные иероглифа. Проверьте подключение к интернету.');
    }
  };
}

function initWriter(char) {
  if (writer) {
    try { writer.cancelQuiz(); } catch(e) {}
    writer = null;
  }

  clearWriterContainer();

  setTimeout(() => {
    writer = HanziWriter.create('hanzi-target', char, getWriterOptions());
    initGuidelineCanvas();
  }, 50);
}

function animateCharacter() {
  if (!writer) return;
  setGridDim(true);
  updateStrokeProgress(0, totalStrokes);
  currentStrokeNum = 0;
  isAnimating = true;

  writer.animateCharacter({
    onComplete: function() {
      isAnimating = false;
      setGridDim(false);
      showToast('Анимация завершена');
      updateStrokeProgress(totalStrokes, totalStrokes);
    }
  });

  let interval = setInterval(() => {
    if (!isAnimating || currentStrokeNum >= totalStrokes) {
      clearInterval(interval);
      return;
    }
    currentStrokeNum++;
    updateStrokeProgress(currentStrokeNum, totalStrokes);
  }, 600);
}

function startPracticeMode() {
  if (!writer || !currentCharData) {
    showToast('Иероглиф ещё не загружен');
    return;
  }

  isPracticeMode = true;
  currentStrokeNum = 0;
  setGridDim(true);

  const banner = document.getElementById('practice-banner');
  if (banner) banner.classList.add('active');

  setButtonsEnabled(false);

  writer.hideCharacter();

  writer.quiz({
    onCorrectStroke: function(strokeData) {
      currentStrokeNum = strokeData.strokeNum + 1;
      updateStrokeProgress(currentStrokeNum, totalStrokes);
      if (strokeData.strokesRemaining > 0) {
        showToast(`Черта ${currentStrokeNum} из ${totalStrokes}`, 1200);
      }
    },
    onMistake: function(strokeData) {
      const svg = document.querySelector('#hanzi-target svg');
      if (svg) {
        svg.style.animation = 'shake 0.5s';
        setTimeout(() => svg.style.animation = '', 500);
      }
      if (strokeData.mistakesOnStroke === 1) {
        showToast('Попробуйте ещё раз!', 1500);
      }
    },
    onComplete: function() {
      showToast('Иероглиф освоен! 🎉', 3000);
      const target = document.getElementById('hanzi-target');
      target.style.transform = 'scale(1.05)';
      setTimeout(() => {
        target.style.transform = 'scale(1)';
        setTimeout(exitPracticeMode, 1500);
      }, 300);
    }
  });

  showToast('Нарисуйте черты по порядку!');
}

function exitPracticeMode() {
  if (!isPracticeMode) return;

  isPracticeMode = false;
  currentStrokeNum = 0;
  setGridDim(false);

  if (writer) {
    writer.cancelQuiz();
    writer.showCharacter();
  }

  const banner = document.getElementById('practice-banner');
  if (banner) banner.classList.remove('active');

  setButtonsEnabled(true);
  updateStrokeProgress(0, totalStrokes);
  showToast('Выход из практики');
}

function selectChar(idx) {
  if (!CHARACTERS[idx]) return;
  if (isPracticeMode) exitPracticeMode();

  currentCharIdx = idx;
  currentCharData = CHARACTERS[idx];

  hideError();
  renderCarousel();
  renderInfo(currentCharData);
  setButtonsEnabled(true);
  initWriter(currentCharData.char);
}

function speakText(text, lang = 'zh-CN') {
  if (!window.speechSynthesis) {
    showToast('Аудио не поддерживается');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.8;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// === EVENT LISTENERS ===
document.getElementById('btn-speak')?.addEventListener('click', () => {
  if (currentCharData) speakText(currentCharData.char);
});

document.getElementById('btn-animate')?.addEventListener('click', () => {
  if (isPracticeMode) exitPracticeMode();
  animateCharacter();
});

document.getElementById('btn-practice')?.addEventListener('click', startPracticeMode);
document.getElementById('btn-exit-practice')?.addEventListener('click', exitPracticeMode);
document.getElementById('btn-retry')?.addEventListener('click', () => selectChar(currentCharIdx));

// === ИСПРАВЛЕНИЕ: добавляем обработчик для кнопки избранного ===
document.getElementById('btn-favorite')?.addEventListener('click', toggleFavorite);

document.getElementById('btn-favorites-scroll')?.addEventListener('click', openFavoritesModal);
document.querySelector('.modal-close')?.addEventListener('click', closeFavoritesModal);
window.addEventListener('click', (e) => {
  if (e.target === favoritesModal) closeFavoritesModal();
});

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
let theme = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', theme);

if (theme === 'dark') {
  themeToggle?.classList.add('active');
}

themeToggle?.addEventListener('click', () => {
  themeToggle.classList.add('theme-switching');

  theme = theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  if (theme === 'dark') {
    themeToggle.classList.add('active');
  } else {
    themeToggle.classList.remove('active');
  }

  if (writer && currentCharData) {
    const isDark = theme === 'dark';
    writer.updateColor('strokeColor', isDark ? '#ef4444' : '#c0392b');
    writer.updateColor('outlineColor', isDark ? '#444' : '#ddd');
  }

  drawGrid();

  setTimeout(() => {
    themeToggle.classList.remove('theme-switching');
  }, 500);
});

// Init
window.addEventListener('load', () => {
  if (typeof CHARACTERS === 'undefined') {
    showToast('Ошибка загрузки данных');
    return;
  }
  if (typeof HanziWriter === 'undefined') {
    showError('Ошибка загрузки Hanzi Writer');
    return;
  }

  renderCarousel();
  setupCarouselNavigation();
  initTooltips();
  selectChar(0);
  updateFavoritesModal();
});

window.addEventListener('resize', () => {
  setTimeout(drawGrid, 100);
});
