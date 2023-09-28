// webhooks.js
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const WebSocket = require('ws');
const { processPayload, updateReceivedData, sendToWebSocketClients } = require('./parselog');

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

router.post('/webhook/:id', upload.any(), (req, res) => {

  if (!req.body || !req.body.payload_json) {
    return res.status(400).send('Invalid request body');
  }

  const payload = {
    files: req.files,
    body: JSON.parse(req.body.payload_json)
  };

  const id = req.params.id;
  const isEnabled = endpoints.get(id);

  if (!isEnabled) {
    return res.status(403).send('Endpoint disabled');
  }

  const newData = processPayload(payload);
  receivedData = updateReceivedData(receivedData, newData);
  sendToWebSocketClients(wss, receivedData);

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