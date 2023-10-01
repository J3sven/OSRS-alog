const pluralize = require('pluralize');
const crypto = require('crypto');
const { updatePointsInProfile } = require('./updateprofile');

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
      case 'ACHIEVEMENT_DIARY':
        processedData = this.processAchievementDiaryPayload(payload.body, newId, unixTimestamp, humanReadableTimestamp);
        break;
      case 'COMBAT_ACHIEVEMENT':
        processedData = this.processCombatAchievementPayload(payload.body, newId, unixTimestamp, humanReadableTimestamp);
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
    const { questName, questPoints } = payload.extra;
    const sanitizedPlayerName = payload.playerName.replace(/ /g, '_');

    const titleText = `I completed the quest ${questName}.`;
    const displayText = `${titleText} I now have ${questPoints} Quest points. (${humanReadableTimestamp})`;

    updatePointsInProfile(sanitizedPlayerName, questPoints, 'questpoints');

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

  processAchievementDiaryPayload(payload, newId, unixTimestamp, humanReadableTimestamp) {
    const { area, difficulty, total } = payload.extra;
    const sanitizedPlayerName = payload.playerName.replace(/ /g, '_');

    const titleText = `I have completed the ${difficulty} ${area} Achievement Diary.`;
    const displayText = `After completing all the ${difficulty} tasks in the ${area} region I have completed the ${difficulty} Achievement Diary tier for ${area}. (${humanReadableTimestamp})`;

    updatePointsInProfile(sanitizedPlayerName, total, 'achievements');

    return {
      id: newId,
      area,
      difficulty,
      total,
      timestamp: unixTimestamp,
      displayText,
      titleText,
    };
  }

  // Then add the new processor function
  processCombatAchievementPayload(payload, newId, unixTimestamp, humanReadableTimestamp) {
    const {
      tier, task, taskPoints, totalPoints, tierProgress, tierTotalPoints, justCompletedTier,
    } = payload.extra;
    const sanitizedPlayerName = payload.playerName.replace(/ /g, '_');

    let titleText = '';
    let displayText = '';

    if (justCompletedTier) {
      titleText = `I have completed the ${justCompletedTier} tier.`;
      displayText = `${titleText} By completing the combat task: ${task}, I have unlocked rewards for the ${justCompletedTier} tier. 
      I now have ${totalPoints} total points. (${humanReadableTimestamp})`;
    } else {
      titleText = `I have completed the ${task} ${tier} combat task.`;
      displayText = `${titleText} I earned ${taskPoints} points for a total of ${totalPoints}. (${humanReadableTimestamp})`;
    }

    updatePointsInProfile(sanitizedPlayerName, totalPoints, 'combatachievements');

    return {
      id: newId,
      tier,
      task,
      taskPoints,
      totalPoints,
      tierProgress,
      tierTotalPoints,
      justCompletedTier,
      timestamp: unixTimestamp,
      displayText,
      titleText,
    };
  }
}

module.exports = PayloadProcessor;
