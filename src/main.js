/**
 * ポモドーロタイマー メインアプリケーション
 */

import './index.css';
import { initSubjects, getSubjects, addSubject, updateSubject, deleteSubject, subscribeSubjects, getSubjectById } from './stores/subjects.js';
import { initSettings, getSettings, updateSettings, updateTimerSettings, subscribeSettings } from './stores/settings.js';
import {
  initTimer,
  getTimerState,
  getRemainingMs,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  skipPhase,
  subscribeTimer,
  requestNotificationPermission,
  PHASES
} from './stores/timer.js';
import { formatTime, formatTimerDisplay, showToast, showConfirmDialog, loadData, saveData, STORAGE_KEYS } from './utils/storage.js';
import { renderStatisticsPage, initStatisticsChart } from './pages/StatisticsPage.js';

// 現在のページ状態
let currentPage = 'timer';

// 背景パターン定義
const BACKGROUNDS = [
  { id: 'bg_sunrise', name: 'Sunrise', hue: 200, hue2: 260 }, // 朝焼け（青紫）
  { id: 'bg_lemon', name: 'Lemon', hue: 50, hue2: 60 },  // 黄色系
  { id: 'bg_sunset', name: 'Sunset', hue: 20, hue2: 40 },  // オレンジ系
  { id: 'bg_cherry', name: 'Cherry', hue: 340, hue2: 0 },   // 赤系
  { id: 'bg_emerald', name: 'Emerald', hue: 140, hue2: 170 }, // 緑系
  { id: 'bg_ocean', name: 'Ocean', hue: 190, hue2: 220 }, // 青系
  { id: 'bg_royal', name: 'Royal', hue: 250, hue2: 290 }, // 紫系
  { id: 'bg_snow', name: 'Snow', hue: 0, hue2: 0, sat: 0, light: 95 }, // 白系
  { id: 'bg_onyx', name: 'Onyx', hue: 0, hue2: 0, sat: 0, light: 10 }  // 黒系
];

/**
 * アプリ初期化
 */
function init() {
  // ストア初期化
  initSettings();
  initSubjects();
  initTimer();

  // 初期レンダリング
  render();

  // 変更検知リスナー登録
  subscribeSubjects(() => {
    if (currentPage === 'statistics') {
      render(); // 統計ページならグラフ更新
    } else {
      renderSubjectList();
    }
  });
  subscribeSettings(() => {
    applySettings();
    renderSettingsForm();
  });
  subscribeTimer(() => renderTimer());

  // 設定の適用（テーマ・背景）
  applySettings();
}

/**
 * メインレンダリング関数
 */
function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="background-layer"></div>
    
    <nav class="nav-tabs">
      <button class="nav-tab ${currentPage === 'timer' ? 'active' : ''}" data-page="timer">
        ⏱️ タイマー
      </button>
      <button class="nav-tab ${currentPage === 'subjects' ? 'active' : ''}" data-page="subjects">
        📚 学習項目
      </button>
      <button class="nav-tab ${currentPage === 'statistics' ? 'active' : ''}" data-page="statistics">
        📊 統計
      </button>
      <button class="nav-tab ${currentPage === 'settings' ? 'active' : ''}" data-page="settings">
        ⚙️ 設定
      </button>
    </nav>

    <main class="main-content">
      <div id="page-timer" class="page ${currentPage === 'timer' ? 'active' : ''}">
        ${renderTimerPage()}
      </div>
      <div id="page-subjects" class="page ${currentPage === 'subjects' ? 'active' : ''}">
        ${renderSubjectsPage()}
      </div>
      <div id="page-statistics" class="page ${currentPage === 'statistics' ? 'active' : ''}">
        ${renderStatisticsPage()}
      </div>
      <div id="page-settings" class="page ${currentPage === 'settings' ? 'active' : ''}">
        ${renderSettingsPage()}
      </div>
    </main>

    <div class="ad-banner">
      📢 広告スペース
    </div>
  `;

  // イベントリスナー設定
  setupEventListeners();

  // 背景適用
  applyBackground();

  // 統計ページならチャート初期化
  if (currentPage === 'statistics') {
    initStatisticsChart();
  }
}

/**
 * タイマーページのHTML生成
 */
function renderTimerPage() {
  const state = getTimerState();
  const subjects = getSubjects();
  const remainingMs = getRemainingMs();
  const settings = getSettings();

  const phaseLabels = {
    [PHASES.IDLE]: '待機中',
    [PHASES.STUDY]: '勉強中',
    [PHASES.BREAK]: '休憩中',
    [PHASES.INTERVAL]: '長い休憩'
  };

  const isRunning = state.phase !== PHASES.IDLE && !state.isPaused;
  const isPaused = state.isPaused;
  const isIdle = state.phase === PHASES.IDLE;

  return `
    <div class="timer-container">
      <div class="subject-selector">
        <select class="subject-select" id="subject-select" ${!isIdle ? 'disabled' : ''}>
          <option value="">学習項目を選択...</option>
          ${subjects.map(s => `
            <option value="${s.id}" ${state.subjectId === s.id ? 'selected' : ''}>
              ${s.name} (${formatTime(s.totalMinutes)})
            </option>
          `).join('')}
        </select>
      </div>

      <div class="timer-display" id="timer-display">
        ${isIdle ? formatTimerDisplay(settings.studyMinutes * 60 * 1000) : formatTimerDisplay(remainingMs)}
      </div>

      <div class="timer-phase" data-phase="${state.phase.toLowerCase()}">
        ${phaseLabels[state.phase]}
      </div>

      ${!isIdle ? `
        <div class="timer-count">
          完了済み: ${state.count} / ${settings.intervalCycle} セット
        </div>
      ` : ''}

      <div class="controls">
        ${isIdle ? `
          <button class="btn btn-primary" id="btn-start">
            ▶️ 開始
          </button>
        ` : ''}

        ${isRunning ? `
          <button class="btn btn-secondary" id="btn-pause">
            ⏸️ 一時停止
          </button>
        ` : ''}

        ${isPaused ? `
          <button class="btn btn-primary" id="btn-resume">
            ▶️ 再開
          </button>
        ` : ''}

        ${!isIdle ? `
          <button class="btn btn-secondary" id="btn-skip">
            ⏭️ スキップ
          </button>
          <button class="btn btn-danger" id="btn-reset">
            🔄 リセット
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * 学習項目ページのHTML生成
 */
function renderSubjectsPage() {
  const subjects = getSubjects();

  return `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
        <h2 style="margin: 0;">📚 学習項目</h2>
        <button class="btn btn-primary" id="btn-add-subject">
          ➕ 追加
        </button>
      </div>

      <div class="subject-list" id="subject-list">
        ${subjects.length === 0 ? `
          <p class="text-muted text-center">学習項目がありません。<br>「追加」ボタンから登録してください。</p>
        ` : subjects.map(s => `
          <div class="subject-item" data-id="${s.id}">
            <div class="subject-color" style="background-color: ${s.color}"></div>
            <div class="subject-info">
              <div class="subject-name">${s.name}</div>
              <div class="subject-time">${formatTime(s.totalMinutes)}</div>
            </div>
            <div class="subject-actions">
              <button class="btn btn-secondary btn-icon" data-action="edit" data-id="${s.id}" title="編集">
                ✏️
              </button>
              <button class="btn btn-danger btn-icon" data-action="delete" data-id="${s.id}" title="削除">
                🗑️
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * 設定ページのHTML生成
 */
function renderSettingsPage() {
  const settings = getSettings();

  const themes = [
    { id: 'light', name: 'White', color: '#FFFFFF' },
    { id: 'dark', name: 'Dark', color: '#1A1A2E' },
    { id: 'blue', name: 'Blue', color: '#0D1B2A' },
    { id: 'green', name: 'Green', color: '#1B4332' },
    { id: 'red', name: 'Red', color: '#4a191c' },
    { id: 'yellow', name: 'Yellow', color: '#4d420c' },
    { id: 'monochrome', name: 'Mono', color: '#2D2D2D' }
  ];

  return `
    <div class="card">
      <div class="settings-section">
        <h3 class="settings-section-title">⏱️ タイマー設定</h3>
        
        <div class="form-group">
          <label class="form-label">勉強時間（分）</label>
          <input type="number" class="form-input" id="setting-study" 
            value="${settings.studyMinutes}" min="1" max="180">
        </div>
        
        <div class="form-group">
          <label class="form-label">休憩時間（分）</label>
          <input type="number" class="form-input" id="setting-break" 
            value="${settings.breakMinutes}" min="1" max="60">
        </div>
        
        <div class="form-group">
          <label class="form-label">長い休憩（分）</label>
          <input type="number" class="form-input" id="setting-interval" 
            value="${settings.intervalMinutes}" min="1" max="120">
        </div>
        
        <div class="form-group">
          <label class="form-label">長い休憩の周期（回）</label>
          <input type="number" class="form-input" id="setting-cycle" 
            value="${settings.intervalCycle}" min="1" max="10">
        </div>

        <button class="btn btn-primary" id="btn-save-timer" style="width: 100%;">
          💾 設定を保存
        </button>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">🔔 通知設定</h3>
        
        <div class="settings-row">
          <span class="settings-label">通知</span>
          <label class="toggle">
            <input type="checkbox" id="setting-notification" ${settings.notificationEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="settings-row">
          <span class="settings-label">音</span>
          <label class="toggle">
            <input type="checkbox" id="setting-sound" ${settings.soundEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="settings-row">
          <span class="settings-label">バイブレーション</span>
          <label class="toggle">
            <input type="checkbox" id="setting-vibration" ${settings.vibrationEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">🎨 デザイン</h3>
        
        <div class="form-group">
          <label class="form-label">テーマ</label>
          <div class="theme-grid">
            ${themes.map(t => `
              <div class="theme-option ${settings.theme === t.id ? 'active' : ''}" data-theme="${t.id}">
                <div class="theme-preview" style="background-color: ${t.color}"></div>
                <span class="theme-name">${t.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">タイマー色</label>
          <input type="color" class="form-input" id="setting-timer-color" 
            value="${settings.timerColor}">
        </div>
        
        <div class="form-group">
          <label class="form-label">背景</label>
          <div class="bg-grid">
            ${BACKGROUNDS.map(bg => {
    let style;
    if (bg.sat !== undefined) {
      style = `background: linear-gradient(135deg, hsl(${bg.hue}, ${bg.sat}%, ${bg.light}%), hsl(${bg.hue2}, ${bg.sat}%, ${bg.light - 10}%));`;
    } else {
      style = `background: linear-gradient(135deg, hsl(${bg.hue}, 70%, 50%), hsl(${bg.hue2}, 70%, 30%));`;
    }
    return `
              <div class="bg-option ${settings.backgroundType === 'default' && settings.backgroundValue === bg.id ? 'active' : ''}" 
                data-bg-type="default" data-bg-value="${bg.id}"
                style="${style}"
                title="${bg.name}">
              </div>
            `}).join('')}
            <div class="bg-option photo-picker ${settings.backgroundType === 'photo' ? 'active' : ''}" 
              id="photo-picker" title="写真を選択">
              📷
            </div>
          </div>
          <input type="file" id="photo-input" accept="image/*" style="display: none;">
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">💾 データ管理</h3>
        <div class="settings-row">
          <button class="btn btn-secondary" id="btn-export">
            📤 バックアップを保存
          </button>
        </div>
        <div class="settings-row">
          <button class="btn btn-secondary" id="btn-import-trigger">
            📥 バックアップから復元
          </button>
          <input type="file" id="import-input" accept=".json" style="display: none;">
        </div>
      </div>
      
      <div class="settings-section">
        <h3 class="settings-section-title">ℹ️ アプリ情報</h3>
        <div class="settings-row">
          <button class="btn btn-secondary" id="btn-help" style="width: 100%;">
            📖 アプリの使い方
          </button>
        </div>
        <div class="settings-row">
          <button class="btn btn-secondary" id="btn-terms" style="width: 100%;">
            📜 利用規約を表示
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * タイマー表示更新
 */
function renderTimer() {
  const timerPage = document.getElementById('page-timer');
  if (timerPage && currentPage === 'timer') {
    timerPage.innerHTML = renderTimerPage();
    setupTimerEventListeners();
  }
}

/**
 * Subjectリスト更新
 */
function renderSubjectList() {
  const subjectList = document.getElementById('subject-list');
  if (subjectList) {
    const subjectsPage = document.getElementById('page-subjects');
    if (subjectsPage) {
      subjectsPage.innerHTML = renderSubjectsPage();
      setupSubjectsEventListeners();
    }
  }
  // タイマー画面のセレクトボックスも更新
  renderTimer();
}

/**
 * 設定画面の更新
 */
function renderSettingsForm() {
  const settingsPage = document.getElementById('page-settings');
  if (settingsPage && currentPage === 'settings') {
    settingsPage.innerHTML = renderSettingsPage();
    setupSettingsEventListeners();
  }
}

/**
 * 設定の反映（テーマ等）
 */
function applySettings() {
  const settings = getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme);
  document.documentElement.style.setProperty('--timer-color', settings.timerColor);
  applyBackground();
}

/**
 * 背景の適用
 */
function applyBackground() {
  const settings = getSettings();
  const bgLayer = document.querySelector('.background-layer');
  if (!bgLayer) return;

  if (settings.backgroundType === 'default') {
    // プリセット背景
    const bg = BACKGROUNDS.find(b => b.id === settings.backgroundValue);
    if (bg) {
      if (bg.sat !== undefined) {
        // 白黒など特殊設定
        bgLayer.style.backgroundImage = `linear-gradient(135deg, hsl(${bg.hue}, ${bg.sat}%, ${bg.light}%), hsl(${bg.hue2}, ${bg.sat}%, ${bg.light - 10}%))`;
      } else {
        // 通常カラー
        bgLayer.style.backgroundImage = `linear-gradient(135deg, hsl(${bg.hue}, 70%, 50%), hsl(${bg.hue2}, 70%, 30%))`;
      }
    } else {
      // フォールバック
      bgLayer.style.backgroundImage = `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`;
    }
  } else if (settings.backgroundType === 'photo') {
    bgLayer.style.backgroundImage = `url('${settings.backgroundValue}')`;
  }
}

/**
 * グローバルイベントリスナー設定
 */
function setupEventListeners() {
  // ナビゲーション切り替え
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentPage = tab.dataset.page;
      render();
    });
  });

  setupTimerEventListeners();
  setupSubjectsEventListeners();
  setupSettingsEventListeners();
}

/**
 * タイマー画面のイベント設定
 */
function setupTimerEventListeners() {
  const startBtn = document.getElementById('btn-start');
  const pauseBtn = document.getElementById('btn-pause');
  const resumeBtn = document.getElementById('btn-resume');
  const skipBtn = document.getElementById('btn-skip');
  const resetBtn = document.getElementById('btn-reset');
  const subjectSelect = document.getElementById('subject-select');

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      const subjectId = subjectSelect?.value;
      if (!subjectId) {
        showToast('学習項目を選択してください', 'error');
        return;
      }
      try {
        startTimer(subjectId);
        showToast('タイマーを開始しました', 'success');
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      pauseTimer();
      showToast('一次停止しました');
    });
  }

  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      resumeTimer();
      showToast('再開しました');
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      skipPhase();
      showToast('スキップしました');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog(
        'リセット確認',
        '本当にリセットしますか？未完了の勉強時間は保存されません。'
      );
      if (confirmed) {
        resetTimer();
        showToast('リセットしました');
      }
    });
  }
}

/**
 * 学習項目画面のイベント設定
 */
function setupSubjectsEventListeners() {
  const addBtn = document.getElementById('btn-add-subject');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      showSubjectModal();
    });
  }

  // 編集・削除ボタン
  document.querySelectorAll('.subject-actions button').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'edit') {
        const subject = getSubjectById(id);
        if (subject) {
          showSubjectModal(subject);
        }
      } else if (action === 'delete') {
        const subject = getSubjectById(id);
        const confirmed = await showConfirmDialog(
          '削除確認',
          `「${subject?.name}」を削除しますか？\nこの項目の総学習時間も削除されます。`
        );
        if (confirmed) {
          try {
            deleteSubject(id);
            showToast('削除しました', 'success');
          } catch (e) {
            showToast(e.message, 'error');
          }
        }
      }
    });
  });
}

/**
 * 学習項目追加・編集モーダル表示
 */
function showSubjectModal(subject = null) {
  const isEdit = !!subject;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal">
      <h2 class="modal-title">${isEdit ? '学習項目を編集' : '学習項目を追加'}</h2>
      
      <div class="form-group">
        <label class="form-label">項目名（1〜30文字）</label>
        <input type="text" class="form-input" id="subject-name" 
          value="${subject?.name || ''}" maxlength="30" placeholder="例: 数学">
      </div>
      
      <div class="form-group">
        <label class="form-label">色</label>
        <input type="color" class="form-input" id="subject-color" 
          value="${subject?.color || '#6C63FF'}">
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-secondary" data-action="cancel">キャンセル</button>
        <button class="btn btn-primary" data-action="save">${isEdit ? '更新' : '追加'}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const nameInput = overlay.querySelector('#subject-name');
  const colorInput = overlay.querySelector('#subject-color');

  overlay.addEventListener('click', (e) => {
    const action = e.target.dataset.action;

    if (action === 'save') {
      const name = nameInput.value;
      const color = colorInput.value;

      try {
        if (isEdit) {
          updateSubject(subject.id, name, color);
          showToast('更新しました', 'success');
        } else {
          addSubject(name, color);
          showToast('追加しました', 'success');
        }
        overlay.remove();
      } catch (err) {
        showToast(err.message, 'error');
      }
    } else if (action === 'cancel' || e.target === overlay) {
      overlay.remove();
    }
  });

  nameInput.focus();
}

/**
 * 設定画面のイベント設定
 */
function setupSettingsEventListeners() {
  // タイマー設定保存
  const saveTimerBtn = document.getElementById('btn-save-timer');
  if (saveTimerBtn) {
    saveTimerBtn.addEventListener('click', () => {
      try {
        const study = parseInt(document.getElementById('setting-study').value);
        const breakMins = parseInt(document.getElementById('setting-break').value);
        const interval = parseInt(document.getElementById('setting-interval').value);
        const cycle = parseInt(document.getElementById('setting-cycle').value);

        updateTimerSettings(study, breakMins, interval, cycle);
        showToast('設定を保存しました', 'success');
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  }

  // 通知設定
  const notificationToggle = document.getElementById('setting-notification');
  if (notificationToggle) {
    notificationToggle.addEventListener('change', async (e) => {
      if (e.target.checked) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          e.target.checked = false;
          showToast('通知の許可が必要です', 'error');
          return;
        }
      }
      updateSettings({ notificationEnabled: e.target.checked });
    });
  }

  const soundToggle = document.getElementById('setting-sound');
  if (soundToggle) {
    soundToggle.addEventListener('change', (e) => {
      updateSettings({ soundEnabled: e.target.checked });
    });
  }

  const vibrationToggle = document.getElementById('setting-vibration');
  if (vibrationToggle) {
    vibrationToggle.addEventListener('change', (e) => {
      updateSettings({ vibrationEnabled: e.target.checked });
    });
  }

  // テーマ選択
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      updateSettings({ theme });
      document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
    });
  });

  // タイマー色
  const timerColorInput = document.getElementById('setting-timer-color');
  if (timerColorInput) {
    timerColorInput.addEventListener('change', (e) => {
      updateSettings({ timerColor: e.target.value });
    });
  }

  // 背景選択
  document.querySelectorAll('.bg-option:not(.photo-picker)').forEach(option => {
    option.addEventListener('click', () => {
      const bgType = option.dataset.bgType;
      const bgValue = option.dataset.bgValue;
      updateSettings({ backgroundType: bgType, backgroundValue: bgValue });
      document.querySelectorAll('.bg-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
    });
  });

  // 写真選択
  const photoPicker = document.getElementById('photo-picker');
  const photoInput = document.getElementById('photo-input');

  if (photoPicker && photoInput) {
    photoPicker.addEventListener('click', () => {
      photoInput.click();
    });

    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          updateSettings({
            backgroundType: 'photo',
            backgroundValue: event.target.result
          });
          document.querySelectorAll('.bg-option').forEach(o => o.classList.remove('active'));
          photoPicker.classList.add('active');
          showToast('背景を設定しました', 'success');
        };
        reader.readAsDataURL(file);
      }
    });

    // バックアップ機能
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportData);
    }

    const importTrigger = document.getElementById('btn-import-trigger');
    const importInput = document.getElementById('import-input');

    if (importTrigger && importInput) {
      importTrigger.addEventListener('click', () => importInput.click());

      importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          importData(text);
        } catch (err) {
          showToast('ファイルの読み込みに失敗しました', 'error');
        }
        // 入力リセット
        importInput.value = '';
      });
    }

    // 利用規約・ヘルプ
    const termsBtn = document.getElementById('btn-terms');
    if (termsBtn) {
      termsBtn.addEventListener('click', showTermsModal);
    }

    const helpBtn = document.getElementById('btn-help');
    if (helpBtn) {
      helpBtn.addEventListener('click', showHelpModal);
    }
  }
}

/**
 * アプリの使い方モーダルを表示
 */
function showHelpModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal">
      <h2 class="modal-title">📖 アプリの使い方</h2>
      <div style="text-align: left; max-height: 400px; overflow-y: auto; margin-bottom: 2rem; font-size: 0.9rem; line-height: 1.6;">
        <h3 style="font-size: 1rem; margin-top: 1rem; color: var(--accent);">1. 学習を始める</h3>
        <p>「学習項目」タブで科目を作成し、「タイマー」タブで選択してスタートします。</p>
        
        <h3 style="font-size: 1rem; margin-top: 1rem; color: var(--accent);">2. サイクルについて</h3>
        <p>勉強時間と休憩時間を繰り返します。数セット完了すると、長い休憩（Interval）に入ります。</p>
        
        <h3 style="font-size: 1rem; margin-top: 1rem; color: var(--accent);">3. カスタマイズ</h3>
        <p>「設定」タブでテーマカラーや背景画像を変更できます。お気に入りの写真も設定可能です。</p>
        
        <h3 style="font-size: 1rem; margin-top: 1rem; color: var(--accent);">4. データのバックアップ</h3>
        <p>「設定」タブの下部から、学習記録をファイルに保存したり、復元したりできます。</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" data-action="close">閉じる</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'close' || e.target === overlay) {
      overlay.remove();
    }
  });
}

/**
 * 利用規約モーダルを表示
 */
function showTermsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal">
      <h2 class="modal-title">利用規約</h2>
      <div style="text-align: left; max-height: 400px; overflow-y: auto; margin-bottom: 2rem; font-size: 0.9rem; line-height: 1.6;">
        <p><strong>1. はじめに</strong><br>
        本アプリ（以下「当アプリ」）をご利用いただきありがとうございます。当アプリは、学習の補助を目的としたポモドーロタイマーです。</p>
        
        <p><strong>2. データの取り扱い</strong><br>
        当アプリは、ユーザーの学習記録や設定データを端末内（ローカルストレージ）にのみ保存します。収集したデータを外部サーバーへ送信することはありません。</p>
        
        <p><strong>3. 免責事項</strong><br>
        当アプリの利用により生じた損害（学習データの消失など）について、開発者は一切の責任を負いません。重要なデータは定期的にバックアップ機能をご利用ください。</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" data-action="close">閉じる</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'close' || e.target === overlay) {
      overlay.remove();
    }
  });
}

/**
 * データをエクスポート
 */
function exportData() {
  const data = {
    subjects: loadData(STORAGE_KEYS.SUBJECTS),
    settings: loadData(STORAGE_KEYS.SETTINGS),
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `pomodoro-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
  showToast('バックアップを保存しました', 'success');
}

/**
 * データをインポート
 */
function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    if (!data.subjects || !data.settings) {
      throw new Error('無効なデータ形式です');
    }

    saveData(STORAGE_KEYS.SUBJECTS, data.subjects);
    saveData(STORAGE_KEYS.SETTINGS, data.settings);

    showToast('データを復元しました。リロードします...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1500);

  } catch (err) {
    console.error(err);
    showToast('復元に失敗しました', 'error');
  }
}

// アプリ起動
document.addEventListener('DOMContentLoaded', init);
