const WebSocket = require('ws');
const pluralize = require('pluralize');

let lastId = null;
let lastSource = null;
let tallyCount = 0;

function processPayload(payload) {
  const currentSource = payload.body.extra.source;
  const timestamp = new Date(payload.body.embeds[0].timestamp).toLocaleString();

  if (lastSource === currentSource) {
    tallyCount++;
  } else {
    tallyCount = 1;
    lastId = null;
    lastSource = currentSource;
  }

  const titleText = `I killed ${tallyCount} ${pluralize(currentSource, tallyCount)}.`;
  const displayText = `${titleText} (${timestamp})`;

  const newData = {
    id: lastId || payload.body.embeds[0].timestamp,
    currentSource,
    timestamp,
    displayText,
    titleText,
    tallyCount
  };

  return newData;
}

function updateReceivedData(receivedData, newData) {
  if (lastId) {
    const index = receivedData.findIndex(item => item.id === lastId);
    if (index !== -1) {
      receivedData[index] = newData;
    }
  } else {
    receivedData.push(newData);
    lastId = newData.id;
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
  processPayload,
  updateReceivedData,
  sendToWebSocketClients
};
