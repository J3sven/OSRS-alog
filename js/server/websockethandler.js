const WebSocket = require('ws');

function sendToWebSocketClients(wss, playerName) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ action: 'update', playerName }));
    }
  });
}

module.exports = {
  sendToWebSocketClients,
};
