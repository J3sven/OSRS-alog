const WebSocket = require('ws');
const pluralize = require('pluralize');

let lastId = null;
let lastSource = null;
let tallyCount = 0;

function processPayload(payload) {
  const type = payload.body.type;

  console.log(`payload is ${JSON.stringify(payload)}`)

  switch (type) {
    case "LOOT":
      return processLootPayload(payload.body);
    case "QUEST":
      return processQuestPayload(payload.body);
    default:
      return {};
  }
}

function processLootPayload(payload) {
  const currentSource = payload.extra.source;
  const timestamp = new Date(payload.embeds[0].timestamp).toLocaleString();
  
  if (lastSource === currentSource) {
    tallyCount++;
  } else {
    tallyCount = 1;
    lastId = null;
    lastSource = currentSource;
  }

  const titleText = `I killed ${tallyCount} ${pluralize(currentSource, tallyCount)}.`;
  const displayText = `${titleText} (${timestamp})`;

  return {
    id: lastId || payload.embeds[0].timestamp,
    currentSource,
    timestamp,
    displayText,
    titleText,
    tallyCount
  };
}

function processQuestPayload(payload) {
  const questName = payload.extra.questName;
  const timestamp = new Date(payload.embeds[0].timestamp).toLocaleString();
  const questPoints = payload.extra.questPoints;
  
  const titleText = `I completed the quest ${questName}.`;
  const displayText = `${titleText} I now have ${questPoints} Quest points. (${timestamp})`;

  return {
    id: payload.embeds[0].timestamp,
    questName,
    timestamp,
    displayText,
    titleText,
    questPoints
  };
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
