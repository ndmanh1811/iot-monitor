require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { testDbConnection } = require('./src/config/database');
const { initMqtt } = require('./src/config/mqtt');

const PORT = parseInt(process.env.PORT, 10) || 5000;

// 1. Khởi tạo HTTP Server từ Express App (RESTful API)
const server = http.createServer(app);

// 2. Khởi động Server lắng nghe trên PORT
server.listen(PORT, async () => {
  console.log(`🚀 IoT Central Server (Enterprise Backend) đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 Chế độ: MySQL (${process.env.DB_NAME || 'iot_monitor'}) + MQTT Local (Port: ${process.env.MQTT_PORT || 6767}) + RESTful API Polling (Chu kỳ 2s)`);
  console.log(`👨‍💻 Tác giả: Nguyễn Đức Mạnh - B23DCCN532 - Lớp B23CNPM06`);

  // Kiểm tra kết nối cơ sở dữ liệu MySQL
  await testDbConnection();

  // Khởi động MQTT Client kết nối tới Mosquitto Broker
  initMqtt();
});

// Xử lý tắt server an toàn (Graceful Shutdown)
process.on('SIGTERM', () => {
  console.log('🛑 Nhận tín hiệu SIGTERM, đang dừng server an toàn...');
  server.close(() => {
    console.log('✅ Server đã dừng hoàn tất.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Nhận tín hiệu SIGINT (Ctrl+C), đang dừng server...');
  server.close(() => {
    console.log('✅ Server đã dừng hoàn tất.');
    process.exit(0);
  });
});
