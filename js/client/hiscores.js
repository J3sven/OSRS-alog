
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

  var skills = {};
  var activities = [];

  /**
   * Fetches the hiscores for the given username.
   * @param {string} username The username.
   * @returns {Promise} A promise that resolves with the hiscores.
   */
  const getOSRSHiscores = async (username) => {
    const response = await fetch(`http://localhost:3000/fetchHiscores?player=${username}`);
    const json = await response.json();

    const mainData = json.main;

    skills = Object.entries(mainData.skills).map(([name, { rank, level, xp }]) => new Skill(name, xp, level, rank));

    for (const [category, data] of Object.entries(mainData)) {
      if (category === 'skills') continue;

      for (const [name, { rank, score }] of Object.entries(data)) {
        activities.push(new Activity(name, score, rank));
      }
    }
    populateInitialSkills();
    return Promise.resolve(activities); 
  }

  /**
   * Updates the skill buttons with the current skill levels.
   * @returns {void}
   */
  const updateButtonLevels = () => {
    const buttons = document.querySelectorAll('.scoreButton');
    buttons.forEach((button, index) => {
      if (button.classList.contains('quest')) return;
      const skill = skills[index];
      if (button.querySelector('img')) {
        button.innerHTML = `<img src="alog_assets/skill_icon_${skill.name}.gif" alt="${skill.name}">${skill.level}`;
      } else {
        button.textContent = skill.level;
      }
    });
  };

  /**
   * Populates the initial skills.
   * @returns {void}
   */
  const populateInitialSkills = () => {
    const skillLevelElement = document.getElementById('skilllevel');
    const skillRankElement = document.getElementById('skillrank');
    const skillXpElement = document.getElementById('skillxp');
    const skillTitleElement = document.getElementById('skilltitle');

    const totalLevelSkill = skills.find(skill => skill.name === 'overall'); // Find 'Total Level' skill

    if (totalLevelSkill) {
      skillLevelElement.textContent = totalLevelSkill.level;
      skillRankElement.textContent = totalLevelSkill.rank;
      skillXpElement.textContent = totalLevelSkill.exp;
      skillTitleElement.textContent = 'Total Level';
    }

    updateButtonLevels();

    const buttonContainer = document.querySelector('.buttonContainer');

    buttonContainer.addEventListener('click', (event) => {
      let target = event.target;
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

  /**
   * Updates the skill details.
   * @param {string} skillName The skill name.
   * @returns {void}
   */
  const updateSkills = (skillName) => {
    const skill = skills.find(skill => skill.name === skillName.toLowerCase());
    if (!skill) return;  // Exit if skill is not found

    const buttons = document.querySelectorAll('.scoreButton');
    buttons.forEach(button => {
      if (button.getAttribute('data-skill-name') === skillName.toLowerCase()) {
        button.classList.add('selected');
      } else {
        button.classList.remove('selected');
      }
    });

    const skillLevelElement = document.getElementById('skilllevel');
    const skillRankElement = document.getElementById('skillrank');
    const skillXpElement = document.getElementById('skillxp');
    const skillTitleElement = document.getElementById('skilltitle');

    skillLevelElement.textContent = skill.level;
    skillRankElement.textContent = skill.rank;
    skillXpElement.textContent = skill.exp;
    skillTitleElement.textContent = skillName === 'overall' ? 'Total Level' : skillName;
  };

  document.addEventListener('DOMContentLoaded', () => {
    getOSRSHiscores('j3_gg').then((activities) => {
      populateInitialSkills();

      const activityDetail = document.getElementById('activitydetail');

      const updateDetails = (name, count, rank) => {
        activityDetail.innerHTML = `<span id="activity_name">${name}</span>
                              <span id="activity_count">${count}</span>
                              - Rank: <span id="activity_rank">${rank}</span>`;
      };

      const activityContainer = document.querySelector('.activitycontainer');
        activityContainer.innerHTML = '';
      
      activities.forEach(activity => {
        const activityName = activity.name;
        if (activityName === 'score' || activityName === 'rank') {
          return;
        }
        const activityCount = activity.count !== -1 ? activity.count : '0';
        const activityRank = activity.rank !== -1 ? activity.rank : '0';

        const activityElement = document.createElement('span');
        activityElement.setAttribute('data-activity-name', activityName);
        activityElement.innerHTML = `<img src="alog_assets/game_icon_${activityName}.png" alt="${activityName}">${activityCount}`;

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
    });
  });
