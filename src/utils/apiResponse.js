function sendSuccess(res, data = null, message = 'Thành công', statusCode = 200) {
  const payload = {
    status: 'success',
    message
  };
  if (data !== null) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
}

function sendError(res, message = 'Đã có lỗi xảy ra', statusCode = 500, error = null) {
  const payload = {
    status: 'error',
    message
  };
  if (error && process.env.NODE_ENV === 'development') {
    payload.error = error.message || error;
  }
  return res.status(statusCode).json(payload);
}

module.exports = {
  sendSuccess,
  sendError
};
