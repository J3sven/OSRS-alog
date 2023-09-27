const express = require('express');
const hiscores = require('osrs-json-hiscores');
const router = express.Router();

router.get('/fetchHiscores', async (req, res) => {
  const player = req.query.player;
  try {
    const response = await hiscores.getStats(player);
    console.log(response);
    res.send(response);
  } catch (error) {
    res.status(500).send('Error fetching hiscores');
  }
});

module.exports = router;