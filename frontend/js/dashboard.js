/**
 * SENSOR REALTIME CHART - APEXCHARTS
 * Trục thời gian: Các mốc đứng yên tại chỗ, chỉ thay đổi số trực tiếp trên DOM
 * Cột Y bên trái: Nhiệt độ (°C) & Độ ẩm (%) (0 - 100)
 * Cột Y bên phải: Ánh sáng (Lux) (0 - 1000)
 * Chu kỳ làm mới: 2 giây/lần (2000ms)
 */

// =====================================================
// KHỞI TẠO DỮ LIỆU BAN ĐẦU (8 MỐC THỜI GIAN THỰC CÁCH NHAU 2S)
// =====================================================

const TOTAL_POINTS = 8;
let currentChartTime = Date.now();

function generateInitialData() {
  currentChartTime = Date.now();
  const categories = [];
  const temp = [];
  const humi = [];
  const lightArr = [];

  let cachedData = null;
  const cached = localStorage.getItem('iot_cached_chart');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.temp) && parsed.temp.length === TOTAL_POINTS) {
        cachedData = parsed;
      }
    } catch (e) {}
  }

  for (let i = TOTAL_POINTS - 1; i >= 0; i--) {
    const d = new Date(currentChartTime - i * 2000);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    categories.push(`${h}:${m}:${s}`);

    temp.push(cachedData ? cachedData.temp[TOTAL_POINTS - 1 - i] : 21.8);
    humi.push(cachedData ? cachedData.humi[TOTAL_POINTS - 1 - i] : 58.0);
    lightArr.push(cachedData ? cachedData.light[TOTAL_POINTS - 1 - i] : 800);
  }

  return { categories, temp, humi, light: lightArr };
}

const chartData = generateInitialData();

// =====================================================
// SENSOR REALTIME CHART - APEXCHARTS CONFIG
// =====================================================

const chartOptions = {
  chart: {
    type: 'line',
    height: 310,
    fontFamily: 'Inter, sans-serif',

    toolbar: {
      show: false
    },

    zoom: {
      enabled: false
    },

    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 800,
      dynamicAnimation: {
        enabled: false // TẮT dynamicAnimation để 8 mốc thời gian đứng yên tại chỗ, không trượt ngang
      }
    }
  },

  colors: [
    APP_COLORS.sensor.temperature.hex,
    APP_COLORS.sensor.humidity.hex,
    APP_COLORS.sensor.light.hex
  ],

  series: [
    {
      name: 'Nhiệt độ (°C)',
      data: chartData.temp
    },
    {
      name: 'Độ ẩm (%)',
      data: chartData.humi
    },
    {
      name: 'Ánh sáng (lux)',
      data: chartData.light
    }
  ],

  stroke: {
    curve: 'smooth',
    width: 3,
    lineCap: 'round'
  },

  markers: {
    size: [4, 4, 4],
    strokeWidth: 2,
    strokeColors: '#FFFFFF',
    showNullDataPoints: false,
    hover: {
      size: 7
    }
  },

  dataLabels: {
    enabled: false
  },

  legend: {
    position: 'top',
    horizontalAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'Inter, sans-serif'
  },

  // Tooltip: di chuột vào đường nào thì hiện giá trị của đường đó tại thời điểm đó
  tooltip: {
    shared: false,
    intersect: false,
    theme: 'dark',
    x: {
      show: true,
      formatter: function (val, { dataPointIndex }) {
        return (chartData.categories && chartData.categories[dataPointIndex]) || val;
      }
    },
    y: {
      formatter: function (val, { seriesIndex, w }) {
        if (val === null || val === undefined) return 'Chưa có dữ liệu (Offline)';
        const name = w.globals.seriesNames[seriesIndex] || '';
        if (name.includes('Nhiệt độ')) return val + ' °C';
        if (name.includes('Độ ẩm')) return val + ' %';
        return val + ' Lux';
      }
    }
  },

  // TRỤC THỜI GIAN: CÁC MỐC ĐỨNG YÊN TẠI CHỖ, CHỈ ĐỔI GIÁ TRỊ THỜI GIAN
  xaxis: {
    type: 'category',
    categories: chartData.categories,
    labels: {
      formatter: function (val) {
        return val;
      },
      style: {
        colors: APP_COLORS.chart.text,
        fontSize: '11px',
        fontWeight: 500
      }
    },
    title: {
      text: undefined
    },
    axisBorder: { show: false },
    axisTicks: { show: true }
  },

  // ĐÚNG FORM: CỘT BÊN TRÁI LÀ GIÁ TRỊ NHIỆT ĐỘ, CỘT BÊN PHẢI LÀ GIÁ TRỊ ÁNH SÁNG
  yaxis: [
    {
      seriesName: 'Nhiệt độ (°C)',
      title: {
        text: 'Nhiệt độ (°C) & Độ ẩm (%)',
        style: {
          color: APP_COLORS.sensor.temperature.hex,
          fontSize: '12px',
          fontWeight: 600
        }
      },
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        style: {
          colors: APP_COLORS.sensor.temperature.hex,
          fontSize: '11px',
          fontWeight: 500
        },
        formatter: (val) => (val != null ? Math.round(val) : '')
      }
    },
    {
      seriesName: 'Độ ẩm (%)', // ĐÚNG TÊN SERIES để tránh lỗi xung đột cấu hình
      show: false, // Dùng chung thang đo 0-100 với cột trái
      min: 0,
      max: 100,
      tickAmount: 5
    },
    {
      opposite: true, // CỘT BÊN PHẢI: Ánh sáng (lux)
      seriesName: 'Ánh sáng (lux)',
      title: {
        text: 'Ánh sáng (Lux)',
        style: {
          color: APP_COLORS.sensor.light.hex,
          fontSize: '12px',
          fontWeight: 600
        }
      },
      min: 0,
      max: 1500,
      tickAmount: 5,
      labels: {
        style: {
          colors: APP_COLORS.sensor.light.hex,
          fontSize: '11px',
          fontWeight: 500
        },
        formatter: (val) => (val != null ? Math.round(val) : '')
      }
    }
  ],

  grid: {
    strokeDashArray: 4,
    borderColor: APP_COLORS.chart.grid
  }
};

// =====================================================
// KHỞI TẠO CHART
// =====================================================

let sensorChart = null;

function initChart() {
  const chartEl = document.querySelector('#sensorChart');
  if (!chartEl) return;

  sensorChart = new ApexCharts(chartEl, chartOptions);
  sensorChart.render();
}

// Hàm cập nhật chuỗi thời gian thực trực tiếp tại 8 điểm cố định trên trục hoành (chỉ nhảy số)
function updateAxisTextDirectly() {
  const container = document.querySelector('#sensorChart');
  if (!container) return;

  const textElements = container.querySelectorAll('.apexcharts-xaxis-texts-g text');
  if (textElements && textElements.length > 0) {
    chartData.categories.forEach((timeStr, idx) => {
      const el = textElements[idx];
      if (el) {
        const titleEl = el.querySelector('title');
        if (titleEl) titleEl.textContent = timeStr;

        const tspan = el.querySelector('tspan');
        if (tspan) {
          tspan.textContent = timeStr;
        } else {
          el.textContent = timeStr;
        }
      }
    });
  }
}

// =====================================================
// HÀM CẬP NHẬT DỮ LIỆU SENSOR & MỐC THỜI GIAN THEO REALTIME (2S / LẦN)
// =====================================================

// Cập nhật 3 Card giá trị cảm biến trên đầu và thanh tiến trình
function updateCards(tempVal, humiVal, lightVal) {
  const tempEl = document.getElementById('temp-val');
  const humiEl = document.getElementById('humi-val');
  const lightEl = document.getElementById('light-val');
  const tempBar = document.getElementById('temp-bar');
  const humiBar = document.getElementById('humi-bar');
  const lightBar = document.getElementById('light-bar');

  // Cập nhật giá trị hiển thị
  if (tempEl) tempEl.textContent = (tempVal === '--' || tempVal == null) ? '--' : tempVal;
  if (humiEl) humiEl.textContent = (humiVal === '--' || humiVal == null) ? '--' : humiVal;
  if (lightEl) lightEl.textContent = (lightVal === '--' || lightVal == null) ? '--' : lightVal;

  // Cập nhật độ rộng thanh tiến trình (Progress Bar)
  if (tempBar) {
    if (tempVal === '--' || tempVal == null || isNaN(parseFloat(tempVal))) {
      tempBar.style.width = '0%';
    } else {
      const v = parseFloat(tempVal);
      // Dải đo nhiệt độ phòng: 0 - 50°C
      const pct = Math.min(100, Math.max(0, (v / 50) * 100));
      tempBar.style.width = `${pct}%`;
    }
  }

  if (humiBar) {
    if (humiVal === '--' || humiVal == null || isNaN(parseFloat(humiVal))) {
      humiBar.style.width = '0%';
    } else {
      const v = parseFloat(humiVal);
      // Dải đo độ ẩm: 0 - 100%
      const pct = Math.min(100, Math.max(0, v));
      humiBar.style.width = `${pct}%`;
    }
  }

  if (lightBar) {
    if (lightVal === '--' || lightVal == null || isNaN(parseFloat(lightVal))) {
      lightBar.style.width = '0%';
    } else {
      const v = parseFloat(lightVal);
      // Dải đo độ sáng: 0 - 1000 Lux
      const pct = Math.min(100, Math.max(0, (v / 1000) * 100));
      lightBar.style.width = `${pct}%`;
    }
  }
}

let wasRecentlyOffline = false;
let offlineDetectedAt = 0;

function updateSensorChart(tempVal, humiVal, lightVal, serverTimestamp = null) {
  // Nếu vừa phục hồi từ trạng thái mất kết nối (Offline):
  if (wasRecentlyOffline) {
    wasRecentlyOffline = false;
    const offlineDurationMs = Math.max(
      lastSensorDataTime ? (Date.now() - lastSensorDataTime) : 0,
      offlineDetectedAt ? (Date.now() - offlineDetectedAt) : 0
    );

    if (offlineDurationMs > 8000) {
      // Trường hợp 1: Ngắt kết nối quá 8 giây (ví dụ ngắt ở 26:02 đến 26:33)
      // Tái tạo lại chuỗi 8 mốc thời gian kết thúc tại thời điểm hiện tại
      // Các mốc trước đó ĐỂ TRỐNG (null) - Tuyệt đối không chèn số ảo!
      currentChartTime = Date.now();
      const categories = [];
      for (let i = TOTAL_POINTS - 1; i >= 0; i--) {
        const d = new Date(currentChartTime - i * 2000);
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        const s = d.getSeconds().toString().padStart(2, '0');
        categories.push(`${h}:${m}:${s}`);
      }
      chartData.categories = categories;

      // 7 mốc trước đó hoàn toàn để trống (null), chỉ mốc thứ 8 có dữ liệu thật vừa nhận
      chartData.temp = [null, null, null, null, null, null, null, tempVal];
      chartData.humi = [null, null, null, null, null, null, null, humiVal];
      chartData.light = [null, null, null, null, null, null, null, lightVal];

      if (sensorChart) {
        sensorChart.updateOptions({
          xaxis: { categories: [...chartData.categories] }
        }, false, false);
        sensorChart.updateSeries([
          { name: 'Nhiệt độ (°C)', data: [...chartData.temp] },
          { name: 'Độ ẩm (%)', data: [...chartData.humi] },
          { name: 'Ánh sáng (lux)', data: [...chartData.light] }
        ], true);
      }
      updateAxisTextDirectly();
      updateCards(tempVal, humiVal, lightVal);
      try {
        localStorage.setItem('iot_cached_chart', JSON.stringify(chartData));
      } catch (e) {}
      return;
    } else {
      // Trường hợp 2: Ngắt kết nối <= 8 giây (ví dụ ngắt ở 26:02 và 26:10 kết nối lại)
      // Bỏ qua các khoảng thời gian bị thiếu (04, 06, 08), không sinh mốc ảo và không chèn số ảo
      // Nối tiếp điểm đo mới vào cuối biểu đồ và đẩy lùi mốc cũ nhất ra
      currentChartTime = Date.now();
      const d = new Date(currentChartTime);
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

      chartData.categories.push(timeStr);
      chartData.categories.shift();

      chartData.temp.push(tempVal);
      chartData.temp.shift();

      chartData.humi.push(humiVal);
      chartData.humi.shift();

      chartData.light.push(lightVal);
      chartData.light.shift();

      if (sensorChart) {
        sensorChart.updateOptions({
          xaxis: { categories: [...chartData.categories] }
        }, false, false);
        sensorChart.updateSeries([
          { name: 'Nhiệt độ (°C)', data: [...chartData.temp] },
          { name: 'Độ ẩm (%)', data: [...chartData.humi] },
          { name: 'Ánh sáng (lux)', data: [...chartData.light] }
        ], true);
      }
      updateAxisTextDirectly();
      updateCards(tempVal, humiVal, lightVal);
      try {
        localStorage.setItem('iot_cached_chart', JSON.stringify(chartData));
      } catch (e) {}
      return;
    }
  }

  // Luôn tịnh tiến đều đặn đúng +2000ms (2 giây) để loại bỏ hoàn toàn đứt đoạn
  if (Date.now() - currentChartTime > 15000) {
    currentChartTime = Date.now();
  } else {
    currentChartTime += 2000;
  }

  let d = new Date(currentChartTime);
  let timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

  // Đảm bảo không bao giờ trùng với điểm ngay trước đó
  if (chartData.categories.length > 0 && timeStr === chartData.categories[chartData.categories.length - 1]) {
    currentChartTime += 2000;
    d = new Date(currentChartTime);
    timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  }

  // 1. Cập nhật mảng mốc thời gian thực: đẩy thời gian mới vào, bỏ thời gian cũ nhất
  chartData.categories.push(timeStr);
  chartData.categories.shift();

  // 2. Cập nhật mảng số liệu để biểu đồ uốn lượn liên tục
  chartData.temp.push(tempVal);
  chartData.temp.shift();

  chartData.humi.push(humiVal);
  chartData.humi.shift();

  chartData.light.push(lightVal);
  chartData.light.shift();

  // 3. Cập nhật đường sóng uốn lượn mượt mà (chỉ morph độ cao, không trượt ngang)
  if (sensorChart) {
    sensorChart.updateSeries([
      { name: 'Nhiệt độ (°C)', data: [...chartData.temp] },
      { name: 'Độ ẩm (%)', data: [...chartData.humi] },
      { name: 'Ánh sáng (lux)', data: [...chartData.light] }
    ], true);
  }

  // 4. Nhảy số thời gian thực trực tiếp tại 8 điểm cố định trên trục hoành
  updateAxisTextDirectly();

  // 5. Cập nhật số liệu hiển thị trên 3 Card phía trên
  updateCards(tempVal, humiVal, lightVal);

  // 6. Lưu cache biểu đồ để khi tải lại trang hoặc chuyển tab không bị giật số liệu
  try {
    localStorage.setItem('iot_cached_chart', JSON.stringify(chartData));
  } catch (e) {}
}

// =====================================================
// LẤY DỮ LIỆU CẢM BIẾN REALTIME TỪ SERVER (2 GIÂY / LẦN)
// =====================================================

async function fetchRealtimeSensors(isInitial = false) {
  try {
    const res = await apiFetch('/api/v1/sensors/current');
    if (res.status === 'success' && res.data) {
      if (res.data.is_online === false) {
        setDashboardOfflineState();
        return;
      }

      lastSensorDataTime = Date.now();
      setDashboardOnlineState();

      const t = res.data.temperature.value;
      const h = res.data.humidity.value;
      const l = res.data.light.value;

      if (isInitial) {
        // Lần đầu tải trang: Cập nhật 3 thẻ số liệu
        updateCards(t, h, l);

        // Nạp toàn bộ các mốc đo thực tế gần nhất từ CSDL MySQL vào biểu đồ (khử đứt đoạn)
        if (Array.isArray(res.data.chart_points) && res.data.chart_points.length >= 2) {
          const rawPoints = res.data.chart_points;
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
          if (cleanPoints.length < TOTAL_POINTS && cleanPoints.length > 0) {
            const firstPt = cleanPoints[0];
            const needed = TOTAL_POINTS - cleanPoints.length;
            const padded = [];
            const [ph, pm, ps] = firstPt.time_label.split(':').map(Number);
            const baseDt = new Date();
            baseDt.setHours(ph, pm, ps, 0);

            for (let k = needed; k >= 1; k--) {
              const dPrev = new Date(baseDt.getTime() - k * 2000);
              padded.push({
                time_label: `${dPrev.getHours().toString().padStart(2, '0')}:${dPrev.getMinutes().toString().padStart(2, '0')}:${dPrev.getSeconds().toString().padStart(2, '0')}`,
                temp: null,
                humi: null,
                light: null
              });
            }
            cleanPoints = [...padded, ...cleanPoints];
          }

          chartData.categories = cleanPoints.map(p => p.time_label);
          chartData.temp = cleanPoints.map(p => p.temp);
          chartData.humi = cleanPoints.map(p => p.humi);
          chartData.light = cleanPoints.map(p => p.light);

          if (cleanPoints.length > 0) {
            const lastPt = cleanPoints[cleanPoints.length - 1];
            const [lh, lm, ls] = lastPt.time_label.split(':').map(Number);
            const lastDt = new Date();
            lastDt.setHours(lh, lm, ls, 0);
            currentChartTime = lastDt.getTime();
          }

          if (sensorChart) {
            sensorChart.updateOptions({
              xaxis: { categories: [...chartData.categories] }
            }, false, false);

            sensorChart.updateSeries([
              { name: 'Nhiệt độ (°C)', data: [...chartData.temp] },
              { name: 'Độ ẩm (%)', data: [...chartData.humi] },
              { name: 'Ánh sáng (lux)', data: [...chartData.light] }
            ], true);
          }
          try {
            localStorage.setItem('iot_cached_chart', JSON.stringify(chartData));
          } catch (e) {}
        }
      } else {
        // Chu kỳ Polling 2s tiếp theo: Đẩy điểm mới nhất vào biểu đồ và cập nhật thẻ số liệu
        if (t !== null && h !== null && l !== null) {
          updateSensorChart(t, h, l);
        }
      }
    }
  } catch (err) {
    if (isInitial) {
      setDashboardOfflineState();
    }
  }
}

// =====================================================
// XỬ LÝ TRẠNG THÁI MẤT KẾT NỐI (OFFLINE STATE)
// =====================================================

let isDashboardCurrentlyOffline = false;
let offlineGraceTimer = null;
const OFFLINE_GRACE_PERIOD_MS = 3000; // 3 giây: Độ trễ phát hiện mất kết nối REST API
let lastSensorDataTime = Date.now();
const SENSOR_WATCHDOG_TIMEOUT_MS = 4500; // 4.5 giây: Quá 2 chu kỳ đo không có dữ liệu mới

function setDashboardOfflineState() {
  wasRecentlyOffline = true;
  if (!isDashboardCurrentlyOffline) {
    offlineDetectedAt = Date.now();
  }
  if (isDashboardCurrentlyOffline) return;
  isDashboardCurrentlyOffline = true;

  // 1. Các ô số liệu cảm biến hiển thị --
  updateCards('--', '--', '--');

  // 2. Nút toggle thiết bị bị làm mờ và vô hiệu hóa
  const container = document.getElementById('devices-control-container');
  if (container) {
    container.classList.add('opacity-50');
  }

  [1, 2, 3].forEach(id => {
    const toggleTrack = document.getElementById(`toggle-track-${id}`);
    const btn = toggleTrack ? toggleTrack.closest('button') : null;
    const badge = document.getElementById(`status-badge-${id}`);
    if (btn) {
      btn.disabled = true;
      btn.classList.add('cursor-not-allowed', 'pointer-events-none');
    }
    if (badge) {
      badge.className = 'inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200';
      badge.textContent = 'Mất kết nối';
    }
  });

  // 3. Cập nhật badge ESP8266 ở Header
  const espBadge = document.getElementById('esp-status-badge');
  if (espBadge) {
    espBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200';
    espBadge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-rose-500"></span>
      <span>ESP8266 Offline (MQTT)</span>
    `;
  }

  // 4. Làm mờ biểu đồ cảm biến khi mất kết nối
  const chartEl = document.getElementById('sensorChart');
  if (chartEl) {
    chartEl.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
    chartEl.style.filter = 'blur(2px)';
    chartEl.style.opacity = '0.4';
    chartEl.style.pointerEvents = 'none';
  }
  const filterSelect = document.getElementById('chart-filter-select');
  if (filterSelect) filterSelect.disabled = true;

  // 5. Hiển thị hiệu ứng loading phủ mờ toàn màn hình chờ kết nối lại
  if (typeof showReconnectOverlay === 'function') {
    showReconnectOverlay('Đang kết nối lại...');
  }
}

function setDashboardOnlineState() {
  if (!isDashboardCurrentlyOffline) return;
  isDashboardCurrentlyOffline = false;

  // 0. Tự động ẩn lớp phủ mờ khi đã kết nối lại thành công
  if (typeof hideReconnectOverlay === 'function') {
    hideReconnectOverlay();
  }

  // 1. Khôi phục các nút toggle (gỡ làm mờ và cho phép tương tác)
  const container = document.getElementById('devices-control-container');
  if (container) {
    container.classList.remove('opacity-50');
  }

  [1, 2, 3].forEach(id => {
    const toggleTrack = document.getElementById(`toggle-track-${id}`);
    const btn = toggleTrack ? toggleTrack.closest('button') : null;
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('cursor-not-allowed', 'pointer-events-none');
    }
  });

  // 2. Khôi phục badge ESP8266 ở Header
  const espBadge = document.getElementById('esp-status-badge');
  if (espBadge) {
    espBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200';
    espBadge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      <span>ESP8266 Online (MQTT)</span>
    `;
  }

  // 3. Khôi phục độ sắc nét và tương tác cho biểu đồ cảm biến
  const chartEl = document.getElementById('sensorChart');
  if (chartEl) {
    chartEl.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
    chartEl.style.filter = 'none';
    chartEl.style.opacity = '1';
    chartEl.style.pointerEvents = 'auto';
  }
  const filterSelect = document.getElementById('chart-filter-select');
  if (filterSelect) filterSelect.disabled = false;

  // 4. Đồng bộ lại trạng thái 3 thiết bị từ máy chủ
  syncDevicesFromServer(false);
}

// Cập nhật giao diện trạng thái thiết bị
function applyDeviceStateUI(devId, status, withAnimation = true) {
  const statusBadge = document.getElementById(`status-badge-${devId}`);
  const toggleTrack = document.getElementById(`toggle-track-${devId}`);
  const btnElement = toggleTrack ? toggleTrack.closest('button') : null;

  if (toggleTrack && !withAnimation) {
    toggleTrack.classList.add('no-switch-anim');
  }

  if (status === 'ON') {
    if (statusBadge) {
      statusBadge.className = `inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${APP_COLORS.status.success.badge}`;
      statusBadge.textContent = 'Đang BẬT (ON)';
    }
    if (toggleTrack) {
      toggleTrack.className = withAnimation ? 'switch-track on' : 'switch-track on no-switch-anim';
    }
  } else {
    if (statusBadge) {
      statusBadge.className = `inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${APP_COLORS.status.off.badge}`;
      statusBadge.textContent = 'Đang TẮT (OFF)';
    }
    if (toggleTrack) {
      toggleTrack.className = withAnimation ? 'switch-track off' : 'switch-track off no-switch-anim';
    }
  }

  if (btnElement) {
    btnElement.setAttribute('onclick', `toggleDevice(${devId}, '${status}', this)`);
  }

  if (toggleTrack && !withAnimation) {
    setTimeout(() => {
      toggleTrack.classList.remove('no-switch-anim');
    }, 60);
  }
}

// Đồng bộ trạng thái 3 thiết bị từ server khi mở trang
async function syncDevicesFromServer(withAnimation = false) {
  try {
    const res = await apiFetch('/api/v1/devices');
    if (res.status === 'success' && Array.isArray(res.data)) {
      const cachedStates = {};
      res.data.forEach(dev => {
        cachedStates[dev.id] = dev.status;
        applyDeviceStateUI(dev.id, dev.status, withAnimation);
      });
      try {
        localStorage.setItem('iot_devices_state', JSON.stringify(cachedStates));
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Chưa kết nối được server để lấy danh sách thiết bị');
  } finally {
    setTimeout(() => {
      document.body.classList.remove('preload-switches');
    }, 120);
  }
}

// =====================================================
// XỬ LÝ ĐIỀU KHIỂN THIẾT BỊ (PENDING -> SUCCESS / FAILED)
// =====================================================

async function toggleDevice(deviceId, currentStatus, btnElement) {
  const newAction = currentStatus === 'ON' ? 'OFF' : 'ON';
  const statusBadge = document.getElementById(`status-badge-${deviceId}`);
  const toggleTrack = document.getElementById(`toggle-track-${deviceId}`);

  btnElement.disabled = true;
  if (toggleTrack) toggleTrack.className = 'switch-track pending';
  if (statusBadge) {
    statusBadge.className = `inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${APP_COLORS.status.pending.badge}`;
    statusBadge.textContent = 'Đang gửi lệnh (PENDING)...';
  }

  try {
    const res = await apiFetch(`/api/v1/devices/${deviceId}/control`, {
      method: 'POST',
      body: JSON.stringify({ action: newAction, operator: 'Nguyễn Đức Mạnh' })
    });

    if (res.status === 'success') {
      // Cơ chế RESTful Polling: Thăm dò trạng thái thiết bị sau khi nhận ACK từ phần cứng
      let pollCount = 0;
      const maxPolls = 10; // Tối đa 5 giây (mỗi 500ms một lần)
      const pollTimer = setInterval(async () => {
        pollCount++;
        try {
          const devRes = await apiFetch('/api/v1/devices');
          if (devRes.status === 'success' && Array.isArray(devRes.data)) {
            const dev = devRes.data.find(d => d.id === parseInt(deviceId, 10));
            if (dev && dev.status === newAction) {
              clearInterval(pollTimer);
              btnElement.disabled = false;
              applyDeviceStateUI(deviceId, newAction, true);
              try {
                const cached = JSON.parse(localStorage.getItem('iot_devices_state') || '{}');
                cached[deviceId] = newAction;
                localStorage.setItem('iot_devices_state', JSON.stringify(cached));
              } catch (e) {}
              return;
            }
          }
        } catch (e) {}

        if (pollCount >= maxPolls) {
          clearInterval(pollTimer);
          btnElement.disabled = false;
          applyDeviceStateUI(deviceId, currentStatus, true);
          if (statusBadge) {
            statusBadge.className = `inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${APP_COLORS.status.failed.badge}`;
            statusBadge.textContent = 'Hết hạn phản hồi (FAILED)';
          }
          alert(`Thiết bị ${deviceId} không phản hồi trong 5 giây! Lệnh bị hủy.`);
        }
      }, 500);
    } else {
      throw new Error(res.message);
    }
  } catch (err) {
    btnElement.disabled = false;
    applyDeviceStateUI(deviceId, currentStatus, true);
    if (statusBadge) {
      statusBadge.className = `inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${APP_COLORS.status.failed.badge}`;
      statusBadge.textContent = 'Lỗi kết nối (FAILED)';
    }
    alert(`Không thể điều khiển thiết bị ${deviceId}! Vui lòng thử lại.`);
  }
}

// Khởi chạy khi DOM sẵn sàng (100% Pure RESTful HTTP Polling)
document.addEventListener('DOMContentLoaded', () => {
  // 1. Đồng bộ tức thì từ cache để triệt tiêu hoàn toàn hiện tượng nháy công tắc khi load lại trang
  try {
    const cached = localStorage.getItem('iot_devices_state');
    if (cached) {
      const states = JSON.parse(cached);
      Object.keys(states).forEach(id => {
        applyDeviceStateUI(id, states[id], false);
      });
    }
  } catch (e) {}

  initChart();
  fetchRealtimeSensors(true); // Lần đầu: nạp 8 điểm dữ liệu từ MySQL vào biểu đồ
  syncDevicesFromServer(false); // Không chạy animation khi nạp trang lần đầu

  // 2. VÒNG LẶP POLLING RESTFUL ĐỊNH KỲ 2 GIÂY/LẦN (ĐỒNG BỘ CHU KỲ PHẦN CỨNG 2S)
  setInterval(() => {
    fetchRealtimeSensors(false);
  }, 2000);

  // 3. Watchdog kiểm tra dữ liệu cảm biến (quá 5 giây không có dữ liệu -> báo Mất kết nối)
  setInterval(() => {
    if (Date.now() - lastSensorDataTime > SENSOR_WATCHDOG_TIMEOUT_MS) {
      setDashboardOfflineState();
    }
  }, 1000);

  // 4. Đồng bộ trạng thái thiết bị định kỳ mỗi 5 giây
  setInterval(() => {
    if (!isDashboardCurrentlyOffline) {
      syncDevicesFromServer(true);
    }
  }, 5000);

  const filterSelect = document.getElementById('chart-filter-select');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      const type = e.target.value;
      if (!sensorChart) return;
      if (type === 'all') {
        sensorChart.showSeries('Nhiệt độ (°C)');
        sensorChart.showSeries('Độ ẩm (%)');
        sensorChart.showSeries('Ánh sáng (lux)');
      } else if (type === 'temperature') {
        sensorChart.showSeries('Nhiệt độ (°C)');
        sensorChart.hideSeries('Độ ẩm (%)');
        sensorChart.hideSeries('Ánh sáng (lux)');
      } else if (type === 'humidity') {
        sensorChart.hideSeries('Nhiệt độ (°C)');
        sensorChart.showSeries('Độ ẩm (%)');
        sensorChart.hideSeries('Ánh sáng (lux)');
      } else if (type === 'light') {
        sensorChart.hideSeries('Nhiệt độ (°C)');
        sensorChart.hideSeries('Độ ẩm (%)');
        sensorChart.showSeries('Ánh sáng (lux)');
      }
    });
  }

  // Khi chuyển tab rồi quay lại: đồng bộ ngay 8 điểm chuẩn từ máy chủ để tránh bị lệch thời gian do trình duyệt ngủ đông
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (!isDashboardCurrentlyOffline) {
        fetchRealtimeSensors(true);
        syncDevicesFromServer(false);
      }
    }
  });
});
