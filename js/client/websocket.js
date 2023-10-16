const ws = new WebSocket('ws://localhost:3000')
const MAX_LOG_COUNT = 10
let isFirstFetch = true
const logs = {}

async function fetchLogsData(url) {
  const response = await fetch(url)
  return response.json()
}

function sortLogsData(logsData) {
  logsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

function updateExistingElement(headerElem, bodyElem, id, titleText, displayText) {
  const existingHeader = headerElem
  const existingBody = bodyElem

  existingHeader.id = `A${id}`
  existingHeader.innerHTML = `<span class="ui-icon ui-icon-triangle-1-e"></span><span class="Title">${titleText}</span>`

  existingBody.id = `A${id}Body`
  existingBody.innerHTML = `<div class="AMBodyLiner"><p>${displayText}</p></div>`
}

function createNewElement(id, titleText, displayText) {
  const newHeader = document.createElement('a')
  newHeader.className = 'AMHead ui-accordion-header ui-helper-reset ui-state-default ui-corner-all'
  newHeader.id = `A${id}`
  newHeader.innerHTML = `<span class="ui-icon ui-icon-triangle-1-e"></span><span class="Title">${titleText}</span>`

  const newBody = document.createElement('div')
  newBody.className = 'AMBody ui-accordion-content ui-helper-reset ui-widget-content ui-corner-bottom'
  newBody.id = `A${id}Body`
  newBody.style.height = '0px'
  newBody.innerHTML = `<div class="AMBodyLiner"><p>${displayText}</p></div>`

  return { newHeader, newBody }
}

async function fetchAndUpdateLogs(playerName) {
  try {
    const url = `/getLatestLogs/${playerName}`
    const newLogsData = await fetchLogsData(url)
    sortLogsData(newLogsData)

    const logsElement = document.getElementById('RAAccordion')

    if (isFirstFetch && newLogsData.length > 0) {
      logsElement.innerHTML = ''
      isFirstFetch = false
    }

    let displayedLogCount = 0
    const reversedLogs = newLogsData.reverse()

    const tempContainer = document.createElement('div')

    reversedLogs.forEach((currentLog) => {
      if (displayedLogCount >= MAX_LOG_COUNT) {
        return
      }

      const {
        type, id, titleText, displayText,
      } = currentLog

      if (type === 'QUEST' && !logs[id]) {
        const { newHeader, newBody } = createNewElement(id, titleText, displayText)
        newBody.style.height = '0px'
        tempContainer.appendChild(newHeader)
        tempContainer.appendChild(newBody)
        logs[id] = currentLog
        displayedLogCount += 1
      } else {
        const existingHeader = document.getElementById(`A${id}`)
        const existingBody = document.getElementById(`A${id}Body`)

        if (existingHeader && existingBody) {
          updateExistingElement(existingHeader, existingBody, id, titleText, displayText)
        } else {
          const { newHeader, newBody } = createNewElement(id, titleText, displayText)
          newBody.style.height = '0px'
          tempContainer.appendChild(newHeader)
          tempContainer.appendChild(newBody)
          displayedLogCount += 1
        }
      }

      logs[id] = currentLog
    })

    while (tempContainer.lastChild) {
      logsElement.insertBefore(tempContainer.lastChild, logsElement.firstChild)
    }

    // eslint-disable-next-line no-undef
    expandNewlyAddedElement(logsElement.firstChild) // Not imported from accordion.js because it's client code

    setTimeout(() => {
      document.getElementById('RAAccordion').classList.add('ready')
    }, 300)
  } catch (error) {
    const logsElement = document.getElementById('RAAccordion')
    logsElement.classList.add('ready')
    logsElement.innerHTML = '<p style="text-align: center; padding-top: 25px;">This player has no recorded logs yet, is this your character? <br> <a href="/login">Log in</a> and get started!</p>'
  }
}

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)

  if (message.action === 'update' && message.playerName) {
    fetchAndUpdateLogs(message.playerName)
  } else {
    console.warn('Player name missing in WebSocket message.')
  }
})

window.onload = async function handleOnLoad() {
  const urlParams = new URLSearchParams(window.location.search)
  const playerName = urlParams.get('player')

  if (!playerName) {
    return
  }

  const sanitizedPlayerName = playerName.replace(/ /g, '_')

  await fetchAndUpdateLogs(sanitizedPlayerName)
  fetch(`/checkImageExistence/${sanitizedPlayerName}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.headExists) {
        document.querySelector('#avatar img.head').src = `/data/${sanitizedPlayerName}/img/head.png`
      }
      if (data.bodyExists) {
        document.querySelector('#avatar img.body').src = `/data/${sanitizedPlayerName}/img/full.png`
      }
    })
}
