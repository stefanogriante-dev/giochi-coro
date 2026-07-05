@echo off
cd /d "E:\Stefano\progetti_personali\giochi-coro"
del /f /q .git\index.lock 2>nul
git add .
git commit --allow-empty -m "feat: accordi in Guida agli Ingressi + fix BPM pre-start"
git push
echo.
echo Deploy completato!
pause
