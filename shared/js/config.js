/* 
  Constants & Configuration for Team Composition Guide
*/
export const APP_CONFIG = {
  PAGE_MAP: { dungeon: 'dungeonSection', story: 'storySection', raid: 'raidSection', storyTowers: 'storyTowersSection', battleTowers: 'battleTowersSection', celestialTower: 'celestialTowerSection', worldBoss: 'worldBossSection' },
  GROUPS_MAP: { dungeon: 'dungeonGroups', story: 'storyGroups', raid: 'raidGroups', storyTowers: 'storyTowersGroups', battleTowers: 'battleTowersGroups', celestialTower: 'celestialTowerGroups', worldBoss: 'worldBossGroups' },
  MP_MAP: { dungeon: 'dungeonMpChain', story: 'storyMpChain', raid: 'raidMpChain', storyTowers: 'storyTowersMpChain', battleTowers: 'battleTowersMpChain', celestialTower: 'celestialTowerMpChain', worldBoss: 'worldBossMpChain' },
  CRED_MAP: { dungeon: 'dungeonCredDisplay', story: 'storyCredDisplay', raid: 'raidCredDisplay', storyTowers: 'storyTowersCredDisplay', battleTowers: 'battleTowersCredDisplay', celestialTower: 'celestialTowerCredDisplay', worldBoss: 'worldBossCredDisplay' },
  PV_MAP: { dungeon: 'pvDungeon', story: 'pvStory', raid: 'pvRaid', storyTowers: 'pvStoryTowers', battleTowers: 'pvBattleTowers', celestialTower: 'pvCelestialTower', worldBoss: 'pvWorldBoss' },
  ALL_MODES: ['dungeon', 'story', 'raid', 'storyTowers', 'battleTowers', 'celestialTower', 'worldBoss'],
  TEAM_COLORS: ['#f5c842', '#c36bff', '#00d4ff', '#00e87a', '#ff8c42', '#ff5fa0', '#4488ff', '#ff3355'],
  H1_COLORS: ['#f5c842', '#c36bff', '#00d4ff', '#00e87a', '#ff8c42', '#ff5fa0', '#4488ff', '#ff3355', '#ffffff', '#aaccff', '#ff9999', '#99ffcc'],
  SECURITY: {
    get CLOUD_CONFIG() {
      // MED-05 Runtime Guard: Only allow event handlers in admin context
      const isAdmin = typeof document !== 'undefined' && document.body.classList.contains('is-admin');
      
      const baseAttr = ['style', 'id', 'class', 'data-mode', 'data-block', 'aria-label', 'target', 'href', 'src', 'alt', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'cx', 'cy', 'r', 'x', 'y'];
      const adminAttr = ['onclick', 'ondblclick', 'contenteditable', 'spellcheck'];
      
      return {
        ADD_ATTR: isAdmin ? [...baseAttr, ...adminAttr] : baseAttr,
        ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'use', 'symbol'],
        ALLOW_DATA_ATTR: true
      };
    }
  }
};

export const { PAGE_MAP, GROUPS_MAP, MP_MAP, CRED_MAP, PV_MAP, ALL_MODES, TEAM_COLORS, H1_COLORS, SECURITY } = APP_CONFIG;
