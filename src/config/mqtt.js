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

      // Đăng ký toàn bộ topic
      mqttClient.subscribe('#', (err) => {
        if (!err) {
          console.log('📡 [MQTT] Đã đăng ký lắng nghe toàn bộ topic (#)');
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
        console.log(`📡 [MQTT Inbound] Topic: ${topic} | Payload: ${raw}`);
        const data = parseMqttJson(raw);
        if (!data || typeof data !== 'object') {
          console.warn('⚠️ [MQTT] Gói tin không thể parse JSON:', raw);
          return;
        }

        // 1. Xử lý bản tin phản hồi (ACK) từ ESP8266 khi nhận lệnh điều khiển
        if (topic === 'iot/devices/response' || topic === 'device_response') {
          console.log(`📥 [MQTT ➔ Server] ESP8266 phản hồi ACK: Request ${data.request_id} | Status: ${data.status} | Pin: ${data.pin} | State: ${data.state}`);
          const ackStatus = data.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';

          if (data.request_id && pool) {
            try {
              await pool.query('UPDATE action SET status = ? WHERE request_id = ?', [ackStatus, data.request_id]);
              if (data.device_id && data.status === 'SUCCESS' && (data.state === 'ON' || data.state === 'OFF')) {
                await pool.query('UPDATE devices SET current_state = ? WHERE id = ?', [data.state, data.device_id]);
              }
            } catch (dbErr) {
              console.error('❌ [Database] Lỗi cập nhật ACK:', dbErr.message);
            }
          }
          return;
        }

        if (topic === 'iot/devices/control' || topic === 'device_control') {
          return; // Bỏ qua topic phát lệnh
        }

        // 2. Xử lý bản tin dữ liệu đo từ cảm biến (topic: iot/sensors/data hoặc tương tự)
        let temp = data.temperature ?? data.temp;
        let humi = data.humidity ?? data.humi;
        let light = data.light ?? data.lux;

        if (Array.isArray(data.readings)) {
          data.readings.forEach(r => {
            const st = (r.sensor_type || '').toUpperCase();
            if (st === 'TEMP' || st === 'TEMPERATURE') temp = r.value;
            if (st === 'HUMI' || st === 'HUMIDITY') humi = r.value;
            if (st === 'LIGHT' || st === 'LUX') light = r.value;
          });
        }

        if (temp === undefined && humi === undefined && light === undefined) {
          return;
        }

        // Lưu đúng mốc thời gian thực tế tự nhiên lúc nhận tin (hoặc timestamp của thiết bị nếu có)
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

        console.log(`📥 [MQTT ➔ MySQL] Nhận từ ESP8266: Nhiệt độ ${temp}°C | Độ ẩm ${humi}% | Ánh sáng ${light} Lux ➔ Đã lưu thành công vào MySQL!`);
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
