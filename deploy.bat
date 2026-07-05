@echo off
cd /d "E:\Stefano\progetti_personali\giochi-coro"
del /f /q .git\index.lock 2>nul
git add .
git commit --allow-empty -m "fix: BPM aggiornati subito anche prima del Start"
git push
echo.
echo Deploy completato!
pause
