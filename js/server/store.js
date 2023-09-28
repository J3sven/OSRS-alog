const fs = require('fs');
const path = require('path');

function sanitizePlayerName(playerName) {
    return playerName.replace(/ /g, '_');
}

function getFilePaths(playerName, type) {
    const folderPath = path.join(__dirname, '..', '..', 'data', playerName);
    const logFilePath = path.join(folderPath, 'log.json');
    const typeFilePath = path.join(folderPath, `${type.toLowerCase()}.json`);
    return { folderPath, logFilePath, typeFilePath };
}

function ensureFolderExists(folderPath) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
}

function readJSONFile(filePath) {
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return fileContent ? JSON.parse(fileContent) : [];
    }
    return [];
}

function updateData(existingData, newData) {
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

function updateLogData(logData, type, processedData) {
    const latestTypeIndex = logData.reduce((acc, curr, idx) => {
        return (curr.type === type) ? idx : acc;
    }, -1);

    if (latestTypeIndex >= 0 && logData[latestTypeIndex].currentSource === processedData.currentSource) {
        processedData.tallyCount = logData[latestTypeIndex].tallyCount + 1;
        logData[latestTypeIndex] = { type, ...processedData };
    } else {
        processedData.tallyCount = 1;
        logData.push({ type, ...processedData });
    }

    return logData;
}

function storePayload(playerName, type, processedData) {
    const sanitizedPlayerName = sanitizePlayerName(playerName);
    const { folderPath, logFilePath, typeFilePath } = getFilePaths(sanitizedPlayerName, type);

    ensureFolderExists(folderPath);

    let logData = readJSONFile(logFilePath);
    let existingTypeData = readJSONFile(typeFilePath);

    const updatedTypeData = updateData(existingTypeData, processedData);
    fs.writeFileSync(typeFilePath, JSON.stringify(updatedTypeData, null, 2));

    const updatedLogData = updateLogData(logData, type, processedData);
    fs.writeFileSync(logFilePath, JSON.stringify(updatedLogData, null, 2));
}


module.exports = {
    storePayload
};
