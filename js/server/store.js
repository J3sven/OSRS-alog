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

    if ('tallyCount' in processedData) {
        const index = logData.findIndex(
            item => item.type === type && item.currentSource === processedData.currentSource
        );
        if (index !== -1 && logData[index].tallyCount < processedData.tallyCount) {
            logData.splice(index, 1);
        }
    }

    logData.push({ type, ...processedData });

    fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2));

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

module.exports = {
    storePayload,
    updateData
};
