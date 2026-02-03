/**
 * タイマー状態管理ストア
 * 状態遷移とアプリ復帰時のロジックを担当
 */

import { saveData, loadData, STORAGE_KEYS } from '../utils/storage.js';
import { getSettings, getPhaseDurationMs } from './settings.js';
import { addStudyTime } from './subjects.js';

// フェーズ定義
export const PHASES = {
    IDLE: 'IDLE',
    STUDY: 'STUDY',
    BREAK: 'BREAK',
    INTERVAL: 'INTERVAL'
};

// 初期状態
const INITIAL_STATE = {
    phase: PHASES.IDLE,
    phaseStartAt: null,
    isPaused: false,
    pausedRemainingMs: null,
    count: 0,
    subjectId: null
};

let state = { ...INITIAL_STATE };
let listeners = [];
let tickInterval = null;

/**
 * タイマー初期化（復帰ロジック含む）
 */
export function initTimer() {
    const saved = loadData(STORAGE_KEYS.TIMER_STATE, null);

    if (saved && saved.phase !== PHASES.IDLE) {
        // 保存された状態から復帰
        resumeFromState(saved);
    } else {
        state = { ...INITIAL_STATE };
    }
}

/**
 * 保存状態からの復帰処理
 */
function resumeFromState(savedState) {
    const settings = getSettings();

    // 一時停止中は時間経過なし
    if (savedState.isPaused) {
        state = { ...savedState };
        return;
    }

    let phase = savedState.phase;
    let count = savedState.count;
    let elapsedMs = Date.now() - savedState.phaseStartAt;
    let phaseDurationMs = getPhaseDurationMs(phase);

    // 経過時間分、フェーズを進める
    while (elapsedMs >= phaseDurationMs && phase !== PHASES.IDLE) {
        elapsedMs -= phaseDurationMs;

        // 勉強時間が完了していたら加算
        if (phase === PHASES.STUDY) {
            try {
                addStudyTime(savedState.subjectId, settings.studyMinutes);
            } catch (e) {
                console.error('学習時間の加算に失敗しました:', e);
            }
            count++;
        }

        // 次のフェーズへ
        phase = getNextPhase(phase, count, settings.intervalCycle);
        phaseDurationMs = getPhaseDurationMs(phase);
    }

    // 最新の状態に更新
    state = {
        phase,
        phaseStartAt: Date.now() - elapsedMs,
        isPaused: false,
        pausedRemainingMs: null,
        count,
        subjectId: savedState.subjectId
    };

    save();

    // アイドルでなければ計測再開
    if (state.phase !== PHASES.IDLE) {
        startTick();
    }
}

/**
 * 次のフェーズを判定
 */
function getNextPhase(currentPhase, count, intervalCycle) {
    switch (currentPhase) {
        case PHASES.STUDY:
            // サイクル完了なら長い休憩、それ以外は短い休憩
            return (count % intervalCycle === 0) ? PHASES.INTERVAL : PHASES.BREAK;
        case PHASES.BREAK:
        case PHASES.INTERVAL:
            return PHASES.STUDY;
        default:
            return PHASES.IDLE;
    }
}

/**
 * タイマー開始
 */
export function startTimer(subjectId) {
    if (!subjectId) {
        throw new Error('学習項目を選択してください');
    }

    state = {
        phase: PHASES.STUDY,
        phaseStartAt: Date.now(),
        isPaused: false,
        pausedRemainingMs: null,
        count: 0,
        subjectId
    };

    save();
    startTick();
    notifyListeners();
}

/**
 * 一時停止
 */
export function pauseTimer() {
    if (state.phase === PHASES.IDLE || state.isPaused) return;

    const remainingMs = getRemainingMs();
    state.isPaused = true;
    state.pausedRemainingMs = remainingMs;

    stopTick();
    save();
    notifyListeners();
}

/**
 * 再開
 */
export function resumeTimer() {
    if (!state.isPaused) return;

    state.phaseStartAt = Date.now() - (getPhaseDurationMs(state.phase) - state.pausedRemainingMs);
    state.isPaused = false;
    state.pausedRemainingMs = null;

    save();
    startTick();
    notifyListeners();
}

/**
 * リセット
 */
export function resetTimer() {
    stopTick();
    state = { ...INITIAL_STATE };
    save();
    notifyListeners();
}

/**
 * フェーズスキップ
 */
export function skipPhase() {
    if (state.phase === PHASES.IDLE) return;

    const settings = getSettings();

    // 勉強時間をスキップした場合、時間は加算しない
    if (state.phase === PHASES.STUDY) {
        state.phase = getNextPhase(PHASES.STUDY, state.count + 1, settings.intervalCycle);
    } else {
        // 休憩スキップ -> 勉強へ
        state.phase = PHASES.STUDY;
    }

    state.phaseStartAt = Date.now();
    state.isPaused = false;
    state.pausedRemainingMs = null;

    save();
    startTick();
    notifyListeners();

    // 通知
    playNotification();
}

/**
 * 現在の状態を取得
 */
export function getTimerState() {
    return { ...state };
}

/**
 * 残り時間を取得（ミリ秒）
 */
export function getRemainingMs() {
    if (state.phase === PHASES.IDLE) return 0;

    if (state.isPaused) {
        return state.pausedRemainingMs || 0;
    }

    const phaseDurationMs = getPhaseDurationMs(state.phase);
    const elapsedMs = Date.now() - state.phaseStartAt;
    return Math.max(0, phaseDurationMs - elapsedMs);
}

/**
 * 定期更新を開始
 */
function startTick() {
    stopTick();
    tickInterval = setInterval(() => {
        checkPhaseComplete();
        notifyListeners();
    }, 100);
}

/**
 * 定期更新を停止
 */
function stopTick() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
}

/**
 * フェーズ完了チェック
 */
function checkPhaseComplete() {
    if (state.phase === PHASES.IDLE || state.isPaused) return;

    const remainingMs = getRemainingMs();

    if (remainingMs <= 0) {
        completePhase();
    }
}

/**
 * フェーズ完了時の処理
 */
function completePhase() {
    const settings = getSettings();

    // 勉強時間完了なら時間を加算
    if (state.phase === PHASES.STUDY) {
        try {
            addStudyTime(state.subjectId, settings.studyMinutes);
        } catch (e) {
            console.error('学習時間の加算に失敗しました:', e);
        }
        state.count++;
    }

    // 次のフェーズへ
    state.phase = getNextPhase(state.phase, state.count, settings.intervalCycle);
    state.phaseStartAt = Date.now();

    save();
    notifyListeners();

    // 通知
    playNotification();
}

/**
 * 通知再生
 */
function playNotification() {
    const settings = getSettings();

    // 音（Web Audio API）
    if (settings.soundEnabled) {
        try {
            playBeep();
        } catch (e) {
            console.log('音声再生エラー:', e);
        }
    }

    // バイブレーション
    if (settings.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }

    // ブラウザ通知
    if (settings.notificationEnabled && Notification.permission === 'granted') {
        const phaseNames = {
            [PHASES.STUDY]: '勉強タイム',
            [PHASES.BREAK]: '休憩タイム',
            [PHASES.INTERVAL]: '長い休憩タイム'
        };

        new Notification('ポモドーロタイマー', {
            body: `${phaseNames[state.phase] || '次のフェーズ'}が始まります！`,
            icon: '/icon-192.png',
            tag: 'pomodoro-phase'
        });
    }
}

/**
 * ビープ音再生
 */
function playBeep() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // 2回鳴らす
    [0, 0.15].forEach((delay) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + 0.1);

        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + 0.1);
    });
}

/**
 * 通知権限のリクエスト
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

/**
 * 変更監視（リスナー登録）
 */
export function subscribeTimer(listener) {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
}

/**
 * 状態を保存
 */
function save() {
    saveData(STORAGE_KEYS.TIMER_STATE, state);
}

/**
 * リスナーへ通知
 */
function notifyListeners() {
    listeners.forEach(listener => listener(state));
}

/**
 * ページ離脱時に保存
 */
if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            save();
        }
    });

    window.addEventListener('beforeunload', () => {
        save();
    });
}
