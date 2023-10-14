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
    const url = `/data/${playerName}/log.json`
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
    console.error('Failed to fetch and update logs:', error)
  }
}

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  console.log('message', message)

  if (message.action === 'update' && message.playerName) {
    fetchAndUpdateLogs(message.playerName)
  } else {
    console.error('Player name missing in WebSocket message.')
  }
})

window.onload = async function handleOnLoad() {
  const urlParams = new URLSearchParams(window.location.search)
  const playerName = urlParams.get('player')
  console.log('playerName', playerName)

  if (!playerName) {
    return
  }

  const sanitizedPlayerName = playerName.replace(/ /g, '_')
  console.log('sanitizedPlayerName', sanitizedPlayerName)
  await fetchAndUpdateLogs(sanitizedPlayerName)

  function imageExists(url, callback) {
    const img = new Image()
    img.onload = function onLoad() { callback(true) }
    img.onerror = function onError() { callback(false) }
    img.src = url
  }

  const headPath = `/data/${sanitizedPlayerName}/img/head.png`
  const bodyPath = `/data/${sanitizedPlayerName}/img/full.png`

  imageExists(headPath, (exists) => {
    if (exists) {
      document.querySelector('#avatar img.head').src = headPath
    }
  })

  imageExists(bodyPath, (exists) => {
    if (exists) {
      document.querySelector('#avatar img.body').src = bodyPath
    }
  })
}
