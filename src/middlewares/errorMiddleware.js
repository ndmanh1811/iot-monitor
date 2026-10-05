const { sendError } = require('../utils/apiResponse');

function errorHandler(err, req, res, next) {
  console.error(` [Server Error] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Lỗi máy chủ nội bộ (Internal Server Error)';

  return sendError(res, message, statusCode, err);
}

function notFoundHandler(req, res, next) {
  return sendError(res, `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = {
  errorHandler,
  notFoundHandler
};
