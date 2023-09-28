const ws = new WebSocket('ws://localhost:3000');

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

async function fetchAndUpdateLogs(playerName) {
  try {
    // Construct the URL to fetch
    const sanitizedPlayerName = playerName.replace(/ /g, '_');
    const url = `/data/${sanitizedPlayerName}/log.json`;

    // Fetch the log.json file
    const response = await fetch(url);

    // Parse the JSON response
    const logsData = await response.json();

    // Sort logsData if necessary
    logsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Get logsElement
    const logsElement = document.getElementById('RAAccordion');

    if (isFirstFetch && logsData.length > 0) {
      logsElement.innerHTML = '';
      isFirstFetch = false;
    }

    // Update UI based on logsData
    logsData.forEach((data, index) => {
      const id = data.id;
      const titleText = data.titleText;
      const displayText = data.displayText;
    
      const existingHeader = document.getElementById('A' + id);
      const existingBody = document.getElementById('A' + id + 'Body');
    
      if (existingHeader && existingBody) {
        // Update existing elements if they exist
        existingHeader.innerHTML = `<span class="ui-icon ui-icon-triangle-1-e"></span><span class="Title">${titleText}</span>`;
        existingBody.innerHTML = `<div class="AMBodyLiner"><p>${displayText}</p></div>`;
      } else {
        // Create new elements if they don't exist
        const newHeader = document.createElement('a');
        newHeader.className = 'AMHead ui-accordion-header ui-helper-reset ui-state-default ui-corner-all';
        newHeader.id = 'A' + id;
        newHeader.innerHTML = `<span class="ui-icon ui-icon-triangle-1-e"></span><span class="Title">${titleText}</span>`;
    
        const newBody = document.createElement('div');
        newBody.className = 'AMBody ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom';
        newBody.id = 'A' + id + 'Body';
        newBody.style.height = '0px';
        newBody.innerHTML = `<div class="AMBodyLiner"><p>${displayText}</p></div>`;
    
        // Insert new elements at the beginning of logsElement
        if (logsElement.firstChild) {
          logsElement.insertBefore(newBody, logsElement.firstChild);
          logsElement.insertBefore(newHeader, logsElement.firstChild);
        } else {
          logsElement.appendChild(newHeader);
          logsElement.appendChild(newBody);
        }
    
        if (index === 0) {
          expandNewlyAddedElement(newHeader);
        }
      }
    
      logs[id] = data;
    });
    

  } catch (error) {
    // Handle errors
    console.error('Failed to fetch and update logs:', error);
  }
}

window.onload = async function() {
  const playerName = 'J3_gg'; // Replace this with how you get the playerName
  await fetchAndUpdateLogs(playerName);
};