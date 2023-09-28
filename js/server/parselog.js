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
    logData = JSON.parse(fs.readFileSync(logFilePath));
  }

  if ('tallyCount' in processedData) {
    const index = logData.findIndex(
      item => item.type === type && item.processedData.currentSource === processedData.currentSource
    );
    if (index !== -1) {
      if (logData[index].processedData.tallyCount < processedData.tallyCount) {
        logData[index] = { type, processedData };
      }
    } else {
      logData.push({ type, processedData });
    }
  } else {
    logData.push({ type, processedData });
  }

  // Write to type-specific file
  let existingTypeData = [];
  if (fs.existsSync(typeFilePath)) {
    existingTypeData = JSON.parse(fs.readFileSync(typeFilePath));
  }
  const updatedTypeData = updateData(existingTypeData, processedData);
  fs.writeFileSync(typeFilePath, JSON.stringify(updatedTypeData, null, 2));

  // Write to log file
  let existingLogData = [];
  if (fs.existsSync(logFilePath)) {
    existingLogData = JSON.parse(fs.readFileSync(logFilePath));
  }
  const updatedLogData = updateData([...existingLogData], processedData, type);
  fs.writeFileSync(logFilePath, JSON.stringify(updatedLogData, null, 2));
}

function updateData(existingData, newData, type = null) {
  const isTally = 'tallyCount' in newData;
  const findCondition = item =>
    (type ? item.type === type : true) &&
    ((item.processedData && item.processedData.currentSource === newData.currentSource) ||
      (item.currentSource === newData.currentSource));

  const index = isTally ? existingData.findIndex(findCondition) : -1;

  const dataToPush = type ? { type, processedData: newData } : newData;

  if (index !== -1) {
    console.log('tally', existingData[index])
    console.log('processing new tally', newData)
    
    // Null check added here
    if (existingData[index] && existingData[index].processedData && existingData[index].processedData.tallyCount < newData.tallyCount) {
      existingData[index] = dataToPush;  // Replace the old data with new
    }
  } else {
    existingData.push(dataToPush);  // Push new data if it doesn't exist
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

  // First, check if the last source and the current source are the same
  if (lastSource === currentSource) {
    tallyCount++;  // Use global tallyCount
  } else {
    tallyCount = 1;  // Reset global tallyCount
  }

  const titleText = `I killed ${tallyCount} ${pluralize(currentSource, tallyCount)}.`;
  const displayText = `${titleText} (${timestamp})`;

  // Generate a new ID only if the source has changed or if this is the first entry
  const newId = (lastSource === currentSource && lastId) ? lastId : new Date().toISOString();
  
  // Update lastId and lastSource for future reference
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
