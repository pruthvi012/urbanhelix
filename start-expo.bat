@echo off
echo ===================================================
echo     UrbanHeliX - Final Expo Start Script
echo ===================================================
echo This script will start the Blockchain, Backend, and Frontend.

echo [1/4] Starting Blockchain Network...
start "UrbanHeliX - Blockchain Node" cmd /k "cd blockchain && npm run node"

echo Waiting for Blockchain to initialize...
timeout /t 5 /nobreak >nul

echo [2/4] Deploying Smart Contracts...
start "UrbanHeliX - Smart Contract Deployment" cmd /c "cd blockchain && npm run deploy && echo. && echo Deployment Complete! Closing in 5 seconds... && timeout /t 5 >nul"

echo Waiting for deployment to finish...
timeout /t 5 /nobreak >nul

echo [3/4] Starting Backend Server...
start "UrbanHeliX - Backend Server" cmd /k "cd server && npm run dev"

echo Waiting for Backend Server...
timeout /t 3 /nobreak >nul

echo [4/4] Starting Frontend Client...
start "UrbanHeliX - Frontend UI" cmd /k "cd client && npm run dev"

echo.
echo ===================================================
echo   All systems started successfully! 
echo   Your project is now running.
echo   Keep the CMD windows open while presenting.
echo ===================================================
pause
