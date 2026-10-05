const path = require('path');
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

// 2. Phục vụ giao diện Frontend tĩnh trực tiếp từ Backend Port 5000
app.use(express.static(path.join(__dirname, '../frontend')));

// Điều hướng trang chủ (GET /) vào thẳng màn hình Tổng quan
app.get('/', (req, res) => {
  res.redirect('/tongquan.html');
});

// 3. Đăng ký nhánh API v1
app.use('/api/v1', apiRoutes);

// 4. Xử lý Route 404 và Error Handler tập trung
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
