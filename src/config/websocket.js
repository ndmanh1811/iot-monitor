const WebSocket = require('ws');

let wss = null;
const clients = new Set();

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    clients.add(ws);
    console.log(`⚡ [WebSocket] Client Frontend vừa kết nối thời gian thực (Hiện có: ${clients.size} client)`);

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.warn('⚠️ [WebSocket Client Error]:', err.message);
      clients.delete(ws);
    });
  });

  return wss;
}

function broadcastWs(type, data = {}) {
  if (!wss) return;
  const payload = JSON.stringify({ type, ...data });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.warn('⚠️ [WebSocket Send Error]:', err.message);
      }
    }
  });
}

function getConnectedClientsCount() {
  return clients.size;
}

module.exports = {
  initWebSocket,
  broadcastWs,
  getConnectedClientsCount
};
