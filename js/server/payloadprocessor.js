const pluralize = require('pluralize');

let lastId = null;
let lastSource = null;
let tallyCount = 0;

function processPayload(payload, storePayload) {
    const type = payload.body.type;
    const playerName = payload.body.playerName;

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

module.exports = {
    processPayload,
    processLootPayload,
    processQuestPayload
};
