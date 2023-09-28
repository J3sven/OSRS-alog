const ws = new WebSocket('ws://localhost:3000');

function markdownToHtml(markdown) {
  return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}

let lastSource = null;
let firstEvent = true;
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
    const url = `/data/${playerName}/log.json`;

    // Fetch the log.json file
    const response = await fetch(url);

    // Parse the JSON response
    const logsData = await response.json();

    // Clear existing logs (if you wish)
    const logsElement = document.getElementById('RAAccordion');
    logsElement.innerHTML = '';

    // Update UI based on logsData
    logsData.forEach((data) => {
      const id = data.id;
      const titleText = data.titleText;
      const displayText = data.displayText;

      // Create new elements for each log entry and append them
      const newHeader = document.createElement('a');
      newHeader.className = 'AMHead ui-accordion-header ui-helper-reset ui-state-default ui-corner-all';
      newHeader.id = 'A' + id;
      newHeader.innerHTML = `<span class="ui-icon ui-icon-triangle-1-e"></span><span class="Title">${titleText}</span>`;

      const newBody = document.createElement('div');
      newBody.className = 'AMBody ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom';
      newBody.id = 'A' + id + 'Body';
      newBody.style.height = '0px';
      newBody.innerHTML = `<div class="AMBodyLiner"><p>${displayText}</p></div>`;

      logsElement.appendChild(newHeader);
      logsElement.appendChild(newBody);
    });

  } catch (error) {
    // Handle errors
    console.error('Failed to fetch and update logs:', error);
  }
}