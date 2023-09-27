const express = require('express');
const http = require('http');
const cors = require('cors');
const webhooks = require('./js/server/webhooks');
const hiscoresRoute = require('./js/server/hiscores'); // Path to your new hiscoresRoutes.js

const app = express();
app.use(cors());
const server = http.createServer(app);
webhooks.initWebSocket(server);

app.use('/', webhooks.router);
app.use('/', hiscoresRoute); // Mount hiscores router here
app.use('/img', express.static('img'));
app.use('/js', express.static('js'));
app.use('/css', express.static('css'));
app.use('/alog_assets', express.static('alog_assets'));

app.get('/log', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

server.listen(3000, () => {
  console.log('Server started on http://localhost:3000/');
});
