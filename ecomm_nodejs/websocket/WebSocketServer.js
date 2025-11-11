const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketServer {
  constructor(port = 8080) {
    this.port = port;
    this.clients = new Map(); // userId -> WebSocket connection
    this.wss = null;
  }

  start() {
    this.wss = new WebSocket.Server({ 
      port: this.port,
      verifyClient: (info) => {
        // Basic verification - can be enhanced
        return true;
      }
    });

    console.log(`🔌 WebSocket Server started on port ${this.port}`);

    this.wss.on('connection', (ws, request) => {
      console.log('👤 New WebSocket connection');

      // Handle authentication
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('❌ Invalid JSON message:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });

      ws.on('close', () => {
        console.log('🚪 WebSocket connection closed');
        this.removeClient(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.removeClient(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to WebSocket server'
      }));
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket Server error:', error);
    });

    return this.wss;
  }

  handleMessage(ws, data) {
    switch (data.type) {
      case 'auth':
        this.handleAuth(ws, data);
        break;
      case 'message':
        this.handleChatMessage(ws, data);
        break;
      case 'notification':
        this.handleNotification(ws, data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Unknown message type' 
        }));
    }
  }

  handleAuth(ws, data) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Store authenticated connection
      ws.userId = decoded.email || decoded.userId;
      this.clients.set(ws.userId, ws);
      
      ws.send(JSON.stringify({
        type: 'auth_success',
        message: 'Authenticated successfully',
        userId: ws.userId
      }));

      console.log(`✅ User authenticated: ${ws.userId}`);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'auth_error',
        message: 'Authentication failed'
      }));
      console.error('❌ Authentication failed:', error);
    }
  }

  handleChatMessage(ws, data) {
    if (!ws.userId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Not authenticated'
      }));
      return;
    }

    // Broadcast message to specific user or all users
    const messageData = {
      type: 'message',
      from: ws.userId,
      to: data.to,
      message: data.message,
      timestamp: new Date().toISOString()
    };

    if (data.to) {
      // Send to specific user
      const targetClient = this.clients.get(data.to);
      if (targetClient && targetClient.readyState === WebSocket.OPEN) {
        targetClient.send(JSON.stringify(messageData));
      }
    } else {
      // Broadcast to all authenticated clients
      this.broadcast(messageData, ws.userId);
    }
  }

  handleNotification(ws, data) {
    if (!ws.userId) {
      return;
    }

    const notification = {
      type: 'notification',
      from: ws.userId,
      message: data.message,
      timestamp: new Date().toISOString()
    };

    // Send notification to all admin users or specific users
    this.broadcast(notification);
  }

  broadcast(message, excludeUserId = null) {
    this.clients.forEach((client, userId) => {
      if (userId !== excludeUserId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  removeClient(ws) {
    if (ws.userId) {
      this.clients.delete(ws.userId);
      console.log(`🚪 User disconnected: ${ws.userId}`);
    }
  }

  // Send message to specific user
  sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.clients.size;
  }

  // Get online users list
  getOnlineUsers() {
    return Array.from(this.clients.keys());
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      console.log('🛑 WebSocket Server stopped');
    }
  }
}

module.exports = WebSocketServer;