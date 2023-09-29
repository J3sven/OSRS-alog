const pluralize = require('pluralize');
const crypto = require('crypto');

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

    generateTimeBasedHash() {
        const time = Date.now();
        const hash = crypto.createHash('sha256');
        hash.update(time.toString());
        return hash.digest('hex').substring(0, 12);
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
    
        const newId = this.generateTimeBasedHash(); 
        const unixTimestamp = Math.floor(Date.now() / 1000);
        const humanReadableTimestamp = new Date(unixTimestamp * 1000).toLocaleString();
    
        let processedData;
    
        switch (type) {
            case "LOOT":
                processedData = this.processLootPayload(payload.body, newId, unixTimestamp, humanReadableTimestamp);
                break;
            case "QUEST":
                processedData = this.processQuestPayload(payload.body, newId, unixTimestamp, humanReadableTimestamp);
                break;
            default:
                return {};
        }
    
        storePayload(playerName, type, processedData);
        return processedData;
    }
    
    processLootPayload(payload, newId, unixTimestamp, humanReadableTimestamp) {

        const currentSource = payload.extra.source;
        
        let idToUse = newId; // By default, use the newId
    
        if (this.lastSource === currentSource) {
            this.tallyCount++;
            idToUse = this.lastId; // Use the lastId if it's a tally
        } else {
            this.tallyCount = 1;
        }
    
        const titleText = `I killed ${this.tallyCount} ${pluralize(currentSource, this.tallyCount)}.`;
        const displayText = `${titleText} (${humanReadableTimestamp})`;
    
        this.lastId = idToUse;
        this.lastSource = currentSource;
    
        return {
            id: idToUse,
            currentSource,
            timestamp: unixTimestamp,
            displayText,
            titleText,
            tallyCount: this.tallyCount
        };
    }
    
    
    processQuestPayload(payload, newId, unixTimestamp, humanReadableTimestamp) {
        const questName = payload.extra.questName;
        const questPoints = payload.extra.questPoints;
    
        const titleText = `I completed the quest ${questName}.`;
        const displayText = `${titleText} I now have ${questPoints} Quest points. (${humanReadableTimestamp})`;
    
        return {
            id: newId,
            questName,
            timestamp: unixTimestamp,
            displayText,
            titleText,
            questPoints
        };
    }
}

module.exports = PayloadProcessor;