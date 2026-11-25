@echo off
title s7PMS - Stop Servers
cd /d "%~dp0"

echo ========================================================
echo               s7PMS Server Stopper
echo ========================================================
echo.

echo Stopping services running on port 5171 (Backend) and 4200 (Frontend)...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5171') do (
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4200') do (
    taskkill /F /PID %%a 2>nul
)

echo Services on ports 5171 and 4200 stopped successfully.
timeout /t 2 /nobreak >nul
