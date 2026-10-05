const sensorService = require('../services/sensorService');
const { sendSuccess } = require('../utils/apiResponse');

async function getCurrentSensors(req, res, next) {
  try {
    const data = await sensorService.getCurrentSensors();
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

async function getAllSensorData(req, res, next) {
  try {
    const rows = await sensorService.getAllSensorData(req.query);
    // Format response giữ nguyên 100% để tương thích với frontend sensor-data.js
    return res.status(200).json({
      status: 'success',
      pagination: {
        page: 1,
        limit: 10,
        total_records: rows.length
      },
      data: rows
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentSensors,
  getAllSensorData
};
