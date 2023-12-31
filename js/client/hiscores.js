/* eslint-disable no-console */
class Skill {
  constructor(name, exp, level, rank) {
    this.name = name
    this.exp = exp
    this.level = level
    this.rank = rank
  }
}

class Activity {
  constructor(name, count, rank) {
    this.name = name
    this.count = count
    this.rank = rank
  }
}

let skills = {}
const activities = []

const updateButtonLevels = () => {
  const buttons = document.querySelectorAll('.scoreButton')
  buttons.forEach((buttonElem) => {
    if (buttonElem.classList.contains('quest')) return
    const skillName = buttonElem.getAttribute('data-skill-name')
    const skillsArray = Object.values(skills)
    const skill = skillsArray.find((s) => s.name === skillName)
    if (!skill) return
    const innerContent = buttonElem.querySelector('img')
      ? `<img src="alog_assets/skill_icon_${skill.name}.gif" alt="${skill.name}">${skill.level}`
      : skill.level

    const modifiedButton = buttonElem
    modifiedButton.innerHTML = innerContent
  })
}

const updateSkills = (targetSkillName) => {
  const targetSkill = skills.find((skillItem) => skillItem.name === targetSkillName.toLowerCase())
  if (!targetSkill) return

  const buttons = document.querySelectorAll('.scoreButton')
  buttons.forEach((button) => {
    if (button.getAttribute('data-skill-name') === targetSkillName.toLowerCase()) {
      button.classList.add('selected')
    } else {
      button.classList.remove('selected')
    }
  })
}

const updateAchievements = (questPoints, combatTasks, achievements, collectionLog) => {
  const questPointsElement = document.getElementById('questpoints')
  const combatTasksElement = document.getElementById('combattasks')
  const achievementsElement = document.getElementById('achievements')
  const collectionLogElement = document.getElementById('collectionlog')

  questPointsElement.textContent = questPoints
  combatTasksElement.textContent = combatTasks || 'no data'
  achievementsElement.textContent = achievements || 'no data'
  collectionLogElement.textContent = collectionLog || 'no data'
}

const populateInitialSkills = () => {
  const skillLevelElement = document.getElementById('skilllevel')
  const skillRankElement = document.getElementById('skillrank')
  const skillXpElement = document.getElementById('skillxp')
  const skillTitleElement = document.getElementById('skilltitle')

  // Explicitly look for 'overall' or 'totallevel'
  const totalLevelSkill = skills.overall || skills.totallevel

  if (totalLevelSkill) {
    skillLevelElement.textContent = totalLevelSkill.level
    skillRankElement.textContent = totalLevelSkill.rank
    skillXpElement.textContent = totalLevelSkill.exp
    skillTitleElement.textContent = 'Total Level'
  }

  updateButtonLevels()

  const buttonContainer = document.querySelector('.buttonContainer')

  buttonContainer.addEventListener('click', (event) => {
    let { target } = event
    while (target !== buttonContainer) {
      if (target.classList.contains('scoreButton')) {
        const skillName = target.getAttribute('data-skill-name')
        updateSkills(skillName)
        return
      }
      target = target.parentElement
    }
  })
}

const handleUIUpdates = (fetchedActivities) => {
  populateInitialSkills()

  const activityDetail = document.getElementById('activitydetail')

  const updateDetails = (name, count, rank) => {
    activityDetail.innerHTML = `<span id="activity_name">${name}</span>
                            <span id="activity_count">${count}</span>
                            - Rank: <span id="activity_rank">${rank}</span>`
  }

  const activityContainer = document.querySelector('.activitycontainer')
  activityContainer.innerHTML = ''

  fetchedActivities.forEach((activity) => {
    const activityName = activity.name.toLowerCase()
    if (activityName === 'score' || activityName === 'rank') {
      return
    }
    const activityCount = activity.count !== -1 ? activity.count : '0'
    const activityRank = activity.rank !== -1 ? activity.rank : '0'

    const activityElement = document.createElement('div')
    activityElement.setAttribute('data-activity-name', activityName)
    activityElement.innerHTML = `<img src="alog_assets/game_icon_${activityName.toLowerCase()}.png" alt="${activityName}"><span>${activityCount}</span>`

    activityElement.addEventListener('click', () => {
      const selected = document.querySelector('.activitycontainer .selected')
      if (selected) {
        selected.classList.remove('selected')
      }
      activityElement.classList.add('selected')
      updateDetails(activityName, activityCount, activityRank)
    })

    activityContainer.appendChild(activityElement)
  })
}

const loadProfileFromJSON = async (username) => {
  const activityContainer = document.querySelector('.activitycontainer')
  activityContainer.innerHTML = '<span class="spinner"></span>'

  const player = username.replace(/ /g, '_').toLowerCase()
  try {
    const response = await fetch(`/getProfile/${player}`)
    if (!response.ok) {
      throw new Error('JSON not found')
    }
    const json = await response.json()

    skills = Object.entries(json.Skills).reduce((acc, [name, { rank, level, xp }]) => {
      acc[name] = new Skill(name, xp, level, rank)
      return acc
    }, {})

    activities.length = 0 // Clear existing activities
    Object.entries(json.Activities).forEach(([name, { rank, score }]) => {
      activities.push(new Activity(name, score, rank))
    })

    populateInitialSkills()
    updateAchievements(json.questpoints, json.combatachievements, json.achievements, json.collectionLog)
    return Promise.resolve(activities)
  } catch (error) {
    // Error handling logic
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search)
  const player = urlParams.get('player')
  const activityContainer = document.querySelector('.activitycontainer')

  if (!player) {
    activityContainer.innerHTML = ''
    return
  }

  const sanitizedPlayer = player.replace(/ /g, '_').toLowerCase()

  loadProfileFromJSON(sanitizedPlayer)
    .then(handleUIUpdates)
    .catch((error) => {
      console.error('Failed to load initial profile:', error)
    })

  fetch(`/updateProfile/${sanitizedPlayer}`)
    .then((response) => {
      if (response.ok) {
        return response.json()
      }
      throw new Error('Failed to update profile')
    })
    .then(() => loadProfileFromJSON(sanitizedPlayer))
    .then(handleUIUpdates)
    .catch((error) => {
      console.error('Failed to update profile:', error)
    })
})
