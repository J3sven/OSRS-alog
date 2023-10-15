async function fetchUserInfo() {
  const res = await fetch('http://localhost:3000/api/user')
  const data = await res.json()

  const userPanel = document.getElementById('userPanel')
  userPanel.innerHTML = '' // Clear previous content

  if (data.authenticated) {
    const avatarDiv = document.createElement('div')
    avatarDiv.className = 'avatar'
    avatarDiv.style = 'position: relative; width: 42px; height: 42px;'
    userPanel.appendChild(avatarDiv)

    const avatar = document.createElement('img')
    avatar.width = 35
    avatar.height = 35
    avatar.style = 'border-radius: 100%;'
    avatar.src = `https://cdn.discordapp.com/avatars/${data.userInfo.id}/${data.userInfo.avatar}.png`
    avatarDiv.appendChild(avatar)

    const avatarDeco = document.createElement('img')
    avatarDeco.width = 42
    avatarDeco.height = 42
    avatarDeco.style = 'position: absolute; left: 3px; top: -5px;'
    avatarDeco.src = `https://cdn.discordapp.com/avatar-decoration-presets/${data.userInfo.avatar_decoration_data.asset}.png`
    avatarDiv.appendChild(avatarDeco)

    const username = document.createElement('a')
    username.innerText = data.userInfo.global_name
    username.href = '/user-settings'
    userPanel.appendChild(username)
  } else {
    // Create and append elements for unauthenticated users
    const discordButtonDiv = document.createElement('div')
    discordButtonDiv.id = 'discord-button'

    const discordButtonA = document.createElement('a')
    discordButtonA.onclick = () => { window.location.href = '/login' }

    const iconDiv = document.createElement('div')
    iconDiv.className = 'icon'

    fetch('/img/discordicon.svg')
      .then((response) => response.text())
      .then((svgData) => {
        iconDiv.innerHTML = svgData
      })

    discordButtonA.appendChild(iconDiv)

    const discordSpan = document.createElement('span')
    discordSpan.innerText = 'Login via Discord'
    discordButtonA.appendChild(discordSpan)

    discordButtonDiv.appendChild(discordButtonA)

    userPanel.appendChild(discordButtonDiv)
  }
}

fetchUserInfo()
