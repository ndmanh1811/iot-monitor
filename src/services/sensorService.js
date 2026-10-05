const { pool } = require('../config/database');
const { isEspOnline, currentSensors, getMqttStatus } = require('../config/mqtt');

const TOTAL_CHART_POINTS = 8;

async function getCurrentSensors() {
  const espOnline = isEspOnline();
  const mqttStatus = getMqttStatus();
  const now = new Date();

  let chartPoints = [];
  if (pool) {
    try {
      const sqlChart = `
        SELECT 
          DATE_FORMAT(recorded_at, '%H:%i:%s') as time_label,
          ROUND(MAX(CASE WHEN sensor_type = 'temperature' THEN value END), 1) as temp,
          ROUND(MAX(CASE WHEN sensor_type = 'humidity' THEN value END), 1) as humi,
          ROUND(MAX(CASE WHEN sensor_type = 'light' THEN value END)) as light
        FROM dataSensors
        GROUP BY recorded_at
        ORDER BY recorded_at DESC
        LIMIT ?
      `;
      const [cRows] = await pool.query(sqlChart, [TOTAL_CHART_POINTS]);
      if (Array.isArray(cRows) && cRows.length > 0) {
        const rawPoints = cRows.reverse();

        // Khử đứt đoạn: Kiểm tra xem có khoảng hở > 8s do từng tắt máy không
        let splitIdx = 0;
        for (let i = rawPoints.length - 1; i > 0; i--) {
          const t2 = new Date(`1970-01-01T${rawPoints[i].time_label}Z`).getTime();
          const t1 = new Date(`1970-01-01T${rawPoints[i - 1].time_label}Z`).getTime();
          if (t2 - t1 > 8000 || t2 - t1 < 0) {
            splitIdx = i;
            break;
          }
        }

        let cleanPoints = rawPoints.slice(splitIdx);
        if (cleanPoints.length < TOTAL_CHART_POINTS && cleanPoints.length > 0) {
          const firstPt = cleanPoints[0];
          const needed = TOTAL_CHART_POINTS - cleanPoints.length;
          const padded = [];
          const [ph, pm, ps] = firstPt.time_label.split(':').map(Number);
          const baseDt = new Date();
          baseDt.setHours(ph, pm, ps, 0);

          for (let k = needed; k >= 1; k--) {
            const dPrev = new Date(baseDt.getTime() - k * 2000);
            const padH = String(dPrev.getHours()).padStart(2, '0');
            const padM = String(dPrev.getMinutes()).padStart(2, '0');
            const padS = String(dPrev.getSeconds()).padStart(2, '0');
            padded.push({
              time_label: `${padH}:${padM}:${padS}`,
              temp: null,
              humi: null,
              light: null
            });
          }
          cleanPoints = [...padded, ...cleanPoints];
        }

        chartPoints = cleanPoints;
      }
    } catch (e) {
      console.warn('⚠️ [SensorService] Lỗi truy vấn điểm chart:', e.message);
    }
  }

  return {
    is_online: espOnline,
    mqtt_connected: mqttStatus.mqtt_connected,
    temperature: { value: espOnline ? currentSensors.temperature : null, unit: '°C' },
    humidity: { value: espOnline ? currentSensors.humidity : null, unit: '%' },
    light: { value: espOnline ? currentSensors.light : null, unit: 'Lux' },
    updated_at: now.toLocaleTimeString('vi-VN'),
    chart_points: chartPoints
  };
}

async function getAllSensorData(filters = {}) {
  let sql = `
    SELECT id, id as stt, sensor_code as sensor_id, sensor_name, sensor_type, value, unit,
           DATE_FORMAT(recorded_at, '%Y/%m/%d %H:%i:%s') as recorded_at
    FROM dataSensors
    WHERE 1=1
  `;
  const params = [];

  if (filters.sensor_type) {
    sql += ' AND sensor_type = ?';
    params.push(filters.sensor_type);
  }

  if (filters.search) {
    sql += ' AND (sensor_code LIKE ? OR sensor_name LIKE ? OR value LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY recorded_at DESC, id DESC';

  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = {
  getCurrentSensors,
  getAllSensorData
};
