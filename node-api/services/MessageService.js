const BaseService = require("./BaseService");

class MessageService extends BaseService {
  constructor(db) {
    super(db);
  }

  normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  async getMessagesBetween(user1, user2) {
    const normalizedUser1 = this.normalizeEmail(user1);
    const normalizedUser2 = this.normalizeEmail(user2);

    const rows = await this.db.query(
      `SELECT sender, recipient, content, timestamp, is_read FROM messages
       WHERE (LOWER(sender) = ? AND LOWER(recipient) = ?) OR (LOWER(sender) = ? AND LOWER(recipient) = ?)
       ORDER BY id ASC`,
      [normalizedUser1, normalizedUser2, normalizedUser2, normalizedUser1]
    );
    return rows;
  }

  async saveMessage(data) {
    if (!data || !data.sender || !data.recipient || !data.content) {
      return { error: "Missing fields" };
    }

    await this.db.query("INSERT INTO messages (sender, recipient, content) VALUES (?, ?, ?)", [
      this.normalizeEmail(data.sender),
      this.normalizeEmail(data.recipient),
      data.content
    ]);

    return { success: true };
  }

  async getUnreadMessages(recipient) {
    const normalizedRecipient = this.normalizeEmail(recipient);

    const rows = await this.db.query(
      "SELECT COUNT(*) as count FROM messages WHERE LOWER(recipient) = ? AND is_read = 0",
      [normalizedRecipient]
    );
    return rows[0] || { count: 0 };
  }

  async markMessagesAsRead(sender, recipient) {
    const normalizedSender = this.normalizeEmail(sender);
    const normalizedRecipient = this.normalizeEmail(recipient);

    if (!normalizedSender || !normalizedRecipient) {
      return { error: "sender and recipient are required" };
    }

    const result = await this.db.query(
      "UPDATE messages SET is_read = 1 WHERE LOWER(sender) = ? AND LOWER(recipient) = ? AND is_read = 0",
      [normalizedSender, normalizedRecipient]
    );

    return {
      success: true,
      updated: Number((result && result.affectedRows) || 0)
    };
  }
}

module.exports = MessageService;
