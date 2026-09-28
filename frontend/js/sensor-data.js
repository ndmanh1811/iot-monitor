/**
 * Sensor Data Table Logic - Filters, Mathematical Comparison, Flexible Date Prefix, Sort & Pagination
 */

let allSensorRecords = [];
let filteredRecords = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentSort = { column: null, order: null }; // null: ban đầu chưa sắp xếp

// Hàm cập nhật mũi tên hiển thị trạng thái sắp xếp đơn cột (3 trạng thái: ↓, ↑, ↕)
function updateSortIcons() {
  const iconMap = {
    'id': document.getElementById('sort-icon-id'),
    'sensor_id': document.getElementById('sort-icon-sensor_id'),
    'value': document.getElementById('sort-icon-value'),
    'recorded_at': document.getElementById('sort-icon-recorded_at')
  };

  for (const [col, el] of Object.entries(iconMap)) {
    if (!el) continue;
    if (currentSort.column === col && currentSort.order) {
      el.textContent = currentSort.order === 'asc' ? '↑' : '↓';
      el.className = APP_COLORS.ui.sortActive;
    } else {
      el.textContent = '↕';
      el.className = APP_COLORS.ui.sortInactive;
    }
  }
}

// Hàm render bảng dữ liệu
function renderSensorTable() {
  const tbody = document.getElementById('sensor-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageData = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">Không tìm thấy bản ghi nào phù hợp với bộ lọc!</td></tr>`;
    document.getElementById('total-records-count').textContent = '0';
    return;
  }

  pageData.forEach((row) => {
    const badgeClass = APP_COLORS.getSensorBadge(row.sensor_type);

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/70 transition-colors';
    tr.innerHTML = `
      <td class="py-2 px-6 text-center text-slate-800 text-xs font-mono font-semibold">${row.id}</td>
      <td class="py-2 px-6 font-mono text-slate-700 text-xs font-semibold">${row.sensor_id}</td>
      <td class="py-2 px-6">
        <span class="inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${badgeClass} border">
          ${row.sensor_name}
        </span>
      </td>
      <td class="py-2 px-6 font-mono-val font-semibold text-slate-900">${row.value} ${row.unit}</td>
      <td class="py-2 px-6 font-mono-val text-slate-600 text-xs">${row.recorded_at}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('total-records-count').textContent = filteredRecords.length.toLocaleString();
  renderPagination();
}

// Đổi nhãn & gợi ý nhập theo tiêu chí lọc
function handleFilterTypeChange() {
  const filterTypeEl = document.getElementById('filter-type');
  const labelEl = document.getElementById('filter-val-label');
  const inputEl = document.getElementById('filter-input-val');
  if (!filterTypeEl || !inputEl) return;

  const type = filterTypeEl.value;
  if (type === 'time') {
    if (labelEl) labelEl.textContent = 'Thời gian cần tìm';
    inputEl.placeholder = 'Nhập ngày giờ (VD: 2025/05/20, 20/05/2025, 10:00, 09:55)';
  } else if (type === 'temperature') {
    if (labelEl) labelEl.textContent = 'Số liệu Nhiệt độ (°C)';
    inputEl.placeholder = 'Nhập nhiệt độ (VD: 30, > 28) hoặc mã (#TEMP-01)';
  } else if (type === 'humidity') {
    if (labelEl) labelEl.textContent = 'Số liệu Độ ẩm (%)';
    inputEl.placeholder = 'Nhập độ ẩm (VD: 65, > 70) hoặc mã (#HUMI-01)';
  } else if (type === 'light') {
    if (labelEl) labelEl.textContent = 'Số liệu Ánh sáng (Lux)';
    inputEl.placeholder = 'Nhập độ sáng (VD: 450, > 400) hoặc mã (#LIGHT-01)';
  } else {
    if (labelEl) labelEl.textContent = 'Giá trị / Thời gian cần tìm';
    inputEl.placeholder = 'Nhập số (VD: 30), mã (#TEMP-01) hoặc ngày giờ (VD: 10:00)';
  }
}

// Nhận biết chuỗi nhập vào là Thời gian hay Số liệu
function isTimeString(query) {
  if (!query) return false;
  const q = query.trim().toLowerCase();

  // Có dấu phân cách thời gian: /, -, :, hoặc chữ 'h' (VD: 9h30, 10:00, 2025/05/20, 20-05)
  if (q.includes('/') || q.includes('-') || q.includes(':') || q.includes('h')) {
    return true;
  }

  // Năm 4 chữ số (VD: 2024, 2025, 2026)
  if (/^20\d{2}$/.test(q)) {
    return true;
  }

  return false;
}

// Khớp giá trị số học (hỗ trợ >, <, >=, <=, = hoặc số chính xác/tiền tố số)
function matchNumericValue(itemVal, queryStr) {
  if (!queryStr) return true;
  const q = queryStr.trim();

  // 1. Toán tử so sánh: >=, <=, >, <, =
  if (q.startsWith('>=')) {
    const num = parseFloat(q.substring(2).trim());
    return !isNaN(num) && itemVal >= num;
  }
  if (q.startsWith('<=')) {
    const num = parseFloat(q.substring(2).trim());
    return !isNaN(num) && itemVal <= num;
  }
  if (q.startsWith('>')) {
    const num = parseFloat(q.substring(1).trim());
    return !isNaN(num) && itemVal > num;
  }
  if (q.startsWith('<')) {
    const num = parseFloat(q.substring(1).trim());
    return !isNaN(num) && itemVal < num;
  }
  if (q.startsWith('=')) {
    const num = parseFloat(q.substring(1).trim());
    return !isNaN(num) && (itemVal === num || Math.abs(itemVal - num) < 0.05);
  }

  // 2. Nhập số trực tiếp (VD: 30, 65, 28, 450)
  const num = parseFloat(q);
  if (!isNaN(num)) {
    // a. Khớp chính xác số học (VD: 65 === 65.0, 30 === 30.0)
    if (itemVal === num || Math.abs(itemVal - num) < 0.05) {
      return true;
    }

    // b. Khớp theo tiền tố số (VD: gõ 30 khớp 30.0, 30.2, 30.5; gõ 28 khớp 28.0, 28.5)
    // Nhưng 64.5 không khớp 65; 430 không khớp 30
    const valStr = itemVal.toString();
    if (valStr.startsWith(q)) {
      return true;
    }

    return false;
  }

  return false;
}

// Khớp chuỗi thời gian linh hoạt (hỗ trợ cả YYYY/MM/DD, DD/MM/YYYY, DD-MM-YYYY, HH:mm:ss, HH:mm, 9h30)
function matchTimeValue(itemTime, queryStr) {
  if (!queryStr) return true;
  let q = queryStr.trim().toLowerCase();
  const timeStr = (itemTime || '').toLowerCase();

  // Chuẩn hóa chữ 'h' thành ':' (VD: 9h30 -> 9:30)
  q = q.replace(/h/g, ':');

  // 1. Khớp trực tiếp (VD: "10:00", "2025/05/20", "09:30")
  if (timeStr.includes(q)) return true;

  // 2. Chuyển đổi qua lại giữa dấu gạch chéo (/) và gạch ngang (-)
  const qSlash = q.replace(/-/g, '/');
  const qDash = q.replace(/\//g, '-');
  const timeSlash = timeStr.replace(/-/g, '/');
  const timeDash = timeStr.replace(/\//g, '-');

  if (timeSlash.includes(qSlash) || timeDash.includes(qDash)) return true;

  // 3. Hỗ trợ định dạng ngày Việt Nam DD/MM/YYYY hoặc DD-MM-YYYY (VD: "20/05/2025" -> tìm "2025/05/20")
  const dmyMatch = q.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const rest = dmyMatch[4].trim();
    const convertedSlash = `${year}/${month}/${day}` + (rest ? ` ${rest}` : '');
    const convertedDash = `${year}-${month}-${day}` + (rest ? ` ${rest}` : '');
    if (timeSlash.includes(convertedSlash) || timeDash.includes(convertedDash)) return true;
  }

  // 4. Hỗ trợ định dạng DD/MM hoặc DD-MM (VD: "20/05" -> tìm "/05/20")
  const dmMatch = q.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (dmMatch) {
    const day = dmMatch[1].padStart(2, '0');
    const month = dmMatch[2].padStart(2, '0');
    if (timeSlash.includes(`/${month}/${day}`) || timeDash.includes(`-${month}-${day}`)) return true;
  }

  return false;
}

// Xử lý bộ lọc: Dropdown tiêu chí + Ô nhập
function handleFilterSubmit(e, keepCurrentPage = false) {
  if (e && e.preventDefault) e.preventDefault();

  const filterTypeEl = document.getElementById('filter-type');
  const inputEl = document.getElementById('filter-input-val');
  if (!filterTypeEl || !inputEl) return;

  const filterType = filterTypeEl.value;
  const query = inputEl.value.trim();

  filteredRecords = allSensorRecords.filter(item => {
    // Không có từ khóa: hiển thị theo loại cảm biến đã chọn
    if (!query) {
      if (filterType === 'all' || filterType === 'time') return true;
      return item.sensor_type === filterType;
    }

    // TRƯỜNG HỢP 1: Dropdown là "Thời gian" (filterType === 'time')
    if (filterType === 'time') {
      return matchTimeValue(item.recorded_at, query);
    }

    // TRƯỜNG HỢP 2: Dropdown là "Tất cả cảm biến" (filterType === 'all')
    if (filterType === 'all') {
      // Phân biệt: Nếu người dùng nhập ngày giờ (có /, -, :, h hoặc năm 202x) -> Lọc theo thời gian!
      if (isTimeString(query)) {
        return matchTimeValue(item.recorded_at, query);
      }

      // Ngược lại nếu nhập số (VD: 30, 65, > 28) -> CHỈ LỌC THEO SỐ LIỆU (không tìm vào mốc thời gian 09:30:00)!
      const matchNum = matchNumericValue(item.value, query);
      const matchName = (item.sensor_name || '').toLowerCase().includes(query.toLowerCase());
      const matchId = (item.sensor_id || '').toLowerCase().includes(query.toLowerCase());
      return matchNum || matchName || matchId;
    }

    // TRƯỜNG HỢP 3: Dropdown là loại cảm biến cụ thể (nhiệt độ, độ ẩm, ánh sáng)
    if (item.sensor_type !== filterType) {
      return false;
    }

    // Nếu query có dấu ngày giờ thì lọc theo mốc thời gian của cảm biến đó, ngược lại lọc theo số liệu
    if (isTimeString(query)) {
      return matchTimeValue(item.recorded_at, query);
    }
    return matchNumericValue(item.value, query);
  });

  if (!keepCurrentPage) {
    currentPage = 1;
  } else {
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
  }
  applySorting();
  renderSensorTable();
}

// Xử lý Sắp xếp cột (Sort) - 3 thao tác: 1: giảm dần (desc), 2: tăng dần (asc), 3: về ban đầu (none)
function sortColumn(column) {
  if (currentSort.column === column) {
    if (currentSort.order === 'desc') {
      // Lần 2: Tăng dần
      currentSort.order = 'asc';
    } else if (currentSort.order === 'asc') {
      // Lần 3: Về ban đầu
      currentSort = { column: null, order: null };
    }
  } else {
    // Lần 1: Bấm cột mới -> Giảm dần (desc)
    currentSort = { column, order: 'desc' };
  }

  updateSortIcons();
  applySorting();
  renderSensorTable();
}

function applySorting() {
  if (!currentSort.column || !currentSort.order) {
    // Mặc định: Bản ghi mới nhất hiển thị lên đầu tiên
    filteredRecords.sort((a, b) => Number(b.id || b.stt) - Number(a.id || a.stt));
    return;
  }

  filteredRecords.sort((a, b) => {
    const col = currentSort.column;
    const order = currentSort.order;
    let valA = a[col];
    let valB = b[col];

    let cmp = 0;
    if (col === 'id' || col === 'stt') {
      const numA = Number(a.id !== undefined ? a.id : a.stt);
      const numB = Number(b.id !== undefined ? b.id : b.stt);
      cmp = numA - numB;
    } else if (col === 'value') {
      const floatA = parseFloat(valA);
      const floatB = parseFloat(valB);
      cmp = floatA - floatB;
    } else {
      valA = (valA || '').toString();
      valB = (valB || '').toString();
      cmp = valA.localeCompare(valB);
    }

    return order === 'asc' ? cmp : -cmp;
  });
}

// Xóa bộ lọc
function resetFilters() {
  const typeEl = document.getElementById('filter-type');
  const inputEl = document.getElementById('filter-input-val');
  if (typeEl) typeEl.value = 'all';
  if (inputEl) inputEl.value = '';
  handleFilterTypeChange();

  filteredRecords = [...allSensorRecords];
  currentPage = 1;
  currentSort = { column: null, order: null };
  updateSortIcons();
  applySorting();
  renderSensorTable();
}

// Phân trang
function renderPagination() {
  const container = document.getElementById('pagination-numbers');
  if (!container) return;

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  container.innerHTML = '';

  let pagesToShow = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
  } else {
    if (currentPage <= 4) {
      pagesToShow = [1, 2, 3, 4, 5, '...', totalPages];
    } else if (currentPage >= totalPages - 3) {
      pagesToShow = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pagesToShow = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }
  }

  pagesToShow.forEach(p => {
    if (p === '...') {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'w-7 h-7 flex items-center justify-center text-xs font-semibold text-slate-400 select-none';
      ellipsis.textContent = '...';
      container.appendChild(ellipsis);
    } else {
      const btn = document.createElement('button');
      btn.className = `w-7 h-7 rounded text-xs font-semibold transition cursor-pointer ${p === currentPage ? APP_COLORS.ui.pageActive : APP_COLORS.ui.pageInactive}`;
      btn.textContent = p;
      btn.onclick = () => { currentPage = p; renderSensorTable(); };
      container.appendChild(btn);
    }
  });

  // Nút Trước / Tiếp theo
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderSensorTable();
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderSensorTable();
  }
}

function changeLimit(newLimit) {
  itemsPerPage = parseInt(newLimit);
  currentPage = 1;
  renderSensorTable();
}

// Gọi API lấy dữ liệu từ Backend Server
async function fetchSensorDataFromServer() {
  const tbody = document.getElementById('sensor-table-body');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">Đang tải dữ liệu từ máy chủ http://localhost:5000...</td></tr>`;
  }

  try {
    const res = await apiFetch('/api/v1/sensors/data');
    if (res.status === 'success' && Array.isArray(res.data)) {
      allSensorRecords = res.data;
      filteredRecords = [...allSensorRecords];
      applySorting();
      renderSensorTable();
    }
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-rose-500 font-semibold">⚠️ Không thể kết nối tới Backend Server (http://localhost:5000)! Vui lòng bật server bằng lệnh: <code class="bg-rose-50 px-2 py-0.5 rounded border border-rose-200">node server.js</code></td></tr>`;
    }
    const countEl = document.getElementById('total-records-count');
    if (countEl) countEl.textContent = '0';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  handleFilterTypeChange();
  updateSortIcons();
  fetchSensorDataFromServer();

  // Lắng nghe dữ liệu cảm biến mới qua WebSocket Realtime
  if (typeof initIotWebSocket === 'function') {
    initIotWebSocket((msg) => {
      if (msg.type === 'SENSOR_UPDATE' && Array.isArray(msg.records) && msg.records.length > 0) {
        const existingIds = new Set(allSensorRecords.map(r => r.id || r.stt));
        const toAdd = msg.records.filter(r => !existingIds.has(r.id || r.stt));
        if (toAdd.length > 0) {
          allSensorRecords.unshift(...toAdd);
          // Tự động cập nhật bảng nhưng BẢO LƯU trang hiện tại của người dùng
          handleFilterSubmit(null, true);
        }
      }
    });
  }
});
