const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/v1/user/profile: Lấy thông tin hồ sơ cá nhân sinh viên
router.get('/profile', userController.getUserProfile);

// PUT /api/v1/user/profile: Cập nhật thông tin hồ sơ cá nhân và các liên kết
router.put('/profile', userController.updateUserProfile);

module.exports = router;
