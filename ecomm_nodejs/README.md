# E-commerce Node.js Backend

This is the complete Node.js backend converted from PHP for the E-commerce application.

## Features

- **RESTful API**: Complete API endpoints for user management, products, cart, orders
- **Authentication**: JWT-based authentication with password hashing
- **File Upload**: Product image upload with Multer
- **Real-time Communication**: WebSocket server for live messaging
- **Database**: MySQL integration with connection pooling
- **Security**: CORS, Helmet, Rate limiting, Input validation
- **Error Handling**: Comprehensive error handling and logging

## Project Structure

```
ecomm_nodejs/
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   └── upload.js            # File upload middleware
├── services/
│   ├── UserService.js       # User management and authentication
│   ├── ProductService.js    # Product CRUD operations
│   ├── CartService.js       # Shopping cart management
│   ├── OrderService.js      # Order processing and management
│   └── MessageService.js    # Messaging system
├── websocket/
│   ├── WebSocketServer.js   # WebSocket server implementation
│   └── server.js            # WebSocket standalone server
├── uploads/                 # Product images directory
├── .env                     # Environment configuration
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
├── Router.js               # API routes configuration
├── server.js               # Main application server
└── start.bat               # Windows startup script
```

## Installation

1. **Install Node.js** (version 16 or higher)
2. **Navigate to the project directory**:
   ```bash
   cd ecomm_nodejs
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Configure environment**:
   - Update `.env` file with your database credentials
   - Change JWT secrets for production

## Configuration

### Environment Variables (.env)

```env
# Server Configuration
NODE_ENV=development
PORT=3001
WS_PORT=8080

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=e-comm
DB_USER=root
DB_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-here
```

### Database Setup

Ensure your MySQL database `e-comm` is running and accessible with the configured credentials.

## Running the Application

### Option 1: Using the startup script (Windows)
```bash
start.bat
```

### Option 2: Using npm commands
```bash
# Install dependencies (first time only)
npm install

# Start the server
npm start

# Development mode with auto-reload
npm run dev
```

### Option 3: Direct node execution
```bash
node server.js
```

## API Endpoints

### Authentication
- `POST /api/user/login` - User login
- `POST /api/user/register` - User registration
- `POST /api/user/logout` - User logout

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/all` - Get all users (admin)

### Products
- `GET /api/product/getAll` - Get all products
- `GET /api/product/get/{id}` - Get product by ID
- `POST /api/product/add` - Add new product (admin)
- `PUT /api/product/update/{id}` - Update product (admin)
- `DELETE /api/product/delete/{id}` - Delete product (admin)

### Cart
- `GET /api/cart/get` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item
- `DELETE /api/cart/remove` - Remove item from cart
- `DELETE /api/cart/clear` - Clear entire cart

### Orders
- `GET /api/order/getAll` - Get all orders
- `GET /api/order/user/{userId}` - Get user orders
- `POST /api/order/create` - Create new order
- `PUT /api/order/update/{orderId}` - Update order status
- `POST /api/order/complete/{orderId}` - Complete order with remarks

### Messages
- `GET /api/message/getMessages` - Get messages between users
- `POST /api/message/send` - Send message
- `GET /api/message/conversations` - Get user conversations

## WebSocket Server

The WebSocket server runs on port 8080 (configurable) and supports:

- **Real-time messaging**: Direct messages between users
- **User authentication**: JWT-based WebSocket authentication
- **Online status**: Track online/offline user status
- **Notifications**: Real-time notifications
- **Channel subscriptions**: Subscribe to specific channels

### WebSocket Message Types

```javascript
// Authentication
{
  "type": "auth",
  "userId": "123",
  "token": "jwt-token"
}

// Send message
{
  "type": "message",
  "to": "456",
  "content": "Hello!"
}

// Send notification
{
  "type": "notification",
  "to": "456",
  "content": "Order status updated"
}

// Subscribe to channel
{
  "type": "subscribe",
  "channel": "orders"
}
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: BCrypt password encryption
- **CORS Protection**: Configurable cross-origin requests
- **Rate Limiting**: Prevent API abuse
- **Helmet**: Security headers
- **Input Validation**: Request parameter validation
- **File Upload Security**: Safe file upload handling

## Development

### Adding New Endpoints

1. Add route in `Router.js`
2. Implement service method in appropriate service file
3. Add authentication middleware if needed
4. Test the endpoint

### Database Queries

All database operations use async/await with MySQL2 promise interface:

```javascript
const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

### Error Handling

All services include comprehensive error handling:

```javascript
try {
  // Database operation
} catch (error) {
  console.error('Service error:', error);
  return { success: false, error: error.message };
}
```

## Production Deployment

1. **Set NODE_ENV=production** in `.env`
2. **Update JWT secrets** with strong random values
3. **Configure database** connection for production
4. **Set up SSL/HTTPS** for secure connections
5. **Configure reverse proxy** (Nginx/Apache)
6. **Set up process manager** (PM2)

```bash
# Using PM2 for production
npm install -g pm2
pm2 start server.js --name "ecomm-api"
pm2 startup
pm2 save
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MySQL server is running
   - Verify database credentials in `.env`
   - Ensure database `e-comm` exists

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing process: `taskkill /f /im node.exe`

3. **File Upload Issues**
   - Check `uploads/` directory permissions
   - Verify MAX_FILE_SIZE setting

4. **WebSocket Connection Failed**
   - Check WS_PORT is not blocked by firewall
   - Verify WebSocket URL in frontend

### Logs

Server logs include:
- Request/response logging with Morgan
- Error logging with stack traces
- Database operation logs
- WebSocket connection logs

## Migration from PHP

This Node.js backend maintains API compatibility with the original PHP backend:
- Same endpoint URLs and parameters
- Same response formats
- Same authentication flow
- Same database schema

## Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Ensure backward compatibility

## License

MIT License