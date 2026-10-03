const mqtt = require('mqtt');
const { pool } = require('./database');
const { formatDateTime, pad } = require('../utils/timeUtils');

let mqttClient = null;
let isMqttBrokerConnected = false;
let lastMqttReceived = 0;

// Bộ nhớ đệm lưu giá trị cảm biến thời gian thực mới nhất
const currentSensors = {
  temperature: 21.4,
  humidity: 55.0,
  light: 800
};

function isEspOnline() {
  return isMqttBrokerConnected && lastMqttReceived > 0 && (Date.now() - lastMqttReceived < 4500);
}

function getMqttStatus() {
  return {
    mqtt_connected: isMqttBrokerConnected,
    esp_online: isEspOnline(),
    current_sensors: { ...currentSensors },
    last_received: lastMqttReceived
  };
}

function initMqtt() {
  const host = process.env.MQTT_HOST || 'localhost';
  const port = parseInt(process.env.MQTT_PORT, 10) || 6767;
  const username = process.env.MQTT_USER || 'nguyenducmanh';
  const password = process.env.MQTT_PASSWORD || 'B23DCCN532';
  const clientId = `iot_backend_${Math.random().toString(16).substring(2, 8)}`;

  try {
    mqttClient = mqtt.connect(`mqtt://${host}:${port}`, {
      username,
      password,
      clientId,
      connectTimeout: 5000,
      reconnectPeriod: 3000
    });

    mqttClient.on('connect', () => {
      isMqttBrokerConnected = true;
      console.log(`✅ [MQTT] Đã kết nối Broker thành công tại: mqtt://${host}:${port} (User: ${username})`);

      // Đăng ký lắng nghe toàn bộ topic (#) bao gồm: sensor_data, device_control, device_response
      mqttClient.subscribe('#', (err) => {
        if (!err) {
          console.log('📡 [MQTT] Đã đăng ký lắng nghe 3 topic chính: "sensor_data", "device_control", "device_response" (Pattern: #)');
        }
      });
    });

    mqttClient.on('close', () => {
      if (isMqttBrokerConnected) {
        isMqttBrokerConnected = false;
        console.warn('⚠️ [MQTT] Mất kết nối tới Broker!');
      }
    });

    mqttClient.on('offline', () => {
      if (isMqttBrokerConnected) {
        isMqttBrokerConnected = false;
        console.warn('⚠️ [MQTT] Broker offline!');
      }
    });

    mqttClient.on('error', (err) => {
      isMqttBrokerConnected = false;
      console.warn(`⚠️ [MQTT] Broker port ${port}: ${err.message}`);
    });

function parseMqttJson(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    try {
      let normalized = raw.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      normalized = normalized.replace(/:\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*([,}])/g, (match, val, ending) => {
        if (['true', 'false', 'null'].includes(val.toLowerCase())) {
          return `:${val.toLowerCase()}${ending}`;
        }
        return `:"${val}"${ending}`;
      });
      normalized = normalized.replace(/'/g, '"');
      return JSON.parse(normalized);
    } catch (e2) {
      return null;
    }
  }
}

    // Lắng nghe và xử lý toàn bộ bản tin nhận từ Broker
    mqttClient.on('message', async (topic, message) => {
      try {
        const raw = message.toString();
        console.log(`📡 [MQTT Inbound] Topic: "${topic}" | Payload: ${raw}`);
        const data = parseMqttJson(raw);
        if (!data || typeof data !== 'object') {
          console.warn('⚠️ [MQTT] Gói tin không thể parse JSON:', raw);
          return;
        }

        // 1. TOPIC: device_control - Bỏ qua bản tin lệnh phát đi (do Backend phát ra)
        if (topic === 'device_control' || topic.startsWith('device_control/') || topic === 'iot/devices/control') {
          return;
        }

        // 2. TOPIC: device_response - Xử lý phản hồi trạng thái từ phần cứng ESP8266 / CMD
        if (topic === 'device_response' || topic.startsWith('device_response/') || topic === 'iot/devices/response') {
          console.log(`📥 [MQTT ➔ Server] Nhận phản hồi tại topic "${topic}":`, data);

          // Trường hợp 2A: Payload chứa các trường led1, led2, led3 theo định dạng của thầy
          const ledMap = [
            { key: 'led1', id: 1, code: '#LED-01', name: 'Đèn LED', type: 'led' },
            { key: 'led2', id: 2, code: '#AC-01', name: 'Điều hòa', type: 'ac' },
            { key: 'led3', id: 3, code: '#FAN-01', name: 'Quạt', type: 'fan' }
          ];

          let matchedLed = false;
          for (const item of ledMap) {
            if (data[item.key] !== undefined) {
              matchedLed = true;
              const val = String(data[item.key]).toUpperCase();
              const state = (val === 'ON' || val === '1' || val === 'TRUE') ? 'ON' : 'OFF';

              if (pool) {
                // Cập nhật trạng thái thiết bị trong MySQL
                await pool.query('UPDATE devices SET current_state = ?, updated_at = NOW() WHERE id = ?', [state, item.id]);

                // Chốt lệnh PENDING gần nhất nếu có
                const [pending] = await pool.query(
                  "SELECT id, request_id FROM action WHERE device_id = ? AND status = 'PENDING' ORDER BY id DESC LIMIT 1",
                  [item.id]
                );

                if (pending.length > 0) {
                  await pool.query("UPDATE action SET status = 'SUCCESS' WHERE id = ?", [pending[0].id]);
                  console.log(`✅ [MQTT ➔ MySQL] Chốt lệnh ${pending[0].request_id} thành công cho ${item.name} ➔ Trạng thái: ${state}`);
                } else {
                  // Phản hồi từ nút bấm vật lý trên mạch hoặc test trực tiếp bằng CMD
                  const hwReqId = `HW_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                  await pool.query(
                    `INSERT INTO action (request_id, device_id, device_code, device_name, device_type, action, status, operator_name, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, 'SUCCESS', 'Phần cứng ESP8266/CMD', NOW())`,
                    [hwReqId, item.id, item.code, item.name, item.type, state]
                  );
                  console.log(`✅ [MQTT ➔ MySQL] Ghi nhận trạng thái phần cứng trực tiếp: ${item.name} ➔ ${state}`);
                }
              }
            }
          }

          // Trường hợp 2B: Payload chứa request_id (phản hồi ACK theo chuẩn Server)
          if (!matchedLed && data.request_id && pool) {
            const ackStatus = (data.status === 'SUCCESS' || data.status === 'OK' || data.state) ? 'SUCCESS' : 'FAILED';
            try {
              await pool.query('UPDATE action SET status = ? WHERE request_id = ?', [ackStatus, data.request_id]);
              if (data.device_id && ackStatus === 'SUCCESS' && (data.state === 'ON' || data.state === 'OFF')) {
                await pool.query('UPDATE devices SET current_state = ? WHERE id = ?', [data.state, data.device_id]);
              }
              console.log(`✅ [MQTT ➔ MySQL] Phản hồi ACK cho Request ${data.request_id} ➔ ${ackStatus}`);
            } catch (dbErr) {
              console.error('❌ [Database] Lỗi cập nhật ACK:', dbErr.message);
            }
          }

          // Trường hợp 2C: Payload chứa device_id và state trực tiếp
          if (!matchedLed && !data.request_id && data.device_id && pool) {
            const state = String(data.state || data.action || data.status || '').toUpperCase();
            if (state === 'ON' || state === 'OFF') {
              await pool.query('UPDATE devices SET current_state = ? WHERE id = ?', [state, data.device_id]);
            }
          }
          return;
        }

        // 3. TOPIC: sensor_data (hoặc sensor_data/+ như sensor_data/room_101, iot/sensors/data)
        // Xử lý bản tin dữ liệu đo từ cảm biến
        let temp = data.temp ?? data.temperature;
        let humi = data.humi ?? data.huni ?? data.humidity; // hỗ trợ cả 'huni' theo định dạng đề bài của thầy
        let light = data.light ?? data.lux ?? data.anh_sang;

        if (Array.isArray(data.readings)) {
          data.readings.forEach(r => {
            const st = (r.sensor_type || '').toUpperCase();
            if (st === 'TEMP' || st === 'TEMPERATURE') temp = r.value;
            if (st === 'HUMI' || st === 'HUMIDITY' || st === 'HUNI') humi = r.value;
            if (st === 'LIGHT' || st === 'LUX') light = r.value;
          });
        }

        if (temp === undefined && humi === undefined && light === undefined) {
          return;
        }

        const now = (data.timestamp && !isNaN(new Date(data.timestamp).getTime())) 
          ? new Date(data.timestamp) 
          : new Date();
        lastMqttReceived = Date.now();

        if (temp !== undefined) currentSensors.temperature = parseFloat(temp);
        if (humi !== undefined) currentSensors.humidity = parseFloat(humi);
        if (light !== undefined) currentSensors.light = Math.round(parseFloat(light));

        const formattedTime = formatDateTime(now);
        const newRecords = [];

        if (pool) {
          if (temp !== undefined) {
            const [resTemp] = await pool.query(
              `INSERT INTO dataSensors (device_id, sensor_id, sensor_code, sensor_name, sensor_type, value, unit, recorded_at)
               VALUES (1, 1, '#TEMP-01', 'Nhiệt độ', 'temperature', ?, '°C', ?)`,
              [temp, now]
            );
            newRecords.push({
              id: resTemp.insertId,
              stt: resTemp.insertId,
              sensor_id: '#TEMP-01',
              sensor_name: 'Nhiệt độ',
              sensor_type: 'temperature',
              value: parseFloat(temp),
              unit: '°C',
              recorded_at: formattedTime
            });
          }

          if (humi !== undefined) {
            const [resHumi] = await pool.query(
              `INSERT INTO dataSensors (device_id, sensor_id, sensor_code, sensor_name, sensor_type, value, unit, recorded_at)
               VALUES (1, 2, '#HUMI-01', 'Độ ẩm', 'humidity', ?, '%', ?)`,
              [humi, now]
            );
            newRecords.push({
              id: resHumi.insertId,
              stt: resHumi.insertId,
              sensor_id: '#HUMI-01',
              sensor_name: 'Độ ẩm',
              sensor_type: 'humidity',
              value: parseFloat(humi),
              unit: '%',
              recorded_at: formattedTime
            });
          }

          if (light !== undefined) {
            const [resLight] = await pool.query(
              `INSERT INTO dataSensors (device_id, sensor_id, sensor_code, sensor_name, sensor_type, value, unit, recorded_at)
               VALUES (1, 3, '#LIGHT-01', 'Ánh sáng', 'light', ?, 'lux', ?)`,
              [light, now]
            );
            newRecords.push({
              id: resLight.insertId,
              stt: resLight.insertId,
              sensor_id: '#LIGHT-01',
              sensor_name: 'Ánh sáng',
              sensor_type: 'light',
              value: Math.round(parseFloat(light)),
              unit: 'lux',
              recorded_at: formattedTime
            });
          }
        }

        console.log(`📥 [MQTT ➔ MySQL] Topic: "${topic}" | Nhiệt độ ${temp}°C | Độ ẩm ${humi}% | Ánh sáng ${light} Lux ➔ Đã lưu thành công vào MySQL!`);
      } catch (err) {
        console.error('❌ [MQTT] Lỗi xử lý bản tin cảm biến:', err.message);
      }
    });
  } catch (e) {
    console.error('❌ [MQTT] Lỗi khởi tạo MQTT Client:', e.message);
  }

  return mqttClient;
}

function publishMessage(topic, payload, qos = 1) {
  return new Promise((resolve, reject) => {
    if (!mqttClient || !isMqttBrokerConnected) {
      return reject(new Error('MQTT Broker chưa sẵn sàng kết nối'));
    }
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    mqttClient.publish(topic, message, { qos }, (err) => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

module.exports = {
  initMqtt,
  getMqttStatus,
  isEspOnline,
  currentSensors,
  publishMessage
};
