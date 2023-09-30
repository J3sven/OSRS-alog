const express = require('express');
const fs = require('fs');
const path = require('path');
const hiscores = require('osrs-json-hiscores');

const router = express.Router();

router.get('/updateProfile/:player', async (req, res) => {
  const { player } = req.params;
  const profilePath = path.join(__dirname, '..', '..', `data/${player}/profile.json`);
  let existingData = {};

  if (fs.existsSync(profilePath)) {
    const rawExistingData = fs.readFileSync(profilePath, 'utf8');
    existingData = JSON.parse(rawExistingData);
  }

  try {
    const hiscoreData = await hiscores.getStats(player);
    const updatedData = {
      Skills: {
        ...hiscoreData.main.skills,
        TotalLevel: {
          rank: hiscoreData.main.skills.overall.rank,
          level: hiscoreData.main.skills.overall.level,
          xp: hiscoreData.main.skills.overall.xp,
        },
      },
      Activities: {
        soulWarsZeal: hiscoreData.main.soulWarsZeal,
        riftsClosed: hiscoreData.main.riftsClosed,
        ...hiscoreData.main.bountyHunter,
        ...hiscoreData.main.clues,
        ...hiscoreData.main.bosses,
      },
      collectionLog: existingData.collectionLog || 0,
      achievements: existingData.achievements || 0,
      combatachievements: existingData.combatachievements || 0,
      questpoints: existingData.questpoints || 0,
    };

    fs.mkdirSync(path.dirname(profilePath), { recursive: true });
    fs.writeFileSync(profilePath, JSON.stringify(updatedData), 'utf8');

    res.status(200).send({ message: 'Profile updated successfully' });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('Error fetching and updating profile:', error);
    res.status(500).send({ message: 'Error fetching and updating profile' });
  }
});

const updateQuestPointsInProfile = (player, questPoints) => {
  const profilePath = path.join(__dirname, '..', '..', `data/${player}/profile.json`);
  console.log('profilePath', profilePath);

  if (fs.existsSync(profilePath)) {
    const rawExistingData = fs.readFileSync(profilePath, 'utf8');
    const existingData = JSON.parse(rawExistingData);

    existingData.questpoints = questPoints;

    fs.writeFileSync(profilePath, JSON.stringify(existingData), 'utf8');
  }
};

module.exports = {
  router,
  updateQuestPointsInProfile,
};
