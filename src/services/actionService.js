const { pool } = require('../config/database');

async function getActionHistory(filters = {}) {
  let sql = `
    SELECT id, id as stt, device_code as device_id, device_name, device_type,
           operator_name as operator, action, status,
           DATE_FORMAT(created_at, '%Y/%m/%d %H:%i:%s') as created_at
    FROM action
    WHERE 1=1
  `;
  const params = [];

  if (filters.status) {
    sql += ' AND LOWER(status) = LOWER(?)';
    params.push(filters.status);
  }

  if (filters.action) {
    sql += ' AND LOWER(action) = LOWER(?)';
    params.push(filters.action);
  }

  if (filters.device_name) {
    sql += ' AND LOWER(device_type) = LOWER(?)';
    params.push(filters.device_name);
  }

  sql += ' ORDER BY created_at DESC, id DESC';

  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = {
  getActionHistory
};
