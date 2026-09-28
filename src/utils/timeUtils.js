function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDateTime(d = new Date()) {
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

function formatTime(d = new Date()) {
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${hours}:${minutes}:${seconds}`;
}

// Thuật toán Anti-burst Pacing: Chống dồn gói khi Wi-Fi lag, giữ nhịp đều đặn 2s
let lastAssignedSensorTimeMs = 0;
function calculateSensorRecordTime() {
  const now = Date.now();
  if (!lastAssignedSensorTimeMs || (now - lastAssignedSensorTimeMs > 10000)) {
    lastAssignedSensorTimeMs = Math.floor(now / 1000) * 1000;
    return new Date(lastAssignedSensorTimeMs);
  }
  let nextTs = lastAssignedSensorTimeMs + 2000;
  if (nextTs <= now) {
    lastAssignedSensorTimeMs = nextTs;
  } else {
    const currentSecondTs = Math.floor(now / 1000) * 1000;
    if (currentSecondTs > lastAssignedSensorTimeMs) {
      lastAssignedSensorTimeMs = currentSecondTs;
    } else {
      lastAssignedSensorTimeMs += 1000;
    }
  }
  return new Date(lastAssignedSensorTimeMs);
}

module.exports = {
  pad,
  formatDateTime,
  formatTime,
  calculateSensorRecordTime
};
