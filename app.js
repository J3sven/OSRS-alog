const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const webhooks = require('./js/server/webhooks');
const hiscoresRoute = require('./js/server/hiscores');

const app = express();
app.use(cors());
const server = http.createServer(app);
webhooks.initWebSocket(server);

app.get('/', (req, res) => {
  res.redirect('/log');
});

app.use('/', webhooks.router);
app.use('/', hiscoresRoute);
app.use('/data', express.static('data'));
app.use('/img', express.static('img'));
app.use('/js/client', express.static('js/client'));
app.use('/css', express.static('css'));
app.use('/alog_assets', express.static('alog_assets'));

app.get('/log', (req, res) => {
  const { player } = req.query;
  const filePath = path.join(__dirname, 'index.html');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('An error occurred while reading the file.');
    }

    const modifiedData = data.replace(/playerName/g, player);
    res.send(modifiedData);
    return null;
  });
});

server.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('Server started on http://localhost:3000/');
});
