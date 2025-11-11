const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for Express
app.use(cors({
  origin: ['http://localhost:4200', 'https://localfit-nine.vercel.app'],
  credentials: true
}));

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:4200', 'https://localfit-nine.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store connected users and messages
let connectedUsers = new Map();
let messages = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send all existing messages to the new user
  socket.emit('all-messages', messages);

  // Handle user joining
  socket.on('join', (userData) => {
    connectedUsers.set(socket.id, userData);
    console.log('User joined:', userData);
  });

  // Handle sending messages
  socket.on('send-message', (message) => {
    console.log('Message received:', message);
    messages.push(message);
    
    // Broadcast to all connected clients
    io.emit('receive-message', message);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    connectedUsers.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
