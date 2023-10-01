const ws = new WebSocket('ws://localhost:3000');

let isFirstFetch = true;
const logs = {};

async function fetchLogsData(url) {
  const response = await fetch(url);
  return response.json();
}

function sortLogsData(logsData) {
  logsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function updateExistingElement(headerElem, bodyElem, id, titleText, displayText) {
  const existingHeader = headerElem;
  const existingBody = bodyElem;

  existingHeader.id = `A${id}`;
  existingHeader.innerHTML = `<span class="ui-icon ui-icon-triangle-1-e"></span><span class="Title">${titleText}</span>`;

  existingBody.id = `A${id}Body`;
  existingBody.innerHTML = `<div class="AMBodyLiner"><p>${displayText}</p></div>`;
}

function createNewElement(id, titleText, displayText) {
  const newHeader = document.createElement('a');
  newHeader.className = 'AMHead ui-accordion-header ui-helper-reset ui-state-default ui-corner-all';
  newHeader.id = `A${id}`;
  newHeader.innerHTML = `<span class="ui-icon ui-icon-triangle-1-e"></span><span class="Title">${titleText}</span>`;

  const newBody = document.createElement('div');
  newBody.className = 'AMBody ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom';
  newBody.id = `A${id}Body`;
  newBody.style.height = '0px';
  newBody.innerHTML = `<div class="AMBodyLiner"><p>${displayText}</p></div>`;

  return { newHeader, newBody };
}

function insertElementsIntoDOM(newHeader, newBody, logsElement) {
  if (logsElement.firstChild) {
    logsElement.insertBefore(newBody, logsElement.firstChild);
    logsElement.insertBefore(newHeader, logsElement.firstChild);
  } else {
    logsElement.appendChild(newHeader);
    logsElement.appendChild(newBody);
  }
}

async function fetchAndUpdateLogs(playerName) {
  try {
    const sanitizedPlayerName = playerName.replace(/ /g, '_');
    const url = `/data/${sanitizedPlayerName}/log.json`;

    const newLogsData = await fetchLogsData(url);
    sortLogsData(newLogsData);

    const logsElement = document.getElementById('RAAccordion');

    if (isFirstFetch && newLogsData.length > 0) {
      logsElement.innerHTML = '';
      isFirstFetch = false;
    }

    let prevLog = null;

    newLogsData.reverse().forEach((currentLog) => {
      const {
        type, id, titleText, displayText,
      } = currentLog;

      if (prevLog && prevLog.currentSource === currentLog.currentSource) {
        // If this log is a continuation of a tally, update existing
        const existingHeader = document.getElementById(`A${prevLog.id}`);
        const existingBody = document.getElementById(`A${prevLog.id}Body`);

        if (existingHeader && existingBody) {
          updateExistingElement(existingHeader, existingBody, id, titleText, displayText);
          logs[id] = currentLog;
          prevLog = currentLog;
          return;
        }
      }

      if (type === 'QUEST' && !logs[id]) {
        const { newHeader, newBody } = createNewElement(id, titleText, displayText);
        insertElementsIntoDOM(newHeader, newBody, logsElement);
        logs[id] = currentLog;
        return;
      }

      const existingHeader = document.getElementById(`A${id}`);
      const existingBody = document.getElementById(`A${id}Body`);

      if (existingHeader && existingBody) {
        updateExistingElement(existingHeader, existingBody, id, titleText, displayText);
      } else {
        const { newHeader, newBody } = createNewElement(id, titleText, displayText);
        insertElementsIntoDOM(newHeader, newBody, logsElement);
        // eslint-disable-next-line no-undef
        expandNewlyAddedElement(newHeader);
      }
      logs[id] = currentLog;
      prevLog = currentLog;
    });
  } catch (error) {
    console.error('Failed to fetch and update logs:', error);
  }
}

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.action === 'update') {
    fetchAndUpdateLogs(message.playerName);
  }
});

window.onload = async function handleOnLoad() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerName = urlParams.get('player');
  const sanitizedPlayerName = playerName.replace(/ /g, '_');
  await fetchAndUpdateLogs(playerName);

  function imageExists(url, callback) {
    const img = new Image();
    img.onload = function onLoad() { callback(true); };
    img.onerror = function onError() { callback(false); };
    img.src = url;
  }

  const headPath = `/data/${sanitizedPlayerName}/img/head.png`;
  const bodyPath = `/data/${sanitizedPlayerName}/img/full.png`;

  imageExists(headPath, (exists) => {
    if (exists) {
      document.querySelector('#avatar img.head').src = headPath;
    }
  });

  imageExists(bodyPath, (exists) => {
    if (exists) {
      document.querySelector('#avatar img.body').src = bodyPath;
    }
  });
};
