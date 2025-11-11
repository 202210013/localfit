const jwt = require('jsonwebtoken');
const UserService = require('../services/UserService');

// Extract Bearer token from request headers
function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  return null;
}

// Middleware to require authentication
async function requireAuthentication(req, res, next) {
  try {
    const token = getBearerToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    // Validate token using UserService (matching PHP logic)
    const userService = new UserService();
    const tokenValidation = await userService.validateToken(token);
    
    if (!tokenValidation.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token validation failed'
      });
    }

    // Add user info to request object for use in routes
    req.user = tokenValidation.user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
}

// Optional authentication (doesn't fail if no token)
async function optionalAuthentication(req, res, next) {
  try {
    const token = getBearerToken(req);
    
    if (token) {
      const userService = new UserService();
      const tokenValidation = await userService.validateToken(token);
      
      if (tokenValidation.valid) {
        req.user = tokenValidation.user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication on error
    console.warn('Optional authentication failed:', error.message);
    next();
  }
}

// Generate JWT token
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Middleware for admin-only routes
async function requireAdmin(req, res, next) {
  try {
    // First check authentication
    await requireAuthentication(req, res, () => {});
    
    // Then check if user is admin (you may need to adjust this logic)
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Admin access denied',
      message: error.message
    });
  }
}

module.exports = {
  requireAuthentication,
  optionalAuthentication,
  requireAdmin,
  getBearerToken,
  generateToken,
  verifyToken
};