/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
document.addEventListener('DOMContentLoaded', () => {
  const textField = document.getElementById('textField')
  const generateBtn = document.getElementById('generateBtn')
  const copyBtn = document.getElementById('copyBtn')

  if (textField.value) {
    const domain = window.location.origin
    textField.value = `${domain}/webhook/${textField.value}`
    generateBtn.classList.add('hidden')
    copyBtn.classList.remove('hidden')
  } else {
    generateBtn.classList.remove('hidden')
    opyBtn.classList.add('hidden')
  }

  generateBtn.addEventListener('click', async () => {
    const response = await fetch('/generate-endpoint')
    const data = await response.json()
    const domain = window.location.origin

    // Construct the full URL here and update the textField
    textField.value = `${domain}/webhook/${data.endpoint}`
    adjustWidth(textField)

    generateBtn.classList.add('hidden')
    copyBtn.classList.remove('hidden')
  })
})

const tooltip = document.getElementById('tooltip')
document.getElementById('copyBtn').addEventListener('click', async () => {
  const textField = document.getElementById('textField')
  const textToCopy = textField.value

  try {
    await navigator.clipboard.writeText(textToCopy)
    tooltip.classList.add('show')
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }

  setTimeout(() => {
    tooltip.classList.remove('show')
  }, 2000)
})

document.getElementById('generateBtn').addEventListener('click', async () => {
  const response = await fetch('/generate-endpoint')
  const data = await response.json()
  const textField = document.getElementById('textField')

  const domain = window.location.origin
  textField.value = `${domain}${data.endpoint}`

  document.getElementById('generateBtn').classList.add('hidden')
  document.getElementById('copyBtn').classList.remove('hidden')
})

document.getElementById('logoutButton').addEventListener('click', async () => {
  const res = await fetch('http://localhost:3000/api/logout', { method: 'POST' })
  const data = await res.json()
  if (data.loggedOut) {
    // Clear the user info on the front-end and re-fetch user info
    fetchUserInfo()
    window.location.href = '/'
  }
})

function openTab(evt, tabName) {
  let i
  const event = evt
  const tabcontent = document.getElementsByClassName('tabcontent')
  const tablinks = document.getElementsByClassName('tablinks')
  for (i = 0; i < tabcontent.length; i += 1) {
    tabcontent[i].style.display = 'none'
  }
  for (i = 0; i < tablinks.length; i += 1) {
    tablinks[i].className = tablinks[i].className.replace(' active', '')
  }
  document.getElementById(tabName).style.display = 'block'
  event.currentTarget.className += ' active'
}
