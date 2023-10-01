const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { updatePointsInProfile } = require('./updateprofile');

class PayloadProcessor {
  constructor() {
    this.lastId = null;
    this.lastActivity = new Date().getTime();
    this.methodNameCache = {};

    try {
      const processorData = JSON.parse(fs.readFileSync(path.join(__dirname, './processorData.json'), 'utf8'));
      const { raredrops, allbosses } = processorData;
      this.excludedItemIds = raredrops;
      this.allbosses = allbosses;
    } catch (err) {
      console.error('Error reading processorData.json:', err);
      this.excludedItemIds = [];
      this.allbosses = [];
    }

    this.hash = crypto.createHash('sha256');
  }

  updateActivity() {
    this.lastActivity = new Date().getTime();
  }

  static generateTimeBasedHash(hash) {
    const hashClone = hash.copy();
    hashClone.update(Date.now().toString());
    return hashClone.digest('hex').substring(0, 12);
  }

  getMethodName(type) {
    if (!this.methodNameCache[type]) {
      this.methodNameCache[type] = `process${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase().replace(/_([a-z])/g, (match, p1) => p1.toUpperCase())}Payload`;
    }
    return this.methodNameCache[type];
  }

  formatDisplayText(commonData, titlePart, displayPart, extraData = {}) {
    return {
      ...commonData,
      displayText: `${displayPart} (${commonData.timestamp})`,
      titleText: titlePart,
      ...extraData,
    };
  }

  processPayload(payload, storePayload) {
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const { type, playerName } = payload.body;
    const newId = PayloadProcessor.generateTimeBasedHash(this.hash);

    const processorMethod = this.getMethodName(type);
    if (this[processorMethod]) {
      const processedData = this[processorMethod](payload.body, newId, unixTimestamp);
      if (processedData !== null) {
        storePayload(playerName, type, processedData);
      }

      // Check for bosses in loot payload and generate boss kill payload if applicable
      if (type === 'LOOT' && this.allbosses.includes(payload.body.extra.source)) {
        console.log('boss kill payload check');
        const bossKillPayload = this.processBossKillPayload(payload.body, newId, unixTimestamp);
        if (bossKillPayload !== null) {
          storePayload(playerName, 'bosskill', bossKillPayload);
        }
      }

      return processedData;
    }
    return {};
  }

  convertUnixToHumanReadable(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000);
    const day = date.getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) {
      suffix = 'st';
    } else if (day === 2 || day === 22) {
      suffix = 'nd';
    } else if (day === 3 || day === 23) {
      suffix = 'rd';
    }

    return `${day}${suffix} ${month} ${year}`;
  }

  processPayloadCommon(payload, newId, unixTimestamp) {
    const sanitizedPlayerName = payload.playerName.replace(/[^a-zA-Z0-9]/g, '_');
    const humanReadableTimestamp = this.convertUnixToHumanReadable(unixTimestamp);

    return {
      id: newId,
      ...payload.extra,
      timestamp: humanReadableTimestamp,
      sanitizedPlayerName,
    };
  }

  // updateTally(currentSource, newId) {
  //   if (this.lastSource === currentSource) {
  //     this.tallyCount += 1;
  //     return this.lastId;
  //   }
  //   this.tallyCount = 1;
  //   this.lastId = newId;
  //   return this.lastId;
  // }

  formatItemList(items) {
    if (items.length === 0) {
      return '';
    }
    if (items.length === 1) {
      return items[0];
    }
    return `${items.slice(0, -1).join(', ')} and ${items.slice(-1)}`;
  }

  chooseArticle(word) {
    return ['a', 'e', 'i', 'o', 'u'].includes(word[0].toLowerCase()) ? 'an' : 'a';
  }

  processLootPayload(payload, newId, unixTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp);
    const { source, items, category } = payload.extra;
    const expensiveItems = items.filter((item) => item.priceEach >= 250000 || this.excludedItemIds.includes(item.id));

    if (expensiveItems.length === 0 || category === 'CLUE') return null;

    const expensiveItemNames = expensiveItems.map((item) => item.name);
    return this.formatDisplayText(
      commonData,
      `I found ${this.formatItemList(expensiveItemNames)}`,
      `After killing ${this.chooseArticle(source)} ${source}, it dropped ${this.formatItemList(expensiveItemNames)}`,
    );
  }

  processBossKillPayload(payload, newId, unixTimestamp) {
    console.log('boss kill payload invoked', payload);
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp);
    const { source } = payload.extra;
    return this.formatDisplayText(
      commonData,
      `I killed ${source}`,
      `I killed 1 ${source}`,
    );
  }

  processQuestPayload(payload, newId, unixTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp);
    const { questName, questPoints } = payload.extra;

    updatePointsInProfile(commonData.sanitizedPlayerName, questPoints, 'questpoints');
    return this.formatDisplayText(
      commonData,
      `I completed the quest ${questName}.`,
      `I completed the quest ${questName}. I now have ${questPoints} Quest points.`,
      { questPoints },
    );
  }

  processLevelPayload(payload, newId, unixTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp);
    const { levelledSkills } = payload.extra;
    const [highestSkill, highestLevel] = Object.entries(levelledSkills).reduce((acc, [skill, level]) => (level > acc[1] ? [skill, level] : acc), ['', 0]);
    return this.formatDisplayText(
      commonData,
      `I levelled up ${highestSkill}`,
      `I levelled my ${highestSkill} skill, I am now level ${highestLevel}`,
    );
  }

  processAchievementDiaryPayload(payload, newId, unixTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp);
    const { area, difficulty, total } = payload.extra;
    updatePointsInProfile(commonData.sanitizedPlayerName, total, 'achievements');
    return this.formatDisplayText(
      commonData,
      `I have completed the ${difficulty} ${area} Achievement Diary.`,
      `After completing all the ${difficulty} tasks in the ${area} region I have completed the ${difficulty} Achievement Diary tier for ${area}.`,
      { total },
    );
  }

  processCluePayload(payload, newId, unixTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp);
    const { clueType, numberCompleted, items } = payload.extra;
    const itemNames = items.map((item) => `${item.name} x${item.quantity}`).join(', ');
    return this.formatDisplayText(
      commonData,
      `I have completed ${this.chooseArticle(clueType)} ${clueType} treasure trail.`,
      `I've completed ${numberCompleted} in total. I obtained: ${itemNames}.`,
    );
  }

  processKillCountPayload(payload, newId, unixTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp);
    const { boss, count } = payload.extra;
    return this.formatDisplayText(
      commonData,
      `I killed ${boss}.`,
      `I have defeated ${boss} for a total lifetime killcount of ${count}.`,
    );
  }

  processSpeedrunPayload(payload, newId, unixTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp);
    const { questName, currentTime } = payload.extra;
    return this.formatDisplayText(
      commonData,
      `I beat my ${questName} speedrun record.`,
      `I just beat my personal best in a speedrun of ${questName} with a time of ${currentTime}.`,
    );
  }

  processCollectionPayload(payload, newId, unixTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp);
    const { itemName, completedEntries, totalEntries } = payload.extra;
    updatePointsInProfile(commonData.sanitizedPlayerName, completedEntries, 'collectionLog');
    return this.formatDisplayText(
      commonData,
      `I added ${itemName} to my collection log.`,
      `I added ${itemName} to my collection log. I now have ${completedEntries} out of ${totalEntries} entries filled in the collection log.`,
      { completedEntries, totalEntries },
    );
  }

  processCombatAchievementPayload(payload, newId, unixTimestamp) {
    const commonData = this.processPayloadCommon(payload, newId, unixTimestamp);
    const {
      tier, task, totalPoints, justCompletedTier,
    } = payload.extra;
    updatePointsInProfile(commonData.sanitizedPlayerName, totalPoints, 'combatachievements');
    const titleText = justCompletedTier
      ? `I have unlocked the ${justCompletedTier.toLowerCase()} combat task rewards.`
      : `I have completed ${this.chooseArticle(tier)} ${tier.toLowerCase()} combat task.`;
    const displayText = justCompletedTier
      ? `By completing the combat task: ${task}, I have earned enough points to unlock the rewards for the ${justCompletedTier.toLowerCase()} tier. I now have ${totalPoints} total points.`
      : `I completed the ${task} ${tier.toLowerCase()} combat task. I earned points for a total of ${totalPoints}.`;
    return this.formatDisplayText(
      commonData,
      titleText,
      displayText,
      { totalPoints, justCompletedTier },
    );
  }
}

module.exports = PayloadProcessor;
