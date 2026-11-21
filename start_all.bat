@echo off
title VAIDYcare-AI Launcher
echo ========================================================
echo       Launching VAIDYcare-AI Ecosystem (3 Services)
echo ========================================================
echo.

echo [1/3] Starting Python ML Microservice (FastAPI :8000)...
start "VAIDYcare-AI Python ML Engine (:8000)" cmd /k "cd /d %~dp0backend-ai && venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Node.js Backend Gateway (:5000)...
start "VAIDYcare-AI Node.js Gateway (:5000)" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 3 /nobreak >nul

echo [3/3] Starting React Frontend (:5173)...
start "VAIDYcare-AI React Frontend (:5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo  All services launched in separate terminal windows!
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:5000/health
echo  FastAPI:  http://localhost:8000/docs
echo ========================================================
pause

