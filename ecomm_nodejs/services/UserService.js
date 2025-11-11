const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../config/database');

class UserService {
  constructor() {
    // No database connection needed here since we use the database module
  }

  // Get all user emails and names
  async getAllEmails() {
    try {
      const users = await query('SELECT name, email FROM users');
      return {
        success: true,
        data: users
      };
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw new Error('Failed to fetch user emails');
    }
  }

  // Get all users (id, name, email)
  async getAllUsers() {
    try {
      const users = await query('SELECT id, name, email, cellphone FROM users');
      return {
        success: true,
        data: users
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  // Check login status (for session-based auth)
  async checkLoginStatus(req) {
    try {
      const loggedIn = req.session && req.session.user_id ? true : false;
      return {
        success: true,
        loggedIn: loggedIn,
        user_id: req.session?.user_id || null
      };
    } catch (error) {
      console.error('Error checking login status:', error);
      return {
        success: false,
        loggedIn: false,
        error: 'Failed to check login status'
      };
    }
  }

  // Login user
  async loginUser(data) {
    try {
      const { email, password } = data;

      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required',
          status: 400
        };
      }

      // Find user by email
      const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
          status: 401
        };
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return {
          success: false,
          error: 'Invalid email or password',
          status: 401
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          name: user.name 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Return success response
      return {
        success: true,
        token: token,
        user_id: user.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          cellphone: user.cellphone
        }
      };
    } catch (error) {
      console.error('Error during login:', error);
      return {
        success: false,
        error: 'Login failed',
        status: 500
      };
    }
  }

  // Logout user
  async logoutUser(req) {
    try {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
          }
        });
      }

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Error during logout:', error);
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }

  // Register new user
  async registerUser(data) {
    try {
      const { name, email, cellphone, password } = data;

      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required',
          status: 400
        };
      }

      // Check if user already exists
      const existingUser = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
      
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
          status: 409
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Insert new user
      const result = await query(
        'INSERT INTO users (name, email, cellphone, password) VALUES (?, ?, ?, ?)',
        [name || null, email, cellphone || null, hashedPassword]
      );

      return {
        success: true,
        message: 'User was registered successfully',
        user_id: result.insertId
      };
    } catch (error) {
      console.error('Error during registration:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return {
          success: false,
          error: 'User with this email already exists',
          status: 409
        };
      }

      return {
        success: false,
        error: 'Unable to register the user',
        status: 500
      };
    }
  }

  // Set session (for session-based auth compatibility)
  async setSession(data, req) {
    try {
      if (data.userId) {
        req.session.user_id = data.userId;
        return {
          success: true,
          message: 'Session set successfully'
        };
      } else {
        return {
          success: false,
          error: 'Invalid data provided',
          status: 400
        };
      }
    } catch (error) {
      console.error('Error setting session:', error);
      return {
        success: false,
        error: 'Failed to set session',
        status: 500
      };
    }
  }

  // Validate JWT token
  async validateToken(token) {
    try {
      if (!token) {
        return {
          valid: false,
          message: 'No token provided'
        };
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Optional: Check if user still exists in database
      const user = await queryOne('SELECT id, name, email, cellphone FROM users WHERE id = ?', [decoded.id]);

      if (!user) {
        return {
          valid: false,
          message: 'User not found'
        };
      }

      return {
        valid: true,
        user: user,
        user_id: user.id
      };
    } catch (error) {
      console.error('Token validation error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return {
          valid: false,
          message: 'Invalid token'
        };
      }
      
      if (error.name === 'TokenExpiredError') {
        return {
          valid: false,
          message: 'Token expired'
        };
      }

      return {
        valid: false,
        message: 'Token validation failed'
      };
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await queryOne('SELECT id, name, email, cellphone FROM users WHERE id = ?', [userId]);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          status: 404
        };
      }

      return {
        success: true,
        user: user
      };
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return {
        success: false,
        error: 'Failed to fetch user',
        status: 500
      };
    }
  }

  // Update user profile
  async updateUser(userId, data) {
    try {
      const { name, cellphone } = data;
      
      await query(
        'UPDATE users SET name = ?, cellphone = ? WHERE id = ?',
        [name, cellphone, userId]
      );

      return {
        success: true,
        message: 'User updated successfully'
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return {
        success: false,
        error: 'Failed to update user',
        status: 500
      };
    }
  }
}

module.exports = UserService;