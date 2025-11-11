@echo off
echo Installing Node.js dependencies...
npm install

echo.
echo Starting E-commerce Node.js Backend Server...
echo.
echo API Server will run on: http://localhost:3001
echo WebSocket Server will run on: ws://localhost:8080
echo.

npm start