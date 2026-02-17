function isDevModeEnabled() {
  return String(process.env.DEV_MODE || '').trim().toLowerCase() === 'true';
}

function getMinPlayers() {
  return isDevModeEnabled() ? 1 : 3;
}

module.exports = {
  isDevModeEnabled,
  getMinPlayers
};