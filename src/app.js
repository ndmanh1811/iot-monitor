const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');

const app = express();

// 1. Cấu hình Middlewares chung
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// 2. Trang chủ giới thiệu Backend API (GET /)
app.get('/', (req, res) => {
  const mqttHost = process.env.MQTT_HOST || 'localhost';
  const mqttPort = process.env.MQTT_PORT || 6767;

  res.status(200).json({
    status: 'success',
    message: '🚀 IoT Central Backend Server (Enterprise Layered Architecture) đang hoạt động!',
    author: 'Nguyễn Đức Mạnh - B23DCCN532 - Lớp B23CNPM06',
    architecture: 'Express.js + MySQL Pool + Mosquitto MQTT + RESTful HTTP Polling (Chu kỳ 2s)',
    database: `MySQL (${process.env.DB_NAME || 'iot_monitor'})`,
    mqtt_broker: `mqtt://${mqttHost}:${mqttPort}`,
    available_endpoints: [
      'GET  /api/v1/sensors/current',
      'GET  /api/v1/sensors/data',
      'GET  /api/v1/devices',
      'POST /api/v1/devices/:id/control',
      'GET  /api/v1/actions/history',
      'GET  /api/v1/user/profile',
      'PUT  /api/v1/user/profile'
    ]
  });
});

// 3. Đăng ký nhánh API v1
app.use('/api/v1', apiRoutes);

// 4. Xử lý Route 404 và Error Handler tập trung
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
