// webhooks.js
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const WebSocket = require('ws');

const upload = multer();
const router = express.Router();

let receivedData = [];
let endpoints;
let wss;

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server });
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify(receivedData));
  });
};

try {
  const rawData = fs.readFileSync('endpoints.json', 'utf8');
  endpoints = new Map(JSON.parse(rawData));
} catch (e) {
  endpoints = new Map();
}

const saveEndpoints = () => {
  const data = JSON.stringify(Array.from(endpoints));
  fs.writeFileSync('endpoints.json', data);
};

function generateEndpointId() {
  return crypto.randomBytes(16).toString('hex');
}

router.get('/generate-endpoint', (req, res) => {
  const id = generateEndpointId();
  endpoints.set(id, true);
  saveEndpoints();
  res.send({ endpoint: `/webhook/${id}` });
});

let lastId = null;
let lastSource = null;
let tallyCount = 0;

router.post('/webhook/:id', upload.any(), (req, res) => {

  // if (!req.body || !req.body.payload_json) {
  //   return res.status(400).send('Invalid request body');
  // }

  console.log('Received webhook', req.body)
  const payload = {
    files: req.files,
    body: JSON.parse(req.body.payload_json)
  };

  const id = req.params.id;
  const isEnabled = endpoints.get(id);

  if (!isEnabled) {
    return res.status(403).send('Endpoint disabled');
  }

  console.log('Received webhook', payload);

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

router.post('/disable-endpoint/:id', (req, res) => {
  const id = req.params.id;
  const clientIP = req.ip || req.connection.remoteAddress;

  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).send('IP not allowed');
  }

  if (endpoints.has(id)) {
    endpoints.set(id, false);
    saveEndpoints();
    res.status(200).send('Endpoint disabled');
  } else {
    res.status(404).send('Endpoint not found');
  }
});


module.exports = {
  router: router,
  initWebSocket: initWebSocket
};