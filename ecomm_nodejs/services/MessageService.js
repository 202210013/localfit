const { query, queryOne } = require('../config/database');

class MessageService {
  constructor() {
    this.tableName = 'messages';
  }

  // Get messages between two users
  async getMessagesBetween(user1, user2) {
    try {
      if (!user1 || !user2) {
        return {
          success: false,
          error: 'Both user1 and user2 are required',
          status: 400
        };
      }

      const messages = await query(
        `SELECT sender, recipient, content, timestamp 
         FROM ${this.tableName} 
         WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)
         ORDER BY id ASC`,
        [user1, user2, user2, user1]
      );

      return {
        success: true,
        messages: messages
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return {
        success: false,
        error: 'Failed to fetch messages',
        status: 500
      };
    }
  }

  // Save a new message
  async saveMessage(data) {
    try {
      const { sender, recipient, content } = data;

      if (!sender || !recipient || !content) {
        return {
          success: false,
          error: 'Missing required fields: sender, recipient, content',
          status: 400
        };
      }

      const result = await query(
        `INSERT INTO ${this.tableName} (sender, recipient, content, timestamp) 
         VALUES (?, ?, ?, NOW())`,
        [sender, recipient, content]
      );

      return {
        success: true,
        message: 'Message saved successfully',
        message_id: result.insertId
      };
    } catch (error) {
      console.error('Error saving message:', error);
      return {
        success: false,
        error: 'Failed to save message',
        status: 500
      };
    }
  }

  // Get unread messages count for a recipient
  async getUnreadMessages(recipient) {
    try {
      if (!recipient) {
        return {
          success: false,
          error: 'Recipient is required',
          status: 400
        };
      }

      const result = await queryOne(
        `SELECT COUNT(*) as count FROM ${this.tableName} 
         WHERE recipient = ? AND is_read = 0`,
        [recipient]
      );

      return {
        success: true,
        count: parseInt(result.count) || 0
      };
    } catch (error) {
      console.error('Error fetching unread messages:', error);
      
      // Handle case where is_read column might not exist
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        return {
          success: true,
          count: 0,
          message: 'Read status tracking not available'
        };
      }

      return {
        success: false,
        error: 'Failed to fetch unread messages',
        status: 500
      };
    }
  }

  // Mark messages as read
  async markMessagesAsRead(recipient, sender) {
    try {
      if (!recipient || !sender) {
        return {
          success: false,
          error: 'Both recipient and sender are required',
          status: 400
        };
      }

      await query(
        `UPDATE ${this.tableName} 
         SET is_read = 1 
         WHERE recipient = ? AND sender = ? AND is_read = 0`,
        [recipient, sender]
      );

      return {
        success: true,
        message: 'Messages marked as read'
      };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      
      // Handle case where is_read column might not exist
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        return {
          success: true,
          message: 'Read status tracking not available'
        };
      }

      return {
        success: false,
        error: 'Failed to mark messages as read',
        status: 500
      };
    }
  }

  // Get all conversations for a user
  async getUserConversations(userEmail) {
    try {
      if (!userEmail) {
        return {
          success: false,
          error: 'User email is required',
          status: 400
        };
      }

      const conversations = await query(
        `SELECT 
           CASE 
             WHEN sender = ? THEN recipient 
             ELSE sender 
           END as other_user,
           MAX(timestamp) as last_message_time,
           COUNT(*) as message_count,
           (SELECT content FROM ${this.tableName} m2 
            WHERE ((m2.sender = ? AND m2.recipient = other_user) OR 
                   (m2.sender = other_user AND m2.recipient = ?))
            ORDER BY m2.timestamp DESC LIMIT 1) as last_message
         FROM ${this.tableName} 
         WHERE sender = ? OR recipient = ?
         GROUP BY other_user
         ORDER BY last_message_time DESC`,
        [userEmail, userEmail, userEmail, userEmail, userEmail]
      );

      return {
        success: true,
        conversations: conversations
      };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return {
        success: false,
        error: 'Failed to fetch conversations',
        status: 500
      };
    }
  }

  // Delete a message
  async deleteMessage(messageId, userEmail) {
    try {
      if (!messageId || !userEmail) {
        return {
          success: false,
          error: 'Message ID and user email are required',
          status: 400
        };
      }

      // Check if message exists and user has permission to delete
      const message = await queryOne(
        `SELECT id FROM ${this.tableName} 
         WHERE id = ? AND (sender = ? OR recipient = ?)`,
        [messageId, userEmail, userEmail]
      );

      if (!message) {
        return {
          success: false,
          error: 'Message not found or access denied',
          status: 404
        };
      }

      await query(`DELETE FROM ${this.tableName} WHERE id = ?`, [messageId]);

      return {
        success: true,
        message: 'Message deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting message:', error);
      return {
        success: false,
        error: 'Failed to delete message',
        status: 500
      };
    }
  }

  // Search messages
  async searchMessages(userEmail, searchTerm) {
    try {
      if (!userEmail || !searchTerm) {
        return {
          success: false,
          error: 'User email and search term are required',
          status: 400
        };
      }

      const messages = await query(
        `SELECT sender, recipient, content, timestamp 
         FROM ${this.tableName} 
         WHERE (sender = ? OR recipient = ?) AND content LIKE ?
         ORDER BY timestamp DESC`,
        [userEmail, userEmail, `%${searchTerm}%`]
      );

      return {
        success: true,
        messages: messages
      };
    } catch (error) {
      console.error('Error searching messages:', error);
      return {
        success: false,
        error: 'Failed to search messages',
        status: 500
      };
    }
  }

  // Get message statistics
  async getMessageStats(userEmail) {
    try {
      if (!userEmail) {
        return {
          success: false,
          error: 'User email is required',
          status: 400
        };
      }

      const stats = await queryOne(
        `SELECT 
           COUNT(*) as total_messages,
           SUM(CASE WHEN sender = ? THEN 1 ELSE 0 END) as sent_messages,
           SUM(CASE WHEN recipient = ? THEN 1 ELSE 0 END) as received_messages,
           COUNT(DISTINCT CASE WHEN sender = ? THEN recipient ELSE sender END) as unique_conversations
         FROM ${this.tableName} 
         WHERE sender = ? OR recipient = ?`,
        [userEmail, userEmail, userEmail, userEmail, userEmail]
      );

      return {
        success: true,
        stats: {
          total_messages: parseInt(stats.total_messages) || 0,
          sent_messages: parseInt(stats.sent_messages) || 0,
          received_messages: parseInt(stats.received_messages) || 0,
          unique_conversations: parseInt(stats.unique_conversations) || 0
        }
      };
    } catch (error) {
      console.error('Error fetching message stats:', error);
      return {
        success: false,
        error: 'Failed to fetch message statistics',
        status: 500
      };
    }
  }
}

module.exports = MessageService;