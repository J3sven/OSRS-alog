const admin = require('firebase-admin')
const express = require('express')

const router = express.Router()

router.get('/getLatestLogs/:username', async (req, res) => {
  const { username } = req.params
  const sanitizedUsername = username.replace(/ /g, '_').toLowerCase()

  const db = admin.firestore()
  const logCollectionRef = db.collection('players').doc(sanitizedUsername).collection('log')

  try {
    const snapshot = await logCollectionRef.orderBy('timestamp', 'desc').limit(10).get()

    if (snapshot.empty) {
      return res.status(404).send({ message: 'Logs not found' })
    }

    const logs = snapshot.docs.map((doc) => doc.data())
    return res.status(200).send(logs)
  } catch (error) {
    console.log('Error fetching logs:', error)
    return res.status(500).send({ message: 'Error fetching logs' })
  }
})

module.exports = router
