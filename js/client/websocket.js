const ws = new WebSocket('ws://localhost:3000');

function markdownToHtml(markdown) {
  return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}

let lastSource = null;
const logs = {};

ws.addEventListener('message', (event) => {
  console.log(event.data);
  const receivedData = JSON.parse(event.data);
  const logsElement = document.getElementById('RAAccordion');

  if (!(Array.isArray(receivedData) && receivedData.length === 0)) {
    console.log('Clearing logs', receivedData)
    logsElement.innerHTML = '';
  }

  receivedData.forEach((data) => {
    const id = data.id;
    const titleText = data.titleText;
    const displayText = data.displayText;

    if (logs[id]) {
      const headerToUpdate = document.getElementById('A' + id);
      const bodyToUpdate = document.getElementById('A' + id + 'Body');

      if (headerToUpdate && bodyToUpdate) {
        headerToUpdate.innerHTML = `<span class="ui-icon ui-icon-triangle-1-e"></span><span class="Title">${titleText}</span>`;
        bodyToUpdate.innerHTML = `<div class="AMBodyLiner"><p>${displayText}</p></div>`;
      }
    } else {
      const newHeader = document.createElement('a');
      newHeader.className = 'AMHead ui-accordion-header ui-helper-reset ui-state-default ui-corner-all';
      newHeader.id = 'A' + id;
      newHeader.innerHTML = `<span class="ui-icon ui-icon-triangle-1-e"></span><span class="Title">${titleText}</span>`;

      const newBody = document.createElement('div');
      newBody.className = 'AMBody ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom';
      newBody.id = 'A' + id + 'Body';
      newBody.style.height = '0px';
      newBody.innerHTML = `<div class="AMBodyLiner"><p>${displayText}</p></div>`;

      if (logsElement.firstChild) {
        logsElement.insertBefore(newBody, logsElement.firstChild);
        logsElement.insertBefore(newHeader, logsElement.firstChild);
      } else {
        logsElement.appendChild(newHeader);
        logsElement.appendChild(newBody);
      }
      expandNewlyAddedElement(newHeader);

      logs[id] = data;
    }
  });
});