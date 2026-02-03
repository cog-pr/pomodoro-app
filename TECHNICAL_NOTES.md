# ポモドーロタイマーアプリ - 技術解説資料

> 就職活動・インターン選考用の成果物説明資料

---

## 📋 プロジェクト概要

学習効率を高めるためのポモドーロテクニック対応タイマーアプリです。
Webアプリとして開発し、Android向けネイティブアプリとしても動作するクロスプラットフォーム対応を実現しました。

### 開発背景・目的
- 既存のポモドーロアプリは機能がシンプルすぎる、またはUIが古いものが多い
- 学習科目ごとに時間を記録・可視化したい
- 複数デバイスで使いたい（Web/モバイル対応）

---

## 🛠️ 技術スタック

### フロントエンド
- **JavaScript (Vanilla)**: あえてフレームワークを使わず、基礎力をアピール
- **Vite**: 高速な開発環境とビルドツール
- **CSS3**: Glassmorphismデザイン、CSS Variables によるテーマ切り替え

### ライブラリ
- **Chart.js**: 学習統計のグラフ描画
- **vite-plugin-pwa**: PWA対応（オフライン動作、ホーム画面追加）

### ネイティブ化
- **Capacitor**: WebアプリをAndroidアプリに変換
- 単一コードベースでWeb/Androidの両プラットフォームに対応

### データ管理
- **LocalStorage**: ブラウザ内でのデータ永続化
- JSON形式でのバックアップ・復元機能

---

## 🏗️ アーキテクチャ設計

### ディレクトリ構成
```
src/
├── main.js              # アプリケーションのエントリーポイント
├── index.css            # グローバルスタイル（デザインシステム）
├── stores/              # 状態管理層
│   ├── subjects.js      # 学習項目の管理
│   ├── settings.js      # 設定の管理
│   └── timer.js         # タイマー状態管理
├── pages/               # 画面コンポーネント
│   └── StatisticsPage.js
└── utils/               # ユーティリティ関数
    └── storage.js       # LocalStorage操作
```

### 設計パターン

#### 1. **Store パターン（状態管理）**
各機能ごとに状態を管理するStoreを作成し、以下の原則に従いました：
- **単一責任の原則**: 1つのStoreは1つの責務のみを持つ
- **Immutability**: 状態はコピーを返し、直接変更させない
- **カプセル化**: 内部状態へのアクセスを制限

```javascript
// subjects.js の例
let subjects = [];  // 内部状態（外部から直接アクセス不可）

export function getSubjects() {
    return [...subjects];  // コピーを返す
}
```

#### 2. **Observer パターン（変更通知）**
状態の変更を監視し、UIを自動更新する仕組みを実装：

```javascript
export function subscribeSubjects(listener) {
    listeners.push(listener);
    return () => listeners.filter(l => l !== listener);  // unsubscribe関数
}
```

この設計により、**データとUIの同期**が自動化され、バグが減少しました。

#### 3. **関心の分離**
- **Store**: データとビジネスロジック
- **main.js**: UIレンダリングとイベントハンドリング
- **utils**: 汎用的な処理（ストレージ操作、フォーマット関数など）

DOM操作をStoreから排除し、**テスタビリティ**と**保守性**を向上させました。

---

## ✨ 主な機能

### 1. タイマー機能
- ポモドーロサイクル（勉強→休憩→勉強→...→長い休憩）
- 一時停止・再開・スキップ・リセット
- 科目選択による時間の自動記録

### 2. 学習管理
- 科目の登録・編集・削除
- 色分けによる視覚的な分類
- 総学習時間の自動集計

### 3. 統計機能
- Chart.jsによる円グラフ表示
- 科目別の学習時間内訳
- 総学習時間の表示

### 4. カスタマイズ
- 9種類のテーマ（Light, Dark, Blue, Red等）
- 9種類の背景パターン + カスタム画像アップロード
- タイマー時間の調整（勉強時間、休憩時間、サイクル数）

### 5. データ管理
- ローカルストレージでの自動保存
- JSON形式でのバックアップ・復元

---

## 🎯 技術的な工夫と実装の詳細

### 1. タイマーの復帰ロジック（最も技術的に難しかった点）

**課題**: アプリを閉じても時間計測を継続し、再起動時に正確な状態に復帰する必要がある。

**解決策**: 
```javascript
function resumeFromState(savedState) {
    let elapsedMs = Date.now() - savedState.phaseStartAt;
    let phaseDurationMs = getPhaseDurationMs(phase);
    
    // 経過時間分、フェーズを自動で進める
    while (elapsedMs >= phaseDurationMs && phase !== PHASES.IDLE) {
        elapsedMs -= phaseDurationMs;
        // 完了したフェーズの処理（時間加算など）
        if (phase === PHASES.STUDY) {
            addStudyTime(savedState.subjectId, settings.studyMinutes);
            count++;
        }
        phase = getNextPhase(phase, count, settings.intervalCycle);
        phaseDurationMs = getPhaseDurationMs(phase);
    }
    
    // 残り時間で状態を更新
    state = {
        phase,
        phaseStartAt: Date.now() - elapsedMs,
        // ...
    };
}
```

**工夫点**:
- 開始時刻を保存し、現在時刻との差分で経過時間を計算
- ループ処理で複数フェーズをまたいだ場合も正確に処理
- `visibilitychange` / `beforeunload` イベントで状態を自動保存

### 2. パフォーマンス最適化

**課題**: ボタンのホバー時に「ちらつき」が発生し、操作感が悪化。

**原因分析**:
- `box-shadow` や複雑な `transform` がGPUに負荷をかけていた
- `transition` の対象が多すぎた

**解決策**:
```css
/* Before (重い) */
.btn:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 20px rgba(0,0,0,0.3);
}

/* After (軽い) */
.btn:hover {
    background: rgba(255, 255, 255, 0.9);  /* 色変更のみ */
}
.btn:active {
    transform: translateY(1px);  /* 押し込み効果のみ */
}
```

**結果**: スムーズな操作感を実現し、UXが大幅に改善されました。

### 3. レスポンシブデザイン

**課題**: スマホではボタンが大きすぎて背景が見えにくい、テキストが折り返す。

**解決策**:
```css
@media (max-width: 768px) {
  .controls .btn {
    padding: 0.5rem 0.8rem;  /* サイズ縮小 */
    min-width: 60px;
    width: auto;  /* 固定幅を解除 */
  }
  
  .card h2 {
    white-space: nowrap;  /* 改行防止 */
    font-size: 1.1rem;
  }
}
```

**工夫点**:
- CSS Variablesでサイズを一元管理
- メディアクエリで段階的に調整
- `flexbox` の `flex-shrink` を活用

### 4. デザインシステムの構築

**CSS Variables**を活用し、保守性の高いスタイルシステムを構築：

```css
:root {
  --bg-primary: #f0f2f5;
  --accent: #6C63FF;
  --space-sm: 0.5rem;
  --radius-lg: 1rem;
  /* ... */
}

[data-theme="dark"] {
  --bg-primary: #1A1A2E;
  --accent: #9D84FF;
  /* ... */
}
```

**メリット**:
- テーマ切り替えが簡単（属性変更のみ）
- 色やサイズの統一が容易
- メンテナンス性の向上

### 5. Glassmorphism UI

**backdrop-filter** を用いた現代的なガラス調デザイン：

```css
.card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

### 6. PWA対応

`vite-plugin-pwa` により：
- オフラインでも動作
- ホーム画面に追加可能
- Service Workerによる自動アップデート

### 7. クロスプラットフォーム対応

**Capacitor**を使用し、**一つのコードベース**でWeb/Android両対応を実現：

```bash
npm run build              # Webアプリビルド
npx cap add android        # Androidプロジェクト生成
npx cap sync               # アセット同期
```

**メリット**:
- 開発効率が高い（重複コードなし）
- メンテナンスコストの削減
- リリース速度の向上

---

## 🚧 苦労した点と解決方法

### 1. 状態管理の複雑化

**問題**: 最初は `main.js` に全てのロジックを書いていたため、コードが肥大化。

**解決**: 
- Store パターンを導入し、責務を分離
- 各Storeを独立したモジュールに分割

**学んだこと**: 
- 大規模アプリケーションでは設計が重要
- 早めのリファクタリングが後々の開発を楽にする

### 2. タイマーの精度

**問題**: `setInterval` だけだと、ブラウザのバックグラウンド動作で遅延が発生。

**解決**:
- 開始時刻を記録し、都度現在時刻との差分で残り時間を計算
- 100msごとにチェックし、誤差を最小化

### 3. データの永続化

**問題**: LocalStorageのエラーハンドリングが不十分で、データロスが発生。

**解決**:
```javascript
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
```

**工夫**:
- バックアップ・復元機能の実装
- エラー時のユーザーへの通知

---

## 📈 今後の展望

### 技術的な改善案
1. **TypeScript化**: 型安全性の向上
2. **テストの追加**: Jest / Vitestによる単体テスト
3. **状態管理ライブラリ**: Zustand等の導入検討
4. **バックエンド連携**: Firebase等でのデータ同期

### 機能追加案
1. **クラウド同期**: 複数デバイス間でのデータ共有
2. **SNS連携**: 学習記録のシェア機能
3. **リマインダー**: 通知機能の強化
4. **学習分析**: より詳細な統計・分析機能

---

## 💡 このプロジェクトで得られた学び

### 技術面
- Vanilla JSでの大規模アプリ開発経験
- 状態管理の設計パターン（Store, Observer）
- パフォーマンス最適化の重要性
- クロスプラットフォーム開発の知見

### ソフトスキル
- ユーザー体験を意識した設計
- 保守性・拡張性を考慮したコード設計
- 問題解決能力（バグ修正、パフォーマンス改善）

---

## 📊 プロジェクト統計

- **総開発時間**: 約40時間
- **コード行数**: 約2,000行
- **ファイル数**: 10ファイル
- **対応プラットフォーム**: Web, Android (iOS対応可能)

---

## 🔗 参考リンク

- [Capacitor公式ドキュメント](https://capacitorjs.com/)
- [Chart.js公式ドキュメント](https://www.chartjs.org/)
- [Vite公式ドキュメント](https://vitejs.dev/)

---

**開発者**: まお
**開発期間**: 2026年1月
**使用言語**: JavaScript, HTML, CSS
