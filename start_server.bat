@echo off
cd /d %~dp0
echo Starting Kui Letter API server...
npm install
npm start
pause
