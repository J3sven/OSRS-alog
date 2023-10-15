// profileRoute.js
const admin = require('firebase-admin')
const express = require('express')

const router = express.Router()

router.get('/getProfile/:username', async (req, res) => {
  const { username } = req.params
  const sanitizedUsername = username.replace(/ /g, '_').toLowerCase()

  const db = admin.firestore()
  const profileRef = db.collection('players').doc(sanitizedUsername).collection('profile')

  try {
    const snapshot = await profileRef.get()

    if (snapshot.empty) {
      return res.status(404).send({ message: 'Profile not found' })
    }

    const [profileDataDoc] = snapshot.docs.map((doc) => doc.data())
    return res.status(200).send(profileDataDoc)
  } catch (error) {
    console.log('Error fetching profile:', error)
    return res.status(500).send({ message: 'Error fetching profile' })
  }
})

module.exports = router
