const { pool } = require('../config/database');
const { publishMessage } = require('../config/mqtt');

async function getAllDevices() {
  const [rows] = await pool.query(
    'SELECT id, device_code as code, name, type, current_state as status, is_online FROM devices ORDER BY id ASC'
  );
  return rows.map(r => ({
    ...r,
    is_online: Boolean(r.is_online)
  }));
}

async function controlDevice(deviceId, action, operator = 'Nguyễn Đức Mạnh', userId = 1) {
  const devId = parseInt(deviceId, 10);
  const [devRows] = await pool.query('SELECT * FROM devices WHERE id = ?', [devId]);
  const dev = devRows[0];

  if (!dev) {
    const error = new Error('Không tìm thấy thiết bị ngoại vi này');
    error.statusCode = 404;
    throw error;
  }

  const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date();
  const uId = userId || 1;

  // 1. Ghi nhận trạng thái PENDING vào bảng action trong MySQL (kèm user_id)
  await pool.query(
    `INSERT INTO action (request_id, user_id, device_id, device_code, device_name, device_type, action, status, operator_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
    [requestId, uId, dev.id, dev.device_code, dev.name, dev.type, action, operator, now]
  );

  // 2. Xác định chân GPIO tương ứng trên phần cứng ESP8266
  let pinNum = 5;
  if (dev.id === 1) pinNum = 5;       // Đèn LED (D1 / GPIO 5)
  else if (dev.id === 2) pinNum = 12; // Quạt thông gió (D6 / GPIO 12)
  else if (dev.id === 3) pinNum = 13; // Máy điều hòa (D7 / GPIO 13)
  else {
    const m = String(dev.pin).match(/\d+/);
    pinNum = m ? parseInt(m[0], 10) : 5;
  }

  // 3. Đóng gói lệnh và gửi qua MQTT tới ESP8266 với QoS 1
  const controlPayload = {
    device_id: dev.id,
    device_code: dev.device_code,
    pin: pinNum,
    action: action,
    request_id: requestId,
    timestamp: now.toISOString()
  };

  try {
    await publishMessage('iot/devices/control', controlPayload, 1);
    console.log(`📤 [MQTT ➔ ESP8266] Bắn lệnh điều khiển: Topic iot/devices/control ➔ ${dev.name} (Pin ${pinNum}, ${action})`);
  } catch (err) {
    console.warn('⚠️ [MQTT] Không thể gửi lệnh tới Broker:', err.message);
  }

  // 4. Cơ chế chống kẹt lệnh (Action Timeout): Nếu sau 5 giây không nhận được ACK từ phần cứng -> Ghi nhận FAILED
  setTimeout(async () => {
    try {
      const [pendingRows] = await pool.query(
        "SELECT id, status FROM action WHERE request_id = ? AND status = 'PENDING'",
        [requestId]
      );
      if (pendingRows.length > 0) {
        await pool.query("UPDATE action SET status = 'FAILED' WHERE request_id = ?", [requestId]);
        console.warn(`⏰ [Action Timeout] Request ${requestId} hết hạn 5s không nhận được ACK từ phần cứng -> Đã ghi nhận FAILED`);
      }
    } catch (e) {
      console.error('❌ [Action Timeout Error]:', e.message);
    }
  }, 5000);

  return {
    action_id: requestId,
    device_id: devId,
    action: action,
    status: 'PENDING',
    message: `Đang gửi lệnh ${action} tới thiết bị ${dev.name}...`
  };
}

module.exports = {
  getAllDevices,
  controlDevice
};
