const { query, queryOne } = require('../config/database');

class CartService {
  constructor() {
    this.tableName = 'carts';
  }

  // Create cart item
  async createCart(data, user) {
    try {
      if (!data || Object.keys(data).length === 0) {
        return {
          success: false,
          error: 'No data provided',
          status: 400
        };
      }

      const { product_id, quantity, size, pickup_date } = data;

      if (!product_id || !quantity) {
        return {
          success: false,
          error: 'Product ID and quantity are required',
          status: 400
        };
      }

      // Validate pickup date if provided
      if (pickup_date && !this.isValidPickupDate(pickup_date)) {
        return {
          success: false,
          error: 'Invalid pickup date. Date must be between today and 30 days from now.',
          status: 400
        };
      }

      // Check if the product exists
      const product = await queryOne('SELECT id FROM products WHERE id = ?', [product_id]);
      
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
          status: 404
        };
      }

      // Insert into cart
      const result = await query(
        `INSERT INTO ${this.tableName} 
         (product_id, quantity, size, pickup_date, user_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          product_id,
          quantity,
          size || 'M',
          pickup_date || null,
          user.id
        ]
      );

      return {
        success: true,
        message: 'Cart item was created',
        cart_id: result.insertId,
        status: 201
      };
    } catch (error) {
      console.error('Error creating cart:', error);
      return {
        success: false,
        error: 'Unable to create cart item',
        status: 500
      };
    }
  }

  // Read user's cart items
  async readCarts(user) {
    try {
      const carts = await query(
        `SELECT c.id, c.product_id, c.quantity, c.size, c.pickup_date, c.user_id, 
                p.name, p.price, p.description, p.image 
         FROM ${this.tableName} c 
         INNER JOIN products p ON c.product_id = p.id 
         WHERE c.user_id = ?
         ORDER BY c.id DESC`,
        [user.id]
      );

      return {
        success: true,
        records: carts
      };
    } catch (error) {
      console.error('Error reading carts:', error);
      return {
        success: false,
        error: 'Failed to fetch cart items',
        records: []
      };
    }
  }

  // Read single cart item
  async readOneCart(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Cart ID is required',
          status: 400
        };
      }

      const cart = await queryOne(
        `SELECT c.id, c.product_id, c.quantity, c.size, c.pickup_date, c.user_id, 
                p.name, p.price, p.description, p.image 
         FROM ${this.tableName} c 
         INNER JOIN products p ON c.product_id = p.id 
         WHERE c.id = ?`,
        [id]
      );

      if (!cart) {
        return {
          success: false,
          error: 'Cart item not found',
          status: 404
        };
      }

      return {
        success: true,
        cart: cart
      };
    } catch (error) {
      console.error('Error reading cart item:', error);
      return {
        success: false,
        error: 'Failed to fetch cart item',
        status: 500
      };
    }
  }

  // Update cart item
  async updateCart(data, user) {
    try {
      if (!data || !data.id) {
        return {
          success: false,
          error: 'Cart ID is required',
          status: 400
        };
      }

      const { id, quantity, size, pickup_date } = data;

      // Check if cart item exists and belongs to user
      const existingCart = await queryOne(
        `SELECT * FROM ${this.tableName} WHERE id = ? AND user_id = ?`,
        [id, user.id]
      );

      if (!existingCart) {
        return {
          success: false,
          error: 'Cart item not found or access denied',
          status: 404
        };
      }

      // Validate pickup date if provided
      if (pickup_date && !this.isValidPickupDate(pickup_date)) {
        return {
          success: false,
          error: 'Invalid pickup date. Date must be between today and 30 days from now.',
          status: 400
        };
      }

      // Build update query dynamically
      let updateFields = [];
      let updateValues = [];

      if (quantity !== undefined) {
        updateFields.push('quantity = ?');
        updateValues.push(quantity);
      }

      if (size !== undefined) {
        updateFields.push('size = ?');
        updateValues.push(size);
      }

      if (pickup_date !== undefined) {
        updateFields.push('pickup_date = ?');
        updateValues.push(pickup_date);
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          error: 'No fields to update',
          status: 400
        };
      }

      // Add WHERE clause values
      updateValues.push(id, user.id);

      const sql = `UPDATE ${this.tableName} SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`;
      
      await query(sql, updateValues);

      return {
        success: true,
        message: 'Cart item updated successfully'
      };
    } catch (error) {
      console.error('Error updating cart:', error);
      return {
        success: false,
        error: 'Failed to update cart item',
        status: 500
      };
    }
  }

  // Delete cart item
  async deleteCart(id, user) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Cart ID is required',
          status: 400
        };
      }

      // Check if cart item exists and belongs to user
      const existingCart = await queryOne(
        `SELECT * FROM ${this.tableName} WHERE id = ? AND user_id = ?`,
        [id, user.id]
      );

      if (!existingCart) {
        return {
          success: false,
          error: 'Cart item not found or access denied',
          status: 404
        };
      }

      // Delete cart item
      await query(`DELETE FROM ${this.tableName} WHERE id = ? AND user_id = ?`, [id, user.id]);

      return {
        success: true,
        message: 'Cart item deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting cart:', error);
      return {
        success: false,
        error: 'Failed to delete cart item',
        status: 500
      };
    }
  }

  // Clear all cart items for user
  async clearCart(user) {
    try {
      await query(`DELETE FROM ${this.tableName} WHERE user_id = ?`, [user.id]);

      return {
        success: true,
        message: 'Cart cleared successfully'
      };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return {
        success: false,
        error: 'Failed to clear cart',
        status: 500
      };
    }
  }

  // Validate pickup date
  isValidPickupDate(pickupDate) {
    try {
      const date = new Date(pickupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 30); // 30 days from today
      
      return date >= today && date <= maxDate;
    } catch (error) {
      return false;
    }
  }

  // Get cart summary for user
  async getCartSummary(user) {
    try {
      const summary = await queryOne(
        `SELECT 
           COUNT(*) as total_items,
           SUM(c.quantity) as total_quantity,
           SUM(c.quantity * p.price) as total_amount
         FROM ${this.tableName} c 
         INNER JOIN products p ON c.product_id = p.id 
         WHERE c.user_id = ?`,
        [user.id]
      );

      return {
        success: true,
        summary: {
          total_items: parseInt(summary.total_items) || 0,
          total_quantity: parseInt(summary.total_quantity) || 0,
          total_amount: parseFloat(summary.total_amount) || 0
        }
      };
    } catch (error) {
      console.error('Error getting cart summary:', error);
      return {
        success: false,
        error: 'Failed to get cart summary',
        status: 500
      };
    }
  }
}

module.exports = CartService;