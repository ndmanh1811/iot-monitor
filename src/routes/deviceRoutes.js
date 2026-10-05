const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// GET /api/v1/devices: Lấy danh sách 3 thiết bị ngoại vi và trạng thái hiện tại
router.get('/', deviceController.getAllDevices);

// POST /api/v1/devices/:id/control: Gửi lệnh bật/tắt thiết bị (kèm bắn MQTT tới ESP8266)
router.post('/:id/control', deviceController.controlDevice);

module.exports = router;
