// === GLOBAL STATE ===
let currentCharIdx = 0;
let writer = null;
let isPracticeMode = false;
let stats = { practiced: 0, mastered: new Set() };
let currentCharData = null;
let totalStrokes = 0;
let currentStrokeNum = 0;
let isAnimating = false;

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

function updateStatsUI() {
  document.getElementById('stat-practiced').textContent = stats.practiced;
  document.getElementById('stat-mastered').textContent = stats.mastered.size;
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
    btn.className = `carousel-item ${i === currentCharIdx ? 'active' : ''} ${stats.mastered.has(i) ? 'mastered' : ''}`;
    btn.innerHTML = `
      <span class="carousel-hanzi">${c.char}</span>
      <span class="carousel-pinyin">${c.pinyin}</span>
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
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      container.scrollBy({ left: -140, behavior: 'smooth' });
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      container.scrollBy({ left: 140, behavior: 'smooth' });
    });
  }
  
  let touchStartX = 0;
  container.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  container.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        container.scrollBy({ left: 140, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -140, behavior: 'smooth' });
      }
    }
  });
}

// === ФАКТЫ (всегда раскрыты) ===
function updateFactsExpanded(facts) {
  if (!facts) return;
  
  const historyEl = document.getElementById('history-text');
  const positionEl = document.getElementById('position-text');
  const statsEl = document.getElementById('stats-text');
  
  if (historyEl) historyEl.textContent = facts.history || 'Информация отсутствует';
  if (positionEl) positionEl.textContent = facts.position || 'Информация отсутствует';
  if (statsEl) statsEl.textContent = facts.stats || 'Информация отсутствует';
}

function renderInfo(charData) {
  if (!charData) return;
  document.getElementById('info-char').textContent = charData.char;
  document.getElementById('info-pinyin').textContent = charData.pinyin;
  document.getElementById('info-transcription').textContent = `(${charData.transcription})`;
  document.getElementById('info-meaning').textContent = charData.meaning;
  document.getElementById('stroke-count').textContent = `Количество черт: ${charData.strokes}`;
  document.getElementById('radical-display').textContent = `Ключ №${charData.radicalNum}`;
  
  const toneNames = { 
    1: "1-й тон (высокий ровный) ¯", 
    2: "2-й тон (восходящий) ´", 
    3: "3-й тон (нисходяще-восходящий) ˇ", 
    4: "4-й тон (нисходящий) `", 
    5: "нейтральный тон" 
  };
  const toneIndicator = document.getElementById('tone-indicator');
  if (toneIndicator) {
    toneIndicator.textContent = toneNames[charData.tone] || toneNames[1];
    toneIndicator.className = `tone-indicator tone-${charData.tone || 1}`;
  }
  
  renderExamples(charData.examples);
  updateFactsExpanded(charData.facts);
}

function renderExamples(examplesStr) {
  const container = document.getElementById('examples-grid');
  if (!container) return;
  
  const examplesList = examplesStr.split('、');
  container.innerHTML = '';
  
  const examplesData = {
    '王': { pinyin: 'wáng', transcription: 'ван', meaning: 'король' },
    '丁': { pinyin: 'dīng', transcription: 'дин', meaning: 'гвоздь, человек' },
    '七': { pinyin: 'qī', transcription: 'ци', meaning: 'семь' },
    '三': { pinyin: 'sān', transcription: 'сань', meaning: 'три' },
    '十': { pinyin: 'shí', transcription: 'ши', meaning: 'десять' },
    '中': { pinyin: 'zhōng', transcription: 'чжун', meaning: 'центр' },
    '串': { pinyin: 'chuàn', transcription: 'чуань', meaning: 'связка' },
    '丰': { pinyin: 'fēng', transcription: 'фэн', meaning: 'изобильный' },
    '丸': { pinyin: 'wán', transcription: 'вань', meaning: 'пилюля' },
    '凡': { pinyin: 'fán', transcription: 'фань', meaning: 'обычный' },
    '丹': { pinyin: 'dān', transcription: 'дань', meaning: 'красный' },
    '户': { pinyin: 'hù', transcription: 'ху', meaning: 'дверь' },
    '乂': { pinyin: 'yì', transcription: 'и', meaning: 'косить' },
    '乃': { pinyin: 'nǎi', transcription: 'най', meaning: 'затем' },
    '久': { pinyin: 'jiǔ', transcription: 'цзю', meaning: 'долгий' },
    '八': { pinyin: 'bā', transcription: 'ба', meaning: 'восемь' },
    '九': { pinyin: 'jiǔ', transcription: 'цзю', meaning: 'девять' },
    '乞': { pinyin: 'qǐ', transcription: 'ци', meaning: 'просить' },
    '也': { pinyin: 'yě', transcription: 'е', meaning: 'также' },
    '了': { pinyin: 'le', transcription: 'лэ', meaning: 'частица' },
    '矛': { pinyin: 'máo', transcription: 'мао', meaning: 'копьё' },
    '事': { pinyin: 'shì', transcription: 'ши', meaning: 'дело' },
    '贰': { pinyin: 'èr', transcription: 'эр', meaning: 'два (формально)' },
    '于': { pinyin: 'yú', transcription: 'юй', meaning: 'в, на' },
    '云': { pinyin: 'yún', transcription: 'юнь', meaning: 'облако' },
    '些': { pinyin: 'xiē', transcription: 'се', meaning: 'немного' },
    '方': { pinyin: 'fāng', transcription: 'фан', meaning: 'квадрат' },
    '亡': { pinyin: 'wáng', transcription: 'ван', meaning: 'погибать' },
    '亢': { pinyin: 'kàng', transcription: 'кан', meaning: 'высокий' },
    '交': { pinyin: 'jiāo', transcription: 'цзяо', meaning: 'пересекаться' },
    '你': { pinyin: 'nǐ', transcription: 'ни', meaning: 'ты' },
    '什': { pinyin: 'shén', transcription: 'шэнь', meaning: 'что' },
    '仁': { pinyin: 'rén', transcription: 'жэнь', meaning: 'гуманность' },
    '仇': { pinyin: 'chóu', transcription: 'чоу', meaning: 'враг' },
    '儿': { pinyin: 'ér', transcription: 'эр', meaning: 'сын' },
    '兀': { pinyin: 'wù', transcription: 'у', meaning: 'высокий' },
    '允': { pinyin: 'yǔn', transcription: 'юнь', meaning: 'разрешать' },
    '元': { pinyin: 'yuán', transcription: 'юань', meaning: 'начало' },
    '入': { pinyin: 'rù', transcription: 'жу', meaning: 'входить' },
    '內': { pinyin: 'nèi', transcription: 'нэй', meaning: 'внутри' },
    '全': { pinyin: 'quán', transcription: 'цюань', meaning: 'полный' },
    '兩': { pinyin: 'liǎng', transcription: 'лян', meaning: 'два' },
    '公': { pinyin: 'gōng', transcription: 'гун', meaning: 'общественный' },
    '分': { pinyin: 'fēn', transcription: 'фэнь', meaning: 'разделять' },
    '半': { pinyin: 'bàn', transcription: 'бань', meaning: 'половина' },
    '冂': { pinyin: 'jiōng', transcription: 'цзюн', meaning: 'дальний' },
    '冃': { pinyin: 'mào', transcription: 'мао', meaning: 'шапка' },
    '冄': { pinyin: 'rǎn', transcription: 'жань', meaning: 'медленно' },
    '内': { pinyin: 'nèi', transcription: 'нэй', meaning: 'внутри' },
    '冠': { pinyin: 'guān', transcription: 'гуань', meaning: 'корона' },
    '冢': { pinyin: 'zhǒng', transcription: 'чжун', meaning: 'могила' },
    '冥': { pinyin: 'míng', transcription: 'мин', meaning: 'тёмный' },
    '冰': { pinyin: 'bīng', transcription: 'бин', meaning: 'лёд' },
    '冷': { pinyin: 'lěng', transcription: 'лэн', meaning: 'холодный' },
    '凍': { pinyin: 'dòng', transcription: 'дун', meaning: 'замерзать' },
    '凝': { pinyin: 'níng', transcription: 'нин', meaning: 'застывать' }
  };
  
  examplesList.forEach(example => {
    const data = examplesData[example] || { pinyin: '?', transcription: '?', meaning: '?' };
    const card = document.createElement('div');
    card.className = 'example-card';
    card.innerHTML = `
      <div class="example-char">${example}</div>
      <div class="example-pinyin">${data.pinyin}</div>
      <div class="example-transcription">${data.transcription}</div>
      <div class="example-meaning">${data.meaning}</div>
    `;
    container.appendChild(card);
  });
}

// === HANZI WRITER ===
function clearWriterContainer() {
  const container = document.getElementById('hanzi-target');
  if (container) {
    container.innerHTML = '';
  }
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
    highlightColor: '#3b82f6',
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
    },
    onLoadCharDataError: function(reason) {
      console.error('Error loading character data:', reason);
      showError('Не удалось загрузить данные иероглифа. Проверьте соединение.');
    }
  };
}

function initWriter(char) {
  if (writer) {
    try {
      writer.cancelQuiz();
    } catch(e) {}
    writer = null;
  }
  
  clearWriterContainer();
  writer = HanziWriter.create('hanzi-target', char, getWriterOptions());
}

function animateCharacter() {
  if (!writer) return;
  
  updateStrokeProgress(0, totalStrokes);
  currentStrokeNum = 0;
  isAnimating = true;
  
  writer.animateCharacter({
    onComplete: function() {
      isAnimating = false;
      showToast('✅ Анимация завершена!');
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
  document.querySelector('.writer-wrap')?.classList.add('practice-active');
  setButtonsEnabled(false);
  
  writer.hideCharacter();
  
  writer.quiz({
    onCorrectStroke: function(strokeData) {
      currentStrokeNum = strokeData.strokeNum + 1;
      updateStrokeProgress(currentStrokeNum, totalStrokes);
      
      if (strokeData.strokesRemaining > 0) {
        showToast(`✅ Черта ${currentStrokeNum} из ${totalStrokes}`, 1200);
      }
    },
    onMistake: function(strokeData) {
      const svg = document.querySelector('#hanzi-target svg');
      if (svg) {
        svg.style.animation = 'shake 0.5s';
        setTimeout(() => svg.style.animation = '', 500);
      }
      
      if (strokeData.mistakesOnStroke === 1) {
        showToast('❌ Попробуйте ещё раз!', 1500);
      }
    },
    onComplete: function(summaryData) {
      showToast('🎉 Иероглиф освоен!', 3000);
      stats.mastered.add(currentCharIdx);
      stats.practiced++;
      updateStatsUI();
      renderCarousel();
      
      const target = document.getElementById('hanzi-target');
      target.style.transform = 'scale(1.05)';
      setTimeout(() => {
        target.style.transform = 'scale(1)';
        setTimeout(exitPracticeMode, 1500);
      }, 300);
    }
  });
  
  stats.practiced++;
  updateStatsUI();
  renderCarousel();
  showToast('✍️ Нарисуйте черты по порядку!');
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
  document.querySelector('.writer-wrap')?.classList.remove('practice-active');
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
  
  showToast(`Загружен: ${currentCharData.char} (${currentCharData.transcription})`);
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
  showToast('🎬 Анимация...');
});

document.getElementById('btn-practice')?.addEventListener('click', startPracticeMode);
document.getElementById('btn-exit-practice')?.addEventListener('click', exitPracticeMode);
document.getElementById('btn-retry')?.addEventListener('click', () => selectChar(currentCharIdx));
document.getElementById('btn-speak')?.addEventListener('click', () => {
  if (currentCharData) {
    speakText(currentCharData.char);
  }
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
});

// Init
window.addEventListener('load', () => {
  if (typeof CHARACTERS === 'undefined') {
    showToast('Ошибка загрузки данных');
    return;
  }
  
  if (typeof HanziWriter === 'undefined') {
    showError('Ошибка загрузки Hanzi Writer. Проверьте подключение к интернету.');
    return;
  }
  
  updateStatsUI();
  renderCarousel();
  setupCarouselNavigation();
  selectChar(0);
});