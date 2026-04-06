import { CORE_TEAMS, NEW_TEAMS, STORY_CORE_TEAMS, STORY_NEW_TEAMS } from './data/defaults.js';

export const AppState = {
  currentRole: 'guest',
  theme: 'dark', // 'dark' or 'light'
  data: {
    pageVisibility: {
      dungeon: true,
      story: true
    },
    dungeon: {
      id: 'dungeonMode',
      title: 'TEAM COMPOSITION GUIDE',
      alert: '🚫 DO NOT USE SEC MERGED BEAST ABOVE FLOOR 140 (Use Rare Ver. Because Sec version heals bosses for hundreds of O)!',
      coreLabel: 'CORE TEAMS',
      coreTeams: JSON.parse(JSON.stringify(CORE_TEAMS)),
      newLabel: 'NEW TEAMS',
      newTeams: JSON.parse(JSON.stringify(NEW_TEAMS)),
      customSections: []
    },
    story: {
      id: 'storyMode',
      title: 'STORY MODE GUIDE',
      alert: '🚫 FOCUS ON AOE DAMAGE FOR STORY MODE CHAPTERS',
      coreLabel: 'CORE TEAMS',
      coreTeams: JSON.parse(JSON.stringify(STORY_CORE_TEAMS)),
      newLabel: 'NEW TEAMS',
      newTeams: JSON.parse(JSON.stringify(STORY_NEW_TEAMS)),
      customSections: []
    },
    modifiers: [
      { id: 'm1', priority: '1', title: '130+ RUNS', items: ['Max Damage Reduction', 'Attack Speed', 'Effect Hit Rate/Skill Cast Rate'] },
    ],
    credits: [
      { id: 'c1', role: 'DESIGN & MAINTAINED BY', names: ['AnotherUseru'] },
      { id: 'c2', role: 'TEAMS BY', names: ['Smoker', 'Nero'] },
      { id: 'c3', role: 'WITH HELP FROM', names: ['Baguette', 'Deyan'] }
    ]
  },
  
  listeners: [],
  subscribe(fn) {
    this.listeners.push(fn);
  },
  notify() {
    this.listeners.forEach(fn => fn(this.data));
  },
  
  updateData(newData) {
    this.data = { ...this.data, ...newData };
    this.notify();
  },

  setRole(role) {
    this.currentRole = role;
    if (role === 'admin') {
      document.body.classList.remove('readonly');
      document.getElementById('roleBadge').textContent = 'ADMIN MODE';
      document.getElementById('roleBadge').classList.add('admin-badge');
    } else {
      document.body.classList.add('readonly');
      document.getElementById('roleBadge').textContent = 'VIEW MODE';
      document.getElementById('roleBadge').classList.remove('admin-badge');
    }
    this.notify(); // Re-render UI based on role
  }
};
