@echo off
setlocal enabledelayedexpansion

title s7PMS - Local Development Launcher
cd /d "%~dp0"

echo ========================================================
echo               s7PMS Local Development Runner
echo ========================================================
echo.

:: 1. Start SQL Server LocalDB
echo [1/3] Starting SQL Server LocalDB (mssqllocaldb)...
sqllocaldb start mssqllocaldb
echo.

:: 2. Start Backend Web API
echo [2/3] Starting Backend API on http://localhost:5171 ...
start "s7PMS - Backend (Port 5171)" cmd /k "cd /d ""%~dp0"" && title s7PMS Backend (5171) && dotnet run --launch-profile http"
echo.

:: 3. Start Frontend Angular App
echo [3/3] Starting Frontend on http://localhost:4200 ...
start "s7PMS - Frontend (Port 4200)" cmd /k "cd /d ""%~dp0frontend"" && title s7PMS Frontend (4200) && npm start"
echo.

:: 4. Launch Browser
echo Waiting for servers to initialize...
timeout /t 6 /nobreak >nul
echo Opening application in browser...
start http://localhost:4200

echo.
echo ========================================================
echo s7PMS is running:
echo - Frontend: http://localhost:4200
echo - Backend:  http://localhost:5171
echo - Swagger:  http://localhost:5171/swagger
echo.
echo Note: Keep the Backend and Frontend command windows open.
echo ========================================================
echo.
pause
