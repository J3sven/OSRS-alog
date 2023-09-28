const WebSocket = require('ws');
const pluralize = require('pluralize');
const fs = require('fs');
const path = require('path');

let lastId = null;
let lastSource = null;
let tallyCount = 0;

function storePayload(playerName, type, processedData) {
  const sanitizedPlayerName = playerName.replace(/ /g, '_');
  const folderPath = path.join(__dirname, '..', '..', 'data', sanitizedPlayerName);
  const logFilePath = path.join(folderPath, 'log.json');
  const typeFilePath = path.join(folderPath, `${type.toLowerCase()}.json`);

  // Create folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  let logData = [];
  if (fs.existsSync(logFilePath)) {
    const fileContent = fs.readFileSync(logFilePath, 'utf-8');
    logData = fileContent ? JSON.parse(fileContent) : [];
  }

  // Remove last entry with same type and currentSource if tallyCount increases
  if ('tallyCount' in processedData) {
    const index = logData.findIndex(
      item => item.type === type && item.currentSource === processedData.currentSource
    );
    if (index !== -1 && logData[index].tallyCount < processedData.tallyCount) {
      logData.splice(index, 1);
    }
  }

  // Directly push the processedData into logData
  logData.push({ type, ...processedData });

  // Update log file
  fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2));

  // Write to type-specific file
  let existingTypeData = [];
  if (fs.existsSync(typeFilePath)) {
    existingTypeData = JSON.parse(fs.readFileSync(typeFilePath));
  }

  const updatedTypeData = updateData(existingTypeData, processedData);
  fs.writeFileSync(typeFilePath, JSON.stringify(updatedTypeData, null, 2));
}


function updateData(existingData, newData, type = null) {
  const latestIndex = existingData.length - 1;

  if (latestIndex >= 0 && existingData[latestIndex].currentSource === newData.currentSource) {
    newData.tallyCount = existingData[latestIndex].tallyCount + 1;
    existingData[latestIndex] = newData;
  } else {
    newData.tallyCount = 1;
    existingData.push(newData);
  }

  return existingData;
}

function processPayload(payload) {
  const type = payload.body.type;
  const playerName = payload.body.playerName;

  console.log(`payload is ${JSON.stringify(payload)}`);

  let processedData;

  switch (type) {
    case "LOOT":
      processedData = processLootPayload(payload.body);
      break;
    case "QUEST":
      processedData = processQuestPayload(payload.body);
      break;
    default:
      return {};
  }

  storePayload(playerName, type, processedData);
  return processedData;
}

function processLootPayload(payload) {
  const currentSource = payload.extra.source;
  const timestamp = new Date(payload.embeds[0].timestamp).toLocaleString();

  if (lastSource === currentSource) {
    tallyCount++;
  } else {
    tallyCount = 1;
  }

  const titleText = `I killed ${tallyCount} ${pluralize(currentSource, tallyCount)}.`;
  const displayText = `${titleText} (${timestamp})`;

  const newId = new Date().toISOString();

  lastId = newId;
  lastSource = currentSource;

  return {
    id: newId,
    currentSource,
    timestamp,
    displayText,
    titleText,
    tallyCount: tallyCount
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
  processPayload,
  updateReceivedData,
  sendToWebSocketClients
};
