const express = require('express');
const hiscores = require('osrs-json-hiscores');

const router = express.Router();

router.get('/fetchHiscores', async (req, res) => {
  const { player } = req.query;
  try {
    const response = await hiscores.getStats(player);
    res.send(response);
  } catch (error) {
    res.status(500).send('Error fetching hiscores');
  }
});

module.exports = router;
