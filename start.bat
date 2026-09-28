@echo off
echo ====================================================
echo Starting Smart City Citizen System Portal...
echo ====================================================
echo.

IF NOT EXIST "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo Starting Node.js server...
echo Access Citizen Portal at: http://localhost:3000
echo Access Admin Portal at:   http://localhost:3000/admin
echo.
node server.js
pause
