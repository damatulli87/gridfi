// Local storage helpers for favorites and recent nodes
const FAVORITES_KEY = 'ercot_favorite_nodes';
const RECENT_KEY = 'ercot_recent_nodes';
const MAX_RECENT = 10;

export function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch { return []; }
}

export function setFavorites(nodes) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(nodes));
}

export function toggleFavorite(node) {
  const favs = getFavorites();
  const idx = favs.indexOf(node);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(node);
  }
  setFavorites(favs);
  return favs;
}

export function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

export function addRecent(node) {
  let recent = getRecent().filter(n => n !== node);
  recent.unshift(node);
  recent = recent.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  return recent;
}

// Dark mode
export function getDarkMode() {
  return localStorage.getItem('ercot_dark_mode') === 'true';
}

export function setDarkMode(v) {
  localStorage.setItem('ercot_dark_mode', v ? 'true' : 'false');
  if (v) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function initDarkMode() {
  const dark = getDarkMode();
  if (dark) document.documentElement.classList.add('dark');
  return dark;
}