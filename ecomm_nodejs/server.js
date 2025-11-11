const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - MUST be first middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:4200',
      'https://localfit.store',
      'https://api.localfit.store'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Additional middleware for static asset CORS
app.use((req, res, next) => {
  // For image and static file requests
  if (req.path.startsWith('/e-comm-images') || req.path.startsWith('/uploads')) {
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.get('origin') || 'no-origin'}`);
  next();
});

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files for uploaded images with CORS
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Static files for e-comm images (serve from parent directory) with CORS
const imageDirectory = path.join(__dirname, '..', 'e-comm-images');
console.log('📁 Serving images from:', imageDirectory);

// First try with explicit route handler for files with subdirectories
app.get('/e-comm-images/*', (req, res) => {
  // Get the full path after /e-comm-images/
  const imagePath = req.params[0]; // This captures everything after /e-comm-images/
  const filepath = path.join(imageDirectory, imagePath);
  
  console.log('🖼️ Image request for:', imagePath);
  console.log('📍 Full path:', filepath);
  
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Check if file exists and send it
  const fs = require('fs');
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    console.log('❌ File not found:', filepath);
    res.status(404).send('Image not found');
  }
});

// Also keep the static middleware as fallback
app.use('/e-comm-images', (req, res, next) => {
  console.log('🖼️ Static middleware - Image request:', req.path);
  res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(imageDirectory));

// Import routes
const router = require('./Router');

// Import WebSocket server
const WebSocketServer = require('./websocket/WebSocketServer');

// Import Socket.IO
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import database test function
const { testConnection } = require('./config/database');

// Use routes
app.use('/api', router);

// Initialize WebSocket server
const WS_PORT = process.env.WS_PORT || 8080;

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server function
async function startServer() {
  try {
    // Test database connection
    console.log('🔄 Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }

    // Start HTTP server
    const httpServer = app.listen(PORT, () => {
      console.log(`🚀 E-commerce API Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
    });

    // Start WebSocket server
    const wsServer = new WebSocketServer(WS_PORT);
    wsServer.start();

    // Graceful shutdown
    const shutdown = () => {
      console.log('\n🛑 Shutting down servers...');
      
      httpServer.close(() => {
        console.log('✅ HTTP server closed');
      });
      
      wsServer.stop();
      
      setTimeout(() => {
        console.log('✅ Shutdown complete');
        process.exit(0);
      }, 1000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();