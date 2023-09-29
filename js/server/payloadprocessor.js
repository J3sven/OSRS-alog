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

  static generateTimeBasedHash() {
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
    const { type } = payload.body;
    const { playerName } = payload.body;

    const newId = PayloadProcessor.generateTimeBasedHash();
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const humanReadableTimestamp = new Date(unixTimestamp * 1000).toLocaleString();

    let processedData;

    switch (type) {
      case 'LOOT':
        processedData = this.processLootPayload(payload.body, newId, unixTimestamp, humanReadableTimestamp);
        break;
      case 'LEVEL':
        processedData = this.processLevelPayload(payload.body, newId, unixTimestamp, humanReadableTimestamp);
        break;
      case 'QUEST':
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
      this.tallyCount += 1;
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
      tallyCount: this.tallyCount,
    };
  }

  processQuestPayload(payload, newId, unixTimestamp, humanReadableTimestamp) {
    const { questName } = payload.extra;
    const { questPoints } = payload.extra;

    const titleText = `I completed the quest ${questName}.`;
    const displayText = `${titleText} I now have ${questPoints} Quest points. (${humanReadableTimestamp})`;

    return {
      id: newId,
      questName,
      timestamp: unixTimestamp,
      displayText,
      titleText,
      questPoints,
    };
  }

  processLevelPayload(payload, newId, unixTimestamp, humanReadableTimestamp) {
    const { levelledSkills, allSkills, combatLevel } = payload.extra;

    // Find the skill with the highest level
    const [highestSkill, highestLevel] = Object.entries(levelledSkills).reduce((acc, [skill, level]) => ((level > acc[1]) ? [skill, level] : acc), ['', 0]);

    const titleText = `I levelled up ${highestSkill}`;

    // Generating a list of other levelled skills
    const otherSkillsText = Object.entries(levelledSkills)
      .filter(([skill]) => skill !== highestSkill)
      .map(([skill, level]) => `${skill} to ${level}`)
      .join(', ');

    // Displaying if combat level increased
    const combatLevelText = combatLevel.increased ? `My combat level increased to ${combatLevel.value}` : '';

    // Create the display text based on conditions
    let displayText = `I levelled my ${highestSkill} skill, I am now level ${highestLevel}.`;
    if (otherSkillsText) displayText += ` I also levelled ${otherSkillsText}.`;
    if (combatLevelText) displayText += ` ${combatLevelText}`;
    displayText += ` (${humanReadableTimestamp})`;

    return {
      id: newId,
      levelledSkills,
      allSkills,
      timestamp: unixTimestamp,
      displayText,
      titleText,
      combatLevel: combatLevel.value,
    };
  }
}

module.exports = PayloadProcessor;
