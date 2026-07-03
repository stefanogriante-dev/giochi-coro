@echo off
cd /d "E:\Stefano\progetti_personali\giochi-coro"
del /f /q .git\index.lock 2>nul
git add .
git commit -m "IngressiGame v4: layout Simon, stili inline, rimozione overlay rotazione"
git push
echo.
echo Deploy completato!
pause
