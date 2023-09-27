const express = require('express');
const http = require('http');
const cors = require('cors');
const webhooks = require('./js/server/webhooks');
const hiscores = require('osrs-json-hiscores');

const app = express();
app.use(cors());
const server = http.createServer(app);
webhooks.initWebSocket(server);

app.use('/', webhooks.router);
app.use('/img', express.static('img'));
app.use('/js', express.static('js'));
app.use('/alog_assets', express.static('alog_assets'));
app.get('/log', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/fetchHiscores', async (req, res) => {
  const player = req.query.player;
  try {
    const response = await hiscores.getStats(player);
    console.log(response);
    res.send(response);
  } catch (error) {
    res.status(500).send('Error fetching hiscores');
  }
});

server.listen(3000, () => {
  console.log('Server started on http://localhost:3000/');
});
