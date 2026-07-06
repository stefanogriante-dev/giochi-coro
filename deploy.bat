@echo off
cd /d "E:\Stefano\progetti_personali\giochi-coro"
del /f /q .git\index.lock 2>nul
del /f /q .git\HEAD.lock 2>nul
git add .
git commit --allow-empty -m "feat: schermata Note e Accordi"
git push
echo.
echo Deploy completato!
pause
