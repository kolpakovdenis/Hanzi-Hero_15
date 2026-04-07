// === GLOBAL STATE ===
let currentCharIdx = 0;
let writer = null;
let isPracticeMode = false;
let currentCharData = null;
let totalStrokes = 0;
let currentStrokeNum = 0;
let isAnimating = false;

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
  
  const size = container.clientWidth;
  if (size === 0) return;
  
  guidelineCanvas.width = size;
  guidelineCanvas.height = size;
  guidelineCanvas.style.width = `${size}px`;
  guidelineCanvas.style.height = `${size}px`;
  
  const ctx = guidelineCtx;
  ctx.clearRect(0, 0, size, size);
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const mainColor = isDark ? '#ef4444' : '#c0392b';
  const lightColor = isDark ? 'rgba(239,68,68,0.2)' : 'rgba(192,57,43,0.15)';
  
  ctx.save();
  
  // Внешняя рамка
  ctx.beginPath();
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  
  // Центральные линии
  ctx.beginPath();
  ctx.strokeStyle = lightColor;
  ctx.lineWidth = 1;
  ctx.moveTo(size / 2, 4);
  ctx.lineTo(size / 2, size - 4);
  ctx.moveTo(4, size / 2);
  ctx.lineTo(size - 4, size / 2);
  ctx.stroke();
  
  // Диагонали
  ctx.beginPath();
  ctx.strokeStyle = lightColor;
  ctx.lineWidth = 0.8;
  ctx.moveTo(4, 4);
  ctx.lineTo(size - 4, size - 4);
  ctx.moveTo(size - 4, 4);
  ctx.lineTo(4, size - 4);
  ctx.stroke();
  
  // Линии третей
  ctx.beginPath();
  ctx.strokeStyle = lightColor;
  ctx.lineWidth = 0.6;
  ctx.setLineDash([4, 4]);
  
  const third = size / 3;
  const twoThird = (size * 2) / 3;
  ctx.moveTo(4, third);
  ctx.lineTo(size - 4, third);
  ctx.moveTo(4, twoThird);
  ctx.lineTo(size - 4, twoThird);
  ctx.moveTo(third, 4);
  ctx.lineTo(third, size - 4);
  ctx.moveTo(twoThird, 4);
  ctx.lineTo(twoThird, size - 4);
  ctx.stroke();
  
  ctx.restore();
}

function updateGridTheme() { drawGrid(); }

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

function updateStrokeProgress(strokeNum, total) {
  document.getElementById('current-stroke').textContent = strokeNum;
  document.getElementById('total-strokes').textContent = total;
  const percent = total > 0 ? Math.round((strokeNum / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = percent + '%';
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
  
  // Отображаем корейское название и его перевод на русский
  document.getElementById('korean-name').textContent = charData.koreanName;
  document.getElementById('korean-meaning').textContent = `(${charData.koreanMeaning})`;
  
  document.getElementById('info-char').textContent = charData.char;
  document.getElementById('info-pinyin').textContent = charData.pinyin;
  document.getElementById('info-meaning').textContent = charData.meaning;
  document.getElementById('stroke-count').textContent = charData.strokes;
  document.getElementById('radical-num').textContent = charData.radicalNum;
  document.getElementById('tone-indicator').textContent = charData.tone;
  
  document.getElementById('history-text').textContent = charData.history;
  document.getElementById('position-text').textContent = charData.position;
  document.getElementById('stats-text').textContent = charData.stats;
  
  renderExamples(charData.examples);
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
      <div class="example-pinyin">${data.pinyin}</div>
      <div class="example-meaning">${data.meaning}</div>
      <div class="example-korean">🇰🇷 ${data.korean}</div>
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
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    width: 300,
    height: 300,
    padding: 5,
    showOutline: true,
    showCharacter: true,
    strokeColor: isDark ? '#ef4444' : '#c0392b',
    outlineColor: isDark ? '#444' : '#ddd',
    highlightColor: '#f1c40f',
    drawingColor: '#2c6e9e',
    drawingWidth: 5,
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 500,
    strokeHighlightSpeed: 2,
    showHintAfterMisses: 3,
    highlightOnComplete: true,
    onLoadCharDataSuccess: function(data) {
      totalStrokes = data.strokes ? data.strokes.length : currentCharData.strokes;
      updateStrokeProgress(0, totalStrokes);
      hideError();
      setTimeout(drawGrid, 100);
    },
    onLoadCharDataError: function(reason) {
      console.error('Error:', reason);
      showError('Не удалось загрузить данные иероглифа.');
    }
  };
}

function initWriter(char) {
  if (writer) {
    try { writer.cancelQuiz(); } catch(e) {}
    writer = null;
  }
  
  clearWriterContainer();
  writer = HanziWriter.create('hanzi-target', char, getWriterOptions());
  setTimeout(() => initGuidelineCanvas(), 100);
}

function animateCharacter() {
  if (!writer) return;
  
  updateStrokeProgress(0, totalStrokes);
  currentStrokeNum = 0;
  isAnimating = true;
  
  writer.animateCharacter({
    onComplete: function() {
      isAnimating = false;
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
  
  document.getElementById('practice-banner').classList.add('active');
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
      showToast('Иероглиф освоен!', 3000);
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
  
  if (writer) {
    writer.cancelQuiz();
    writer.showCharacter();
  }
  
  document.getElementById('practice-banner').classList.remove('active');
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
document.getElementById('btn-animate')?.addEventListener('click', () => {
  if (isPracticeMode) exitPracticeMode();
  animateCharacter();
});

document.getElementById('btn-practice')?.addEventListener('click', startPracticeMode);
document.getElementById('btn-exit-practice')?.addEventListener('click', exitPracticeMode);
document.getElementById('btn-retry')?.addEventListener('click', () => selectChar(currentCharIdx));
document.getElementById('btn-speak')?.addEventListener('click', () => {
  if (currentCharData) speakText(currentCharData.char);
});

// Theme
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
let theme = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', theme);
themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';

themeToggle?.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  
  if (writer && currentCharData) {
    const isDark = theme === 'dark';
    writer.updateColor('strokeColor', isDark ? '#ef4444' : '#c0392b');
    writer.updateColor('outlineColor', isDark ? '#444' : '#ddd');
  }
  drawGrid();
});

window.addEventListener('resize', () => setTimeout(drawGrid, 100));

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
  selectChar(0);
});
