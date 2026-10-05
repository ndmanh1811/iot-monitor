require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { testDbConnection } = require('./src/config/database');
const { initMqtt } = require('./src/config/mqtt');

const PORT = parseInt(process.env.PORT, 10) || 5000;

const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`[Server] Dang chay tai http://localhost:${PORT}`);
  console.log(`[Config] Database: MySQL (${process.env.DB_NAME || 'iot_monitor'}) | MQTT Port: ${process.env.MQTT_PORT || 6767}`);

  await testDbConnection();
  initMqtt();
});

// Xử lý dừng server an toàn (Graceful Shutdown)
function handleShutdown(signal) {
  console.log(`[Server] Nhan tin hieu ${signal}, dang dong server...`);
  server.close(() => {
    console.log('[Server] Da dung hoan tat.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
