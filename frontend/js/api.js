/**
 * IoT Monitor - API Service Module
 * Kết nối 100% trực tiếp tới Backend Server Node.js tại http://localhost:5000
 * KHÔNG sử dụng giả lập (Mock) nội bộ trên trình duyệt.
 * Chỉ khi server đang chạy (node server.js) thì Frontend mới nhận được dữ liệu.
 */

const API_CONFIG = {
  BASE_URL: localStorage.getItem('iot_api_base_url') || 'http://localhost:5000'
};

// Hàm gọi API trung tâm
async function apiFetch(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[API Error] Không thể kết nối tới máy chủ Backend: ${url}`, error);
    throw error;
  }
}

// =====================================================
// QUẢN LÝ TRẠNG THÁI KẾT NỐI RESTFUL API POLLING (CHU KỲ 2S)
// =====================================================

let isBackendConnected = true;

function updateApiStatusBadge(connected, text) {
  isBackendConnected = connected;
  const badge = document.getElementById('api-status-badge');
  if (badge) {
    if (connected) {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200';
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        <span>${text || 'REST API: Đồng bộ (2s)'}</span>
      `;
    } else {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200';
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-rose-500"></span>
        <span>${text || 'REST API: Mất kết nối'}</span>
      `;
    }
  }
}

function updateEspStatusBadge(online) {
  const espBadge = document.getElementById('esp-status-badge');
  if (espBadge) {
    if (online) {
      espBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200';
      espBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>ESP8266 Online (MQTT)</span>
      `;
    } else {
      espBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200';
      espBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-rose-500"></span>
        <span>ESP8266 Offline</span>
      `;
    }
  }
}

// =====================================================
// ĐỒNG BỘ THÔNG TIN NGƯỜI DÙNG Ở HEADER
// =====================================================

function applyHeaderUserInfo(u) {
  if (!u) return;
  const nameEl = document.getElementById('header-user-name');
  const emailEl = document.getElementById('header-user-email');
  const avatarImg = document.getElementById('header-user-avatar-img');
  if (nameEl && u.full_name) nameEl.textContent = u.full_name;
  if (emailEl && u.email) emailEl.textContent = u.email;
  const savedAvatar = localStorage.getItem('iot_user_avatar');
  if (avatarImg) {
    if (savedAvatar) {
      avatarImg.src = savedAvatar;
    } else if (u.avatar_url) {
      avatarImg.src = u.avatar_url;
    }
  }
}

async function syncHeaderUserInfo() {
  try {
    const cached = localStorage.getItem('iot_user_profile');
    if (cached) {
      applyHeaderUserInfo(JSON.parse(cached));
    }
    const res = await apiFetch('/api/v1/user/profile');
    if (res && res.status === 'success' && res.data) {
      localStorage.setItem('iot_user_profile', JSON.stringify(res.data));
      applyHeaderUserInfo(res.data);
    }
  } catch (e) {
    // Không làm gián đoạn trang nếu backend bận
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncHeaderUserInfo);
} else {
  syncHeaderUserInfo();
}

// =====================================================
// HIỆU ỨNG LOADING PHỦ MỜ TOÀN MÀN HÌNH CHỜ KẾT NỐI LẠI
// (Tối giản: Không hộp cửa sổ, không nút X, click vào màn hình để ẩn/hiện)
// =====================================================

let isOverlayHiddenByUser = false;

function showReconnectOverlay(title = 'Đang kết nối lại...') {
  if (isOverlayHiddenByUser) return;

  let overlay = document.getElementById('iot-reconnect-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'iot-reconnect-overlay';
    overlay.className = 'fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/25 backdrop-blur-md transition-all duration-300 opacity-0 pointer-events-none select-none cursor-pointer';
    overlay.innerHTML = `
      <div class="flex flex-col items-center justify-center pointer-events-none select-none">
        <!-- Vòng quay loading tròn mượt mà -->
        <div class="w-11 h-11 border-[3.5px] border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3 shadow-sm"></div>

        <!-- Dòng chữ duy nhất bên dưới -->
        <p class="text-sm font-semibold text-slate-800 tracking-tight drop-shadow-sm select-none" id="iot-reconnect-title">
          ${title}
        </p>
      </div>
    `;

    // Click vào bất kỳ đâu trên màn hình khi đang hiện overlay -> Tạm ẩn đi để xem giao diện
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      isOverlayHiddenByUser = true;
      overlay.classList.remove('opacity-100', 'pointer-events-auto');
      overlay.classList.add('opacity-0', 'pointer-events-none');
    });

    document.body.appendChild(overlay);
  }

  const titleEl = document.getElementById('iot-reconnect-title');
  if (titleEl) titleEl.textContent = title;

  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    overlay.classList.add('opacity-100', 'pointer-events-auto');
  });
}

function hideReconnectOverlay() {
  isOverlayHiddenByUser = false;
  const overlay = document.getElementById('iot-reconnect-overlay');
  if (overlay) {
    overlay.classList.remove('opacity-100', 'pointer-events-auto');
    overlay.classList.add('opacity-0', 'pointer-events-none');
  }
}

// Khi người dùng đã click ẩn và click vào bất kỳ vùng nào trên màn hình -> Hiển thị lại!
document.addEventListener('click', () => {
  if (isOverlayHiddenByUser) {
    const overlay = document.getElementById('iot-reconnect-overlay');
    if (overlay && typeof isDashboardCurrentlyOffline !== 'undefined' && isDashboardCurrentlyOffline) {
      isOverlayHiddenByUser = false;
      overlay.classList.remove('opacity-0', 'pointer-events-none');
      overlay.classList.add('opacity-100', 'pointer-events-auto');
    }
  }
});

