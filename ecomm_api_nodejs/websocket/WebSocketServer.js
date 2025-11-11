const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

class WebSocketServer {
    constructor() {
        this.clients = new Map(); // Map userId to WebSocket connection
        this.subscriptions = new Map(); // Map channel to Set of connections
        this.userConnections = new Map(); // Map userId to connection
        
        // Initialize database connection
        this.initDatabase();
    }

    async initDatabase() {
        try {
            this.db = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'e-comm',
                timezone: '+00:00'
            });
            
            console.log('Database connected successfully');
        } catch (error) {
            console.error('Database connection failed:', error.message);
        }
    }

    start(port = 8080) {
        this.wss = new WebSocket.Server({ 
            port,
            verifyClient: (info) => {
                // Optional: Add additional verification logic here
                return true;
            }
        });

        this.wss.on('connection', (ws, request) => {
            this.onOpen(ws, request);
        });

        console.log(`WebSocket server started on port ${port}`);
    }

    onOpen(ws, request) {
        const connectionId = this.generateConnectionId();
        ws.connectionId = connectionId;
        
        console.log(`New connection! (${connectionId})`);

        ws.on('message', (message) => {
            this.onMessage(ws, message);
        });

        ws.on('close', () => {
            this.onClose(ws);
        });

        ws.on('error', (error) => {
            this.onError(ws, error);
        });

        // Send welcome message
        this.sendMessage(ws, {
            type: 'connection',
            status: 'connected',
            connectionId: connectionId
        });
    }

    onMessage(ws, message) {
        try {
            const data = JSON.parse(message.toString());
            
            switch (data.type) {
                case 'auth':
                    this.handleAuthentication(ws, data.userId, data.token);
                    break;
                
                case 'message':
                    if (data.to && data.content) {
                        this.handleDirectMessage(ws, data.to, data.content);
                    }
                    break;
                
                case 'notification':
                    this.handleNotification(ws, data);
                    break;

                case 'subscribe':
                    this.handleSubscription(ws, data.channel);
                    break;

                case 'ping':
                    this.handlePing(ws);
                    break;

                case 'getOnlineUsers':
                    this.handleGetOnlineUsers(ws);
                    break;
            }
        } catch (error) {
            console.error('Error parsing message:', error.message);
            this.sendError(ws, 'Invalid message format');
        }
    }

    async handleAuthentication(ws, userId, token) {
        try {
            // Verify JWT token if provided
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                    if (decoded.id !== parseInt(userId)) {
                        throw new Error('Token user ID mismatch');
                    }
                } catch (jwtError) {
                    this.sendError(ws, 'Invalid authentication token');
                    return;
                }
            }

            // Remove previous connection for this user if exists
            if (this.userConnections.has(userId)) {
                const oldConnection = this.userConnections.get(userId);
                if (oldConnection && oldConnection.readyState === WebSocket.OPEN) {
                    oldConnection.close();
                }
            }

            // Store new connection
            this.userConnections.set(userId, ws);
            ws.userId = userId;
            
            console.log(`Client authenticated with user ID: ${userId}`);
            
            this.sendMessage(ws, {
                type: 'auth',
                status: 'success',
                userId: userId
            });

            // Notify other users that this user is online
            this.broadcastUserStatus(userId, 'online');

        } catch (error) {
            console.error('Authentication error:', error.message);
            this.sendError(ws, 'Authentication failed');
        }
    }

    async handleDirectMessage(ws, toUserId, content) {
        try {
            if (!ws.userId) {
                this.sendError(ws, 'Not authenticated');
                return;
            }

            // Get or create conversation
            const conversationId = await this.getOrCreateConversation(ws.userId, toUserId);

            // Store message in database
            const [result] = await this.db.execute(`
                INSERT INTO message (content, conversationId, authorId, receiverId, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, NOW(), NOW())
            `, [content, conversationId, ws.userId, toUserId]);

            const messageId = result.insertId;
            const timestamp = new Date().toISOString();
            
            const messageData = {
                type: 'message',
                id: messageId,
                from: ws.userId,
                to: toUserId,
                content: content,
                timestamp: timestamp,
                conversationId: conversationId
            };

            // Send to recipient if online
            const recipientConnection = this.userConnections.get(toUserId);
            if (recipientConnection && recipientConnection.readyState === WebSocket.OPEN) {
                this.sendMessage(recipientConnection, messageData);
                
                // Send delivery confirmation to sender
                this.sendMessage(ws, {
                    type: 'message_delivered',
                    id: messageId,
                    to: toUserId,
                    timestamp: timestamp
                });
            } else {
                // Send offline confirmation to sender
                this.sendMessage(ws, {
                    type: 'message_queued',
                    id: messageId,
                    to: toUserId,
                    timestamp: timestamp
                });
            }

            // Also send back to sender for consistency
            this.sendMessage(ws, messageData);

        } catch (error) {
            console.error('Error handling message:', error.message);
            this.sendError(ws, 'Failed to deliver message');
        }
    }

    async getOrCreateConversation(user1Id, user2Id) {
        try {
            // First try to find existing conversation
            const [rows] = await this.db.execute(`
                SELECT id FROM conversation 
                WHERE (user1Id = ? AND user2Id = ?)
                OR (user1Id = ? AND user2Id = ?)
                LIMIT 1
            `, [user1Id, user2Id, user2Id, user1Id]);
            
            if (rows.length > 0) {
                return rows[0].id;
            }
            
            // Create new conversation if none exists
            const [result] = await this.db.execute(`
                INSERT INTO conversation (user1Id, user2Id, createdAt, updatedAt)
                VALUES (?, ?, NOW(), NOW())
            `, [user1Id, user2Id]);
            
            return result.insertId;
        } catch (error) {
            console.error('Error managing conversation:', error.message);
            throw error;
        }
    }

    handleNotification(ws, data) {
        try {
            if (!ws.userId) {
                this.sendError(ws, 'Not authenticated');
                return;
            }

            if (data.to && data.content) {
                const recipientConnection = this.userConnections.get(data.to);
                if (recipientConnection && recipientConnection.readyState === WebSocket.OPEN) {
                    this.sendMessage(recipientConnection, {
                        type: 'notification',
                        from: ws.userId,
                        content: data.content,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            console.error('Error handling notification:', error.message);
            this.sendError(ws, 'Failed to send notification');
        }
    }

    handleSubscription(ws, channel) {
        try {
            if (!this.subscriptions.has(channel)) {
                this.subscriptions.set(channel, new Set());
            }
            
            this.subscriptions.get(channel).add(ws);
            ws.subscribedChannels = ws.subscribedChannels || new Set();
            ws.subscribedChannels.add(channel);
            
            this.sendMessage(ws, {
                type: 'subscribe',
                status: 'success',
                channel: channel
            });
        } catch (error) {
            console.error('Error handling subscription:', error.message);
            this.sendError(ws, 'Failed to subscribe to channel');
        }
    }

    handlePing(ws) {
        this.sendMessage(ws, {
            type: 'pong',
            timestamp: new Date().toISOString()
        });
    }

    handleGetOnlineUsers(ws) {
        const onlineUsers = Array.from(this.userConnections.keys());
        this.sendMessage(ws, {
            type: 'online_users',
            users: onlineUsers
        });
    }

    broadcastUserStatus(userId, status) {
        const statusMessage = {
            type: 'user_status',
            userId: userId,
            status: status,
            timestamp: new Date().toISOString()
        };

        // Broadcast to all connected users except the user themselves
        this.userConnections.forEach((connection, connectedUserId) => {
            if (connectedUserId !== userId && connection.readyState === WebSocket.OPEN) {
                this.sendMessage(connection, statusMessage);
            }
        });
    }

    broadcastToChannel(channel, message) {
        const channelSubscribers = this.subscriptions.get(channel);
        if (channelSubscribers) {
            channelSubscribers.forEach(connection => {
                if (connection.readyState === WebSocket.OPEN) {
                    this.sendMessage(connection, message);
                }
            });
        }
    }

    onClose(ws) {
        console.log(`Connection ${ws.connectionId} has disconnected`);
        
        if (ws.userId) {
            this.userConnections.delete(ws.userId);
            this.broadcastUserStatus(ws.userId, 'offline');
        }

        // Clean up subscriptions
        if (ws.subscribedChannels) {
            ws.subscribedChannels.forEach(channel => {
                const channelSubscribers = this.subscriptions.get(channel);
                if (channelSubscribers) {
                    channelSubscribers.delete(ws);
                    if (channelSubscribers.size === 0) {
                        this.subscriptions.delete(channel);
                    }
                }
            });
        }
    }

    onError(ws, error) {
        console.error(`An error occurred on connection ${ws.connectionId}:`, error.message);
        ws.close();
    }

    sendMessage(ws, data) {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(data));
            }
        } catch (error) {
            console.error('Error sending message:', error.message);
        }
    }

    sendError(ws, message) {
        this.sendMessage(ws, {
            type: 'error',
            message: message,
            timestamp: new Date().toISOString()
        });
    }

    generateConnectionId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Cleanup method for graceful shutdown
    async close() {
        if (this.wss) {
            this.wss.close();
        }
        
        if (this.db) {
            await this.db.end();
        }
        
        console.log('WebSocket server closed');
    }

    // Get server statistics
    getStats() {
        return {
            totalConnections: this.userConnections.size,
            totalSubscriptions: this.subscriptions.size,
            onlineUsers: Array.from(this.userConnections.keys())
        };
    }
}

module.exports = WebSocketServer;