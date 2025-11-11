const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration - Fixed MySQL2 invalid options
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'e-comm',
  charset: 'utf8mb4',
  timezone: '+00:00',
  // Valid MySQL2 pool options only
  connectionLimit: 10,
  queueLimit: 0,
  ssl: false,
  multipleStatements: false,
  dateStrings: true,
  // Remove invalid options: acquireTimeout, timeout, reconnect
  supportBigNumbers: true,
  bigNumberStrings: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection function
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    console.log(`📍 Connected to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

// Get connection from pool
async function getConnection() {
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('Error getting database connection:', error);
    throw error;
  }
}

// Execute query with automatic connection management
async function query(sql, params = []) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Execute query and return first row
async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Begin transaction
async function beginTransaction() {
  const connection = await getConnection();
  await connection.beginTransaction();
  return connection;
}

// Commit transaction
async function commitTransaction(connection) {
  await connection.commit();
  connection.release();
}

// Rollback transaction
async function rollbackTransaction(connection) {
  await connection.rollback();
  connection.release();
}

// Close all connections (for graceful shutdown)
async function closePool() {
  await pool.end();
  console.log('📴 Database connection pool closed');
}

// Export the pool and utility functions
module.exports = {
  pool,
  query,
  queryOne,
  getConnection,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  testConnection,
  closePool
};

// Test connection on module load
testConnection().catch(error => {
  console.error('Initial database connection test failed:', error.message);
});