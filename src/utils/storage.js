/**
 * ストレージユーティリティ
 * localStorage のラッパー関数群
 */

const STORAGE_KEYS = {
    SUBJECTS: 'app.subjects',
    SETTINGS: 'app.settings',
    TIMER_STATE: 'app.timerState'
};

/**
 * データを保存
 */
export function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('保存に失敗しました:', error);
        showToast('データの保存に失敗しました', 'error');
        return false;
    }
}

/**
 * データを読み込み
 */
export function loadData(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('読み込みに失敗しました:', error);
        return defaultValue;
    }
}

/**
 * データを削除
 */
export function removeData(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('削除に失敗しました:', error);
        return false;
    }
}

/**
 * ID生成 (UUID v4 like)
 */
export function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 時間表示フォーマット (分 -> X時間 Y分)
 */
export function formatTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
        return `${hours}時間 ${minutes}分`;
    }
    return `${minutes}分`;
}

/**
 * タイマー表示フォーマット (ミリ秒 -> MM:SS)
 */
export function formatTimerDisplay(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * トースト通知を表示
 */
export function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * 確認ダイアログを表示
 */
export function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
      <div class="modal">
        <h2 class="modal-title">${title}</h2>
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" data-action="cancel">キャンセル</button>
          <button class="btn btn-danger" data-action="confirm">OK</button>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'confirm') {
                resolve(true);
                overlay.remove();
            } else if (action === 'cancel' || e.target === overlay) {
                resolve(false);
                overlay.remove();
            }
        });
    });
}

export { STORAGE_KEYS };
