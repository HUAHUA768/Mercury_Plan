@echo off
rem Mercury Plan launcher: start a dedicated Edge instance (own profile => always its own window)
setlocal
set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "PROFILE=%~dp0.edge-profile"
if not exist "%EDGE%" goto fallback
if exist "%PROFILE%\" goto run
"%EDGE%" --headless=new --disable-gpu --user-data-dir="%PROFILE%" --no-first-run about:blank >nul 2>&1
timeout /t 2 /nobreak >nul
:run
start "" "%EDGE%" --user-data-dir="%PROFILE%" --app="file:///%~dp0index.html" --window-size=1440,900 --no-first-run --no-default-browser-check
goto :eof
:fallback
start "" "%~dp0index.html"