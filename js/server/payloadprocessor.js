const pluralize = require('pluralize');

class PayloadProcessor {
    constructor() {
        this.lastId = null;
        this.lastSource = null;
        this.tallyCount = 0;
        this.lastActivity = new Date().getTime();
    }
    
    updateActivity() {
        this.lastActivity = new Date().getTime();
    }

    /**
     * @description Processes the payload by type and returns the processed data.
     * @param {Object} payload 
     * @param {Object} storePayload 
     * @returns {Object} processedData
     */
    processPayload(payload, storePayload) {
        const type = payload.body.type;
        const playerName = payload.body.playerName;

        let processedData;

        switch (type) {
            case "LOOT":
                processedData = this.processLootPayload(payload.body);
                break;
            case "QUEST":
                processedData = this.processQuestPayload(payload.body);
                break;
            default:
                return {};
        }

        storePayload(playerName, type, processedData);
        return processedData;
    }

    processLootPayload(payload) {
        const currentSource = payload.extra.source;
        const timestamp = new Date(payload.embeds[0].timestamp).toLocaleString();

        if (this.lastSource === currentSource) {
            this.tallyCount++;
        } else {
            this.tallyCount = 1;
        }

        const titleText = `I killed ${this.tallyCount} ${pluralize(currentSource, this.tallyCount)}.`;
        const displayText = `${titleText} (${timestamp})`;
        const newId = new Date().toISOString();

        this.lastId = newId;
        this.lastSource = currentSource;

        return {
            id: newId,
            currentSource,
            timestamp,
            displayText,
            titleText,
            tallyCount: this.tallyCount
        };
    }

    processQuestPayload(payload) {
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
}

module.exports = PayloadProcessor;