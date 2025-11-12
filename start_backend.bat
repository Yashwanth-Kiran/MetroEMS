@echo off
setlocal
cd /d "%~dp0\Backend_for_station_Radios"
set PYTHONPATH=%CD%

REM Prefer workspace virtual environment if present
set VENV_PY="%~dp0.venv\Scripts\python.exe"
if exist %VENV_PY% (
	echo Using venv: %VENV_PY%
	%VENV_PY% -m uvicorn real_backend:app --host 0.0.0.0 --port 8000
) else (
	echo Using system Python
	python -m uvicorn real_backend:app --host 0.0.0.0 --port 8000
)
endlocal
