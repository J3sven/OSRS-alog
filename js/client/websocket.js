const ws = new WebSocket('ws://localhost:3000');

/**
  * Converts a markdown string to HTML.
  * @param {string} markdown The markdown string to convert.
  * @returns {string} The HTML string.
  */
function markdownToHtml(markdown) {
  return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}

let lastSource = null;
let isFirstFetch = true;
const logs = {};

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);

  if (message.action === 'update') {
    fetchAndUpdateLogs(message.playerName);
    return
  }

});

async function fetchLogsData(url) {
  const response = await fetch(url);
  return await response.json();
}

function sortLogsData(logsData) {
  logsData.sort((a, b) => new Date(b.id) - new Date(a.id));
}

function updateExistingElement(existingHeader, existingBody, id, titleText, displayText) {
  existingHeader.id = 'A' + id;
  existingHeader.innerHTML = `<span class="ui-icon ui-icon-triangle-1-e"></span><span class="Title">${titleText}</span>`;
  existingBody.id = 'A' + id + 'Body';
  existingBody.innerHTML = `<div class="AMBodyLiner"><p>${displayText}</p></div>`;
}

function createNewElement(id, titleText, displayText) {
  const newHeader = document.createElement('a');
  newHeader.className = 'AMHead ui-accordion-header ui-helper-reset ui-state-default ui-corner-all';
  newHeader.id = 'A' + id;
  newHeader.innerHTML = `<span class="ui-icon ui-icon-triangle-1-e"></span><span class="Title">${titleText}</span>`;

  const newBody = document.createElement('div');
  newBody.className = 'AMBody ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom';
  newBody.id = 'A' + id + 'Body';
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
    
    const logsData = await fetchLogsData(url);
    sortLogsData(logsData);
    
    const logsElement = document.getElementById('RAAccordion');

    if (isFirstFetch && logsData.length > 0) {
      logsElement.innerHTML = '';
      isFirstFetch = false;
    }

    const prevMostRecentLog = logsData.length ? logsData[0] : null;

    logsData.reverse().forEach((data, index) => {
      const { id, titleText, displayText } = data;
      const isTallyUpdate = prevMostRecentLog && (prevMostRecentLog.currentSource === data.currentSource);

      let existingHeader, existingBody;
      if (isTallyUpdate) {
        existingHeader = document.getElementById('A' + prevMostRecentLog.id);
        existingBody = document.getElementById('A' + prevMostRecentLog.id + 'Body');
      } else {
        existingHeader = document.getElementById('A' + id);
        existingBody = document.getElementById('A' + id + 'Body');
      }

      if (existingHeader && existingBody) {
        updateExistingElement(existingHeader, existingBody, id, titleText, displayText);
      } else {
        const { newHeader, newBody } = createNewElement(id, titleText, displayText);
        insertElementsIntoDOM(newHeader, newBody, logsElement);
        expandNewlyAddedElement(newHeader);
      }

      logs[id] = data;
    });
    
  } catch (error) {
    console.error('Failed to fetch and update logs:', error);
  }
}


window.onload = async function() {
  const playerName = 'J3_gg'; // Replace this with how you get the playerName
  await fetchAndUpdateLogs(playerName);
};