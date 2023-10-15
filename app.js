require('dotenv').config()
const express = require('express')
const http = require('http')
const cors = require('cors')
const querystring = require('querystring')
const fetch = require('node-fetch')
const session = require('express-session')
const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')
const serviceAccount = require('./serviceAccountKey.json')
const webhooks = require('./js/server/webhooks')
const hiscoresRoute = require('./js/server/hiscores')
const profileRoute = require('./js/server/profileRoute')
const logRoute = require('./js/server/logRoute')
const { router: updateProfileRouter } = require('./js/server/updateprofile')

const app = express()
app.set('view engine', 'ejs')
app.use(cors())
app.use(express.json())

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()

class FirestoreSessionStore extends session.Store {
  constructor() {
    super()
    this.db = db.collection('sessions')
  }

  async get(sid, callback) {
    const doc = await this.db.doc(sid).get()
    if (!doc.exists) {
      return callback(null, null)
    }
    return callback(null, doc.data().session)
  }

  async set(sid, callback) {
    await this.db.doc(sid).set({ session })
    callback(null)
  }

  async destroy(sid, callback) {
    await this.db.doc(sid).delete()
    callback(null)
  }
}

const firestoreSessionStore = new FirestoreSessionStore()

// Initialize session
app.use(session({
  firestoreSessionStore, // Use Firestore as session store
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
  },
}))
const server = http.createServer(app)
webhooks.initWebSocket(server)

app.use('/', webhooks.router)
app.use('/', updateProfileRouter)
app.use('/', hiscoresRoute)
app.use('/', profileRoute)
app.use('/', logRoute)
app.use('/data', express.static('data'))
app.use('/img', express.static('img'))
app.use('/js/client', express.static('js/client'))
app.use('/css', express.static('css'))
app.use('/alog_assets', express.static('alog_assets'))

const redirectUri = 'http://localhost:3000/auth/discord/callback'
const clientId = process.env.DISCORD_CLIENT_ID
const clientSecret = process.env.DISCORD_CLIENT_SECRET

app.get('/auth/discord', (req, res) => {
  const oauthURL = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&scope=identify&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`
  res.redirect(oauthURL)
})

app.get('/auth/discord/callback', async (req, res) => {
  const { code } = req.query

  const tokenData = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
    scope: 'identify',
  }

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: querystring.stringify(tokenData),
  })

  const tokenJSON = await response.json()
  const accessToken = tokenJSON.access_token

  const userInfoResponse = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const userInfo = await userInfoResponse.json()
  const userRef = db.collection('users').doc(userInfo.id)
  const userSnapshot = await userRef.get()

  if (userSnapshot.exists) {
    // Update only session-relevant data, keeping existing data like webhooks and characters
    await userRef.update(userInfo)
  } else {
    // Create a new document with userInfo if it doesn't exist yet
    await userRef.set(userInfo)
  }

  req.session.userInfo = userInfo

  res.redirect('/')
})

app.get('/api/user', (req, res) => {
  if (req.session.userInfo) {
    res.json({ authenticated: true, userInfo: req.session.userInfo })
  } else {
    res.json({ authenticated: false })
  }
})

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/log', (req, res) => {
  const { player } = req.query
  res.render('log', { playerName: player })
})

app.get('/login', (req, res) => {
  res.render('login')
})

app.get('/checkImageExistence/:playerName', (req, res) => {
  const { playerName } = req.params
  const headPath = path.join(__dirname, `./data/${playerName}/img/head.png`)
  const bodyPath = path.join(__dirname, `./data/${playerName}/img/full.png`)

  const result = {
    headExists: fs.existsSync(headPath),
    bodyExists: fs.existsSync(bodyPath),
  }

  res.json(result)
})

app.get('/user-settings', async (req, res) => {
  if (!req.session || !req.session.userInfo) {
    return res.redirect('/')
  }

  const userId = req.session.userInfo.id
  const userRef = db.collection('users').doc(userId)
  const userSnapshot = await userRef.get()

  if (!userSnapshot.exists) {
    return res.status(404).send('User not found')
  }

  const userData = userSnapshot.data()
  const userwebhooks = userData.webhooks || []
  const characters = userData.characters || []

  res.render('user-settings', { userwebhooks, characters, userData })
})

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.json({ loggedOut: false })
    }
    res.json({ loggedOut: true })
    return null
  })
})

server.listen(3000, () => {
  console.log('Server started on http://localhost:3000/')
})
