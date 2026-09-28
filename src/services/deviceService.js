const { pool } = require('../config/database');
const { publishMessage } = require('../config/mqtt');
const { broadcastWs } = require('../config/websocket');
const { formatDateTime } = require('../utils/timeUtils');

async function getAllDevices() {
  const [rows] = await pool.query(
    'SELECT id, device_code as code, name, type, current_state as status, is_online FROM devices ORDER BY id ASC'
  );
  return rows.map(r => ({
    ...r,
    is_online: Boolean(r.is_online)
  }));
}

async function controlDevice(deviceId, action, operator = 'Nguyễn Đức Mạnh') {
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

  // 1. Ghi nhận trạng thái PENDING vào bảng action trong MySQL
  await pool.query(
    `INSERT INTO action (request_id, device_id, device_code, device_name, device_type, action, status, operator_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
    [requestId, dev.id, dev.device_code, dev.name, dev.type, action, operator, now]
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

  // 4. Phát sự kiện DEVICE_ACTION qua WebSocket tới các trang đang mở
  const formattedActTime = formatDateTime(now);
  broadcastWs('DEVICE_ACTION', {
    id: Date.now(),
    stt: Date.now(),
    device_id: dev.device_code,
    device_name: dev.name,
    device_type: dev.type,
    operator: operator,
    action: action,
    status: 'SUCCESS',
    created_at: formattedActTime,
    request_id: requestId
  });

  return {
    action_id: requestId,
    device_id: devId,
    action: action,
    state: 'SUCCESS',
    message: `Thiết bị ${dev.name} đã được chuyển sang trạng thái ${action}`
  };
}

module.exports = {
  getAllDevices,
  controlDevice
};
