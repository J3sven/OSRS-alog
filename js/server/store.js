const fs = require('fs');
const path = require('path');

function storePayload(playerName, type, processedData) {
    const sanitizedPlayerName = playerName.replace(/ /g, '_');
    const folderPath = path.join(__dirname, '..', '..', 'data', sanitizedPlayerName);
    const logFilePath = path.join(folderPath, 'log.json');
    const typeFilePath = path.join(folderPath, `${type.toLowerCase()}.json`);

    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    let logData = [];
    if (fs.existsSync(logFilePath)) {
        const fileContent = fs.readFileSync(logFilePath, 'utf-8');
        logData = fileContent ? JSON.parse(fileContent) : [];
    }

    let existingTypeData = [];
    if (fs.existsSync(typeFilePath)) {
        existingTypeData = JSON.parse(fs.readFileSync(typeFilePath));
    }

    const updatedTypeData = updateData(existingTypeData, processedData);
    fs.writeFileSync(typeFilePath, JSON.stringify(updatedTypeData, null, 2));

    const existingLogIndex = logData.findIndex(
        item => item.type === type && item.id === processedData.id
    );

    if (existingLogIndex === -1) {
        logData.push({ type, ...processedData });
    } else {
        logData[existingLogIndex] = { type, ...processedData };
    }

    fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2));
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

module.exports = {
    storePayload
};
