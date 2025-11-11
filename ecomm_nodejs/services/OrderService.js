const { query, queryOne } = require('../config/database');

class OrderService {
  constructor() {
    this.tableName = 'orders';
  }

  // Create multiple orders
  async createOrders(orders) {
    try {
      console.log("=== ORDER CREATION DEBUG ===");
      console.log("Received orders data:", orders);

      if (!Array.isArray(orders) || orders.length === 0) {
        return {
          success: false,
          error: 'Invalid orders data',
          status: 400
        };
      }

      // Insert orders one by one
      for (const order of orders) {
        const size = order.size || 'M';
        const pickupDate = order.pickup_date || null;
        
        console.log(`Processing order - Product: ${order.product}, Size: ${size}, Pickup Date: ${pickupDate || 'NULL'}`);
        
        await query(
          `INSERT INTO ${this.tableName} 
           (customer, product, quantity, size, status, created_at, pickup_date) 
           VALUES (?, ?, ?, ?, 'pending', NOW(), ?)`,
          [
            order.customer,
            order.product,
            order.quantity,
            size,
            pickupDate
          ]
        );
      }

      return {
        success: true,
        message: 'Orders created successfully'
      };
    } catch (error) {
      console.error('Error creating orders:', error);
      return {
        success: false,
        error: 'Failed to create orders',
        status: 500
      };
    }
  }

  // Get all orders with optional user filtering
  async getAllOrders(userEmail = null, adminEmail = null) {
    try {
      let sql = `
        SELECT o.*, u.name as customer_name, u.cellphone as customer_cellphone 
        FROM ${this.tableName} o 
        LEFT JOIN users u ON o.customer = u.email
      `;
      let params = [];

      if (userEmail) {
        sql += ' WHERE o.customer = ?';
        params.push(userEmail);
      }

      sql += ' ORDER BY o.created_at DESC';

      const orders = await query(sql, params);
      return orders || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  // Approve order
  async approveOrder(orderId) {
    try {
      if (!orderId) {
        return {
          success: false,
          error: 'Order ID is required',
          status: 400
        };
      }

      // Check if order exists and has a pickup date
      const order = await queryOne(
        `SELECT pickup_date FROM ${this.tableName} WHERE id = ?`,
        [orderId]
      );

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          status: 404
        };
      }

      // Only set pickup date if customer didn't select one (fallback to 3 days from now)
      const pickupDate = order.pickup_date || this.getFutureDate(3);

      // Update order to ready-for-pickup status
      await query(
        `UPDATE ${this.tableName} SET status = 'ready-for-pickup', pickup_date = ? WHERE id = ?`,
        [pickupDate, orderId]
      );

      return {
        success: true,
        pickup_date: pickupDate,
        message: 'Order approved successfully'
      };
    } catch (error) {
      console.error('Error approving order:', error);
      return {
        success: false,
        error: 'Failed to approve order',
        status: 500
      };
    }
  }

  // Decline order
  async declineOrder(orderId, remarks = null) {
    try {
      console.log("=== DECLINE ORDER DEBUG ===");
      console.log("OrderID:", orderId);
      console.log("Remarks:", remarks || "NULL");

      if (!orderId) {
        return {
          success: false,
          error: 'Order ID is required',
          status: 400
        };
      }

      // Check if order exists
      const order = await queryOne(`SELECT id FROM ${this.tableName} WHERE id = ?`, [orderId]);

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          status: 404
        };
      }

      // Update order status and remarks
      if (remarks) {
        await query(
          `UPDATE ${this.tableName} SET status = 'declined', remarks = ? WHERE id = ?`,
          [remarks, orderId]
        );
      } else {
        await query(
          `UPDATE ${this.tableName} SET status = 'declined' WHERE id = ?`,
          [orderId]
        );
      }

      console.log("Order declined successfully");
      return {
        success: true,
        message: 'Order declined successfully'
      };
    } catch (error) {
      console.error('Error declining order:', error);
      return {
        success: false,
        error: 'Failed to decline order',
        status: 500
      };
    }
  }

  // Mark order as ready for pickup
  async markReadyForPickup(orderId) {
    try {
      if (!orderId) {
        return {
          success: false,
          error: 'Order ID is required',
          status: 400
        };
      }

      // Check if order exists
      const order = await queryOne(`SELECT id FROM ${this.tableName} WHERE id = ?`, [orderId]);

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          status: 404
        };
      }

      await query(
        `UPDATE ${this.tableName} SET status = 'ready-for-pickup' WHERE id = ?`,
        [orderId]
      );

      return {
        success: true,
        message: 'Order marked as ready for pickup'
      };
    } catch (error) {
      console.error('Error marking order ready for pickup:', error);
      return {
        success: false,
        error: 'Failed to mark order ready for pickup',
        status: 500
      };
    }
  }

  // Confirm pickup
  async confirmPickup(orderId, customerEmail, orNumber = null) {
    try {
      console.log("Confirm pickup request - OrderID:", orderId, "Customer:", customerEmail);
      console.log("OR Number:", orNumber || "NULL");

      if (!orderId || !customerEmail) {
        return {
          success: false,
          error: 'Order ID and customer email are required',
          status: 400
        };
      }

      // Verify order belongs to customer
      const order = await queryOne(
        `SELECT id, status FROM ${this.tableName} WHERE id = ? AND customer = ?`,
        [orderId, customerEmail]
      );

      if (!order) {
        return {
          success: false,
          error: 'Order not found or access denied',
          status: 404
        };
      }

      if (order.status !== 'ready-for-pickup') {
        return {
          success: false,
          error: 'Order is not ready for pickup',
          status: 400
        };
      }

      // Update order to completed
      if (orNumber) {
        await query(
          `UPDATE ${this.tableName} SET status = 'completed', or_number = ? WHERE id = ?`,
          [orNumber, orderId]
        );
      } else {
        await query(
          `UPDATE ${this.tableName} SET status = 'completed' WHERE id = ?`,
          [orderId]
        );
      }

      console.log(`Order ${orderId} status updated to completed with OR Number: ${orNumber || "NULL"}`);
      
      return {
        success: true,
        message: 'Order pickup confirmed successfully',
        or_number: orNumber
      };
    } catch (error) {
      console.error('Error confirming pickup:', error);
      return {
        success: false,
        error: 'Failed to confirm pickup',
        status: 500
      };
    }
  }

  // Update completion remarks
  async updateCompletionRemarks(orderId, remarks) {
    try {
      console.log("=== UPDATE COMPLETION REMARKS DEBUG ===");
      console.log("OrderID:", orderId);
      console.log("Remarks:", remarks);

      if (!orderId || !remarks) {
        return {
          success: false,
          error: 'Order ID and remarks are required',
          status: 400
        };
      }

      // Check if order exists and is completed
      const order = await queryOne(
        `SELECT status FROM ${this.tableName} WHERE id = ?`,
        [orderId]
      );

      if (!order) {
        console.log(`Order ${orderId} does not exist`);
        return {
          success: false,
          error: 'Order not found',
          status: 404
        };
      }

      if (order.status !== 'completed') {
        console.log(`Order ${orderId} is not completed, current status: ${order.status}`);
        return {
          success: false,
          error: 'Only completed orders can have completion remarks',
          status: 400
        };
      }

      // Update completion remarks
      await query(
        `UPDATE ${this.tableName} SET completion_remarks = ? WHERE id = ?`,
        [remarks, orderId]
      );

      console.log(`Order ${orderId} completion remarks updated successfully`);
      return {
        success: true,
        message: 'Completion remarks updated successfully'
      };
    } catch (error) {
      console.error(`Failed to update completion remarks for order ${orderId}:`, error);
      return {
        success: false,
        error: 'Failed to update completion remarks',
        status: 500
      };
    }
  }

  // Get order by ID
  async getOrderById(orderId) {
    try {
      if (!orderId) {
        return {
          success: false,
          error: 'Order ID is required',
          status: 400
        };
      }

      const order = await queryOne(
        `SELECT o.*, u.name as customer_name, u.cellphone as customer_cellphone 
         FROM ${this.tableName} o 
         LEFT JOIN users u ON o.customer = u.email 
         WHERE o.id = ?`,
        [orderId]
      );

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          status: 404
        };
      }

      return {
        success: true,
        order: order
      };
    } catch (error) {
      console.error('Error fetching order:', error);
      return {
        success: false,
        error: 'Failed to fetch order',
        status: 500
      };
    }
  }

  // Get orders by status
  async getOrdersByStatus(status) {
    try {
      const orders = await query(
        `SELECT o.*, u.name as customer_name, u.cellphone as customer_cellphone 
         FROM ${this.tableName} o 
         LEFT JOIN users u ON o.customer = u.email 
         WHERE o.status = ?
         ORDER BY o.created_at DESC`,
        [status]
      );

      return {
        success: true,
        orders: orders
      };
    } catch (error) {
      console.error('Error fetching orders by status:', error);
      return {
        success: false,
        error: 'Failed to fetch orders',
        status: 500
      };
    }
  }

  // Helper method to get future date
  getFutureDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  // Get order statistics
  async getOrderStats() {
    try {
      const stats = await queryOne(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_orders,
          SUM(CASE WHEN status = 'ready-for-pickup' THEN 1 ELSE 0 END) as ready_orders,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined_orders
        FROM ${this.tableName}
      `);

      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('Error fetching order stats:', error);
      return {
        success: false,
        error: 'Failed to fetch order statistics',
        status: 500
      };
    }
  }
}

module.exports = OrderService;