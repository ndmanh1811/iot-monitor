const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'iot_monitor',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  timezone: '+07:00'
});

// Kiểm tra kết nối cơ sở dữ liệu khi khởi động
async function testDbConnection() {
  try {
    const conn = await pool.getConnection();
    console.log(`✅ [MySQL] Kết nối thành công tới Database: ${process.env.DB_NAME || 'iot_monitor'} (Port: ${process.env.DB_PORT || 3306})`);
    conn.release();
    return true;
  } catch (err) {
    console.warn(`⚠️ [MySQL] Chưa thể kết nối MySQL: ${err.message}. Hãy đảm bảo MySQL trong XAMPP đang BẬT!`);
    return false;
  }
}

module.exports = {
  pool,
  testDbConnection
};
