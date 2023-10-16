const admin = require('firebase-admin')
const serviceAccount = require('../../serviceAccountKey.json')

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()

/**
 * Sanitizes the player name by replacing spaces with underscores.
 * @param {string} playerName The player name to sanitize.
 * @returns {string} The sanitized player name.
 */
function sanitizePlayerName(playerName) {
  return playerName.replace(/ /g, '_').toLowerCase()
}

/**
 * Updates the log data, tallying if necessary.
 * @param {object} logData The existing log data.
 * @param {string} type The type of data.
 * @param {object} processedData The processed data.
 * @returns {object} The updated log data.
 */
function updateLogData(logData, type, processedData) {
  const updatedLogData = [...logData] // Clone logData

  // Initialize or read existing tallyCount and lastBoss
  let { tallyCount, lastBoss } = logData.length > 0 ? logData[logData.length - 1] : { tallyCount: 0, lastBoss: null }

  // Initialize newLogEntry without tallyCount and lastBBoss
  const newLogEntry = { type, ...processedData }

  // Update the tally count based on the type and boss name
  if (type === 'bosskill') {
    console.log('bosskill', processedData)
    if (lastBoss === processedData.source) {
      tallyCount += 1
    } else {
      tallyCount = 1
      lastBoss = processedData.source
    }

    // Add tallyCount and lastBoss only if type is 'bossKill'
    newLogEntry.tallyCount = tallyCount
    newLogEntry.lastBoss = lastBoss
  } else {
    console.log('not bosskill')
    tallyCount = 0
    lastBoss = null
  }

  updatedLogData.push(newLogEntry)

  return updatedLogData
}

/**
 * Stores the payload in the relevant JSON files in the user data directory.
 * @param {string} playerName The player name.
 * @param {string} type The type of data.
 * @param {object} processedData The processed data.
 */

function toPlainObject(obj) {
  return JSON.parse(JSON.stringify(obj))
}

async function storePayload(playerName, type, processedData) {
  const sanitizedPlayerName = sanitizePlayerName(playerName).toLowerCase()

  const playerRef = db.collection('players').doc(sanitizedPlayerName)
  const typeCollectionRef = playerRef.collection(type)

  // Check if the type already exists for this player
  const existingTypeDoc = await typeCollectionRef.doc(processedData.id).get()

  if (existingTypeDoc.exists) {
    await typeCollectionRef.doc(processedData.id).update(toPlainObject(processedData))
  } else {
    await typeCollectionRef.doc(processedData.id).set(toPlainObject(processedData))
  }

  const logCollectionRef = playerRef.collection('log')

  // Fetch log data for this player
  const logData = await logCollectionRef.get()

  const updatedLogData = updateLogData(logData.docs.map((doc) => doc.data()), type, processedData)

  // Add a new log entry or update an existing one
  const newLogData = toPlainObject(updatedLogData[updatedLogData.length - 1])
  const logId = newLogData.id || new Date().toISOString()

  const existingLogDoc = await logCollectionRef.doc(logId).get()

  if (existingLogDoc.exists) {
    await logCollectionRef.doc(logId).update(newLogData)
  } else {
    await logCollectionRef.doc(logId).set(newLogData)
  }
}

module.exports = {
  storePayload,
}
