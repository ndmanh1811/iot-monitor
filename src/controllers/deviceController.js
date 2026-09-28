const deviceService = require('../services/deviceService');
const { sendSuccess } = require('../utils/apiResponse');

async function getAllDevices(req, res, next) {
  try {
    const devices = await deviceService.getAllDevices();
    return sendSuccess(res, devices);
  } catch (err) {
    next(err);
  }
}

async function controlDevice(req, res, next) {
  try {
    const deviceId = req.params.id;
    const { action, operator } = req.body;
    const result = await deviceService.controlDevice(deviceId, action, operator);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllDevices,
  controlDevice
};
