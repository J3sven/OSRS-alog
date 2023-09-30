class Skill {
  constructor(name, exp, level, rank) {
    this.name = name;
    this.exp = exp;
    this.level = level;
    this.rank = rank;
  }
}

class Activity {
  constructor(name, count, rank) {
    this.name = name;
    this.count = count;
    this.rank = rank;
  }
}

let skills = {};
const activities = [];

const updateButtonLevels = () => {
  const buttons = document.querySelectorAll('.scoreButton');
  buttons.forEach((buttonElem, index) => {
    const button = buttonElem;
    if (button.classList.contains('quest')) return;
    const skill = skills[index];
    const innerContent = button.querySelector('img')
      ? `<img src="alog_assets/skill_icon_${skill.name}.gif" alt="${skill.name}">${skill.level}`
      : skill.level;

    button.innerHTML = innerContent;
  });
};

const updateSkills = (targetSkillName) => {
  const targetSkill = skills.find((skillItem) => skillItem.name === targetSkillName.toLowerCase());
  if (!targetSkill) return;

  const buttons = document.querySelectorAll('.scoreButton');
  buttons.forEach((button) => {
    if (button.getAttribute('data-skill-name') === targetSkillName.toLowerCase()) {
      button.classList.add('selected');
    } else {
      button.classList.remove('selected');
    }
  });

  const skillLevelElement = document.getElementById('skilllevel');
  const skillRankElement = document.getElementById('skillrank');
  const skillXpElement = document.getElementById('skillxp');
  const skillTitleElement = document.getElementById('skilltitle');

  skillLevelElement.textContent = targetSkill.level;
  skillRankElement.textContent = targetSkill.rank;
  skillXpElement.textContent = targetSkill.exp;
  skillTitleElement.textContent = targetSkillName === 'overall' ? 'Total Level' : targetSkillName;
};

const populateInitialSkills = () => {
  const skillLevelElement = document.getElementById('skilllevel');
  const skillRankElement = document.getElementById('skillrank');
  const skillXpElement = document.getElementById('skillxp');
  const skillTitleElement = document.getElementById('skilltitle');

  const totalLevelSkill = skills.find((skill) => skill.name === 'overall');

  if (totalLevelSkill) {
    skillLevelElement.textContent = totalLevelSkill.level;
    skillRankElement.textContent = totalLevelSkill.rank;
    skillXpElement.textContent = totalLevelSkill.exp;
    skillTitleElement.textContent = 'Total Level';
  }

  updateButtonLevels();

  const buttonContainer = document.querySelector('.buttonContainer');

  buttonContainer.addEventListener('click', (event) => {
    let { target } = event;
    while (target !== buttonContainer) {
      if (target.classList.contains('scoreButton')) {
        const skillName = target.getAttribute('data-skill-name');
        updateSkills(skillName);
        return;
      }
      target = target.parentElement;
    }
  });
};

const handleUIUpdates = (fetchedActivities) => {
  populateInitialSkills();
  populateInitialSkills();

  const activityDetail = document.getElementById('activitydetail');

  const updateDetails = (name, count, rank) => {
    activityDetail.innerHTML = `<span id="activity_name">${name}</span>
                            <span id="activity_count">${count}</span>
                            - Rank: <span id="activity_rank">${rank}</span>`;
  };

  const activityContainer = document.querySelector('.activitycontainer');
  activityContainer.innerHTML = '';

  fetchedActivities.forEach((activity) => {
    const activityName = activity.name;
    if (activityName === 'score' || activityName === 'rank') {
      return;
    }
    const activityCount = activity.count !== -1 ? activity.count : '0';
    const activityRank = activity.rank !== -1 ? activity.rank : '0';

    const activityElement = document.createElement('div');
    activityElement.setAttribute('data-activity-name', activityName);
    activityElement.innerHTML = `<img src="alog_assets/game_icon_${activityName}.png" alt="${activityName}"><span>${activityCount}</span>`;

    activityElement.addEventListener('click', () => {
      const selected = document.querySelector('.activitycontainer .selected');
      if (selected) {
        selected.classList.remove('selected');
      }
      activityElement.classList.add('selected');
      updateDetails(activityName, activityCount, activityRank);
    });

    activityContainer.appendChild(activityElement);
  });
};

const loadProfileFromJSON = async (username) => {
  const player = username.replace(/ /g, '_');
  try {
    const response = await fetch(`/data/${player}/profile.json`);
    if (!response.ok) {
      throw new Error('JSON not found');
    }
    const json = await response.json();

    skills = Object.entries(json.Skills).map(([name, { rank, level, xp }]) => new Skill(name, xp, level, rank));
    activities.length = 0; // Clear existing activities
    Object.entries(json.Activities).forEach(([name, { rank, score }]) => {
      activities.push(new Activity(name, score, rank));
    });

    populateInitialSkills();
    return Promise.resolve(activities);
  } catch (error) {
    if (error.message === 'JSON not found') {
      const updateResponse = await fetch(`/updateProfile/${player}`);
      if (updateResponse.ok) {
        return loadProfileFromJSON(player);
      }
    }
    return Promise.reject(error);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const player = urlParams.get('player').replace(/ /g, '_');

  loadProfileFromJSON(player)
    .then(handleUIUpdates)
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to load initial profile:', error);
    });
  fetch(`/updateProfile/${player}`)
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to update profile');
    })
    .then(() => loadProfileFromJSON(player))
    .then(handleUIUpdates)
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to update profile:', error);
    });
});
