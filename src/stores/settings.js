/**
 * 設定（Settings）管理ストア
 */

import { saveData, loadData, STORAGE_KEYS } from '../utils/storage.js';

const DEFAULT_SETTINGS = {
    studyMinutes: 25,
    breakMinutes: 5,
    intervalMinutes: 15,
    intervalCycle: 4,
    theme: 'light',
    timerColor: '#6C63FF',
    backgroundType: 'default',
    backgroundValue: 'bg_sunrise',
    soundEnabled: true,
    vibrationEnabled: true,
    notificationEnabled: true
};

let settings = { ...DEFAULT_SETTINGS };
let listeners = [];

/**
 * 初期化
 */
export function initSettings() {
    const saved = loadData(STORAGE_KEYS.SETTINGS, null);
    if (saved) {
        settings = { ...DEFAULT_SETTINGS, ...saved };
    }
    // テーマや色の適用はView側（main.js）で購読して行う
}

/**
 * 現在の設定を取得
 */
export function getSettings() {
    return { ...settings };
}

/**
 * 設定を更新
 */
export function updateSettings(updates) {
    settings = { ...settings, ...updates };
    save();
    notifyListeners();
    return settings;
}

/**
 * タイマー設定を更新
 */
export function updateTimerSettings(studyMinutes, breakMinutes, intervalMinutes, intervalCycle) {
    // バリデーション
    if (studyMinutes < 1 || studyMinutes > 180) {
        throw new Error('勉強時間は1〜180分で設定してください');
    }
    if (breakMinutes < 1 || breakMinutes > 60) {
        throw new Error('休憩時間は1〜60分で設定してください');
    }
    if (intervalMinutes < 1 || intervalMinutes > 120) {
        throw new Error('インターバル休憩は1〜120分で設定してください');
    }
    if (intervalCycle < 1 || intervalCycle > 10) {
        throw new Error('インターバル周期は1〜10で設定してください');
    }

    settings.studyMinutes = studyMinutes;
    settings.breakMinutes = breakMinutes;
    settings.intervalMinutes = intervalMinutes;
    settings.intervalCycle = intervalCycle;
    save();
    notifyListeners();
}

/**
 * 変更監視（リスナー登録）
 */
export function subscribeSettings(listener) {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
}

/**
 * 設定を保存
 */
function save() {
    saveData(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * リスナーへ通知
 */
function notifyListeners() {
    listeners.forEach(listener => listener(settings));
}

/**
 * フェーズごとの時間を取得（ミリ秒）
 */
export function getPhaseDurationMs(phase) {
    switch (phase) {
        case 'STUDY':
            return settings.studyMinutes * 60 * 1000;
        case 'BREAK':
            return settings.breakMinutes * 60 * 1000;
        case 'INTERVAL':
            return settings.intervalMinutes * 60 * 1000;
        default:
            return 0;
    }
}
