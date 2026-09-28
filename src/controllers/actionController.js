const actionService = require('../services/actionService');

async function getActionHistory(req, res, next) {
  try {
    const rows = await actionService.getActionHistory(req.query);
    // Format response giữ nguyên 100% để tương thích với frontend history.js
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
  getActionHistory
};
