/**
 * BẢNG MÀU QUẢN LÝ TẬP TRUNG (CENTRALIZED COLOR SYSTEM)
 * File này là nơi duy nhất định nghĩa toàn bộ mã màu cho hệ thống IoT Monitor.
 * Mọi trang giao diện, biểu đồ, bảng dữ liệu, nhãn badge và trạng thái thiết bị 
 * đều lấy màu từ file này.
 * Khi cần thay đổi giao diện hoặc đổi màu cảm biến, CHỈ CẦN SỬA TẠI ĐÂY.
 */

const APP_COLORS = {
  // 1. MÀU CẢM BIẾN (Dùng cho Biểu đồ ApexCharts, Thẻ Card và Bảng dữ liệu)
  sensor: {
    temperature: {
      hex: '#EF4444',        // Màu đỏ nhiệt độ
      badge: 'bg-rose-50 text-rose-600 border-rose-100',
      label: 'Nhiệt độ (°C)'
    },
    humidity: {
      hex: '#3B82F6',        // Màu xanh dương độ ẩm
      badge: 'bg-blue-50 text-blue-600 border-blue-100',
      label: 'Độ ẩm (%)'
    },
    light: {
      hex: '#F59E0B',        // Màu vàng cam ánh sáng
      badge: 'bg-amber-50 text-amber-600 border-amber-100',
      label: 'Ánh sáng (lux)'
    }
  },

  // 2. MÀU TRẠNG THÁI THIẾT BỊ VÀ PHẢN HỒI (FSM & Device History)
  status: {
    success: {
      hex: '#10B981',        // Màu xanh lá - Thành công / Đang bật (ON)
      badge: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      text: 'text-emerald-600'
    },
    pending: {
      hex: '#F59E0B',        // Màu vàng cam - Đang xử lý (PENDING)
      badge: 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse',
      text: 'text-amber-600'
    },
    failed: {
      hex: '#EF4444',        // Màu đỏ - Thất bại / Lỗi kết nối (FAILED)
      badge: 'bg-rose-50 text-rose-600 border-rose-200',
      text: 'text-rose-600'
    },
    off: {
      hex: '#64748B',        // Màu xám - Đang tắt (OFF)
      badge: 'bg-slate-100 text-slate-600 border-slate-200',
      text: 'text-slate-500'
    }
  },

  // 3. MÀU BIỂU ĐỒ APEXCHARTS (Trục tọa độ, nhãn chữ, lưới kẻ)
  chart: {
    text: '#64748B',         // Màu chữ số trên trục X và trục Y
    grid: '#F1F5F9',         // Màu đường lưới ngang dọc
    background: '#FFFFFF'
  },

  // 4. MÀU TƯƠNG TÁC GIAO DIỆN (Sắp xếp cột, Phân trang, Toast)
  ui: {
    primary: '#2563EB',      // Màu xanh chủ đạo của hệ thống
    sortActive: 'text-xs text-blue-600 font-bold select-none',
    sortInactive: 'text-xs text-slate-400 font-normal select-none',
    pageActive: 'bg-blue-600 text-white',
    pageInactive: 'border border-slate-200 text-slate-700 hover:bg-slate-100',
    toastSuccess: 'bg-emerald-600',
    toastError: 'bg-rose-600'
  },

  // =====================================================
  // CÁC HÀM TIỆN ÍCH LẤY MÀU CHUNG (HELPER FUNCTIONS)
  // =====================================================

  // Lấy class badge màu cho cảm biến
  getSensorBadge(type) {
    if (type === 'temperature') return this.sensor.temperature.badge;
    if (type === 'humidity') return this.sensor.humidity.badge;
    return this.sensor.light.badge;
  },

  // Lấy class badge màu cho trạng thái thiết bị
  getStatusBadge(status) {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS' || s === 'ON') return this.status.success.badge;
    if (s === 'FAILED') return this.status.failed.badge;
    if (s === 'PENDING') return this.status.pending.badge;
    return this.status.off.badge;
  }
};

// Tự động đẩy các mã màu vào CSS Variables (:root) để các thẻ CSS tùy chỉnh có thể dùng trực tiếp
(function syncCssVariables() {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--color-sensor-temp', APP_COLORS.sensor.temperature.hex);
    root.style.setProperty('--color-sensor-humi', APP_COLORS.sensor.humidity.hex);
    root.style.setProperty('--color-sensor-light', APP_COLORS.sensor.light.hex);
    root.style.setProperty('--color-status-success', APP_COLORS.status.success.hex);
    root.style.setProperty('--color-status-pending', APP_COLORS.status.pending.hex);
    root.style.setProperty('--color-status-failed', APP_COLORS.status.failed.hex);
    root.style.setProperty('--color-primary', APP_COLORS.ui.primary);
  }
})();
