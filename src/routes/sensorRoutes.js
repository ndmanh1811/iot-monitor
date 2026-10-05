const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

// GET /api/v1/sensors/current: Lấy cảm biến realtime và 8 mốc đo cho biểu đồ
router.get('/current', sensorController.getCurrentSensors);

// GET /api/v1/sensors/data: Lấy danh sách dữ liệu cảm biến (lọc, phân trang)
router.get('/data', sensorController.getAllSensorData);

module.exports = router;
