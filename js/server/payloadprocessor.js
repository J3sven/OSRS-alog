const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
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

  processPayload(payload, storePayload) {
    const { type, playerName } = payload.body;
    const newId = PayloadProcessor.generateTimeBasedHash();
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const humanReadableTimestamp = new Date(unixTimestamp * 1000).toLocaleString();
    const processorMethod = `process${type.charAt(0) + type.substring(1).toLowerCase().replace(/_([a-z])/g, (match, p1) => p1.toUpperCase())}Payload`;

    console.log('Checking if this method exists:', processorMethod, typeof this[processorMethod]);

    if (this[processorMethod]) {
      const processedData = this[processorMethod](payload.body, newId, unixTimestamp, humanReadableTimestamp);
      if (processedData !== null) {
        storePayload(playerName, type, processedData);
        return processedData;
      }
    }

    return {};
  }

  processPayloadCommon(payload, newId, unixTimestamp) {
    const { extra, playerName } = payload;
    const sanitizedPlayerName = playerName.replace(/ /g, '_');

    return {
      id: newId,
      ...extra,
      timestamp: unixTimestamp,
      sanitizedPlayerName,
    };
  }

  updateTally(currentSource, newId) {
    let idToUse = newId;
    if (this.lastSource === currentSource) {
      this.tallyCount += 1;
      idToUse = this.lastId;
    } else {
      this.tallyCount = 1;
    }
    this.lastId = idToUse;
    this.lastSource = currentSource;
    return idToUse;
  }

  formatItemList(items) {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(', ')} and ${items.slice(-1)}`;
  }

  chooseArticle(word) {
    return ['a', 'e', 'i', 'o', 'u'].includes(word[0].toLowerCase()) ? 'an' : 'a';
  }

  processLootPayload(payload, newId, unixTimestamp, humanReadableTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp, humanReadableTimestamp);
    const { source, items, category } = payload.extra;

    // fetch a list of rare untradable drops
    let excludedItemIds = [];
    try {
      excludedItemIds = JSON.parse(fs.readFileSync(path.join(__dirname, './raredrops.json'), 'utf8'));
    } catch (err) {
      console.error('Error reading raredrops.json:', err);
    }

    const expensiveOrExcludedItems = items.filter((item) => item.priceEach >= 250000 || excludedItemIds.includes(item.id));

    if (expensiveOrExcludedItems.length === 0 || category === 'CLUE') {
      console.log('Either no expensive or excluded items found or category is CLUE');
      return null;
    }

    const idToUse = newId;

    const expensiveItemNames = expensiveOrExcludedItems.map((item) => item.name);
    const joinedNames = this.formatItemList(expensiveItemNames);

    const article = this.chooseArticle(source);
    const titleText = `I found ${expensiveItemNames.length > 1 ? 'items' : 'item'}: ${joinedNames}`;
    const displayText = `After killing ${article} ${source}, it dropped ${expensiveItemNames.length > 1 ? 'items' : 'an item'}: ${joinedNames}. (${humanReadableTimestamp}`;

    return {
      ...commonData,
      id: idToUse,
      displayText,
      titleText,
    };
  }

  processQuestPayload(payload, newId, unixTimestamp, humanReadableTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp, humanReadableTimestamp);
    const { questName, questPoints } = payload.extra;

    const titleText = `I completed the quest ${questName}.`;
    const displayText = `${titleText} I now have ${questPoints} Quest points. (${humanReadableTimestamp})`;

    updatePointsInProfile(commonData.sanitizedPlayerName, questPoints, 'questpoints');

    return {
      ...commonData,
      displayText,
      titleText,
      questPoints,
    };
  }

  processLevelPayload(payload, newId, unixTimestamp, humanReadableTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp, humanReadableTimestamp);
    const { levelledSkills, allSkills, combatLevel } = payload.extra;

    const [highestSkill, highestLevel] = Object.entries(levelledSkills).reduce((acc, [skill, level]) => ((level > acc[1]) ? [skill, level] : acc), ['', 0]);
    const titleText = `I levelled up ${highestSkill}`;

    let displayText = `I levelled my ${highestSkill} skill, I am now level ${highestLevel}.`;
    const otherSkillsText = Object.entries(levelledSkills).filter(([skill]) => skill !== highestSkill).map(([skill, level]) => `${skill} to ${level}`).join(', ');
    const combatLevelText = combatLevel.increased ? `My combat level increased to ${combatLevel.value}` : '';

    if (otherSkillsText) displayText += ` I also levelled ${otherSkillsText}.`;
    if (combatLevelText) displayText += ` ${combatLevelText}`;
    displayText += ` (${humanReadableTimestamp})`;

    return {
      ...commonData,
      displayText,
      titleText,
      levelledSkills,
      allSkills,
      combatLevel: combatLevel.value,
    };
  }

  processAchievementDiaryPayload(payload, newId, unixTimestamp, humanReadableTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp, humanReadableTimestamp);
    const { area, difficulty, total } = payload.extra;

    const titleText = `I have completed the ${difficulty} ${area} Achievement Diary.`;
    const displayText = `After completing all the ${difficulty} tasks in the ${area} region I have completed the ${difficulty} Achievement Diary tier for ${area}. (${humanReadableTimestamp})`;

    updatePointsInProfile(commonData.sanitizedPlayerName, total, 'achievements');

    return {
      ...commonData,
      displayText,
      titleText,
    };
  }

  processCombatAchievementPayload(payload, newId, unixTimestamp, humanReadableTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp, humanReadableTimestamp);
    const {
      tier, task, taskPoints, totalPoints, tierProgress, tierTotalPoints, justCompletedTier,
    } = payload.extra;

    let titleText = '';
    let displayText = '';

    if (justCompletedTier) {
      titleText = `I have unlocked the ${justCompletedTier.toLowerCase()} combat task rewards.`;
      displayText = `By completing the combat task: ${task}, I have earned enough points to unlock the rewards for the ${justCompletedTier.toLowerCase()} tier. 
      I now have ${totalPoints} total points. (${humanReadableTimestamp})`;
    } else {
      titleText = `I have completed an ${tier.toLowerCase()} combat task.`;
      displayText = `I completed the ${task} ${tier.toLowerCase()} combat task. I earned ${taskPoints} points for a total of ${totalPoints}. (${humanReadableTimestamp})`;
    }

    updatePointsInProfile(commonData.sanitizedPlayerName, totalPoints, 'combatachievements');

    return {
      ...commonData,
      displayText,
      titleText,
      taskPoints,
      totalPoints,
      tierProgress,
      tierTotalPoints,
      justCompletedTier,
    };
  }
}

module.exports = PayloadProcessor;
