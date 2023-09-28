const WebSocket = require('ws');

function updateReceivedData(receivedData, newData) {
    const index = receivedData.findIndex(item => item.id === newData.id && item.currentSource === newData.currentSource);

    if (index !== -1) {
        receivedData[index] = newData;
    } else {
        receivedData.push(newData);
    }

    if (receivedData.length > 10) {
        receivedData.shift();
    }

    return receivedData;
}

function sendToWebSocketClients(wss, receivedData) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(receivedData));
        }
    });
}

module.exports = {
    sendToWebSocketClients,
    updateReceivedData
};
