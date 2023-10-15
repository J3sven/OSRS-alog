const express = require('express')
const admin = require('firebase-admin')
const hiscores = require('osrs-json-hiscores')
const serviceAccount = require('../../serviceAccountKey.json')

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()

const router = express.Router()

router.get('/updateProfile/:player', async (req, res) => {
  const { player } = req.params
  const sanitizedPlayerName = player.replace(/ /g, '_').toLowerCase()
  const playerRef = db.collection('players').doc(sanitizedPlayerName)
  const profileRef = playerRef.collection('profile')

  let existingData = await profileRef.get()
  if (!existingData.empty) {
    const [existingDataDoc] = await profileRef.get().then((snapshot) => snapshot.docs.map((doc) => doc.data()))
    existingData = existingDataDoc || {}
  }

  try {
    const hiscoreData = await hiscores.getStats(player)
    const updatedData = {
      Skills: {
        ...hiscoreData.main.skills,
        TotalLevel: {
          rank: hiscoreData.main.skills.overall.rank,
          level: hiscoreData.main.skills.overall.level,
          xp: hiscoreData.main.skills.overall.xp,
        },
      },
      Activities: {
        soulWarsZeal: hiscoreData.main.soulWarsZeal,
        riftsClosed: hiscoreData.main.riftsClosed,
        ...hiscoreData.main.bountyHunter,
        ...hiscoreData.main.clues,
        ...hiscoreData.main.bosses,
      },
      collectionLog: existingData.collectionLog || 0,
      achievements: existingData.achievements || 0,
      combatachievements: existingData.combatachievements || 0,
      questpoints: existingData.questpoints || 0,
    }

    await profileRef.add(updatedData)

    res.status(200).send({ message: 'Profile updated successfully' })
  } catch (error) {
    console.log('Error fetching and updating profile:', error)
    res.status(500).send({ message: 'Error fetching and updating profile' })
  }
})

const updatePointsInProfile = async (player, points, key) => {
  const sanitizedPlayerName = player.replace(/ /g, '_').toLowerCase()
  const playerRef = db.collection('players').doc(sanitizedPlayerName)
  const profileRef = playerRef.collection('profile')

  const existingData = await profileRef.get()

  if (!existingData.empty) {
    const docId = existingData.docs[0].id
    await profileRef.doc(docId).update({ [key]: points })
  }
}

module.exports = {
  router,
  updatePointsInProfile,
}
