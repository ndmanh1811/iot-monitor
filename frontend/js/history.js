/**
 * Device Action History Table Logic - Filters, Sorter and Pagination
 */

let allHistoryRecords = [];
let filteredHistory = [];
let currentHistoryPage = 1;
let historyItemsPerPage = 10;
let currentHistorySort = { column: null, order: null }; // null: ban đầu chưa sắp xếp

// Cập nhật biểu tượng mũi tên hiển thị trạng thái sắp xếp đơn cột (3 trạng thái: ↓, ↑, ↕)
function updateHistorySortIcons() {
  const iconMap = {
    'id': document.getElementById('sort-icon-hist-id'),
    'device_id': document.getElementById('sort-icon-hist-dev-id'),
    'created_at': document.getElementById('sort-icon-hist-time')
  };

  for (const [col, el] of Object.entries(iconMap)) {
    if (!el) continue;
    if (currentHistorySort.column === col && currentHistorySort.order) {
      el.textContent = currentHistorySort.order === 'asc' ? '↑' : '↓';
      el.className = APP_COLORS.ui.sortActive;
    } else {
      el.textContent = '↕';
      el.className = APP_COLORS.ui.sortInactive;
    }
  }
}

function renderHistoryTable() {
  const tbody = document.getElementById('history-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  const startIndex = (currentHistoryPage - 1) * historyItemsPerPage;
  const pageData = filteredHistory.slice(startIndex, startIndex + historyItemsPerPage);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">Không tìm thấy nhật ký thiết bị nào phù hợp!</td></tr>`;
    document.getElementById('total-history-count').textContent = '0';
    return;
  }

  pageData.forEach((row) => {
    // Action style
    const isActionOn = row.action.toUpperCase() === 'ON';
    const actionHtml = isActionOn
      ? `<span class="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Bật</span>`
      : `<span class="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Tắt</span>`;

    // Status badge
    const badgeClass = APP_COLORS.getStatusBadge(row.status);
    const statusText = row.status === 'SUCCESS' ? 'Thành công' : (row.status === 'FAILED' ? 'Thất bại' : 'Đang xử lý');
    const statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${badgeClass}">${statusText}</span>`;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/70 transition-colors';
    tr.innerHTML = `
      <td class="py-2 px-5 text-center text-slate-800 text-xs font-mono font-semibold">${row.id}</td>
      <td class="py-2 px-5 text-slate-800 font-semibold text-xs font-mono">${row.device_id}</td>
      <td class="py-2 px-5 font-medium text-slate-800">${row.device_name}</td>
      <td class="py-2 px-5 text-slate-700 font-medium text-xs">${row.operator || row.user || 'Nguyễn Đức Mạnh'}</td>
      <td class="py-2 px-5">${actionHtml}</td>
      <td class="py-2 px-5">${statusBadge}</td>
      <td class="py-2 px-5 text-right text-slate-500 text-xs font-mono">${row.created_at}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('total-history-count').textContent = filteredHistory.length.toLocaleString();
  renderHistoryPagination();
}

function handleHistoryFilter(e, keepCurrentPage = false) {
  if (e && e.preventDefault) e.preventDefault();

  const devName = document.getElementById('filter-history-device').value;
  const devId = document.getElementById('filter-history-id').value.trim().toLowerCase();
  const action = document.getElementById('filter-history-action').value;
  const status = document.getElementById('filter-history-status').value;
  const time = document.getElementById('filter-history-time').value.trim();

  filteredHistory = allHistoryRecords.filter(item => {
    if (devName && item.device_type !== devName) return false;
    if (devId && !item.device_id.toLowerCase().includes(devId)) return false;
    if (action && item.action.toLowerCase() !== action.toLowerCase()) return false;
    if (status && (item.status || '').toUpperCase() !== status.toUpperCase()) return false;
    if (time) {
      const cleanSearch = time.replace(/-/g, '/');
      const cleanCreated = item.created_at.replace(/-/g, '/');
      if (!cleanCreated.startsWith(cleanSearch)) return false;
    }
    return true;
  });

  if (!keepCurrentPage) {
    currentHistoryPage = 1;
  } else {
    const totalPages = Math.ceil(filteredHistory.length / historyItemsPerPage) || 1;
    if (currentHistoryPage > totalPages) {
      currentHistoryPage = totalPages;
    }
  }
  applyHistorySorting();
  renderHistoryTable();
}

// Xử lý Sắp xếp cột (Sort) - 3 thao tác: 1: giảm dần (desc), 2: tăng dần (asc), 3: về ban đầu (none)
function sortHistory(column) {
  if (currentHistorySort.column === column) {
    if (currentHistorySort.order === 'desc') {
      // Lần 2: Tăng dần
      currentHistorySort.order = 'asc';
    } else if (currentHistorySort.order === 'asc') {
      // Lần 3: Về ban đầu
      currentHistorySort = { column: null, order: null };
    }
  } else {
    // Lần 1: Bấm cột mới -> Giảm dần (desc)
    currentHistorySort = { column, order: 'desc' };
  }

  updateHistorySortIcons();
  applyHistorySorting();
  renderHistoryTable();
}

function applyHistorySorting() {
  if (!currentHistorySort.column || !currentHistorySort.order) {
    // Mặc định: Nhật ký mới nhất hiển thị lên đầu tiên
    filteredHistory.sort((a, b) => Number(b.id || b.stt) - Number(a.id || a.stt));
    return;
  }

  filteredHistory.sort((a, b) => {
    const col = currentHistorySort.column;
    const order = currentHistorySort.order;
    let valA = a[col];
    let valB = b[col];

    let cmp = 0;
    if (col === 'id' || col === 'stt') {
      const numA = Number(a.id !== undefined ? a.id : a.stt);
      const numB = Number(b.id !== undefined ? b.id : b.stt);
      cmp = numA - numB;
    } else {
      valA = (valA || '').toString();
      valB = (valB || '').toString();
      cmp = valA.localeCompare(valB);
    }

    return order === 'asc' ? cmp : -cmp;
  });
}

function resetHistoryFilters() {
  document.getElementById('filter-history-device').value = '';
  document.getElementById('filter-history-id').value = '';
  document.getElementById('filter-history-action').value = '';
  document.getElementById('filter-history-status').value = '';
  document.getElementById('filter-history-time').value = '';
  filteredHistory = [...allHistoryRecords];
  currentHistoryPage = 1;
  currentHistorySort = { column: null, order: null };
  updateHistorySortIcons();
  applyHistorySorting();
  renderHistoryTable();
}

function renderHistoryPagination() {
  const container = document.getElementById('history-pagination-numbers');
  if (!container) return;

  const totalPages = Math.ceil(filteredHistory.length / historyItemsPerPage) || 1;
  container.innerHTML = '';

  let pagesToShow = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
  } else {
    if (currentHistoryPage <= 4) {
      pagesToShow = [1, 2, 3, 4, 5, '...', totalPages];
    } else if (currentHistoryPage >= totalPages - 3) {
      pagesToShow = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pagesToShow = [1, '...', currentHistoryPage - 1, currentHistoryPage, currentHistoryPage + 1, '...', totalPages];
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
      btn.className = `w-7 h-7 rounded text-xs font-semibold transition cursor-pointer ${p === currentHistoryPage ? APP_COLORS.ui.pageActive : APP_COLORS.ui.pageInactive}`;
      btn.textContent = p;
      btn.onclick = () => { currentHistoryPage = p; renderHistoryTable(); };
      container.appendChild(btn);
    }
  });

  const prevBtn = document.getElementById('history-btn-prev');
  const nextBtn = document.getElementById('history-btn-next');
  if (prevBtn) prevBtn.disabled = currentHistoryPage === 1;
  if (nextBtn) nextBtn.disabled = currentHistoryPage === totalPages;
}

function prevHistoryPage() {
  if (currentHistoryPage > 1) {
    currentHistoryPage--;
    renderHistoryTable();
  }
}

function nextHistoryPage() {
  const totalPages = Math.ceil(filteredHistory.length / historyItemsPerPage);
  if (currentHistoryPage < totalPages) {
    currentHistoryPage++;
    renderHistoryTable();
  }
}

function changeHistoryLimit(limit) {
  historyItemsPerPage = parseInt(limit);
  currentHistoryPage = 1;
  renderHistoryTable();
}

// Gọi API lấy nhật ký thao tác thiết bị từ Backend Server
async function fetchHistoryFromServer() {
  const tbody = document.getElementById('history-table-body');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">Đang tải nhật ký từ máy chủ http://localhost:5000...</td></tr>`;
  }

  try {
    const res = await apiFetch('/api/v1/actions/history');
    if (res.status === 'success' && Array.isArray(res.data)) {
      allHistoryRecords = res.data;
      filteredHistory = [...allHistoryRecords];
      applyHistorySorting();
      renderHistoryTable();
    }
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-rose-500 font-semibold">⚠️ Không thể kết nối tới Backend Server (http://localhost:5000)! Vui lòng bật server bằng lệnh: <code class="bg-rose-50 px-2 py-0.5 rounded border border-rose-200">node server.js</code></td></tr>`;
    }
    const countEl = document.getElementById('total-history-count');
    if (countEl) countEl.textContent = '0';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateHistorySortIcons();
  fetchHistoryFromServer();

  // Lắng nghe thao tác bật/tắt thiết bị thời gian thực qua WebSocket
  if (typeof initIotWebSocket === 'function') {
    initIotWebSocket((msg) => {
      if (msg.type === 'DEVICE_ACTION') {
        allHistoryRecords.unshift(msg);
        handleHistoryFilter(null, true);
      } else if (msg.type === 'DEVICE_STATUS') {
        const item = allHistoryRecords.find(r => r.request_id === msg.request_id);
        if (item) {
          item.status = msg.status;
          renderHistoryTable();
        }
      }
    });
  }
});
