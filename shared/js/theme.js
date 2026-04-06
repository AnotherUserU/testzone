export function initTheme() {
  const currentTheme = localStorage.getItem('siteTheme') || 'dark';
  setTheme(currentTheme);
}

export function toggleTheme() {
  const current = document.documentElement.classList.contains('light-theme') ? 'light' : 'dark';
  setTheme(current === 'light' ? 'dark' : 'light');
}

function setTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light-theme');
    document.getElementById('themeBtn').textContent = '🌙 Dark Mode';
  } else {
    document.documentElement.classList.remove('light-theme');
    document.getElementById('themeBtn').textContent = '☀️ Light Mode';
  }
  localStorage.setItem('siteTheme', theme);
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const tb = document.getElementById('themeBtn');
  if (tb) tb.addEventListener('click', toggleTheme);
});
