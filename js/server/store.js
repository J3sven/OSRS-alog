const fs = require('fs');
const path = require('path');

/**
 * Sanitizes the player name by replacing spaces with underscores.
 * @param {string} playerName The player name to sanitize.
 * @returns {string} The sanitized player name.
 */
function sanitizePlayerName(playerName) {
  return playerName.replace(/ /g, '_');
}

/**
 * Returns the paths to the log and type files.
 * @param {string} playerName
 * @param {string} type
 * @returns
 */
function getFilePaths(playerName, type) {
  const folderPath = path.join(__dirname, '..', '..', 'data', playerName);
  const logFilePath = path.join(folderPath, 'log.json');
  const typeFilePath = path.join(folderPath, `${type.toLowerCase()}.json`);
  return { folderPath, logFilePath, typeFilePath };
}

/**
 * Ensures that the folder exists.
 * @param {string} folderPath The path to the folder.
 */
function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

/**
 * Reads a JSON file.
 * @param {string} filePath The path to the file.
 * @returns {object} The JSON object.
 */
function readJSONFile(filePath) {
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return fileContent ? JSON.parse(fileContent) : [];
  }
  return [];
}

/**
 * Updates the data, tallying if necessary.
 * @param {object} existingData The existing data.
 * @param {object} newData The new data.
 * @returns {object} The updated data.
 */

// TODO: revisit tally logic
// function updateData(existingData, newData) {
//   const latestIndex = existingData.length - 1;
//   const updatedData = [...existingData]; // Clone existingData

//   if (latestIndex >= 0 && existingData[latestIndex].currentSource === newData.currentSource) {
//     const updatedNewData = { ...newData, tallyCount: existingData[latestIndex].tallyCount + 1 };
//     updatedData[latestIndex] = updatedNewData;
//   } else {
//     const updatedNewData = { ...newData, tallyCount: 1 };
//     updatedData.push(updatedNewData);
//   }

//   return updatedData;
// }

function updateData(existingData, newData) {
  const updatedData = [...existingData, newData];
  return updatedData;
}

/**
 * Updates the log data, tallying if necessary.
 * @param {object} logData The existing log data.
 * @param {string} type The type of data.
 * @param {object} processedData The processed data.
 * @returns {object} The updated log data.
 */
function updateLogData(logData, type, processedData) {
  const latestTypeIndex = logData.reduce((acc, curr, idx) => ((curr.type === type) ? idx : acc), -1);
  const updatedLogData = [...logData]; // Clone logData

  if (latestTypeIndex >= 0 && logData[latestTypeIndex].currentSource === processedData.currentSource) {
    const updatedProcessedData = { ...processedData, tallyCount: logData[latestTypeIndex].tallyCount + 1 };
    updatedLogData[latestTypeIndex] = { type, ...updatedProcessedData };
  } else {
    const updatedProcessedData = { ...processedData, tallyCount: 1 };
    updatedLogData.push({ type, ...updatedProcessedData });
  }

  return updatedLogData;
}

/**
 * Stores the payload in the relevant JSON files in the user data directory.
 * @param {string} playerName The player name.
 * @param {string} type The type of data.
 * @param {object} processedData The processed data.
 */
function storePayload(playerName, type, processedData) {
  const sanitizedPlayerName = sanitizePlayerName(playerName);
  const { folderPath, logFilePath, typeFilePath } = getFilePaths(sanitizedPlayerName, type);

  ensureFolderExists(folderPath);

  const logData = readJSONFile(logFilePath);
  const existingTypeData = readJSONFile(typeFilePath);

  const updatedTypeData = updateData(existingTypeData, processedData);
  fs.writeFileSync(typeFilePath, JSON.stringify(updatedTypeData, null, 2));

  const updatedLogData = updateLogData(logData, type, processedData);
  fs.writeFileSync(logFilePath, JSON.stringify(updatedLogData, null, 2));
}

module.exports = {
  storePayload,
};
