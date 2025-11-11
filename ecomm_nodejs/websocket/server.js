require('dotenv').config();
const WebSocketServer = require('./WebSocketServer');

// Create and start the WebSocket server
const wsServer = new WebSocketServer();

// Start the server on port 8080 (or from environment variable)
const port = process.env.WS_PORT || 8080;
wsServer.start(port);

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Gracefully shutting down...');
    wsServer.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Gracefully shutting down...');
    wsServer.stop();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

console.log('WebSocket server is running...');
console.log('Press Ctrl+C to stop the server');