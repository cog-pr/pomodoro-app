@echo off
chcp 65001
echo ポモドーロタイマーを起動しています...
echo.
echo ※この画面は閉じないでください
echo アプリを終了するときは、この画面で [Ctrl] + [C] を押して「y」を入力してください。
echo.

cd /d "%~dp0"

:: ブラウザを起動（少し待ってから）
timeout /t 3 >nul
start http://localhost:5173

:: 開発サーバーを起動
npm run dev

pause
