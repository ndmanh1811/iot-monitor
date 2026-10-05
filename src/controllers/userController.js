const userService = require('../services/userService');
const { sendSuccess } = require('../utils/apiResponse');

async function getUserProfile(req, res, next) {
  try {
    const profile = await userService.getUserProfile(1);
    return sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
}

async function updateUserProfile(req, res, next) {
  try {
    const updatedProfile = await userService.updateUserProfile(1, req.body);
    return sendSuccess(res, updatedProfile, 'Cập nhật hồ sơ cá nhân thành công');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile
};
