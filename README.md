# Pomodoro Timer App

学習管理とポモドーロテクニックを組み合わせた、モダンでカスタマイズ可能なタイマーアプリです。

## 主な機能

### ポモドーロタイマー
- **自動切り替え**: 学習時間、休憩時間、長い休憩を自動で切り替え
- **柔軟な制御**: 一時停止、再開、スキップ、リセット機能
- **カスタマイズ**: タイマーの時間設定を自由に変更可能

### 学習項目管理
- 学習項目の追加・編集・削除
- 項目ごとの学習時間の自動記録
- データの永続化（localStorage）

### 統計・可視化
- 総学習時間の表示
- 項目別の学習時間をドーナツチャートで可視化
- 学習の進捗を一目で確認

### カスタマイズ
- **テーマ**: ライト/ダークモード
- **タイマーカラー**: 好みの色に変更可能
- **背景**: 7種類のグラデーション背景 + カスタム画像アップロード

### 通知・サウンド
- タイマー完了時の通知
- サウンド・バイブレーション設定
- ブラウザ通知のサポート

### データ管理
- すべてのデータをローカルに保存
- バックアップ・復元機能（JSON形式）
- データのインポート/エクスポート

### PWA対応
- オフラインでも動作
- ホーム画面に追加可能
- ネイティブアプリのような体験

---

## 技術スタック

- **フロントエンド**: Vanilla JavaScript（フレームワーク不使用）
- **ビルドツール**: Vite
- **スタイリング**: CSS3（Glassmorphism、CSS Variables）
- **グラフ**: Chart.js
- **PWA**: vite-plugin-pwa
- **モバイル対応**: Capacitor（Android/iOS）
- **データ管理**: localStorage

---

## セットアップ・実行方法

### 前提条件
- Node.js（v16以上推奨）
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-username/pomodoro-app.git
cd pomodoro-app

# 依存関係をインストール
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開いてアプリを確認できます。

### プロダクションビルド

```bash
npm run build
```

ビルドされたファイルは `dist/` ディレクトリに出力されます。

### プレビュー

```bash
npm run preview
```

---

## モバイルアプリとして実行

### Android

1. **ビルド**:
```bash
npm run build
```

2. **Capacitorの初期化**（初回のみ）:
```bash
npx cap init "Pomodoro Timer" "com.pomodoro.app" --web-dir=dist
npx cap add android
```

3. **同期**:
```bash
npx cap sync
```

4. **Android Studioで開く**:
```bash
npx cap open android
```

Android Studioでビルド・実行してください。

---

## アーキテクチャ

このアプリは、シンプルな **Store パターン** を採用しています。

### ストア構造
- **Subjects Store** (`src/stores/subjects.js`): 学習項目の管理
- **Settings Store** (`src/stores/settings.js`): アプリ設定の管理
- **Timer Store** (`src/stores/timer.js`): タイマーのライフサイクル管理

### 主要な設計パターン
- **Observer パターン**: ストアの変更を UI に通知
- **単一責任の原則**: 各ストアは独立した責任を持つ
- **関心の分離**: ビジネスロジックと UI ロジックを分離

詳細は [TECHNICAL_NOTES.md](TECHNICAL_NOTES.md) を参照してください。

---

## プロジェクト構造

```
pomodoro-app/
├── src/
│   ├── main.js              # エントリーポイント・UI制御
│   ├── index.css            # メインスタイル
│   ├── stores/              # 状態管理ストア
│   │   ├── subjects.js
│   │   ├── settings.js
│   │   └── timer.js
│   ├── utils/               # ユーティリティ関数
│   │   └── storage.js
│   └── pages/               # ページコンポーネント
│       └── StatisticsPage.js
├── public/                  # 静的ファイル
├── index.html               # HTMLエントリーポイント
├── vite.config.js           # Vite設定
├── capacitor.config.json    # Capacitor設定
└── package.json
```

---

## 使い方

1. **学習項目を追加**: 「学習項目」タブから項目を追加
2. **タイマーを開始**: 「タイマー」タブで項目を選択してスタート
3. **集中**: 25分間集中して学習
4. **休憩**: 5分間の休憩で気分転換
5. **繰り返す**: 4サイクルごとに15分の長い休憩
6. **統計を確認**: 「統計」タブで学習時間を確認

---

## スクリーンショット

### ホーム画面
![ホーム画面](screenshots/home.jpg)

---

## 貢献

バグ報告や機能リクエストは、[Issues](https://github.com/your-username/pomodoro-app/issues) からお願いします。

---

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

---

## 作成目的・背景

学習とポートフォリオ目的で作成しました。  
自分用にポモドーロタイマーのスマートフォン向けアプリケーションが欲しいと思ったのが作成に及んだきっかけです。  
現在は、Google Playでのリリースを目標としています。(2026/2/4)  
タイマーの背景を任意の画像に変更できる点がこだわりの一つです。  
なるべくシンプルで使いやすいUIデザインを心掛けました。  

---

## 本アプリケーションは以下のOSS・ツールに支えられています。

- [Chart.js](https://www.chartjs.org/) - 統計グラフの描画
- [Vite](https://vitejs.dev/) - 高速な開発環境
- [Capacitor](https://capacitorjs.com/) - クロスプラットフォーム対応
