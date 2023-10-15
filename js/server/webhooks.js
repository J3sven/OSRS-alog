// webhooks.js
const fs = require('fs')
const crypto = require('crypto')
const express = require('express')
const multer = require('multer')
const admin = require('firebase-admin')
const WebSocket = require('ws')
const serviceAccount = require('../../serviceAccountKey.json')
const PayloadProcessor = require('./payloadprocessor')
const { storePayload } = require('./store')
const { sendToWebSocketClients } = require('./websockethandler')

const upload = multer()
const router = express.Router()
const clientProcessors = {}
const INACTIVITY_TIMEOUT = 60000
const allowedIPs = []
const receivedData = []
let endpoints
let wss

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server })
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify(receivedData))
  })
}

try {
  const rawData = fs.readFileSync('endpoints.json', 'utf8')
  endpoints = new Map(JSON.parse(rawData))
} catch (e) {
  endpoints = new Map()
}

const saveEndpoints = () => {
  const data = JSON.stringify(Array.from(endpoints))
  fs.writeFileSync('endpoints.json', data)
}

function generateEndpointId() {
  return crypto.randomBytes(16).toString('hex')
}

router.get('/generate-endpoint', async (req, res) => {
  if (!req.session || !req.session.userInfo) {
    return res.status(401).send({ message: 'Unauthorized' })
  }

  const id = generateEndpointId()
  endpoints.set(id, true)
  saveEndpoints()

  // Store endpoint id in the user's Firebase document
  const userRef = db.collection('users').doc(req.session.userInfo.id)
  await userRef.update({
    webhooks: admin.firestore.FieldValue.arrayUnion(id),
  })

  res.send({ endpoint: `/webhook/${id}` })
  return null
})

router.post('/webhook/:id', upload.any(), async (req, res) => {
  if (!req.body || !req.body.payload_json) {
    return res.status(400).send('Invalid request body')
  }

  const payload = {
    files: req.files,
    body: JSON.parse(req.body.payload_json),
  }
  const { playerName } = payload.body
  const sanitizedPlayerName = playerName.replace(/ /g, '_')
  const { id } = req.params
  const isEnabled = endpoints.get(id)

  if (!isEnabled) {
    return res.status(403).send('Endpoint disabled')
  }

  // Find user document by webhook id
  const userSnapshot = await db.collection('users').where('webhooks', 'array-contains', id).limit(1).get()

  if (userSnapshot.empty) {
    return res.status(403).send('User not found for this webhook')
  }

  const userDoc = userSnapshot.docs[0]
  const userData = userDoc.data()

  // Add the playerName under a "characters" node if it doesn't exist yet
  if (!userData.characters || !userData.characters.includes(sanitizedPlayerName)) {
    await db.collection('users').doc(userDoc.id).update({
      characters: admin.firestore.FieldValue.arrayUnion(sanitizedPlayerName),
    })
  }

  if (!clientProcessors[sanitizedPlayerName]) {
    console.log(`Creating new PayloadProcessor for ${sanitizedPlayerName}, we now have ${Object.keys(clientProcessors).length + 1} active processors`)
    clientProcessors[sanitizedPlayerName] = new PayloadProcessor()
  }

  clientProcessors[sanitizedPlayerName].updateActivity()

  clientProcessors[sanitizedPlayerName].processPayload(payload, storePayload)
  sendToWebSocketClients(wss, sanitizedPlayerName)

  res.status(200).send('Received')
  return null
})

router.post('/disable-endpoint/:id', (req, res) => {
  const { id } = req.params
  const clientIP = req.ip || req.socket.remoteAddress

  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).send('IP not allowed')
  }

  if (endpoints.has(id)) {
    endpoints.set(id, false)
    saveEndpoints()
    res.status(200).send('Endpoint disabled')
    return null
  }
  res.status(404).send('Endpoint not found')
  return null
})

// Keep track of active PayloadProcessor instances and remove them if inactive
setInterval(() => {
  const now = new Date().getTime()
  Object.entries(clientProcessors).forEach(([key, processor]) => {
    if (now - processor.lastActivity > INACTIVITY_TIMEOUT) {
      console.log(`Removing inactive PayloadProcessor for ${key}, we now have ${Object.keys(clientProcessors).length - 1} active processors`)
      delete clientProcessors[key]
    }
  })
}, INACTIVITY_TIMEOUT)

module.exports = {
  router,
  initWebSocket,
}
