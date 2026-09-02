@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Rick Chee Shop V7.7 Local Server
echo.
where py >nul 2>nul
if %errorlevel%==0 (
  echo เปิดเว็บที่ http://localhost:5500/
  start "" http://localhost:5500/
  py -m http.server 5500
  exit /b
)
where python >nul 2>nul
if %errorlevel%==0 (
  echo เปิดเว็บที่ http://localhost:5500/
  start "" http://localhost:5500/
  python -m http.server 5500
  exit /b
)
echo ไม่พบ Python กรุณาใช้ VS Code Live Server หรืออัปขึ้น GitHub Pages
pause
