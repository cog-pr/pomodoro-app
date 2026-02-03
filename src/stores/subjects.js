/**
 * 学習項目（Subject）管理ストア
 */

import { saveData, loadData, generateId, STORAGE_KEYS } from '../utils/storage.js';

let subjects = [];
let listeners = [];

/**
 * 初期化
 */
export function initSubjects() {
    subjects = loadData(STORAGE_KEYS.SUBJECTS, []);
}

/**
 * 全ての学習項目を取得
 */
export function getSubjects() {
    return [...subjects];
}

/**
 * IDで学習項目を取得
 */
export function getSubjectById(id) {
    return subjects.find(s => s.id === id) || null;
}

/**
 * 学習項目を追加
 */
export function addSubject(name, color) {
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 30) {
        throw new Error('項目名は1〜30文字で入力してください');
    }

    const newSubject = {
        id: generateId(),
        name: trimmedName,
        color: color,
        totalMinutes: 0,
        createdAt: new Date().toISOString()
    };

    subjects.push(newSubject);
    save();
    notifyListeners();
    return newSubject;
}

/**
 * 学習項目を編集
 */
export function updateSubject(id, name, color) {
    const subject = subjects.find(s => s.id === id);
    if (!subject) {
        throw new Error('学習項目が見つかりません');
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 30) {
        throw new Error('項目名は1〜30文字で入力してください');
    }

    subject.name = trimmedName;
    subject.color = color;
    save();
    notifyListeners();
    return subject;
}

/**
 * 学習項目を削除
 */
export function deleteSubject(id) {
    const index = subjects.findIndex(s => s.id === id);
    if (index === -1) {
        throw new Error('学習項目が見つかりません');
    }

    subjects.splice(index, 1);
    save();
    notifyListeners();
}

/**
 * 学習時間を加算
 */
export function addStudyTime(id, minutes) {
    const subject = subjects.find(s => s.id === id);
    if (!subject) {
        throw new Error('学習項目が見つかりません');
    }

    subject.totalMinutes += minutes;
    save();
    notifyListeners();
    return subject;
}

/**
 * 変更監視（リスナー登録）
 */
export function subscribeSubjects(listener) {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
}

/**
 * データを保存
 */
function save() {
    saveData(STORAGE_KEYS.SUBJECTS, subjects);
}

/**
 * リスナーへ通知
 */
function notifyListeners() {
    listeners.forEach(listener => listener(subjects));
}
