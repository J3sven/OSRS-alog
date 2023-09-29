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
  logsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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
    
    const newLogsData = await fetchLogsData(url);
    sortLogsData(newLogsData);
    
    const logsElement = document.getElementById('RAAccordion');

    if (isFirstFetch && newLogsData.length > 0) {
      logsElement.innerHTML = '';
      isFirstFetch = false;
    }

    let prevLog = null;

    newLogsData.reverse().forEach((currentLog) => {
      const { id, titleText, displayText } = currentLog;
      
      if (prevLog && prevLog.currentSource === currentLog.currentSource) {
        // If this log is a continuation of a tally, update existing
        const existingHeader = document.getElementById('A' + prevLog.id);
        const existingBody = document.getElementById('A' + prevLog.id + 'Body');
        
        if (existingHeader && existingBody) {
          updateExistingElement(existingHeader, existingBody, id, titleText, displayText);
          logs[id] = currentLog;
          prevLog = currentLog;
          return;
        }
      }

      const existingHeader = document.getElementById('A' + id);
      const existingBody = document.getElementById('A' + id + 'Body');

      if (existingHeader && existingBody) {
        updateExistingElement(existingHeader, existingBody, id, titleText, displayText);
      } else {
        const { newHeader, newBody } = createNewElement(id, titleText, displayText);
        insertElementsIntoDOM(newHeader, newBody, logsElement);
        expandNewlyAddedElement(newHeader);
      }
      logs[id] = currentLog;
      prevLog = currentLog;
    });
    
  } catch (error) {
    console.error('Failed to fetch and update logs:', error);
  }
}
window.onload = async function() {
  const playerName = 'J3_gg'; // Replace this with how you get the playerName
  await fetchAndUpdateLogs(playerName);
};