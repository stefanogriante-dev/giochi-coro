@echo off
cd /d "E:\Stefano\progetti_personali\giochi-coro"
del /f /q .git\index.lock 2>nul
git add .
git commit --allow-empty -m "fix: reset preserva config Ingressi + fix Celebration"
git push
echo.
echo Deploy completato!
pause
