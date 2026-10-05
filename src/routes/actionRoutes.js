const express = require('express');
const router = express.Router();
const actionController = require('../controllers/actionController');

// GET /api/v1/actions/history: Lấy lịch sử điều khiển thiết bị (lọc, phân trang)
router.get('/history', actionController.getActionHistory);

module.exports = router;
