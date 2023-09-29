// webhooks.js
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const WebSocket = require('ws');
const PayloadProcessor = require('./payloadprocessor');
const { storePayload } = require('./store');
const { sendToWebSocketClients } = require('./websockethandler');

const upload = multer();
const router = express.Router();
const clientProcessors = {};
const INACTIVITY_TIMEOUT = 60000;
const allowedIPs = [];
const receivedData = [];
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
    body: JSON.parse(req.body.payload_json),
  };
  const { playerName } = payload.body;
  const sanitizedPlayerName = playerName.replace(/ /g, '_');
  const { id } = req.params;
  const isEnabled = endpoints.get(id);

  if (!isEnabled) {
    return res.status(403).send('Endpoint disabled');
  }

  // Get or create a PayloadProcessor instance for this player
  if (!clientProcessors[sanitizedPlayerName]) {
    clientProcessors[sanitizedPlayerName] = new PayloadProcessor();
  }

  // Update lastActivity for this PayloadProcessor instance
  clientProcessors[sanitizedPlayerName].updateActivity();

  // Process payload using the client's own PayloadProcessor instance
  clientProcessors[sanitizedPlayerName].processPayload(payload, storePayload);
  sendToWebSocketClients(wss, sanitizedPlayerName);

  res.status(200).send('Received');
  return null;
});

router.post('/disable-endpoint/:id', (req, res) => {
  const { id } = req.params;
  const clientIP = req.ip || req.connection.remoteAddress;

  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).send('IP not allowed');
  }

  if (endpoints.has(id)) {
    endpoints.set(id, false);
    saveEndpoints();
    res.status(200).send('Endpoint disabled');
    return null;
  }
  res.status(404).send('Endpoint not found');
  return null;
});

// Keep track of active PayloadProcessor instances and remove them if inactive
setInterval(() => {
  const now = new Date().getTime();
  Object.entries(clientProcessors).forEach(([key, processor]) => {
    if (now - processor.lastActivity > INACTIVITY_TIMEOUT) {
      delete clientProcessors[key];
      // eslint-disable-next-line no-console
      console.log(`Removed PayloadProcessor for ${key} due to inactivity.`);
    }
  });
}, INACTIVITY_TIMEOUT);

module.exports = {
  router,
  initWebSocket,
};
