@echo off
cd /d "E:\Stefano\progetti_personali\giochi-coro"
del /f /q .git\index.lock 2>nul
git add .
git commit --allow-empty -m "trigger deploy: Batti il Tempo 3 voci + 7 misure"
git push
echo.
echo Deploy completato!
pause
