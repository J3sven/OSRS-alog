const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const upload = multer();
const hiscores = require('osrs-json-hiscores');

const app = express();
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use('/img', express.static('img'));
app.use('/alog_assets', express.static('alog_assets'));

let receivedData = [];

wss.on('connection', (ws) => {
  ws.send(JSON.stringify(receivedData));
});

let lastId = null;
let lastSource = null;
let tallyCount = 0;

app.post('/webhook', upload.any(), (req, res) => {
  const payload = {
    files: req.files,
    body: JSON.parse(req.body.payload_json)
  };

  const currentSource = payload.body.extra.source;
  const timestamp = new Date(payload.body.embeds[0].timestamp).toLocaleString();

  if (lastSource === currentSource) {
    tallyCount++;
  } else {
    tallyCount = 1;
    lastId = null; // Reset the lastId since the streak is broken
    lastSource = currentSource;
  }

  const titleText = `I killed ${tallyCount} ${currentSource}${tallyCount > 1 ? 's' : ''}.`;
  const displayText = `${titleText} (${timestamp})`;

  const newData = {
    id: lastId || payload.body.embeds[0].timestamp,
    currentSource,
    timestamp,
    displayText,
    titleText,
    tallyCount
  };

  if (lastId) {
    const index = receivedData.findIndex(item => item.id === lastId);
    if (index !== -1) {
      receivedData[index] = newData;
    }
  } else {
    receivedData.push(newData);
    lastId = newData.id;
  }

  if (receivedData.length > 10) {
    receivedData.shift();
  }

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(receivedData));
    }
  });

  res.status(200).send('Received');
});

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
