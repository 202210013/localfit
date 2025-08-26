import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://localfit.store",
    methods: ["GET", "POST"]
  }
});

const PHP_API_URL = 'https://api.localfit.store/ecomm_api/services/MessageService.php';

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('fetch-messages', async (data) => {
    try {
      const response = await axios.get(PHP_API_URL, {
        params: {
          user1: data.user1,
          user2: data.user2
        }
      });
      socket.emit('all-messages', response.data);
    } catch (err) {
      socket.emit('error', 'Failed to fetch messages');
    }
  });

  socket.on('send-message', async (msg) => {
    try {
      await axios.post(PHP_API_URL, msg);
      io.emit('receive-message', msg);
    } catch (err) {
      socket.emit('error', 'Failed to save message');
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(3000, () => {
  console.log('Socket.IO server running on port 3000');
});